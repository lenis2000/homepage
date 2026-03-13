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
POSTS_DIR = REPO_ROOT / "_arxiv"
CACHE_DB = SCRIPT_DIR / ".embedding-cache-full.db"
REVIEW_FILE = SCRIPT_DIR / "scan-review.json"

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


def _clean_author(name):
    """Strip LaTeX accent commands from author names."""
    import re as _re
    name = name.strip()
    name = name.replace("\\'", "'").replace('\\"', '').replace("\\~", "")
    name = _re.sub(r"\\[vcuHkdb]\{(.)\}", r"\1", name)  # \v{c} -> c etc.
    name = name.replace("{", "").replace("}", "")
    name = name.replace("\\", "")
    return name


def _arxiv_id_to_date_fallback(aid):
    """Fallback: convert arXiv ID to approximate date (YYYY-MM-01)."""
    if "/" in aid:
        num = aid.split("/")[1]
        yy, mm = num[:2], num[2:4]
    else:
        yy, mm = aid[:2], aid[2:4]
    century = "19" if int(yy) > 50 else "20"
    return f"{century}{yy}-{mm}-01"


def load_tracked_ids():
    """Get arXiv IDs already in the feed."""
    with open(INDEX_FILE, encoding="utf-8") as f:
        return {e["id"] for e in json.load(f)}


def load_rejected_ids():
    """Get arXiv IDs previously rejected in review."""
    from fetch_arxiv import load_processed
    processed = load_processed()
    return {aid for aid, info in processed.items() if info.get("decision") == "REJECT"}


def load_rejected_vectors(rejected_ids, cache):
    """Build a matrix of embedding vectors for rejected papers from Kaggle DB + cache."""
    if not rejected_ids or not KAGGLE_DB.exists():
        return None
    kaggle_conn = sqlite3.connect(str(KAGGLE_DB))
    # Fetch title+abstract for rejected papers to compute cache keys
    vecs = []
    placeholders_batch = 500
    rejected_list = list(rejected_ids)
    for start in range(0, len(rejected_list), placeholders_batch):
        batch = rejected_list[start:start + placeholders_batch]
        ph = ",".join("?" * len(batch))
        rows = kaggle_conn.execute(
            f"SELECT id, title, abstract FROM papers WHERE id IN ({ph})", batch
        ).fetchall()
        keys = []
        for arxiv_id, title, abstract in rows:
            text = f"{title}. {abstract}" if abstract else title
            keys.append(text_key(text))
        cached = cache.get_many(keys)
        for k in keys:
            if k in cached:
                vecs.append(cached[k])
    kaggle_conn.close()
    if not vecs:
        return None
    return np.array(vecs, dtype=np.float32)


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


