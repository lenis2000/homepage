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


def fetch_category(category, days, config, before_date=None):
    """Fetch recent papers from a single arXiv category, with pagination.

    Uses surname-only queries with parentheses and + encoding:
      (au:Borodin+OR+au:Corwin+...)+AND+cat:math.PR
    Initial matching is done locally after fetching.

    If before_date is set (historical range), uses ascending sort order
    so we start from the oldest papers and stop at before_date.
    """
    # Collect unique surnames for API queries
    seen_surnames = set()
    all_surname_terms = []
    for author in config["authors"]:
        for name in author["arxiv_names"]:
            # Surname is everything before the last underscore
            # e.g. "Di_Francesco_P" → "Di_Francesco", "Borodin_A" → "Borodin"
            surname = "_".join(name.split("_")[:-1])
            if surname.lower() not in seen_surnames:
                seen_surnames.add(surname.lower())
                # Multi-part surnames need %22 (URL-encoded quotes) to work
                # in OR combinations. Without quotes, arXiv API silently
                # drops them from compound queries.
                if "_" in surname:
                    spaced = surname.replace("_", "+")
                    all_surname_terms.append(f'au:%22{spaced}%22')
                else:
                    all_surname_terms.append(f"au:{surname}")

    # Split into batches to avoid URL length limits
    AUTHOR_BATCH = 20
    author_batches = [
        all_surname_terms[i:i + AUTHOR_BATCH]
        for i in range(0, len(all_surname_terms), AUTHOR_BATCH)
    ]

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_naive = cutoff.replace(tzinfo=None)
    upper_cutoff = datetime.strptime(before_date, "%Y-%m-%d") if before_date else None

    all_papers = {}

    for batch_idx, author_terms in enumerate(author_batches):
        # Show which authors are in this batch
        names = [t.replace("au:", "") for t in author_terms]
        print(f"    batch {batch_idx + 1}/{len(author_batches)}: {', '.join(names[:5])}{'...' if len(names) > 5 else ''}")
        author_query = "+OR+".join(author_terms)
        search_query = f"({author_query})+AND+cat:{category}"

        start = 0
        PAGE_SIZE = 200

        while True:
            params = (
                f"search_query={search_query}"
                f"&start={start}&max_results={PAGE_SIZE}"
                f"&sortBy=submittedDate&sortOrder=descending"
            )

            url = f"{ARXIV_API}?{params}"
            response = urllib.request.urlopen(url).read()
            feed = feedparser.parse(response)

            if not feed.entries:
                break

            past_cutoff = False

            for entry in feed.entries:
                published = entry.get("published", "")
                if not published:
                    continue

                try:
                    pub_date = datetime.strptime(published[:19], "%Y-%m-%dT%H:%M:%S")
                except ValueError:
                    continue

                if pub_date < cutoff_naive:
                    past_cutoff = True
                    continue

                # Skip papers newer than --before (but keep paging)
                if upper_cutoff and pub_date > upper_cutoff:
                    continue

                arxiv_id = entry.id.split("/abs/")[-1].split("v")[0]
                if arxiv_id in all_papers:
                    continue

                authors = [a.name for a in entry.authors]
                title = re.sub(r"\s+", " ", entry.title.replace("\n", " ")).strip()
                categories = [t["term"] for t in entry.tags]
                primary_cat = categories[0] if categories else category

                abstract = re.sub(r"\s+", " ", entry.get("summary", "").strip())

                all_papers[arxiv_id] = {
                    "arxiv_id": arxiv_id,
                    "title": title,
                    "authors": authors,
                    "date": published,
                    "primary_category": primary_cat,
                    "categories": categories,
                    "abstract": abstract,
                }

            if past_cutoff or len(feed.entries) < PAGE_SIZE:
                break

            start += PAGE_SIZE
            oldest = list(all_papers.values())[-1]["date"][:10] if all_papers else "?"
            print(f"      page {start // PAGE_SIZE + 1} — reached {oldest} ({len(all_papers)} total)...")
            time.sleep(RATE_LIMIT_SECONDS)

        if batch_idx < len(author_batches) - 1:
            time.sleep(RATE_LIMIT_SECONDS)

    return list(all_papers.values())


