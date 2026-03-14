#!/usr/bin/env python3
"""
Scan BibTeX mothership for arXiv papers not in the int-prob feed,
compute embedding similarity, and output to scan-review.json for TUI review.

Usage:
    python3 _scripts/arxiv/scan_bib.py [--threshold 0.65] [--batch-size 8]
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

import numpy as np

# Reuse infrastructure from scan_full_arxiv
sys.path.insert(0, str(Path(__file__).resolve().parent))
from scan_full_arxiv import (
    EmbeddingCache, text_key, _clean_author, _arxiv_id_to_date_fallback,
    CACHE_DB, REVIEW_FILE, VECTORS_FILE, INDEX_FILE, MODEL_NAME,
)

_t0 = time.monotonic()
def log(msg):
    elapsed = time.monotonic() - _t0
    print(f"[{elapsed:6.1f}s] {msg}", flush=True)

BIB_FILE = Path.home() / "BiBTeX" / "bib.bib"
KAGGLE_DB = Path.home() / "Data" / "arxiv" / "arxiv-metadata.db"


def extract_bib_arxiv_ids(bib_path):
    """Extract all arXiv IDs from a .bib file."""
    with open(bib_path) as f:
        text = f.read()
    new_ids = set(re.findall(
        r'(?:arxiv[:\s]*|eprint\s*=\s*[{"]?)(\d{4}\.\d{4,5})', text, re.I
    ))
    old_ids = set(re.findall(
        r'(?:eprint\s*=\s*[{"]?|arxiv[:\s]*)([a-z-]+/\d{7})', text, re.I
    ))
    return new_ids | old_ids


def main():
    parser = argparse.ArgumentParser(description="Scan BibTeX for int-prob candidates")
    parser.add_argument("--threshold", type=float, default=0.65)
    parser.add_argument("--batch-size", type=int, default=8)
    args = parser.parse_args()

    # Load reference vectors
    if not VECTORS_FILE.exists():
        log(f"Error: {VECTORS_FILE} not found. Run 'make arxiv-related' first.")
        return 1

    ref_vectors = np.load(VECTORS_FILE)
    log(f"Reference vectors: {ref_vectors.shape}")

    # Get tracked IDs
    with open(INDEX_FILE) as f:
        tracked_ids = {e["id"] for e in json.load(f)}
    log(f"Tracked papers: {len(tracked_ids)}")

    # Extract bib IDs
    bib_ids = extract_bib_arxiv_ids(BIB_FILE)
    untracked = sorted(bib_ids - tracked_ids)
    log(f"BibTeX IDs: {len(bib_ids)} total, {len(untracked)} not in feed")

    if not untracked:
        log("Nothing to scan.")
        return 0

    # Look up metadata in Kaggle DB
    kaggle = sqlite3.connect(str(KAGGLE_DB))
    papers = []
    for aid in untracked:
        row = kaggle.execute(
            "SELECT id, title, abstract, categories, authors, date FROM papers WHERE id=?",
            (aid,)
        ).fetchone()
        if row:
            papers.append(row)
        else:
            log(f"  WARNING: {aid} not in Kaggle DB, skipping")
    kaggle.close()
    log(f"Found {len(papers)} papers in Kaggle DB")

    # Compute embeddings
    cache = EmbeddingCache(CACHE_DB)
    log(f"Cache: {cache.count()} entries")

    texts = [f"{title}. {abstract}" if abstract else title
             for _, title, abstract, *_ in papers]
    keys = [text_key(t) for t in texts]

    # Check cache
    cached = cache.get_many(keys)
    to_embed_idx = [i for i, k in enumerate(keys) if k not in cached]
    log(f"Cache hits: {len(keys) - len(to_embed_idx)}, need to embed: {len(to_embed_idx)}")

    if to_embed_idx:
        import torch
        # Use cached model without network requests if available
        hf_cache = Path.home() / ".cache" / "huggingface" / "hub" / "models--BAAI--bge-m3"
        if hf_cache.exists():
            os.environ.setdefault("HF_HUB_OFFLINE", "1")
        from sentence_transformers import SentenceTransformer
        device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
        log(f"Loading model on {device}...")
        model = SentenceTransformer(MODEL_NAME).to(device)

        embed_texts = [texts[i] for i in to_embed_idx]
        vecs = model.encode(
            embed_texts,
            batch_size=args.batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
        )
        new_items = []
        for idx, vec in zip(to_embed_idx, vecs):
            cached[keys[idx]] = vec
            new_items.append((keys[idx], vec))
        cache.put_many(new_items)
        log(f"Embedded {len(to_embed_idx)} papers")

    # Compute similarity
    vecs_array = np.array([cached[k] for k in keys], dtype=np.float32)
    sims = vecs_array @ ref_vectors.T
    max_sims = sims.max(axis=1)

    # Filter by threshold
    candidates = []
    for i, sim in enumerate(max_sims):
        if sim >= args.threshold:
            aid, title, abstract, categories, authors, date = papers[i]
            candidates.append({
                "sim": float(sim),
                "arxiv_id": aid,
                "title": title,
                "categories": categories.split(),
                "authors": [_clean_author(a) for a in authors.replace(" and ", ", ").split(", ") if a.strip()],
                "abstract": abstract or "",
                "date": date or _arxiv_id_to_date_fallback(aid),
            })

    candidates.sort(key=lambda x: -x["sim"])
    log(f"Candidates above {args.threshold}: {len(candidates)} / {len(papers)}")
    log(f"Below threshold: {len(papers) - len(candidates)}")

    # Merge into scan-review.json
    existing = []
    existing_ids = set()
    if REVIEW_FILE.exists():
        with open(REVIEW_FILE) as f:
            existing = json.load(f)
        existing_ids = {e["arxiv_id"] for e in existing}

    new_count = 0
    for c in candidates:
        if c["arxiv_id"] in existing_ids:
            continue
        existing.append({
            "arxiv_id": c["arxiv_id"],
            "title": c["title"],
            "authors": c["authors"],
            "categories": c["categories"],
            "abstract": c["abstract"],
            "date": c["date"],
            "matched_author": "",
            "is_ambiguous": False,
            "ai_decision": "ACCEPT",
            "ai_confidence": f"{c['sim']:.3f}",
            "ai_reason": f"BibTeX reference, cosine similarity {c['sim']:.3f}",
            "decision": "",
        })
        new_count += 1

    with open(REVIEW_FILE, "w") as f:
        json.dump(existing, f, indent=2)

    log(f"Added {new_count} new to scan-review.json ({len(existing)} total)")
    log(f"\nTop 20 candidates:")
    for c in candidates[:20]:
        log(f"  {c['sim']:.3f}  {c['arxiv_id']}  {c['title'][:80]}")

    below = [(float(max_sims[i]), papers[i][0], papers[i][1])
             for i in range(len(papers)) if max_sims[i] < args.threshold]
    below.sort(key=lambda x: -x[0])
    if below:
        log(f"\nTop 10 below threshold (for reference):")
        for sim, aid, title in below[:10]:
            log(f"  {sim:.3f}  {aid}  {title[:80]}")

    cache.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
