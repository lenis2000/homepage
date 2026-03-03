#!/usr/bin/env python3
"""
Re-render all arxiv post abstracts from Kaggle source data.

Streams the Kaggle dataset, looks up each post's arxiv_id,
re-renders the abstract through KaTeX with current macros,
and rewrites the post body.

Usage:
    python3 _scripts/arxiv/rerender_abstracts.py ~/Downloads/arxiv-metadata-oai-snapshot.json
    python3 _scripts/arxiv/rerender_abstracts.py data.json --dry-run
"""

import json
import re
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_arxiv import _fix_unicode_greek_in_math, _render_math, OUTPUT_DIR


def collect_post_ids():
    """Read all arxiv posts, return dict of {arxiv_id: filepath}."""
    posts = {}
    for f in OUTPUT_DIR.glob("*.md"):
        text = f.read_text()
        m = re.search(r'^arxiv-id:\s*"?([^"\n]+)"?', text, re.MULTILINE)
        if m:
            posts[m.group(1).strip()] = f
    return posts


def stream_abstracts(kaggle_path, needed_ids):
    """Stream Kaggle JSON, return {arxiv_id: abstract} for needed IDs."""
    abstracts = {}
    remaining = set(needed_ids)
    line_count = 0

    with open(kaggle_path, "r", encoding="utf-8") as f:
        for line in f:
            line_count += 1
            if line_count % 200000 == 0:
                print(f"  ... {line_count:,} lines, found {len(abstracts)}/{len(needed_ids)} abstracts")
            if not remaining:
                break

            line = line.strip()
            if not line:
                continue

            # Quick check before JSON parse
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            aid = record.get("id", "")
            if aid not in remaining:
                continue

            abstract = re.sub(r"\s+", " ", record.get("abstract", "").replace("\n", " ")).strip()
            abstracts[aid] = abstract
            remaining.discard(aid)

    print(f"  Scan complete: {line_count:,} lines, found {len(abstracts)}/{len(needed_ids)} abstracts")
    if remaining:
        print(f"  Missing {len(remaining)} IDs (pre-Kaggle era or different ID format)")
    return abstracts


def rerender_post(filepath, abstract, force=False):
    """Re-render a post's abstract and write back. Returns (changed, warnings_count)."""
    text = filepath.read_text()

    # Find the body (everything after second ---)
    parts = text.split("---", 2)
    if len(parts) < 3:
        return False, 0

    front_matter = parts[1]

    # Render abstract
    fixed = _fix_unicode_greek_in_math(abstract)
    rendered = _render_math(fixed)

    new_body = f'\n{{% raw %}}<p>{rendered}</p>{{% endraw %}}\n'
    new_text = f'---{front_matter}---{new_body}'

    if force or new_text != text:
        filepath.write_text(new_text)
        return True, 0
    return False, 0


def main():
    parser = argparse.ArgumentParser(description="Re-render arxiv post abstracts from Kaggle data")
    parser.add_argument("kaggle_file", type=str, help="Path to arxiv-metadata-oai-snapshot.json")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    parser.add_argument("--force", action="store_true", help="Rewrite all posts even if unchanged")
    args = parser.parse_args()

    kaggle_path = Path(args.kaggle_file)
    if not kaggle_path.exists():
        print(f"ERROR: {kaggle_path} not found")
        return 1

    print("Collecting arxiv post IDs...")
    posts = collect_post_ids()
    print(f"  {len(posts)} posts found")

    print(f"Streaming Kaggle dataset for abstracts...")
    abstracts = stream_abstracts(kaggle_path, set(posts.keys()))

    print(f"Re-rendering abstracts...")
    updated = 0
    skipped = 0
    for aid, filepath in sorted(posts.items()):
        if aid not in abstracts:
            skipped += 1
            continue
        if args.dry_run:
            # Just check if it would change
            abstract = abstracts[aid]
            fixed = _fix_unicode_greek_in_math(abstract)
            rendered = _render_math(fixed)
            text = filepath.read_text()
            if f'<p>{rendered}</p>' not in text:
                print(f"  WOULD UPDATE {filepath.name}")
                updated += 1
        else:
            changed, _ = rerender_post(filepath, abstracts[aid], force=args.force)
            if changed:
                updated += 1

    print(f"\nDone. {updated} posts {'would be ' if args.dry_run else ''}updated, "
          f"{skipped} skipped (not in Kaggle)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
