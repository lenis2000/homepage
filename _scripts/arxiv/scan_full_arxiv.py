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
KAGGLE_DB = Path(os.environ.get(
    "ARXIV_KAGGLE_DB",
    Path.home() / "Data" / "arxiv" / "arxiv-metadata.db",
))

MODEL_NAME = "BAAI/bge-m3"
EMBED_DIM = 1024
CHUNK_SIZE = 100  # papers per similarity chunk


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


def load_allowed_categories():
    """Top 20 categories by paper count in the feed."""
    return {
        "math.PR", "math-ph", "math.CO", "math.MP", "cond-mat.stat-mech",
        "math.RT", "math.CA", "math.QA", "hep-th", "nlin.SI",
        "math.AG", "math.AP", "math.CV", "cond-mat", "math.FA",
        "math.NT", "q-alg", "solv-int", "math.ST", "math.DS",
    }


def load_reference_vectors():
    """Load the known int-prob paper vectors."""
    return np.load(VECTORS_FILE)


def main():
    parser = argparse.ArgumentParser(description="Scan full arXiv for missed int-prob papers")
    parser.add_argument("--threshold", type=float, default=0.65,
                        help="Cosine similarity threshold (default: 0.65)")
    parser.add_argument("--batch-size", type=int, default=8,
                        help="Embedding batch size (default: 8)")
    parser.add_argument("--id-prefix", type=str, default=None,
                        help="Only scan papers whose ID starts with this (e.g., '2601' for Jan 2026)")
    args = parser.parse_args()

    if not VECTORS_FILE.exists():
        log(f"Error: {VECTORS_FILE} not found. Run 'make arxiv-related' first.")
        return 1
    if not KAGGLE_DB.exists():
        log(f"Error: Kaggle SQLite DB not found at {KAGGLE_DB}")
        log("Run 'make arxiv-kaggle' to download and import.")
        return 1

    tracked_ids = load_tracked_ids()
    log(f"Tracked papers: {len(tracked_ids)}")

    allowed_cats = load_allowed_categories()
    log(f"Allowed categories: {len(allowed_cats)}")

    ref_vectors = load_reference_vectors()
    log(f"Reference vectors: {ref_vectors.shape}")

    cache = EmbeddingCache(CACHE_DB)
    log(f"Cache DB: {CACHE_DB} ({cache.count()} entries)")

    # Lazy-load model only if needed
    model = None

    candidates = []
    processed = 0
    skipped_cats = 0
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
                device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
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

    # Query SQLite for papers to scan
    kaggle_conn = sqlite3.connect(str(KAGGLE_DB))
    query = "SELECT id, title, abstract, categories, authors FROM papers"
    params = []
    if args.id_prefix:
        query += " WHERE id GLOB ?"
        params.append(f"{args.id_prefix}*")
    query += " ORDER BY id"

    total_rows = kaggle_conn.execute(
        query.replace("SELECT id, title, abstract, categories, authors", "SELECT COUNT(*)"),
        params
    ).fetchone()[0]
    last_id = kaggle_conn.execute(
        query.replace("SELECT id, title, abstract, categories, authors", "SELECT id")
        .replace("ORDER BY id", "ORDER BY id DESC") + " LIMIT 1",
        params
    ).fetchone()
    last_id = last_id[0] if last_id else "?"
    log(f"Querying Kaggle DB: {total_rows:,} papers, last={last_id}")
    cursor = kaggle_conn.execute(query, params)

    for arxiv_id, title, abstract, categories, authors in cursor:
        if arxiv_id in tracked_ids:
            processed += 1
            continue

        # Skip papers with no category overlap with our feed
        paper_cats = set(categories.split())
        if not paper_cats & allowed_cats:
            skipped_cats += 1
            continue

        text = f"{title}. {abstract}" if abstract else title
        batch_texts.append(text)
        batch_keys.append(text_key(text))
        batch_meta.append((arxiv_id, title, categories, authors))

        if len(batch_texts) >= CHUNK_SIZE:
            flush_batch()
            processed += CHUNK_SIZE
            log(f"  {processed:,} processed, {skipped_cats:,} cat-skipped | "
                f"id={arxiv_id} | {cache_hits:,} cached, "
                f"{embedded:,} embedded, {len(candidates)} candidates")

    kaggle_conn.close()

    # Final flush
    flush_batch()
    processed += len(batch_texts)

    log(f"Done. {processed:,} processed, {skipped_cats:,} category-filtered, "
        f"{cache_hits:,} cache hits, {embedded:,} embedded, "
        f"{len(candidates)} candidates")

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
