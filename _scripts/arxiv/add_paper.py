#!/usr/bin/env python3
"""
Add an individual arXiv paper by ID.

Fetches from arXiv API, generates a Jekyll post, updates processed.json,
inserts into Kaggle SQLite DB, rebuilds search index, and recomputes
embeddings + related papers.

Usage:
    python3 _scripts/arxiv/add_paper.py 2505.15726
    python3 _scripts/arxiv/add_paper.py https://arxiv.org/abs/2505.15726
    python3 _scripts/arxiv/add_paper.py 2505.15726 --no-related   # skip embeddings
    python3 _scripts/arxiv/add_paper.py 2505.15726 --dry-run      # preview only
"""

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

try:
    import feedparser
except ImportError:
    print("ERROR: feedparser not installed. Run: pip3 install feedparser")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent

# Re-use infrastructure from fetch_arxiv
sys.path.insert(0, str(SCRIPT_DIR))
from fetch_arxiv import (
    ARXIV_API,
    OUTPUT_DIR,
    generate_post,
    append_to_kaggle,
    load_processed,
    save_processed,
)


def parse_arxiv_id(raw: str) -> str:
    """Extract bare arXiv ID from various input formats."""
    raw = raw.strip().rstrip("/")
    # URL: https://arxiv.org/abs/2505.15726v3
    m = re.search(r"arxiv\.org/abs/(.+?)(?:v\d+)?$", raw)
    if m:
        return m.group(1)
    # Citation: arXiv:2505.15726
    m = re.match(r"arXiv:(.+?)(?:v\d+)?$", raw)
    if m:
        return m.group(1)
    # Bare ID with possible version: 2505.15726v3
    return re.sub(r"v\d+$", "", raw)


def fetch_from_kaggle(arxiv_id: str) -> dict:
    """Fallback: fetch paper metadata from local Kaggle SQLite DB."""
    import sqlite3

    from fetch_arxiv import KAGGLE_DB

    if not KAGGLE_DB.exists():
        return None
    try:
        conn = sqlite3.connect(str(KAGGLE_DB))
        row = conn.execute(
            "SELECT title, abstract, categories, authors, date FROM papers WHERE id=?",
            (arxiv_id,),
        ).fetchone()
        conn.close()
    except Exception:
        return None
    if not row:
        return None
    title, abstract, categories_str, authors_str, date_str = row
    categories = categories_str.split() if categories_str else []
    if authors_str:
        # Kaggle DB stores authors as "Name1, Name2" or "Name1 and Name2"
        authors_str = authors_str.replace(" and ", ", ")
        authors = [a.strip() for a in authors_str.split(",") if a.strip()]
    else:
        authors = []
    return {
        "arxiv_id": arxiv_id,
        "title": re.sub(r"\s+", " ", title.replace("\n", " ")).strip(),
        "authors": authors,
        "date": date_str or "",
        "primary_category": categories[0] if categories else "",
        "categories": categories,
        "abstract": re.sub(r"\s+", " ", (abstract or "").strip()),
    }


def fetch_paper(arxiv_id: str) -> dict:
    """Fetch a single paper from the arXiv API, falling back to Kaggle DB."""
    url = f"{ARXIV_API}?id_list={arxiv_id}"
    try:
        for attempt in range(5):
            try:
                response = urllib.request.urlopen(url).read()
                break
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 4:
                    wait = 3 * (attempt + 1)
                    print(f"  Rate limited, retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    raise
        feed = feedparser.parse(response)

        if not feed.entries:
            raise ValueError("No entries returned")

        entry = feed.entries[0]

        # Check for "not found" — arXiv API returns an entry with error title
        if "Error" in entry.get("title", ""):
            raise ValueError("Paper not found in API")

        authors = [a.name for a in entry.authors]
        title = re.sub(r"\s+", " ", entry.title.replace("\n", " ")).strip()
        categories = [t["term"] for t in entry.tags]
        abstract = re.sub(r"\s+", " ", entry.get("summary", "").strip())
        published = entry.get("published", "")

        return {
            "arxiv_id": arxiv_id,
            "title": title,
            "authors": authors,
            "date": published,
            "primary_category": categories[0] if categories else "",
            "categories": categories,
            "abstract": abstract,
        }
    except Exception as e:
        print(f"  arXiv API failed ({e}), trying Kaggle DB...")
        paper = fetch_from_kaggle(arxiv_id)
        if paper:
            print("  Found in Kaggle DB")
            return paper
        return None


def relevance_check(paper: dict) -> tuple[str, str]:
    """Ask Claude whether this paper belongs in the integrable probability feed.

    Returns (decision, reason) where decision is 'ACCEPT' or 'REJECT'.
    Falls back to ('ACCEPT', '') if claude CLI is unavailable.
    """
    prompt = (
        "You are reviewing an arXiv paper for inclusion in an integrable probability "
        "community feed. The feed covers:\n"
        "- KPZ universality, ASEP, TASEP, stochastic vertex models, exclusion processes\n"
        "- Random matrices, determinantal/Pfaffian point processes, Tracy-Widom\n"
        "- Random tilings, dimers, Arctic curves, limit shapes\n"
        "- Macdonald/Schur/Hall-Littlewood processes, symmetric functions in probabilistic context\n"
        "- Random polymers, last passage percolation, directed landscape\n"
        "- Random partitions, random Young diagrams, asymptotic representation theory\n"
        "- Integrable systems applied to probability, Riemann-Hilbert methods\n"
        "- Stochastic PDE related to KPZ, random growth models\n"
        "- Generalized hydrodynamics, hydrodynamic limits of integrable systems\n"
        "- Random permutations, permutons, longest increasing subsequences\n"
        "- Interacting particle systems with exact solvability\n\n"
        f"Paper: arXiv:{paper['arxiv_id']}\n"
        f"Title: {paper['title']}\n"
        f"Authors: {', '.join(paper['authors'])}\n"
        f"Categories: {', '.join(paper['categories'])}\n"
        f"Abstract: {paper.get('abstract', '(no abstract)')}\n\n"
        "Respond with EXACTLY one line: ACCEPT or REJECT followed by a brief reason.\n"
        "Example: ACCEPT — paper studies TASEP with step initial condition\n"
        "Example: REJECT — paper is about computer vision, unrelated to integrable probability"
    )
    try:
        result = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True, text=True, timeout=60,
        )
        output = result.stdout.strip()
        if output.startswith("ACCEPT"):
            reason = output[len("ACCEPT"):].strip().lstrip("—-: ")
            return "ACCEPT", reason
        elif output.startswith("REJECT"):
            reason = output[len("REJECT"):].strip().lstrip("—-: ")
            return "REJECT", reason
        # Couldn't parse — treat as uncertain
        return "UNCERTAIN", output[:200]
    except FileNotFoundError:
        print("  WARN: claude CLI not found, skipping relevance check")
        return "ACCEPT", ""
    except subprocess.TimeoutExpired:
        print("  WARN: claude CLI timed out, skipping relevance check")
        return "ACCEPT", ""


