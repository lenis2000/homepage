#!/usr/bin/env python3
"""
Compute semantic similarity between arXiv papers using bge-m3 embeddings
and write related-papers into each post's YAML front matter.

Reads raw LaTeX abstracts from the Kaggle arXiv metadata snapshot
(same file used by fetch_arxiv.py and backfill_kaggle.py).

Usage:
    python3 _scripts/arxiv/build_arxiv_embeddings.py

Requires: sentence-transformers, numpy, torch
Install via: make arxiv-venv
"""

import hashlib
import json
import os
import re
import sqlite3
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
POSTS_DIR = REPO_ROOT / "_posts" / "arxiv"
CACHE_FILE = SCRIPT_DIR / ".embedding-cache.json"
VECTORS_FILE = REPO_ROOT / "assets" / "data" / "arxiv-vectors.npy"

KAGGLE_FILE = Path(os.environ.get(
    "ARXIV_KAGGLE",
    Path.home() / "Data" / "arxiv" / "arxiv-metadata-oai-snapshot.json",
))
KAGGLE_DB = Path(os.environ.get(
    "ARXIV_KAGGLE_DB",
    Path.home() / "Data" / "arxiv" / "arxiv-metadata.db",
))

TOP_K = 5
SIMILARITY_THRESHOLD = 0.69
MODEL_NAME = "BAAI/bge-m3"
BATCH_SIZE = 32


def load_post_ids():
    """Get the set of arXiv IDs we have posts for."""
    with open(INDEX_FILE, encoding="utf-8") as f:
        index = json.load(f)
    return {e["id"] for e in index}


def load_kaggle_abstracts(wanted_ids):
    """Load raw LaTeX title+abstract for wanted IDs from Kaggle SQLite DB (or JSON fallback)."""
    if KAGGLE_DB.exists():
        return _load_from_sqlite(wanted_ids)
    if KAGGLE_FILE.exists():
        return _load_from_json(wanted_ids)
    log(f"Error: Neither {KAGGLE_DB} nor {KAGGLE_FILE} found")
    return {}


def _load_from_sqlite(wanted_ids):
    log(f"Querying Kaggle SQLite: {KAGGLE_DB}")
    log(f"Looking for {len(wanted_ids)} papers...")
    conn = sqlite3.connect(str(KAGGLE_DB))
    entries = {}
    ids_list = list(wanted_ids)
    for i in range(0, len(ids_list), 500):
        batch = ids_list[i:i+500]
        placeholders = ",".join("?" * len(batch))
        rows = conn.execute(
            f"SELECT id, title, abstract FROM papers WHERE id IN ({placeholders})",
            batch
        ).fetchall()
        for rid, title, abstract in rows:
            entries[rid] = {"id": rid, "title": title, "abstract": abstract}
    conn.close()
    missed = len(wanted_ids) - len(entries)
    log(f"Found {len(entries)} papers in Kaggle DB ({missed} not found)")
    return entries


