#!/usr/bin/env python3
"""
Backfill arXiv papers from the Kaggle arXiv metadata dataset.

The Kaggle dataset (arxiv-metadata-oai-snapshot.json, ~5GB JSON-lines)
contains all 1.7M+ arXiv papers. Streaming it is faster and more reliable
than the arXiv API (no rate limits, no 503 errors).

Download: kaggle datasets download -d Cornell-University/arxiv

Usage:
    python3 _scripts/arxiv/backfill_kaggle.py arxiv-metadata-oai-snapshot.json --review
    python3 _scripts/arxiv/backfill_kaggle.py data.json --after 1993-01-01 --before 2000-01-01 --review
    python3 _scripts/arxiv/backfill_kaggle.py data.json --dry-run --before 1995-01-01
    python3 _scripts/arxiv/backfill_kaggle.py data.json --no-ai --authors "Alexei Borodin"
"""

import json
import os
import re
import subprocess
import sys
import argparse
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

# Import shared functions from fetch_arxiv.py
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_arxiv import (
    load_config,
    load_processed,
    save_processed,
    match_authors,
    ai_filter,
    generate_post,
    export_for_review,
    import_review,
    OUTPUT_DIR,
    REVIEW_FILE,
    REVIEW_TOOL,
)


def parse_kaggle_date(versions):
    """Parse date from Kaggle versions list.

    versions[0].created is like "Mon, 2 Apr 2007 19:18:42 GMT"
    Returns ISO date string (YYYY-MM-DD) or None.
    """
    if not versions:
        return None
    created = versions[0].get("created", "")
    if not created:
        return None
    try:
        dt = parsedate_to_datetime(created)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


def parse_kaggle_authors(authors_parsed):
    """Convert Kaggle authors_parsed to list of "FirstName LastName" strings.

    Kaggle format: [["LastName", "FirstName", ""], ...]
    Some entries have middle names or suffixes in the third field.
    """
    result = []
    for entry in authors_parsed:
        if not entry or len(entry) < 2:
            continue
        last = entry[0].strip()
        first = entry[1].strip()
        if first and last:
            result.append(f"{first} {last}")
        elif last:
            result.append(last)
    return result


def stream_kaggle(filepath, categories_set, processed, config,
                  after_date=None, before_date=None, author_filter_names=None):
    """Stream the Kaggle JSON-lines file and yield matching papers.

    Applies filters in order of cost:
    1. Category filter (cheapest — string check)
    2. Date range filter
    3. processed.json check (skip already-seen)
    4. Author name matching (most expensive deterministic check)
    """
    line_count = 0
    category_hits = 0
    matched_count = 0

    # Also include backfill categories
    all_categories = set(categories_set)
    backfill_cats = config.get("backfill_categories", [])
    for cat in backfill_cats:
        all_categories.add(cat)

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line_count += 1
            if line_count % 100000 == 0:
                print(f"  ... {line_count:,} lines scanned, "
                      f"{category_hits:,} category hits, "
                      f"{matched_count} author matches")

            line = line.strip()
            if not line:
                continue

            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue

            # 1. Category filter
            record_cats_str = record.get("categories", "")
            record_cats = record_cats_str.split()
            if not any(c in all_categories for c in record_cats):
                continue
            category_hits += 1

            # 2. Parse date and apply date range filter
            date_str = parse_kaggle_date(record.get("versions", []))
            if not date_str:
                continue
            if after_date and date_str < after_date:
                continue
            if before_date and date_str > before_date:
                continue

            # 3. Skip if already processed
            arxiv_id = record.get("id", "")
            if not arxiv_id:
                continue
            if arxiv_id in processed:
                continue

            # 4. Parse authors and run name matching
            authors = parse_kaggle_authors(record.get("authors_parsed", []))
            if not authors:
                continue

            title = re.sub(r"\s+", " ", record.get("title", "").replace("\n", " ")).strip()
            abstract = re.sub(r"\s+", " ", record.get("abstract", "").replace("\n", " ")).strip()

            paper = {
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors,
                "date": date_str,
                "categories": record_cats,
                "primary_category": record_cats[0] if record_cats else "",
                "abstract": abstract,
            }

            matched, is_ambiguous = match_authors(paper, config)
            if not matched:
                continue

            # Author name filter (if --authors specified)
            if author_filter_names:
                if matched["name"].lower() not in author_filter_names:
                    continue

            paper["matched_author"] = matched
            paper["is_ambiguous"] = is_ambiguous
            matched_count += 1
            yield paper

    print(f"  Scan complete: {line_count:,} lines, "
          f"{category_hits:,} in tracked categories, "
          f"{matched_count} author matches")