def main():
    parser = argparse.ArgumentParser(description="Add a single arXiv paper by ID")
    parser.add_argument("paper_id", help="arXiv ID, URL, or citation (e.g. 2505.15726)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--no-related", action="store_true",
                        help="Skip embeddings/related-papers recomputation")
    parser.add_argument("--no-index", action="store_true",
                        help="Skip search index rebuild")
    parser.add_argument("--source", default="manual",
                        help="Source tag (default: manual)")
    parser.add_argument("-y", "--yes", action="store_true",
                        help="Skip relevance check and confirmation prompt")
    args = parser.parse_args()

    arxiv_id = parse_arxiv_id(args.paper_id)
    print(f"Adding paper: {arxiv_id}")

    # Check if already exists
    processed = load_processed()
    if arxiv_id in processed:
        prev = processed[arxiv_id]
        if prev.get("decision") == "ACCEPT" and not prev.get("deleted"):
            print(f"  Already accepted (source: {prev.get('source', '?')})")
            return 0
        if prev.get("deleted"):
            print(f"  Previously deleted — re-adding")
        else:
            print(f"  Previously {prev.get('decision', '?')} — overriding to ACCEPT")

    # Fetch from API
    print("  Fetching from arXiv API...")
    paper = fetch_paper(arxiv_id)
    if not paper:
        print(f"  ERROR: Paper {arxiv_id} not found on arXiv")
        return 1

    print(f"  Title: {paper['title']}")
    print(f"  Authors: {', '.join(paper['authors'])}")
    print(f"  Categories: {', '.join(paper['categories'])}")
    print(f"  Date: {paper['date'][:10]}")

    if args.dry_run:
        print("\n  [DRY RUN] Would generate post and update indices.")
        return 0

    # Relevance check (skip with -y or when called from search tool)
    if not args.yes and args.source == "manual" and sys.stdin.isatty():
        print("\n  Checking relevance to integrable probability...")
        decision, reason = relevance_check(paper)
        if decision == "REJECT":
            print(f"  AI says REJECT: {reason}")
            answer = input("  Add anyway? [y/N] ").strip().lower()
            if answer not in ("y", "yes"):
                print("  Aborted.")
                return 0
        elif decision == "UNCERTAIN":
            print(f"  AI uncertain: {reason}")
            answer = input("  Add anyway? [y/N] ").strip().lower()
            if answer not in ("y", "yes"):
                print("  Aborted.")
                return 0
        else:
            print(f"  AI says ACCEPT: {reason}")
            answer = input("  Proceed? [Y/n] ").strip().lower()
            if answer in ("n", "no"):
                print("  Aborted.")
                return 0

    # Generate post
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    date_prefix = paper["date"].split("T")[0]
    paper["date"] = date_prefix  # normalize to YYYY-MM-DD for front matter
    safe_id = arxiv_id.replace("/", "-")
    filename = f"{date_prefix}-{safe_id}.md"
    filepath = OUTPUT_DIR / filename

    post_content = generate_post(paper)
    # Tag as manual source instead of fetch
    post_content = post_content.replace("source: fetch", f"source: {args.source}")
    filepath.write_text(post_content)
    print(f"  WROTE {filename}")

    # Update processed.json
    processed[arxiv_id] = {
        "date": date_prefix,
        "decision": "ACCEPT",
        "source": args.source,
    }
    save_processed(processed)
    print("  Updated processed.json")

    # Insert into Kaggle SQLite
    append_to_kaggle(paper)
    print("  Inserted into SQLite DB")

    # Rebuild search index
    if not args.no_index:
        print("  Rebuilding search index...")
        subprocess.run(
            [sys.executable, str(SCRIPT_DIR / "build_search_index.py")],
            check=True,
        )

    # Recompute embeddings + related papers
    if not args.no_related:
        print("  Recomputing embeddings and related papers...")
        # Use the venv python if available (needs sentence-transformers)
        venv_python = SCRIPT_DIR / "venv" / "bin" / "python"
        python = str(venv_python) if venv_python.exists() else sys.executable
        subprocess.run(
            [python, str(SCRIPT_DIR / "build_arxiv_embeddings.py")],
            check=True,
        )

    print(f"\n  Done! Paper {arxiv_id} added successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
