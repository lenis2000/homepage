#!/usr/bin/env python3
"""
Delete an arXiv paper from the feed by ID.

Accepts various ID formats:
  - 2603.00317
  - arXiv:2603.00317 [cond-mat.stat-mech]
  - https://arxiv.org/abs/2603.00317
  - https://arxiv.org/pdf/2603.00317
  - https://arxiv.org/html/2603.00317v2

Cleans up:
  1. Post file in _posts/arxiv/
  2. Entry in processed.json
  3. Search index (assets/data/arxiv-index.json)
  4. Related-paper references in other posts' front matter
  5. Embedding vectors (assets/data/arxiv-vectors.npy)
"""

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
POSTS_DIR = REPO_ROOT / "_posts" / "arxiv"
PROCESSED_FILE = SCRIPT_DIR / "processed.json"
INDEX_FILE = REPO_ROOT / "assets" / "data" / "arxiv-index.json"
VECTORS_FILE = REPO_ROOT / "assets" / "data" / "arxiv-vectors.npy"


def parse_arxiv_id(raw):
    """Extract bare arXiv ID from various input formats."""
    s = raw.strip()
    # Strip URL prefix
    s = re.sub(r'.*arxiv\.org/(abs|pdf|html)/', '', s)
    # Strip arXiv: prefix
    s = re.sub(r'^arXiv:', '', s, flags=re.IGNORECASE)
    # Strip category tag like [cond-mat.stat-mech]
    s = re.sub(r'\s*\[.*', '', s)
    # Strip version suffix like v2
    s = re.sub(r'v\d+$', '', s)
    return s.strip()


def find_post(arxiv_id):
    """Find the post file for an arXiv ID."""
    filename_id = arxiv_id.replace("/", "-")
    matches = list(POSTS_DIR.glob(f"*-{filename_id}.md"))
    return matches[0] if matches else None


def remove_from_processed(arxiv_id):
    """Remove entry from processed.json."""
    if not PROCESSED_FILE.exists():
        return False
    data = json.loads(PROCESSED_FILE.read_text())
    if arxiv_id in data:
        del data[arxiv_id]
        PROCESSED_FILE.write_text(json.dumps(data, indent=2, sort_keys=True))
        return True
    return False


def remove_from_index(arxiv_id):
    """Remove entry from search index JSON."""
    if not INDEX_FILE.exists():
        return False
    index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    new_index = [e for e in index if e.get("id") != arxiv_id]
    if len(new_index) == len(index):
        return False
    INDEX_FILE.write_text(
        json.dumps(new_index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return True


def remove_related_references(arxiv_id):
    """Remove this ID from related-papers lists in other posts."""
    count = 0
    for post in POSTS_DIR.glob("*.md"):
        text = post.read_text(encoding="utf-8")
        # Match the related-papers list entry for this ID
        pattern = rf'\n\s*- "{re.escape(arxiv_id)}"'
        if re.search(pattern, text):
            new_text = re.sub(pattern, '', text)
            # Clean up empty related-papers block
            new_text = re.sub(r'\nrelated-papers:\s*\n(?=\S|\Z)', '\n', new_text)
            if new_text != text:
                post.write_text(new_text, encoding="utf-8")
                count += 1
    return count


def remove_from_vectors(arxiv_id):
    """Remove paper from vectors .npy file (keep in sync with index)."""
    if not VECTORS_FILE.exists() or not INDEX_FILE.exists():
        return False
    # The vectors file rows correspond to the old index order.
    # Since we already updated the index, just delete the vectors file
    # so it gets regenerated on next `make arxiv-related`.
    VECTORS_FILE.unlink()
    return True


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <arxiv-id-or-url>")
        sys.exit(1)

    raw = " ".join(sys.argv[1:])
    arxiv_id = parse_arxiv_id(raw)
    print(f"Deleting arXiv paper: {arxiv_id}")

    # 1. Remove post file
    post = find_post(arxiv_id)
    if post:
        post.unlink()
        print(f"  Removed {post.relative_to(REPO_ROOT)}")
    else:
        print(f"  No post found for {arxiv_id}")
        sys.exit(1)

    # 2. Remove from processed.json
    if remove_from_processed(arxiv_id):
        print(f"  Removed from processed.json")

    # 3. Remove from search index
    if remove_from_index(arxiv_id):
        print(f"  Removed from arxiv-index.json")

    # 4. Remove related-paper references from other posts
    n = remove_related_references(arxiv_id)
    if n:
        print(f"  Removed from related-papers in {n} other posts")

    # 5. Invalidate vectors (out of sync now)
    if remove_from_vectors(arxiv_id):
        print(f"  Removed stale arxiv-vectors.npy (run 'make arxiv-related' to rebuild)")

    print("Done.")


if __name__ == "__main__":
    main()
