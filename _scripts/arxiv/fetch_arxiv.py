#!/usr/bin/env python3
"""
arXiv feed pipeline: fetch → match → AI filter → generate posts.

Usage:
    python3 _scripts/arxiv/fetch_arxiv.py              # last 7 days
    python3 _scripts/arxiv/fetch_arxiv.py --days 30     # last 30 days
    python3 _scripts/arxiv/fetch_arxiv.py --dry-run     # preview only
    python3 _scripts/arxiv/fetch_arxiv.py --no-ai       # skip AI, accept all matches
"""

import json
import os
import re
import subprocess
import sys
import time
import argparse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

try:
    import feedparser
except ImportError:
    print("ERROR: feedparser not installed. Run: pip3 install feedparser")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
OUTPUT_DIR = REPO_ROOT / "_posts" / "arxiv"
PROCESSED_FILE = SCRIPT_DIR / "processed.json"
AUTHORS_FILE = SCRIPT_DIR / "authors.yml"
PROMPT_FILE = SCRIPT_DIR / "ai_prompt.txt"
AI_LOG_FILE = SCRIPT_DIR / "ai_log.jsonl"

ARXIV_API = "https://export.arxiv.org/api/query"
RATE_LIMIT_SECONDS = 3


def load_config():
    with open(AUTHORS_FILE) as f:
        return yaml.safe_load(f)


def load_processed():
    if PROCESSED_FILE.exists():
        return json.loads(PROCESSED_FILE.read_text())
    return {}


def save_processed(processed):
    PROCESSED_FILE.write_text(json.dumps(processed, indent=2, sort_keys=True))


def fetch_category(category, days):
    """Fetch recent papers from a single arXiv category."""
    # Build author search query from config
    config = load_config()
    author_terms = []
    for author in config["authors"]:
        for name in author["arxiv_names"]:
            author_terms.append(f"au:{name}")

    author_query = "+OR+".join(author_terms)
    cat_query = f"cat:{category}"
    search_query = f"({author_query})+AND+{cat_query}"

    params = (
        f"search_query={search_query}"
        f"&start=0&max_results=200"
        f"&sortBy=submittedDate&sortOrder=descending"
    )

    url = f"{ARXIV_API}?{params}"
    response = urllib.request.urlopen(url).read()
    feed = feedparser.parse(response)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    papers = []

    for entry in feed.entries:
        # Parse date
        published = entry.get("published", "")
        if not published:
            continue

        try:
            pub_date = datetime.strptime(published[:19], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            continue

        if pub_date < cutoff:
            continue

        arxiv_id = entry.id.split("/abs/")[-1].split("v")[0]
        authors = [a.name for a in entry.authors]
        title = re.sub(r"\s+", " ", entry.title.replace("\n", " ")).strip()
        categories = [t["term"] for t in entry.tags]
        primary_cat = categories[0] if categories else category

        abstract = re.sub(r"\s+", " ", entry.get("summary", "").strip())

        papers.append({
            "arxiv_id": arxiv_id,
            "title": title,
            "authors": authors,
            "date": published,
            "primary_category": primary_cat,
            "categories": categories,
            "abstract": abstract,
        })

    return papers


def match_authors(paper, config):
    """Check if any paper author matches our tracked authors.
    Returns (matched_author_config, is_ambiguous) or (None, False)."""
    paper_authors = paper["authors"]

    for tracked in config["authors"]:
        for arxiv_name in tracked["arxiv_names"]:
            # Parse arxiv_name format: Surname_Initial
            parts = arxiv_name.split("_")
            if len(parts) != 2:
                continue
            surname = parts[0]
            initial = parts[1]

            for pa in paper_authors:
                # Check if paper author matches: surname match + first initial
                name_parts = pa.strip().split()
                if not name_parts:
                    continue
                pa_surname = name_parts[-1]
                pa_initial = name_parts[0][0] if name_parts[0] else ""

                if (pa_surname.lower() == surname.lower() and
                        pa_initial.upper() == initial.upper()):
                    is_ambiguous = tracked.get("high_ambiguity", False)
                    return tracked, is_ambiguous

    return None, False


def ai_filter(papers_to_review, config):
    """Send papers to Claude for filtering via 'claude' CLI."""
    if not papers_to_review:
        return {}

    # Build prompt
    prompt_template = PROMPT_FILE.read_text()

    # Format papers for review
    paper_descs = []
    for p in papers_to_review:
        matched = p.get("matched_author", {})
        ambiguity = "HIGH_AMBIGUITY" if p.get("is_ambiguous") else ""
        disambiguation = matched.get("disambiguation", "")
        topics = ", ".join(matched.get("topics", []))

        desc = (
            f"arXiv:{p['arxiv_id']} | {', '.join(p['authors'])} | "
            f"\"{p['title']}\" | categories: {', '.join(p['categories'])} | "
            f"Matched author: {matched.get('name', '?')} ({matched.get('affiliation', '?')}) "
            f"[{topics}] {ambiguity}"
        )
        if disambiguation:
            desc += f" | HINT: {disambiguation}"
        paper_descs.append(desc)

    full_prompt = prompt_template + "\n".join(paper_descs)

    # Call claude CLI
    try:
        result = subprocess.run(
            ["claude", "-p", full_prompt],
            capture_output=True, text=True, timeout=120,
        )
        output = result.stdout.strip()
    except FileNotFoundError:
        print("  WARN: 'claude' CLI not found, accepting all papers")
        return {p["arxiv_id"]: "ACCEPT" for p in papers_to_review}
    except subprocess.TimeoutExpired:
        print("  WARN: claude CLI timed out, accepting all papers")
        return {p["arxiv_id"]: "ACCEPT" for p in papers_to_review}

    # Parse JSON response
    try:
        # Extract JSON array from response (may have surrounding text)
        json_match = re.search(r"\[.*\]", output, re.DOTALL)
        if not json_match:
            print(f"  WARN: no JSON in AI response, accepting all")
            return {p["arxiv_id"]: "ACCEPT" for p in papers_to_review}

        decisions = json.loads(json_match.group())
    except json.JSONDecodeError as e:
        print(f"  WARN: failed to parse AI response: {e}")
        return {p["arxiv_id"]: "ACCEPT" for p in papers_to_review}

    # Log decisions
    with open(AI_LOG_FILE, "a") as f:
        for d in decisions:
            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **d,
            }
            f.write(json.dumps(log_entry) + "\n")

    return {d["arxiv_id"]: d["decision"] for d in decisions}