def match_authors(paper, config):
    """Check if any paper author matches our tracked authors.
    Returns (matched_author_config, is_ambiguous) or (None, False)."""
    paper_authors = paper["authors"]

    # Skip large collaborations (physics experiments, not math papers)
    if len(paper_authors) > 20:
        return None, False

    for tracked in config["authors"]:
        for arxiv_name in tracked["arxiv_names"]:
            # Parse arxiv_name format: Surname_Initial (or Multi_Part_Surname_Initial)
            parts = arxiv_name.split("_")
            if len(parts) < 2:
                continue
            surname = " ".join(parts[:-1])  # "Di Francesco", "Van Peski", etc.
            initial = parts[-1]

            for pa in paper_authors:
                # Check if paper author matches: surname match + first initial
                name_parts = pa.strip().split()
                if not name_parts:
                    continue
                # Surname might be multi-word: compare last N words
                surname_words = surname.split()
                if len(name_parts) <= len(surname_words):
                    continue
                pa_surname = " ".join(name_parts[-len(surname_words):])
                pa_initial = name_parts[0][0] if name_parts[0] else ""

                if (pa_surname.lower() == surname.lower() and
                        pa_initial.upper() == initial.upper()):
                    is_ambiguous = tracked.get("high_ambiguity", False)
                    return tracked, is_ambiguous

    return None, False


def _format_paper_desc(p):
    """Format a single paper for the AI prompt."""
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
    return desc


def _ai_filter_batch(batch, prompt_template):
    """Send one batch to Claude, return dict of {arxiv_id: decision}."""
    paper_descs = [_format_paper_desc(p) for p in batch]
    full_prompt = prompt_template + "\n".join(paper_descs)

    try:
        result = subprocess.run(
            ["claude", "-p", full_prompt],
            capture_output=True, text=True, timeout=180,
        )
        output = result.stdout.strip()
    except FileNotFoundError:
        return {p["arxiv_id"]: "ACCEPT" for p in batch}, "no claude CLI"
    except subprocess.TimeoutExpired:
        return {p["arxiv_id"]: "ACCEPT" for p in batch}, "timeout"

    try:
        json_match = re.search(r"\[.*\]", output, re.DOTALL)
        if not json_match:
            return {p["arxiv_id"]: "ACCEPT" for p in batch}, "no JSON"
        decisions = json.loads(json_match.group())
    except json.JSONDecodeError:
        return {p["arxiv_id"]: "ACCEPT" for p in batch}, "parse error"

    # Log
    with open(AI_LOG_FILE, "a") as f:
        for d in decisions:
            f.write(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(), **d,
            }) + "\n")

    return {d["arxiv_id"]: d for d in decisions}, None


def ai_filter(papers_to_review, config):
    """Send papers to Claude for filtering, in parallel batches."""
    if not papers_to_review:
        return {}

    prompt_template = PROMPT_FILE.read_text()
    BATCH_SIZE = 20
    MAX_PARALLEL = 5

    # Small batch: single call
    if len(papers_to_review) <= BATCH_SIZE:
        results, err = _ai_filter_batch(papers_to_review, prompt_template)
        if err:
            print(f"  WARN: AI batch error: {err}")
        return results

    # Large batch: parallel
    from concurrent.futures import ThreadPoolExecutor, as_completed

    batches = []
    for i in range(0, len(papers_to_review), BATCH_SIZE):
        batches.append(papers_to_review[i:i + BATCH_SIZE])

    print(f"  Processing {len(batches)} batches ({MAX_PARALLEL} parallel)...")
    all_decisions = {}
    done = 0

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as pool:
        futures = {
            pool.submit(_ai_filter_batch, batch, prompt_template): i
            for i, batch in enumerate(batches)
        }
        for future in as_completed(futures):
            batch_idx = futures[future]
            result, err = future.result()
            all_decisions.update(result)
            done += 1
            status = f"  batch {done}/{len(batches)}"
            if err:
                status += f" (WARN: {err})"
            print(status)

    return all_decisions