def main():
    parser = argparse.ArgumentParser(
        description="Backfill arXiv papers from Kaggle metadata dataset")
    parser.add_argument("kaggle_file", type=str,
                        help="Path to arxiv-metadata-oai-snapshot.json")
    parser.add_argument("--after", type=str, default="",
                        help="Only include papers after this date (YYYY-MM-DD)")
    parser.add_argument("--before", type=str, default="",
                        help="Only include papers before this date (YYYY-MM-DD)")
    parser.add_argument("--review", action="store_true",
                        help="Interactive review mode with TUI")
    parser.add_argument("--no-ai", action="store_true",
                        help="Skip AI filtering, accept all matches")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview only, don't write files")
    parser.add_argument("--authors", type=str, default="",
                        help="Comma-separated author names to filter to")
    args = parser.parse_args()

    kaggle_path = Path(args.kaggle_file)
    if not kaggle_path.exists():
        print(f"ERROR: File not found: {kaggle_path}")
        return 1

    config = load_config()
    processed = load_processed()
    categories_set = set(config.get("categories", ["math.PR"]))

    after_date = args.after or None
    before_date = args.before or None

    # Author filter
    author_filter_names = None
    if args.authors:
        author_filter_names = {a.strip().lower() for a in args.authors.split(",")}
        # Validate author names exist in config
        known = {a["name"].lower() for a in config["authors"]}
        unknown = author_filter_names - known
        if unknown:
            print(f"WARNING: Unknown authors (not in authors.yml): {', '.join(unknown)}")
        matching = author_filter_names & known
        if not matching:
            print(f"ERROR: No matching authors found")
            print(f"Available: {', '.join(a['name'] for a in config['authors'][:10])}...")
            return 1
        print(f"Filtering to authors: {', '.join(sorted(matching))}")

    date_desc = "all dates"
    if after_date or before_date:
        parts = []
        if after_date:
            parts.append(f"after {after_date}")
        if before_date:
            parts.append(f"before {before_date}")
        date_desc = " and ".join(parts)

    print(f"Kaggle backfill: {kaggle_path.name}")
    print(f"Date range: {date_desc}")
    print(f"Categories: {', '.join(sorted(categories_set))}")
    print(f"Processed entries: {len(processed):,}")
    print()

    # Stream and collect candidates
    print("Scanning Kaggle dataset...")
    candidates = list(stream_kaggle(
        kaggle_path, categories_set, processed, config,
        after_date=after_date, before_date=before_date,
        author_filter_names=author_filter_names,
    ))

    if not candidates:
        print("\nNo new matching papers found.")
        return 0

    clear = [p for p in candidates if not p.get("is_ambiguous")]
    ambiguous = [p for p in candidates if p.get("is_ambiguous")]
    print(f"\n  {len(candidates)} candidates: {len(clear)} clear, {len(ambiguous)} ambiguous")

    # AI filtering
    ai_decisions = {}
    if not args.no_ai and candidates:
        print(f"  Sending {len(candidates)} papers to AI for review...")
        ai_decisions = ai_filter(candidates, config)

    # Output mode
    if args.review:
        export_for_review(candidates, ai_decisions, processed)

        ai_accept = sum(1 for v in ai_decisions.values()
                        if (v.get("decision") if isinstance(v, dict) else v) == "ACCEPT")
        ai_reject = sum(1 for v in ai_decisions.values()
                        if (v.get("decision") if isinstance(v, dict) else v) in ("REJECT_PERSON", "REJECT_TOPIC"))
        print(f"\n  === Review summary ===")
        print(f"  {len(candidates)} papers matched tracked authors")
        if ai_decisions:
            print(f"  AI pre-filter: {ai_accept} suggested ACCEPT, {ai_reject} suggested REJECT")
        print(f"  Papers sorted newest-first")
        print(f"  Keys: a=accept  r=reject  s=skip  u=undo  n/p=nav  q=quit (resumable)")
        print()

        # Launch TUI
        if not REVIEW_TOOL.exists():
            print(f"  arxiv-review not found at {REVIEW_TOOL}")
            print(f"  Run: make arxiv-install")
            return 1

        result = subprocess.run([str(REVIEW_TOOL), str(REVIEW_FILE)])
        if result.returncode != 0:
            print("  Review cancelled.")
            return 1

        # Import decisions — build paper lookup from candidates
        all_papers = {p["arxiv_id"]: p for p in candidates}
        import_review(all_papers, config, processed)

    elif args.dry_run:
        for p in candidates:
            ai = ai_decisions.get(p["arxiv_id"], {})
            decision = ai.get("decision", "ACCEPT") if isinstance(ai, dict) else ai
            marker = "+" if decision == "ACCEPT" else "-"
            matched_name = p.get("matched_author", {}).get("name", "?")
            print(f"  [{marker}] {p['arxiv_id']} ({p['date']}) — "
                  f"{matched_name} — {p['title'][:60]}")

    else:
        # Auto mode: accept based on AI decisions
        to_accept = []
        for p in candidates:
            ai = ai_decisions.get(p["arxiv_id"], {})
            decision = ai.get("decision", "ACCEPT") if isinstance(ai, dict) else ai
            if decision == "ACCEPT":
                to_accept.append(p)
            else:
                print(f"    REJECTED: {p['arxiv_id']} — {p['title'][:60]}")

        print(f"  {len(to_accept)} papers accepted")

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        wrote = 0
        for paper in to_accept:
            date_prefix = paper["date"].split("T")[0]
            safe_id = paper["arxiv_id"].replace("/", "-")
            filename = f"{date_prefix}-{safe_id}.md"
            filepath = OUTPUT_DIR / filename
            if not filepath.exists():
                filepath.write_text(generate_post(paper))
                wrote += 1

        print(f"  Wrote {wrote} new posts")

        # Update processed
        for p in candidates:
            aid = p["arxiv_id"]
            if aid not in processed:
                date_prefix = p["date"].split("T")[0]
                accepted = any(a["arxiv_id"] == aid for a in to_accept)
                processed[aid] = {
                    "source": "kaggle",
                    "decision": "ACCEPT" if accepted else "REJECT",
                    "date": date_prefix,
                }
        save_processed(processed)

    print(f"\nDone. {len(candidates)} candidates from Kaggle scan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
