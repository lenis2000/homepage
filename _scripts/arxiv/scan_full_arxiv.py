#!/usr/bin/env python3
"""
Scan the full Kaggle arXiv metadata (~3M papers) to find integrable probability
papers not yet in the feed, using bge-m3 embeddings and cosine similarity.

Uses SQLite for the embedding cache (handles 3M+ entries incrementally).

Usage:
    python3 _scripts/arxiv/scan_full_arxiv.py [--threshold 0.65] [--batch-size 64]

Requires: sentence-transformers, numpy, torch
Install via: make arxiv-venv
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import struct
import sys
import time
from pathlib import Path

import numpy as np

_t0 = time.monotonic()


def log(msg):
    elapsed = time.monotonic() - _t0
    print(f"[{elapsed:6.1f}s] {msg}", flush=True)


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
INDEX_FILE = REPO_ROOT / "assets" / "data" / "arxiv-index.json"
VECTORS_FILE = REPO_ROOT / "assets" / "data" / "arxiv-vectors.npy"
CACHE_DB = SCRIPT_DIR / ".embedding-cache-full.db"
CANDIDATES_FILE = SCRIPT_DIR / "candidates.csv"

KAGGLE_FILE = Path(os.environ.get(
    "ARXIV_KAGGLE",
    Path.home() / "Data" / "arxiv" / "arxiv-metadata-oai-snapshot.json",
))

MODEL_NAME = "BAAI/bge-m3"
EMBED_DIM = 1024
CHUNK_SIZE = 10000  # papers per similarity chunk


# --- SQLite embedding cache ---

def _vec_to_blob(vec):
    """Pack float32 array as bytes."""
    return struct.pack(f'{len(vec)}f', *vec)


def _blob_to_vec(blob):
    """Unpack bytes to float32 array."""
    n = len(blob) // 4
    return np.array(struct.unpack(f'{n}f', blob), dtype=np.float32)


class EmbeddingCache:
    def __init__(self, db_path):
        self.conn = sqlite3.connect(str(db_path))
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS embeddings "
            "(key TEXT PRIMARY KEY, vec BLOB)"
        )
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        self.conn.commit()

    def get(self, key):
        row = self.conn.execute(
            "SELECT vec FROM embeddings WHERE key=?", (key,)
        ).fetchone()
        if row:
            return _blob_to_vec(row[0])
        return None

    def get_many(self, keys):
        """Batch lookup. Returns dict of key -> vector (only hits)."""
        results = {}
        # SQLite has a variable limit, query in batches of 500
        for i in range(0, len(keys), 500):
            batch = keys[i:i+500]
            placeholders = ",".join("?" * len(batch))
            rows = self.conn.execute(
                f"SELECT key, vec FROM embeddings WHERE key IN ({placeholders})",
                batch
            ).fetchall()
            for k, v in rows:
                results[k] = _blob_to_vec(v)
        return results

    def put_many(self, items):
        """Batch insert. items: list of (key, vector)."""
        self.conn.executemany(
            "INSERT OR REPLACE INTO embeddings (key, vec) VALUES (?, ?)",
            [(k, _vec_to_blob(v)) for k, v in items]
        )
        self.conn.commit()

    def count(self):
        return self.conn.execute("SELECT COUNT(*) FROM embeddings").fetchone()[0]

    def close(self):
        self.conn.close()


def text_key(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_tracked_ids():
    """Get arXiv IDs already in the feed."""
    with open(INDEX_FILE, encoding="utf-8") as f:
        return {e["id"] for e in json.load(f)}


def load_reference_vectors():
    """Load the known int-prob paper vectors."""
    return np.load(VECTORS_FILE)


def main():
    parser = argparse.ArgumentParser(description="Scan full arXiv for missed int-prob papers")
    parser.add_argument("--threshold", type=float, default=0.65,
                        help="Cosine similarity threshold (default: 0.65)")
    parser.add_argument("--batch-size", type=int, default=64,
                        help="Embedding batch size (default: 64)")
    args = parser.parse_args()

    if not VECTORS_FILE.exists():
        log(f"Error: {VECTORS_FILE} not found. Run 'make arxiv-related' first.")
        return 1
    if not KAGGLE_FILE.exists():
        log(f"Error: Kaggle DB not found at {KAGGLE_FILE}")
        return 1

    tracked_ids = load_tracked_ids()
    log(f"Tracked papers: {len(tracked_ids)}")

    ref_vectors = load_reference_vectors()
    log(f"Reference vectors: {ref_vectors.shape}")

    cache = EmbeddingCache(CACHE_DB)
    log(f"Cache DB: {CACHE_DB} ({cache.count()} entries)")

    # Lazy-load model only if needed
    model = None

    candidates = []
    processed = 0
    cache_hits = 0
    embedded = 0

    # Buffers for batch embedding
    batch_texts = []
    batch_keys = []
    batch_meta = []  # (arxiv_id, title, categories, authors)

    def flush_batch():
        nonlocal model, embedded, cache_hits
        if not batch_texts:
            return

        # Check cache
        cached = cache.get_many(batch_keys)
        to_embed_idx = [i for i, k in enumerate(batch_keys) if k not in cached]
        cache_hits += len(batch_keys) - len(to_embed_idx)

        if to_embed_idx:
            if model is None:
                from sentence_transformers import SentenceTransformer
                import torch
                device = "mps" if torch.backends.mps.is_available() else "cpu"
                log(f"Loading model on {device}...")
                model = SentenceTransformer(MODEL_NAME).to(device)

            texts_to_embed = [batch_texts[i] for i in to_embed_idx]
            vecs = model.encode(
                texts_to_embed,
                batch_size=args.batch_size,
                show_progress_bar=False,
                normalize_embeddings=True,
            )
            # Store in cache
            new_items = []
            for idx, vec in zip(to_embed_idx, vecs):
                cached[batch_keys[idx]] = vec
                new_items.append((batch_keys[idx], vec))
            cache.put_many(new_items)
            embedded += len(to_embed_idx)

        # Compute similarity against reference set
        vecs_array = np.array(
            [cached[k] for k in batch_keys], dtype=np.float32
        )
        sims = vecs_array @ ref_vectors.T  # (batch, 4068)
        max_sims = sims.max(axis=1)

        for i, sim in enumerate(max_sims):
            if sim >= args.threshold and batch_meta[i][0] not in tracked_ids:
                candidates.append((
                    float(sim),
                    batch_meta[i][0],  # arxiv_id
                    batch_meta[i][1],  # title
                    batch_meta[i][2],  # categories
                    batch_meta[i][3],  # authors
                ))

        batch_texts.clear()
        batch_keys.clear()
        batch_meta.clear()

    log("Streaming Kaggle DB...")
    with open(KAGGLE_FILE, encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue

            arxiv_id = rec.get("id", "")
            if arxiv_id in tracked_ids:
                processed += 1
                continue

            title = re.sub(r"\s+", " ", rec.get("title", "")).strip()
            abstract = re.sub(r"\s+", " ", rec.get("abstract", "")).strip()
            categories = rec.get("categories", "")
            authors = rec.get("authors", "")

            text = f"{title}. {abstract}" if abstract else title
            batch_texts.append(text)
            batch_keys.append(text_key(text))
            batch_meta.append((arxiv_id, title, categories, authors))

            if len(batch_texts) >= CHUNK_SIZE:
                flush_batch()
                processed += CHUNK_SIZE
                if processed % 100000 == 0:
                    log(f"  {processed:,} processed, {cache_hits:,} cache hits, "
                        f"{embedded:,} embedded, {len(candidates)} candidates")

    # Final flush
    flush_batch()
    processed += len(batch_texts)

    log(f"Done. {processed:,} processed, {cache_hits:,} cache hits, "
        f"{embedded:,} embedded, {len(candidates)} candidates")

    # Sort by similarity descending
    candidates.sort(key=lambda x: -x[0])

    # Write CSV
    with open(CANDIDATES_FILE, "w", encoding="utf-8") as f:
        f.write("similarity,arxiv_id,categories,title,authors\n")
        for sim, aid, title, cats, authors in candidates:
            # Escape CSV fields
            title_esc = title.replace('"', '""')
            authors_esc = authors.replace('"', '""')
            f.write(f'{sim:.4f},{aid},"{cats}","{title_esc}","{authors_esc}"\n')

    log(f"Wrote {len(candidates)} candidates to {CANDIDATES_FILE}")

    # Print top 20
    log(f"\nTop 20 candidates (threshold={args.threshold}):")
    for sim, aid, title, cats, authors in candidates[:20]:
        log(f"  {sim:.3f}  {aid}  {cats[:30]}  {title[:80]}")

    cache.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