_GREEK_MAP = {
    'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
    'ε': '\\varepsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
    'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
    'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
    'σ': '\\sigma', 'ς': '\\varsigma', 'τ': '\\tau', 'υ': '\\upsilon',
    'φ': '\\varphi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
    'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
    'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi',
    'Ψ': '\\Psi', 'Ω': '\\Omega',
}
_GREEK_CHARS = set(_GREEK_MAP.keys())


def _fix_unicode_greek_in_math(text):
    """Replace Unicode Greek with LaTeX commands inside $...$ math."""
    result = []
    i = 0
    in_math = False
    while i < len(text):
        ch = text[i]
        if ch == '$':
            in_math = not in_math
            result.append(ch)
            i += 1
        elif in_math and ch in _GREEK_CHARS:
            latex_cmd = _GREEK_MAP[ch]
            next_ch = text[i + 1] if i + 1 < len(text) else ''
            if next_ch.isalnum() or next_ch == '\\':
                result.append(latex_cmd + ' ')
            else:
                result.append(latex_cmd)
            i += 1
        else:
            result.append(ch)
            i += 1
    return ''.join(result)


def _render_math(text):
    """Pre-render $...$ and $$...$$ math to MathML via KaTeX Node.js."""
    if "$" not in text:
        return text
    render_js = SCRIPT_DIR / "render_math.js"
    try:
        batch = json.dumps([{"id": "0", "text": text}])
        result = subprocess.run(
            ["node", str(render_js)],
            input=batch, capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            items = json.loads(result.stdout)
            rendered = items[0]["rendered"]
            for w in items[0].get("warnings", []):
                print(f"  WARN: {w}")
            return rendered
    except Exception as e:
        print(f"  WARN: Math rendering failed: {e}")
    return text


def generate_post(paper):
    """Generate a Jekyll post for an accepted paper."""
    authors_yaml = "\n".join(f'  - "{a}"' for a in paper["authors"])
    cats_yaml = "\n".join(f'  - "{c}"' for c in paper["categories"][:3])

    # Strip LaTeX delimiters from title (plain text for feed listing)
    clean_title = paper["title"].replace("$$", "").replace("$", "")
    yaml_title = clean_title.replace("\\", "\\\\").replace('"', '\\"')
    author_str = ", ".join(paper["authors"])
    arxiv_url = f"https://arxiv.org/abs/{paper['arxiv_id']}"

    abstract = _fix_unicode_greek_in_math(paper.get("abstract", ""))
    abstract = _render_math(abstract)

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
{{% raw %}}<p>{abstract}</p>{{% endraw %}}
"""


REVIEW_FILE = SCRIPT_DIR / "review.json"
FETCH_CACHE = SCRIPT_DIR / "fetch_cache.json"
REVIEW_TOOL = Path.home() / "bin" / "arxiv-review"


def export_for_review(candidates, ai_decisions, processed):
    """Write candidates to review.json for the TUI tool.

    Auto-handles high-confidence cases:
    - ACCEPT + high confidence → auto-accepted (not in TUI)
    - REJECT_PERSON + high confidence → auto-rejected (not in TUI)
    Shows in TUI:
    - REJECT_TOPIC (all) — right person, wrong topic
    - REJECT_PERSON + low confidence — uncertain identity
    - ACCEPT + low confidence — uncertain
    - No AI decision — needs review
    """
    auto_accepted = []
    auto_rejected = []
    review = []

    for p in candidates:
        aid = p["arxiv_id"]
        matched = p.get("matched_author", {})
        ai = ai_decisions.get(aid, {})

        if isinstance(ai, str):
            # Old format fallback
            ai = {"decision": ai, "confidence": "low", "reason": ""}

        decision = ai.get("decision", "")
        confidence = ai.get("confidence", "low")
        reason = ai.get("reason", "")

        entry = {
            "arxiv_id": aid,
            "title": p["title"],
            "authors": p["authors"],
            "categories": p["categories"],
            "abstract": p.get("abstract", ""),
            "date": p["date"],
            "matched_author": matched.get("name", ""),
            "is_ambiguous": p.get("is_ambiguous", False),
            "ai_decision": decision,
            "ai_confidence": confidence,
            "ai_reason": reason,
            "decision": "",
        }

        if decision == "ACCEPT" and confidence == "high":
            auto_accepted.append(entry)
        elif decision == "REJECT_PERSON" and confidence == "high":
            auto_rejected.append(entry)
        else:
            # Show in TUI: REJECT_TOPIC, low-confidence anything, no AI
            review.append(entry)

    # Auto-accept: generate posts immediately
    wrote = 0
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for entry in auto_accepted:
        aid = entry["arxiv_id"]
        date_prefix = entry["date"].split("T")[0]
        filename = f"{date_prefix}-{aid}.md"
        filepath = OUTPUT_DIR / filename
        if not filepath.exists():
            filepath.write_text(generate_post(entry))
            wrote += 1
        if aid not in processed:
            processed[aid] = {"source": "fetch", "decision": "ACCEPT", "date": date_prefix}

    # Auto-reject: mark in processed
    for entry in auto_rejected:
        aid = entry["arxiv_id"]
        date_prefix = entry["date"].split("T")[0]
        if aid not in processed:
            processed[aid] = {"source": "fetch", "decision": "REJECT", "date": date_prefix}

    save_processed(processed)

    print(f"  Auto-accepted: {len(auto_accepted)} ({wrote} new posts)")
    print(f"  Auto-rejected: {len(auto_rejected)} (wrong person, high confidence)")
    print(f"  Need review: {len(review)}")

    # Sort review by date descending
    review.sort(key=lambda x: x["date"], reverse=True)
    REVIEW_FILE.write_text(json.dumps(review, indent=2, ensure_ascii=False))
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
    parser.add_argument("--import-review", action="store_true",
                        help="Import decisions from review.json and generate posts")
    parser.add_argument("--authors", type=str, default="",
                        help="Comma-separated author names to fetch (subset of authors.yml)")
    parser.add_argument("--after", type=str, default="",
                        help="Only include papers after this date (YYYY-MM-DD)")
    parser.add_argument("--before", type=str, default="",
                        help="Only include papers before this date (YYYY-MM-DD)")
    args = parser.parse_args()

    config = load_config()
    processed = load_processed()
    categories = config.get("categories", ["math.PR"])

    # Quick path: just import from existing review.json
    if args.import_review:
        if not REVIEW_FILE.exists():
            print(f"No {REVIEW_FILE} found.")
            return 1
        review = json.loads(REVIEW_FILE.read_text())
        total = len(review)
        accepted = [r for r in review if r["decision"] == "ACCEPT"]
        rejected = [r for r in review if r["decision"] == "REJECT"]
        skipped = [r for r in review if r["decision"] == "SKIP"]
        undecided = [r for r in review if r["decision"] == ""]
        print(f"Importing from review.json: {total} papers")
        print(f"  {len(accepted)} accepted, {len(rejected)} rejected, {len(skipped)} skipped, {len(undecided)} undecided")
        if undecided:
            print(f"  WARNING: {len(undecided)} undecided papers will be skipped")

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        wrote = 0
        for r in accepted:
            aid = r["arxiv_id"]
            date_prefix = r["date"].split("T")[0]
            filename = f"{date_prefix}-{aid}.md"
            filepath = OUTPUT_DIR / filename
            if not filepath.exists():
                filepath.write_text(generate_post(r))
                wrote += 1
            if aid not in processed:
                processed[aid] = {"source": "fetch", "decision": "ACCEPT", "date": date_prefix}

        for r in rejected:
            aid = r["arxiv_id"]
            date_prefix = r["date"].split("T")[0]
            if aid not in processed:
                processed[aid] = {"source": "fetch", "decision": "REJECT", "date": date_prefix}

        save_processed(processed)
        print(f"  Generated {wrote} new posts")
        print(f"  Updated processed.json ({len(processed)} total entries)")

        # Clean up temp files
        REVIEW_FILE.unlink()
        print(f"  Removed {REVIEW_FILE.name}")
        if FETCH_CACHE.exists():
            FETCH_CACHE.unlink()
            print(f"  Removed {FETCH_CACHE.name}")

        return 0

    # Filter to specific authors if requested
    if args.authors:
        author_filter = [a.strip().lower() for a in args.authors.split(",")]
        filtered = [a for a in config["authors"]
                    if a["name"].lower() in author_filter]
        if not filtered:
            print(f"No matching authors found for: {args.authors}")
            print(f"Available: {', '.join(a['name'] for a in config['authors'][:10])}...")
            return 1
        config = dict(config)
        config["authors"] = filtered
        print(f"Filtering to {len(filtered)} authors: {', '.join(a['name'] for a in filtered)}")

    # Date range: compute --days from --after if both are given
    after_date = args.after or ""
    before_date = args.before or ""
    if after_date:
        after_dt = datetime.strptime(after_date, "%Y-%m-%d")
        args.days = (datetime.now() - after_dt).days + 1
    date_desc = f"last {args.days} days"
    if after_date or before_date:
        parts = []
        if after_date:
            parts.append(f"after {after_date}")
        if before_date:
            parts.append(f"before {before_date}")
        date_desc = " and ".join(parts)

    print(f"Fetching papers: {date_desc}")
    print(f"Categories: {', '.join(categories)}")

    # Step 1: Fetch from all categories (with cache for resumability)
    # Cache is keyed to run parameters — stale cache from different run is ignored
    all_papers = {}
    cache_key = f"{args.days}|{args.authors}|{after_date}|{before_date}"
    cache_valid = False
    if FETCH_CACHE.exists():
        cached_data = json.loads(FETCH_CACHE.read_text())
        if isinstance(cached_data, dict) and cached_data.get("_cache_key") == cache_key:
            all_papers = {p["arxiv_id"]: p for p in cached_data["papers"]}
            cache_valid = True
            print(f"  Resumed from cache ({len(all_papers)} papers)")
        else:
            FETCH_CACHE.unlink()
            print(f"  Discarded stale cache (different run parameters)")
    if not cache_valid:
        for cat in categories:
            print(f"  Querying {cat} ({len(config['authors'])} authors in batches of 20)...")
            papers = fetch_category(cat, args.days, config, before_date=before_date)
            for p in papers:
                if p["arxiv_id"] not in all_papers:
                    all_papers[p["arxiv_id"]] = p
            time.sleep(RATE_LIMIT_SECONDS)
        # Save cache (keyed to run parameters so different runs don't collide)
        cache_data = {"_cache_key": cache_key, "papers": list(all_papers.values())}
        FETCH_CACHE.write_text(json.dumps(cache_data, ensure_ascii=False))
        print(f"  Saved fetch cache ({len(all_papers)} papers)")

    print(f"  Fetched {len(all_papers)} unique papers")

    # Apply date range filter
    if after_date or before_date:
        before_filter = len(all_papers)
        all_papers = {
            aid: p for aid, p in all_papers.items()
            if (not after_date or p["date"][:10] >= after_date)
            and (not before_date or p["date"][:10] <= before_date)
        }
        print(f"  Date filter: {before_filter} → {len(all_papers)} papers")

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
        export_for_review(candidates, ai_decisions, processed)

        ai_accept = sum(1 for v in ai_decisions.values()
                        if (v.get("decision") if isinstance(v, dict) else v) == "ACCEPT")
        ai_reject = sum(1 for v in ai_decisions.values()
                        if (v.get("decision") if isinstance(v, dict) else v) in ("REJECT_PERSON", "REJECT_TOPIC"))
        print(f"\n  === Review summary ===")
        print(f"  {len(candidates)} papers matched tracked authors")
        if ai_decisions:
            print(f"  AI pre-filter: {ai_accept} suggested ACCEPT, {ai_reject} suggested REJECT")
            print(f"  AI suggestions are shown in the TUI — you make the final call")
        else:
            print(f"  No AI pre-filter (use without --no-ai to enable)")
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

        # Import decisions
        import_review(all_papers, config, processed)

    elif args.dry_run:
        for p in candidates:
            ai = ai_decisions.get(p["arxiv_id"], {})
            decision = ai.get("decision", "ACCEPT") if isinstance(ai, dict) else ai
            marker = "✓" if decision == "ACCEPT" else "✗"
            print(f"  [{marker}] {p['arxiv_id']} — {p['title'][:60]}")

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