def import_accepted():
    """Create posts from accepted papers in scan-review.json."""
    sys.path.insert(0, str(SCRIPT_DIR))
    from fetch_arxiv import generate_post, load_processed, save_processed

    if not REVIEW_FILE.exists():
        log(f"No review file: {REVIEW_FILE}")
        return 1

    review = json.load(open(REVIEW_FILE, encoding="utf-8"))
    accepted = [r for r in review if r.get("decision") == "ACCEPT"]
    rejected = [r for r in review if r.get("decision") == "REJECT"]
    skipped = [r for r in review if r.get("decision") == "SKIP"]
    undecided = [r for r in review if not r.get("decision")]

    log(f"Review: {len(accepted)} accepted, {len(rejected)} rejected, "
        f"{len(skipped)} skipped, {len(undecided)} undecided")

    if not accepted:
        log("Nothing to import.")
        return 0

    processed = load_processed()
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    wrote = 0

    for r in accepted:
        aid = r["arxiv_id"]
        paper = {
            "arxiv_id": aid,
            "title": r["title"],
            "authors": r["authors"],
            "categories": r["categories"],
            "abstract": r.get("abstract", ""),
            "date": r["date"],
        }

        date_prefix = paper["date"].split("T")[0]
        safe_id = aid.replace("/", "-")
        filename = f"{date_prefix}-{safe_id}.md"
        filepath = POSTS_DIR / filename

        if not filepath.exists():
            filepath.write_text(generate_post(paper))
            log(f"  WROTE {filename}")
            wrote += 1

        if aid not in processed:
            processed[aid] = {
                "source": "scan",
                "decision": "ACCEPT",
                "date": date_prefix,
            }

    save_processed(processed)
    log(f"Created {wrote} new posts from {len(accepted)} accepted papers")
    log("Run 'make arxiv-rebuild' to update search index + related papers")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Scan full arXiv for missed int-prob papers")
    parser.add_argument("--threshold", type=float, default=0.65,
                        help="Cosine similarity threshold (default: 0.65)")
    parser.add_argument("--batch-size", type=int, default=8,
                        help="Embedding batch size (default: 8)")
    parser.add_argument("--id-prefix", type=str, default=None,
                        help="Only scan papers whose ID starts with this (e.g., '2601' for Jan 2026)")
    parser.add_argument("--reject-weight", type=float, default=0.1,
                        help="Weight for rejected-paper repulsion (default: 0.1). "
                             "Score = max_sim_accepted - weight * max_sim_rejected")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show candidates without writing to scan-review.json")
    parser.add_argument("--import-accepted", action="store_true",
                        help="Import accepted papers from scan-review.json as posts")
    args = parser.parse_args()

    if args.import_accepted:
        return import_accepted()

    if not VECTORS_FILE.exists():
        log(f"Error: {VECTORS_FILE} not found. Run 'make arxiv-related' first.")
        return 1
    if not KAGGLE_DB.exists():
        log(f"Error: Kaggle SQLite DB not found at {KAGGLE_DB}")
        log("Run 'make arxiv-kaggle' to download and import.")
        return 1

    tracked_ids = load_tracked_ids()
    log(f"Tracked papers: {len(tracked_ids)}")

    cache = EmbeddingCache(CACHE_DB)
    log(f"Cache DB: {CACHE_DB} ({cache.count()} entries)")

    rejected_ids = load_rejected_ids()
    log(f"Rejected papers: {len(rejected_ids)}")

    reject_vectors = load_rejected_vectors(rejected_ids, cache) if args.reject_weight > 0 else None
    if reject_vectors is not None:
        log(f"Reject vectors: {reject_vectors.shape[0]} (weight: {args.reject_weight})")
    else:
        log("Reject vectors: none (repulsion disabled)")

    allowed_cats = load_allowed_categories()
    log(f"Allowed categories: {len(allowed_cats)}")

    ref_vectors = load_reference_vectors()
    log(f"Reference vectors: {ref_vectors.shape}")

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
    batch_meta = []  # (arxiv_id, title, categories, authors, abstract)

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
        sims = vecs_array @ ref_vectors.T  # (batch, N_ref)
        max_sims = sims.max(axis=1)

        # Compute repulsion from rejected papers
        if reject_vectors is not None:
            reject_sims = vecs_array @ reject_vectors.T  # (batch, N_reject)
            max_reject_sims = reject_sims.max(axis=1)
        else:
            max_reject_sims = np.zeros(len(batch_keys), dtype=np.float32)

        for i, sim in enumerate(max_sims):
            if batch_meta[i][0] in tracked_ids:
                continue
            effective_sim = float(sim) - args.reject_weight * float(max_reject_sims[i])
            if effective_sim >= args.threshold:
                candidates.append((
                    effective_sim,
                    batch_meta[i][0],  # arxiv_id
                    batch_meta[i][1],  # title
                    batch_meta[i][2],  # categories
                    batch_meta[i][3],  # authors
                    batch_meta[i][4],  # abstract
                    batch_meta[i][5],  # date
                ))

        batch_texts.clear()
        batch_keys.clear()
        batch_meta.clear()

    # Query SQLite for papers to scan
    kaggle_conn = sqlite3.connect(str(KAGGLE_DB))
    query = "SELECT id, title, abstract, categories, authors, date FROM papers"
    params = []
    if args.id_prefix:
        query += " WHERE id GLOB ?"
        params.append(f"{args.id_prefix}*")
    query += " ORDER BY id"

    total_rows = kaggle_conn.execute(
        query.replace("SELECT id, title, abstract, categories, authors, date", "SELECT COUNT(*)"),
        params
    ).fetchone()[0]
    last_id = kaggle_conn.execute(
        query.replace("SELECT id, title, abstract, categories, authors, date", "SELECT id")
        .replace("ORDER BY id", "ORDER BY id DESC") + " LIMIT 1",
        params
    ).fetchone()
    last_id = last_id[0] if last_id else "?"
    log(f"Querying Kaggle DB: {total_rows:,} papers, last={last_id}")
    cursor = kaggle_conn.execute(query, params)

    for arxiv_id, title, abstract, categories, authors, paper_date in cursor:
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
        batch_meta.append((arxiv_id, title, categories, authors, abstract, paper_date))

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

    if args.dry_run:
        log(f"\nDry run — {len(candidates)} candidates (not written to review file)")
    else:
        # Append to review JSON for arxiv-review TUI (preserves previous decisions)
        existing = []
        existing_ids = set()
        if REVIEW_FILE.exists():
            with open(REVIEW_FILE, encoding="utf-8") as f:
                existing = json.load(f)
            existing_ids = {e["arxiv_id"] for e in existing}

        new_count = 0
        for sim, aid, title, cats, authors, abstract, date in candidates:
            if aid in existing_ids:
                continue
            author_list = [_clean_author(a) for a in authors.replace(" and ", ", ").split(", ") if a.strip()]
            existing.append({
                "arxiv_id": aid,
                "title": title,
                "authors": author_list,
                "categories": cats.split(),
                "abstract": abstract,
                "date": date or _arxiv_id_to_date_fallback(aid),
                "matched_author": "",
                "is_ambiguous": False,
                "ai_decision": "ACCEPT",
                "ai_confidence": f"{sim:.3f}",
                "ai_reason": f"Cosine similarity {sim:.3f} to known int-prob papers",
                "decision": "",
            })
            new_count += 1

        with open(REVIEW_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)

        log(f"Review file: {new_count} new + {len(existing_ids)} existing = {len(existing)} total")
        log(f"Review with: arxiv-review {REVIEW_FILE}")

    # Print top 20
    log(f"\nTop 20 candidates (threshold={args.threshold}):")
    for sim, aid, title, cats, authors, abstract, date in candidates[:20]:
        log(f"  {sim:.3f}  {aid}  {cats[:30]}  {title[:80]}")

    cache.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
