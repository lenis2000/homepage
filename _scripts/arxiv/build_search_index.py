#!/usr/bin/env python3
"""
Build a compact JSON search index from _posts/arxiv/ for fast client-side search.

Usage:
    python3 _scripts/arxiv/build_search_index.py

Output: assets/data/arxiv-index.json
"""

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
POSTS_DIR = REPO_ROOT / "_posts" / "arxiv"
OUTPUT_FILE = REPO_ROOT / "assets" / "data" / "arxiv-index.json"


def parse_post(filepath):
    """Extract metadata from a post's YAML front matter."""
    text = filepath.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None

    front = parts[1]
    fm = {}
    current_key = None
    current_list = None

    for line in front.strip().splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            if current_list is not None:
                val = stripped[2:].strip().strip('"')
                current_list.append(val)
            continue

        if ":" in stripped:
            key, val = stripped.split(":", 1)
            key = key.strip()
            val = val.strip().strip('"')

            if val == "":
                # Start of a list
                current_key = key
                current_list = []
                fm[key] = current_list
            else:
                current_key = None
                current_list = None
                fm[key] = val

    arxiv_id = fm.get("arxiv-id", "")
    if not arxiv_id:
        return None

    title = fm.get("title", "")
    authors = fm.get("authors", [])
    cats = fm.get("arxiv-categories", [])
    date = fm.get("date", "")
    date_short = date.split("T")[0] if "T" in date else date

    return {
        "id": arxiv_id,
        "t": title,
        "a": ", ".join(authors) if isinstance(authors, list) else str(authors),
        "c": " ".join(cats) if isinstance(cats, list) else str(cats),
        "y": date_short[:4],
        "d": date_short,
    }


def main():
    posts = sorted(POSTS_DIR.glob("*.md"), reverse=True)
    print(f"Scanning {len(posts)} posts...")

    index = []
    for filepath in posts:
        entry = parse_post(filepath)
        if entry:
            index.append(entry)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    size_kb = OUTPUT_FILE.stat().st_size / 1024
    print(f"Wrote {len(index)} entries to {OUTPUT_FILE} ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