def generate_post(paper):
    """Generate a Jekyll post for an accepted paper."""
    authors_yaml = "\n".join(f'  - "{a}"' for a in paper["authors"])
    cats_yaml = "\n".join(f'  - "{c}"' for c in paper["categories"][:3])

    # Strip LaTeX delimiters from title (plain text for feed listing)
    clean_title = paper["title"].replace("$$", "").replace("$", "")
    yaml_title = clean_title.replace("\\", "\\\\").replace('"', '\\"')
    author_str = ", ".join(paper["authors"])
    arxiv_url = f"https://arxiv.org/abs/{paper['arxiv_id']}"

    abstract = paper.get("abstract", "")

    return f"""---
layout: post
title: "{yaml_title}"
arxiv-id: "{paper['arxiv_id']}"
date: {paper['date']}
categories: arxiv-feed
arxiv-categories:
{cats_yaml}
authors:
{authors_yaml}
nsf-frg: false
source: fetch
published: true
---
{{% raw %}}{abstract}{{% endraw %}}
"""


REVIEW_FILE = SCRIPT_DIR / "review.json"
REVIEW_TOOL = SCRIPT_DIR / "arxiv-review" / "arxiv-review"


def export_for_review(candidates, ai_decisions):
    """Write candidates to review.json for the TUI tool."""
    review = []
    for p in candidates:
        aid = p["arxiv_id"]
        matched = p.get("matched_author", {})
        review.append({
            "arxiv_id": aid,
            "title": p["title"],
            "authors": p["authors"],
            "categories": p["categories"],
            "abstract": p.get("abstract", ""),
            "date": p["date"],
            "matched_author": matched.get("name", ""),
            "is_ambiguous": p.get("is_ambiguous", False),
            "ai_decision": ai_decisions.get(aid, ""),
            "ai_reason": "",
            "decision": "",
        })
    # Sort by date descending
    review.sort(key=lambda x: x["date"], reverse=True)
    REVIEW_FILE.write_text(json.dumps(review, indent=2, ensure_ascii=False))
    print(f"  Wrote {len(review)} candidates to {REVIEW_FILE}")
    return review


def import_review(all_papers, config, processed):
    """Read decisions from review.json and generate posts."""
    if not REVIEW_FILE.exists():
        print("No review.json found.")
        return 0

    review = json.loads(REVIEW_FILE.read_text())
    accepted = [r for r in review if r["decision"] == "ACCEPT"]
    rejected = [r for r in review if r["decision"] == "REJECT"]
    skipped = [r for r in review if r["decision"] == "SKIP"]

    print(f"  Review results: {len(accepted)} accepted, {len(rejected)} rejected, {len(skipped)} skipped")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    wrote = 0

    for r in accepted:
        aid = r["arxiv_id"]
        # Find full paper data
        paper = all_papers.get(aid)
        if not paper:
            # Use review data directly
            paper = {
                "arxiv_id": aid,
                "title": r["title"],
                "authors": r["authors"],
                "categories": r["categories"],
                "abstract": r.get("abstract", ""),
                "date": r["date"],
            }

        date_prefix = paper["date"].split("T")[0]
        filename = f"{date_prefix}-{paper['arxiv_id']}.md"
        filepath = OUTPUT_DIR / filename

        if not filepath.exists():
            filepath.write_text(generate_post(paper))
            print(f"  WROTE {filename}")
            wrote += 1

    # Update processed for all decided papers
    for r in review:
        if r["decision"] in ("ACCEPT", "REJECT"):
            aid = r["arxiv_id"]
            if aid not in processed:
                date_prefix = r["date"].split("T")[0]
                processed[aid] = {
                    "source": "fetch",
                    "decision": r["decision"],
                    "date": date_prefix,
                }

    save_processed(processed)
    print(f"  Generated {wrote} new posts")
    return wrote


