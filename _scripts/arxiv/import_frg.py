#!/usr/bin/env python3
"""
One-time import: migrate 460 FRG website posts into _arxiv/.

Reads posts from the FRG website directory, parses them, and generates
new-format posts for the homepage arXiv feed.

Usage:
    python3 _scripts/arxiv/import_frg.py
    python3 _scripts/arxiv/import_frg.py --dry-run
"""

import os
import re
import json
import argparse
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
FRG_DIR = Path.home() / "__FORMER_DPBX" / "Sci" / "FRG-website" / "_posts" / "arXiv_2017"
OUTPUT_DIR = REPO_ROOT / "_arxiv"
PROCESSED_FILE = SCRIPT_DIR / "processed.json"


def parse_frg_post(filepath):
    """Parse a FRG post file and return structured data."""
    text = filepath.read_text(encoding="utf-8")

    # Split front matter and body
    parts = text.split("---", 2)
    if len(parts) < 3:
        print(f"  WARN: no front matter in {filepath.name}")
        return None

    front = parts[1]
    body = parts[2].strip()

    # Parse front matter fields
    fm = {}
    for line in front.strip().splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            fm[key.strip()] = val.strip()

    # Extract arXiv ID and category from title field: "2509.03246 [math.PR]"
    title_field = fm.get("title", "")
    m = re.match(r"([\d.]+)\s*\[([^\]]+)\]", title_field)
    if not m:
        print(f"  WARN: can't parse title '{title_field}' in {filepath.name}")
        return None

    arxiv_id = m.group(1)
    category = m.group(2)

    # Get date
    date = fm.get("date", "")

    # Detect NSF_FRG tag
    tags_str = fm.get("tags", "")
    nsf_frg = "NSF_FRG" in tags_str

    # Parse body: extract authors from <b> tags and title from <i> tag
    author_matches = re.findall(r"<b>([^<]+)</b>", body)
    title_match = re.search(r"<i>([^<]+)</i>", body)
    paper_title = title_match.group(1).strip() if title_match else ""

    # Clean up multi-line whitespace in title
    paper_title = re.sub(r"\s+", " ", paper_title)

    return {
        "arxiv_id": arxiv_id,
        "category": category,
        "date": date,
        "nsf_frg": nsf_frg,
        "authors": author_matches,
        "paper_title": paper_title,
        "original_body": body,
    }


def generate_post(data):
    """Generate a new-format Jekyll post from parsed data."""
    # Build authors YAML list
    authors_yaml = "\n".join(
        f'  - "{a}"' for a in data["authors"]
    )

    # Build body line: Author1, Author2, "Title" (arXiv link)
    author_str = ", ".join(data["authors"])
    arxiv_url = f"https://arxiv.org/abs/{data['arxiv_id']}"

    # Strip LaTeX delimiters from title (plain text for feed listing)
    clean_title = data["paper_title"].replace("$$", "").replace("$", "")
    # Escape for YAML double-quoted string: backslashes then quotes
    yaml_title = clean_title.replace("\\", "\\\\").replace('"', '\\"')

    post = f"""---
layout: post
title: "{yaml_title}"
arxiv-id: "{data['arxiv_id']}"
date: {data['date']}
categories: arxiv-feed
arxiv-categories:
  - "{data['category']}"
authors:
{authors_yaml}
nsf-frg: {str(data['nsf_frg']).lower()}
source: import
published: true
---
{author_str}, "*{data['paper_title']}*" ([arXiv]({arxiv_url}))
"""
    return post


def main():
    parser = argparse.ArgumentParser(description="Import FRG posts")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without writing files")
    parser.add_argument("--frg-dir", type=str, default=str(FRG_DIR),
                        help="Path to FRG posts directory")
    args = parser.parse_args()

    frg_dir = Path(args.frg_dir)
    if not frg_dir.exists():
        print(f"ERROR: FRG directory not found: {frg_dir}")
        return 1

    # Ensure output directory exists
    if not args.dry_run:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load existing processed IDs
    if PROCESSED_FILE.exists():
        processed = json.loads(PROCESSED_FILE.read_text())
    else:
        processed = {}

    # Gather FRG post files
    posts = sorted(frg_dir.glob("*.md"))
    print(f"Found {len(posts)} FRG posts in {frg_dir}")

    imported = 0
    skipped = 0
    errors = 0

    for filepath in posts:
        data = parse_frg_post(filepath)
        if data is None:
            errors += 1
            continue

        arxiv_id = data["arxiv_id"]

        if arxiv_id in processed:
            skipped += 1
            continue

        # Generate output filename: YYYY-MM-DD-ARXIV_ID.md
        date_prefix = data["date"].split("T")[0] if "T" in data["date"] else data["date"]
        out_name = f"{date_prefix}-{arxiv_id}.md"
        out_path = OUTPUT_DIR / out_name

        post_content = generate_post(data)

        if args.dry_run:
            print(f"  [DRY] {out_name} — {data['paper_title'][:60]}...")
        else:
            out_path.write_text(post_content, encoding="utf-8")

        # Track as processed
        processed[arxiv_id] = {
            "source": "frg-import",
            "decision": "ACCEPT",
            "date": date_prefix,
        }
        imported += 1

    # Save processed IDs
    if not args.dry_run:
        PROCESSED_FILE.write_text(
            json.dumps(processed, indent=2, sort_keys=True),
            encoding="utf-8",
        )

    print(f"\nDone: {imported} imported, {skipped} skipped, {errors} errors")
    return 0


if __name__ == "__main__":
    exit(main())