def _load_from_json(wanted_ids):
    log(f"Streaming Kaggle JSON: {KAGGLE_FILE}")
    log(f"Looking for {len(wanted_ids)} papers...")
    entries = {}
    with open(KAGGLE_FILE, encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            rid = rec.get("id", "")
            if rid not in wanted_ids:
                continue
            title = re.sub(r"\s+", " ", rec.get("title", "")).strip()
            abstract = re.sub(r"\s+", " ", rec.get("abstract", "")).strip()
            entries[rid] = {"id": rid, "title": title, "abstract": abstract}
            if len(entries) == len(wanted_ids):
                break
    missed = len(wanted_ids) - len(entries)
    log(f"Found {len(entries)} papers in Kaggle DB ({missed} not found)")
    return entries


def text_key(text):
    """SHA-256 hash of text for cache key."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_cache():
    """Load embedding cache from disk."""
    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cache(cache):
    """Save embedding cache to disk."""
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f)


def compute_embeddings(ids, texts, cache):
    """Embed texts using bge-m3, with caching."""
    keys = [text_key(t) for t in texts]
    uncached_indices = [i for i, k in enumerate(keys) if k not in cache]

    if uncached_indices:
        log(f"Embedding {len(uncached_indices)} new papers (of {len(texts)} total)...")
        from sentence_transformers import SentenceTransformer
        import torch

        device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
        log(f"Using device: {device}")

        model = SentenceTransformer(MODEL_NAME)
        model = model.to(device)

        uncached_texts = [texts[i] for i in uncached_indices]
        embeddings = model.encode(
            uncached_texts,
            batch_size=BATCH_SIZE,
            show_progress_bar=True,
            normalize_embeddings=True,
        )

        for idx, emb in zip(uncached_indices, embeddings):
            cache[keys[idx]] = emb.tolist()

        save_cache(cache)
        log("Cache updated.")
    else:
        log("All embeddings found in cache.")

    vectors = np.array([cache[k] for k in keys], dtype=np.float32)
    return vectors


def compute_related(vectors, ids):
    """Compute top-K related papers for each paper via cosine similarity."""
    log(f"Computing {len(ids)}x{len(ids)} similarity matrix...")
    sim = vectors @ vectors.T
    np.fill_diagonal(sim, 0.0)

    related = {}
    for i, arxiv_id in enumerate(ids):
        row = sim[i]
        top_indices = np.argsort(row)[::-1][:TOP_K]
        neighbors = []
        for j in top_indices:
            if row[j] >= SIMILARITY_THRESHOLD:
                neighbors.append(ids[j])
        related[arxiv_id] = neighbors

    return related, sim


def find_post_file(arxiv_id):
    """Find the post file for an arxiv ID."""
    # Old-style IDs use slash (hep-th/9301026) but filenames use hyphen
    filename_id = arxiv_id.replace("/", "-")
    matches = list(POSTS_DIR.glob(f"*-{filename_id}.md"))
    if matches:
        return matches[0]
    return None


def update_post_frontmatter(filepath, related_ids):
    """Update a post's YAML front matter with related-papers field.

    Returns True if the file was modified.
    """
    text = filepath.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return False

    front = parts[1]
    body = parts[2]

    # Remove any existing related-papers block
    front = re.sub(
        r'\nrelated-papers:.*?(?=\n[a-zA-Z_]|\Z)',
        '',
        front,
        flags=re.DOTALL,
    )

    # Build new related-papers block
    if related_ids:
        lines = "\nrelated-papers:"
        for rid in related_ids:
            lines += f'\n  - "{rid}"'
        front = front.rstrip() + lines + "\n"

    # Ensure front matter ends with a newline before closing ---
    if not front.endswith("\n"):
        front += "\n"

    new_text = "---" + front + "---" + body

    if new_text == text:
        return False

    filepath.write_text(new_text, encoding="utf-8")
    return True


def main():
    if not INDEX_FILE.exists():
        log(f"Error: {INDEX_FILE} not found. Run 'python3 _scripts/arxiv/build_search_index.py' first.")
        return 1

    if not KAGGLE_DB.exists() and not KAGGLE_FILE.exists():
        log(f"Error: Kaggle DB not found at {KAGGLE_DB} or {KAGGLE_FILE}")
        log("Run 'make arxiv-kaggle' to download and import")
        return 1

    # Get IDs of papers we have posts for
    post_ids = load_post_ids()
    log(f"Found {len(post_ids)} papers in index.")

    # Load raw LaTeX abstracts from Kaggle
    kaggle = load_kaggle_abstracts(post_ids)

    # Build ordered lists (only papers found in Kaggle)
    ids = []
    texts = []
    for arxiv_id in sorted(kaggle.keys()):
        entry = kaggle[arxiv_id]
        title = entry["title"]
        abstract = entry["abstract"]
        text = f"{title}. {abstract}" if abstract else title
        ids.append(arxiv_id)
        texts.append(text)

    log(f"Embedding {len(ids)} papers with raw LaTeX abstracts...")

    cache = load_cache()
    vectors = compute_embeddings(ids, texts, cache)

    # Save vectors for potential incremental use
    np.save(VECTORS_FILE, vectors)
    log(f"Saved vectors to {VECTORS_FILE}")

    related, sim = compute_related(vectors, ids)

    # Write into post front matter
    modified = 0
    skipped = 0
    missing = 0

    for arxiv_id in ids:
        filepath = find_post_file(arxiv_id)
        if not filepath:
            missing += 1
            continue

        related_ids = related.get(arxiv_id, [])
        if update_post_frontmatter(filepath, related_ids):
            modified += 1
        else:
            skipped += 1

    # Also clear related-papers from posts not found in Kaggle
    not_in_kaggle = post_ids - set(ids)
    cleared = 0
    for arxiv_id in not_in_kaggle:
        filepath = find_post_file(arxiv_id)
        if filepath and update_post_frontmatter(filepath, []):
            cleared += 1

    log(f"\nResults: {modified} modified, {skipped} unchanged, {missing} posts not found")
    if not_in_kaggle:
        log(f"  {len(not_in_kaggle)} posts not in Kaggle DB ({cleared} had related-papers cleared)")

    # Print stats
    counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for arxiv_id, neighbors in related.items():
        n = min(len(neighbors), 5)
        counts[n] = counts.get(n, 0) + 1

    log("Related paper distribution:")
    for k in range(6):
        log(f"  {k} related: {counts.get(k, 0)}")
    log(f"  Total: {sum(counts.values())}")

    # Print similarity score histogram for top-5 neighbors
    all_scores = []
    for i in range(len(ids)):
        row = sim[i]
        top5 = np.sort(row)[::-1][:TOP_K]
        all_scores.extend(top5.tolist())
    all_scores = np.array(all_scores)
    log("Top-5 neighbor similarity score percentiles:")
    for p in [5, 10, 25, 50, 75, 90, 95]:
        log(f"  p{p}: {np.percentile(all_scores, p):.3f}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