def main():
    parser = argparse.ArgumentParser(description="Fetch arXiv papers")
    parser.add_argument("--days", type=int, default=7,
                        help="Lookback window in days (default: 7)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without writing files")
    parser.add_argument("--no-ai", action="store_true",
                        help="Skip AI filtering, accept all clear matches")
    parser.add_argument("--review", action="store_true",
                        help="Interactive review mode with TUI")
    args = parser.parse_args()

    config = load_config()
    processed = load_processed()
    categories = config.get("categories", ["math.PR"])

    print(f"Fetching papers from last {args.days} days...")
    print(f"Categories: {', '.join(categories)}")

    # Step 1: Fetch from all categories
    all_papers = {}
    for cat in categories:
        print(f"  Querying {cat}...")
        papers = fetch_category(cat, args.days)
        for p in papers:
            if p["arxiv_id"] not in all_papers:
                all_papers[p["arxiv_id"]] = p
        time.sleep(RATE_LIMIT_SECONDS)

    print(f"  Fetched {len(all_papers)} unique papers")

    # Step 2: Dedup against processed
    new_papers = {
        aid: p for aid, p in all_papers.items()
        if aid not in processed
    }
    print(f"  {len(new_papers)} new (not previously processed)")

    if not new_papers:
        print("Nothing new to process.")
        return 0

    # Step 3: Name matching
    clear = []
    ambiguous = []

    for aid, paper in new_papers.items():
        matched, is_ambiguous = match_authors(paper, config)
        if matched:
            paper["matched_author"] = matched
            paper["is_ambiguous"] = is_ambiguous
            if is_ambiguous:
                ambiguous.append(paper)
            else:
                clear.append(paper)

    print(f"  {len(clear)} clear matches, {len(ambiguous)} ambiguous")

    candidates = clear + ambiguous
    if not candidates:
        print("  No author matches found.")
        return 0

    # Step 4: AI filtering
    ai_decisions = {}
    if not args.no_ai and candidates:
        print(f"  Sending {len(candidates)} papers to AI for review...")
        ai_decisions = ai_filter(candidates, config)

    # Step 5: Interactive review or auto-accept
    if args.review:
        # Export for TUI review
        export_for_review(candidates, ai_decisions)

        # Launch TUI
        if REVIEW_TOOL.exists():
            print(f"\n  Launching review TUI...")
            result = subprocess.run([str(REVIEW_TOOL), str(REVIEW_FILE)])
            if result.returncode != 0:
                print("  Review cancelled.")
                return 1
        else:
            # Build the tool first
            print(f"  Building review tool...")
            build = subprocess.run(
                ["go", "build", "-o", str(REVIEW_TOOL), "."],
                cwd=REVIEW_TOOL.parent,
            )
            if build.returncode == 0:
                print(f"\n  Launching review TUI...")
                subprocess.run([str(REVIEW_TOOL), str(REVIEW_FILE)])
            else:
                print("  Failed to build review tool. Review review.json manually.")
                return 1

        # Import decisions
        import_review(all_papers, config, processed)

    elif args.dry_run:
        for p in candidates:
            decision = ai_decisions.get(p["arxiv_id"], "ACCEPT")
            marker = "✓" if decision == "ACCEPT" else "✗"
            print(f"  [{marker}] {p['arxiv_id']} — {p['title'][:60]}")

    else:
        # Auto mode: accept based on AI decisions
        to_accept = []
        for p in candidates:
            decision = ai_decisions.get(p["arxiv_id"], "ACCEPT")
            if decision == "ACCEPT":
                to_accept.append(p)
            else:
                print(f"    REJECTED: {p['arxiv_id']} — {p['title'][:60]}")

        print(f"  {len(to_accept)} papers accepted")

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        for paper in to_accept:
            date_prefix = paper["date"].split("T")[0]
            filename = f"{date_prefix}-{paper['arxiv_id']}.md"
            filepath = OUTPUT_DIR / filename
            filepath.write_text(generate_post(paper))
            print(f"  WROTE {filename}")

        # Update processed
        for aid, paper in all_papers.items():
            if aid not in processed:
                date_prefix = paper["date"].split("T")[0]
                accepted = any(p["arxiv_id"] == aid for p in to_accept)
                processed[aid] = {
                    "source": "fetch",
                    "decision": "ACCEPT" if accepted else "REJECT",
                    "date": date_prefix,
                }
        save_processed(processed)

    # Summary
    print(f"\nDone. {len(all_papers)} fetched, {len(new_papers)} new, "
          f"{len(candidates)} matched authors")

    return 0


if __name__ == "__main__":
    sys.exit(main())
