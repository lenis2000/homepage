#!/usr/bin/env python3
"""
Import the Kaggle arXiv metadata JSON-lines file into SQLite for fast querying.

One-time import: ~5 min for ~3M papers, produces ~3-4GB database.
After import, scan_full_arxiv.py queries SQLite instead of streaming the 5GB JSON.

Usage:
    python3 _scripts/arxiv/import_kaggle_to_sqlite.py
"""

import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

_t0 = time.monotonic()


def log(msg):
    elapsed = time.monotonic() - _t0
    print(f"[{elapsed:6.1f}s] {msg}", flush=True)


SCRIPT_DIR = Path(__file__).resolve().parent

KAGGLE_FILE = Path(os.environ.get(
    "ARXIV_KAGGLE",
    Path.home() / "Data" / "arxiv" / "arxiv-metadata-oai-snapshot.json",
))

KAGGLE_DB = Path(os.environ.get(
    "ARXIV_KAGGLE_DB",
    Path.home() / "Data" / "arxiv" / "arxiv-metadata.db",
))


def main():
    if not KAGGLE_FILE.exists():
        log(f"Error: Kaggle JSON not found at {KAGGLE_FILE}")
        log("Set ARXIV_KAGGLE env var or run 'make arxiv-kaggle'")
        return 1

    log(f"Source: {KAGGLE_FILE}")
    log(f"Target: {KAGGLE_DB}")

    conn = sqlite3.connect(str(KAGGLE_DB))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            title TEXT,
            abstract TEXT,
            categories TEXT,
            authors TEXT
        )
    """)
    conn.commit()

    # Check if already populated
    existing = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
    if existing > 0:
        log(f"DB already has {existing:,} papers. Drop table first to re-import.")
        log("To re-import: rm " + str(KAGGLE_DB))
        conn.close()
        return 0

    log("Importing...")
    inserted = 0
    batch = []
    BATCH_SIZE = 10000

    with open(KAGGLE_FILE, encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue

            arxiv_id = rec.get("id", "")
            title = re.sub(r"\s+", " ", rec.get("title", "")).strip()
            abstract = re.sub(r"\s+", " ", rec.get("abstract", "")).strip()
            categories = rec.get("categories", "")
            authors = rec.get("authors", "")

            batch.append((arxiv_id, title, abstract, categories, authors))

            if len(batch) >= BATCH_SIZE:
                conn.executemany(
                    "INSERT OR IGNORE INTO papers VALUES (?, ?, ?, ?, ?)",
                    batch
                )
                conn.commit()
                inserted += len(batch)
                batch.clear()
                if inserted % 100000 == 0:
                    log(f"  {inserted:,} imported (id={arxiv_id})")

    # Final batch
    if batch:
        conn.executemany(
            "INSERT OR IGNORE INTO papers VALUES (?, ?, ?, ?, ?)",
            batch
        )
        conn.commit()
        inserted += len(batch)

    log(f"Imported {inserted:,} papers")

    # Create index
    log("Creating index on id...")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_id ON papers(id)")
    log("Creating index on categories...")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cats ON papers(categories)")
    conn.commit()

    total = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
    log(f"Done. {total:,} papers in {KAGGLE_DB}")
    log(f"DB size: {KAGGLE_DB.stat().st_size / 1e9:.1f} GB")

    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
