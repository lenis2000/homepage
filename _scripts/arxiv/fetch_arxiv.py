#!/usr/bin/env python3
"""
arXiv feed pipeline: fetch → match → AI filter → generate posts.

Usage:
    python3 _scripts/arxiv/fetch_arxiv.py              # last 7 days
    python3 _scripts/arxiv/fetch_arxiv.py --days 30     # last 30 days
    python3 _scripts/arxiv/fetch_arxiv.py --dry-run     # preview only
    python3 _scripts/arxiv/fetch_arxiv.py --no-ai       # skip AI, accept all matches
    python3 _scripts/arxiv/fetch_arxiv.py --semantic    # name + embedding similarity
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

KAGGLE_DB = Path(os.environ.get(
    "ARXIV_KAGGLE_DB",
    Path.home() / "Data" / "arxiv" / "arxiv-metadata.db",
))

ARXIV_API = "https://export.arxiv.org/api/query"
RATE_LIMIT_SECONDS = 4


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
            for attempt in range(5):
                try:
                    response = urllib.request.urlopen(url).read()
                    break
                except urllib.error.HTTPError as e:
                    if e.code in (503, 429) and attempt < 4:
                        wait = RATE_LIMIT_SECONDS * (2 ** (attempt + 1))
                        print(f"      {e.code} — retrying in {wait}s (attempt {attempt + 1}/5)...")
                        time.sleep(wait)
                    else:
                        raise
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


SEMANTIC_CATEGORIES = {
    "math.PR", "math-ph", "math.CO", "math.MP", "cond-mat.stat-mech",
    "math.RT", "math.CA", "math.QA", "hep-th", "nlin.SI",
    "math.AG", "math.AP", "math.CV", "cond-mat", "math.FA",
    "math.NT", "q-alg", "solv-int", "math.ST", "math.DS",
}


def fetch_category_day(category, day_date):
    """Fetch ALL papers from a category for a single day (no author constraint).

    Uses submittedDate range filter so the API only returns that day's papers,
    keeping each request small and avoiding redundant pagination.
    """
    day_str = day_date.strftime("%Y%m%d")
    search_query = f"cat:{category}+AND+submittedDate:[{day_str}0000+TO+{day_str}2359]"

    all_papers = {}
    start = 0
    PAGE_SIZE = 200

    while True:
        params = (
            f"search_query={search_query}"
            f"&start={start}&max_results={PAGE_SIZE}"
            f"&sortBy=submittedDate&sortOrder=descending"
        )

        url = f"{ARXIV_API}?{params}"
        for attempt in range(5):
            try:
                response = urllib.request.urlopen(url).read()
                break
            except urllib.error.HTTPError as e:
                if e.code in (503, 429) and attempt < 4:
                    wait = RATE_LIMIT_SECONDS * (2 ** (attempt + 1))
                    print(f"      {e.code} — retrying in {wait}s (attempt {attempt + 1}/5)...")
                    time.sleep(wait)
                else:
                    raise
        feed = feedparser.parse(response)

        if not feed.entries:
            break

        for entry in feed.entries:
            published = entry.get("published", "")
            if not published:
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

        if len(feed.entries) < PAGE_SIZE:
            break

        start += PAGE_SIZE
        time.sleep(RATE_LIMIT_SECONDS)

    return list(all_papers.values())


def semantic_filter(papers, threshold=0.72):
    """Filter papers by embedding similarity to known int-prob papers.

    Returns list of (paper, similarity_score) for papers above threshold.
    Uses EmbeddingCache and reference vectors from scan_full_arxiv.py.
    """
    if not papers:
        return []

    from scan_full_arxiv import EmbeddingCache, text_key, VECTORS_FILE, CACHE_DB, MODEL_NAME

    if not VECTORS_FILE.exists():
        print(f"  WARN: {VECTORS_FILE} not found — skipping semantic filter")
        return []

    import numpy as np

    ref_vectors = np.load(VECTORS_FILE)
    cache = EmbeddingCache(CACHE_DB)
    model = None

    # Prepare texts and keys
    texts = []
    keys = []
    for p in papers:
        t = f"{p['title']}. {p.get('abstract', '')}" if p.get('abstract') else p['title']
        texts.append(t)
        keys.append(text_key(t))

    # Check cache
    cached = cache.get_many(keys)
    to_embed_idx = [i for i, k in enumerate(keys) if k not in cached]

    if to_embed_idx:
        from sentence_transformers import SentenceTransformer
        import torch
        device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"  Loading embedding model on {device}...")
        model = SentenceTransformer(MODEL_NAME).to(device)

        BATCH = 64
        for b_start in range(0, len(to_embed_idx), BATCH):
            b_idx = to_embed_idx[b_start:b_start + BATCH]
            batch_texts = [texts[i] for i in b_idx]
            vecs = model.encode(
                batch_texts, batch_size=8,
                show_progress_bar=False, normalize_embeddings=True,
            )
            new_items = []
            for idx, vec in zip(b_idx, vecs):
                cached[keys[idx]] = vec
                new_items.append((keys[idx], vec))
            cache.put_many(new_items)
            if b_start + BATCH < len(to_embed_idx):
                print(f"    embedded {b_start + len(b_idx)}/{len(to_embed_idx)}...")

    print(f"  Embeddings: {len(keys) - len(to_embed_idx)} cached, {len(to_embed_idx)} computed")

    # Compute similarities
    vecs_array = np.array([cached[k] for k in keys], dtype=np.float32)
    sims = vecs_array @ ref_vectors.T
    max_sims = sims.max(axis=1)

    results = []
    for i, sim in enumerate(max_sims):
        if sim >= threshold:
            results.append((papers[i], float(sim)))

    cache.close()
    return results


def match_authors(paper, config):
    """Check if any paper author matches our tracked authors.
    Returns (matched_author_config, is_ambiguous) or (None, False).
    Also attaches all_matched_authors to the paper for disambiguation."""
    paper_authors = paper["authors"]

    # Skip large collaborations (physics experiments, not math papers)
    if len(paper_authors) > 20:
        return None, False

    all_matches = []
    seen_names = set()

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
                    if tracked["name"] not in seen_names:
                        seen_names.add(tracked["name"])
                        all_matches.append(tracked)

    if not all_matches:
        return None, False

    # Store all matches on the paper for AI disambiguation
    paper["all_matched_authors"] = all_matches

    first = all_matches[0]
    is_ambiguous = any(t.get("high_ambiguity", False) for t in all_matches)
    return first, is_ambiguous


def _format_paper_desc(p):
    """Format a single paper for the AI prompt."""
    all_matched = p.get("all_matched_authors", [])
    matched = p.get("matched_author", {})
    ambiguity = "HIGH_AMBIGUITY" if p.get("is_ambiguous") else ""

    # Show all tracked authors that share this name pattern
    if len(all_matched) > 1:
        author_descs = []
        for m in all_matched:
            topics = ", ".join(m.get("topics", []))
            hint = m.get("disambiguation", "")
            ad = f"{m['name']} ({m.get('affiliation', '?')}) [{topics}]"
            if hint:
                ad += f" HINT: {hint}"
            author_descs.append(ad)
        matched_str = " OR ".join(author_descs)
    else:
        topics = ", ".join(matched.get("topics", []))
        matched_str = f"{matched.get('name', '?')} ({matched.get('affiliation', '?')}) [{topics}]"
        hint = matched.get("disambiguation", "")
        if hint:
            matched_str += f" HINT: {hint}"

    desc = (
        f"arXiv:{p['arxiv_id']} | {', '.join(p['authors'])} | "
        f"\"{p['title']}\" | categories: {', '.join(p['categories'])} | "
        f"Matched author(s): {matched_str} {ambiguity}"
    )
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


_BROKEN_LATEX = {
    r'\t au': r'\tau',
    r'\s igma': r'\sigma',
    r'\a lpha': r'\alpha',
    r'\b eta': r'\beta',
    r'\g amma': r'\gamma',
    r'\d elta': r'\delta',
    r'\l ambda': r'\lambda',
    r'\o mega': r'\omega',
}


def _fix_unicode_greek_in_math(text):
    """Replace Unicode Greek with LaTeX commands inside $...$ math.
    Also fixes broken LaTeX commands from Kaggle data (e.g. \\t au → \\tau)."""
    for broken, fixed in _BROKEN_LATEX.items():
        text = text.replace(broken, fixed)
    # Fix broken \{array} → \begin{array} / \end{array}
    text = re.sub(r'\\\{array\}', r'\\begin{array}', text, count=1)
    text = re.sub(r'\\\{array\}', r'\\end{array}', text, count=1)
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


def append_to_kaggle(paper):
    """Insert a paper into the SQLite DB."""
    import sqlite3

    arxiv_id = paper["arxiv_id"]
    date_str = paper["date"].split("T")[0] if "T" in paper["date"] else paper["date"]

    # Insert into SQLite DB (primary store)
    if KAGGLE_DB.exists():
        try:
            conn = sqlite3.connect(str(KAGGLE_DB))
            conn.execute(
                "INSERT OR IGNORE INTO papers (id, title, abstract, categories, authors, date) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    arxiv_id,
                    paper["title"],
                    paper.get("abstract", ""),
                    " ".join(paper.get("categories", [])),
                    ", ".join(paper["authors"]),
                    date_str,
                ),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"  WARN: SQLite insert failed for {arxiv_id}: {e}")



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


def export_for_review(candidates, ai_decisions, processed, append_kaggle=True):
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

        # Semantic-only papers: no AI decision, show similarity score
        source = p.get("source", "name")
        if source == "semantic" and not decision:
            sim = p.get("similarity", 0)
            decision = "ACCEPT"
            confidence = f"{sim:.3f}"
            reason = f"Cosine similarity {sim:.3f} to known int-prob papers"

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
            "source": source,
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
        safe_id = aid.replace("/", "-")
        filename = f"{date_prefix}-{safe_id}.md"
        filepath = OUTPUT_DIR / filename
        if not filepath.exists():
            filepath.write_text(generate_post(entry))
            if append_kaggle:
                append_to_kaggle(entry)
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


def import_review(all_papers, config, processed, append_kaggle=True):
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
        safe_id = paper["arxiv_id"].replace("/", "-")
        filename = f"{date_prefix}-{safe_id}.md"
        filepath = OUTPUT_DIR / filename

        if not filepath.exists():
            filepath.write_text(generate_post(paper))
            if append_kaggle:
                append_to_kaggle(paper)
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
    parser.add_argument("--backfill", action="store_true",
                        help="Include backfill_categories (hep-th, nlin.SI, cond-mat) for historical runs")
    parser.add_argument("--semantic", action="store_true",
                        help="Fetch ALL papers from categories and filter by name + embedding similarity")
    parser.add_argument("--threshold", type=float, default=0.72,
                        help="Cosine similarity threshold for semantic mode (default: 0.72)")
    args = parser.parse_args()

    config = load_config()
    processed = load_processed()
    categories = config.get("categories", ["math.PR"])
    if args.backfill:
        extra = config.get("backfill_categories", [])
        # Deduplicate while preserving order
        seen = set(categories)
        for cat in extra:
            if cat not in seen:
                categories.append(cat)
                seen.add(cat)

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
            safe_id = aid.replace("/", "-")
            filename = f"{date_prefix}-{safe_id}.md"
            filepath = OUTPUT_DIR / filename
            if not filepath.exists():
                filepath.write_text(generate_post(r))
                append_to_kaggle(r)
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

    # In semantic mode, use SEMANTIC_CATEGORIES instead of config categories
    if args.semantic:
        categories = sorted(SEMANTIC_CATEGORIES)

    print(f"Fetching papers: {date_desc}")
    print(f"Categories: {', '.join(categories)}")
    if args.semantic:
        print(f"Mode: SEMANTIC (name + embedding similarity, threshold={args.threshold})")

    # Step 1: Fetch papers (with cache for resumability)
    # Cache is keyed to run parameters — stale cache from different run is ignored
    all_papers = {}
    cache_key = f"{'semantic' if args.semantic else 'name'}|{args.days}|{args.authors}|{after_date}|{before_date}"
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
        if args.semantic:
            # Semantic mode: fetch ALL papers day-by-day from each category
            # Uses submittedDate range filter so each API call is small
            from datetime import date as _date
            start_d = (datetime.now() - timedelta(days=args.days)).date()
            if after_date:
                start_d = datetime.strptime(after_date, "%Y-%m-%d").date()
            end_d = datetime.now().date()
            if before_date:
                end_d = datetime.strptime(before_date, "%Y-%m-%d").date()

            current_d = start_d
            total_days = (end_d - start_d).days + 1
            day_num = 0
            while current_d <= end_d:
                day_num += 1
                day_count_before = len(all_papers)
                print(f"  [{day_num}/{total_days}] {current_d}")
                for ci, cat in enumerate(categories):
                    cat_before = len(all_papers)
                    papers = fetch_category_day(cat, current_d)
                    for p in papers:
                        if p["arxiv_id"] not in all_papers:
                            all_papers[p["arxiv_id"]] = p
                    cat_new = len(all_papers) - cat_before
                    print(f"    {ci+1}/{len(categories)} {cat}: {len(papers)} found, +{cat_new} new", flush=True)
                    time.sleep(RATE_LIMIT_SECONDS)
                day_new = len(all_papers) - day_count_before
                print(f"    day total: +{day_new} new ({len(all_papers)} cumulative)")
                current_d += timedelta(days=1)
        else:
            # Normal mode: fetch by author surname queries
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
    name_matched_ids = set()

    for aid, paper in new_papers.items():
        matched, is_ambiguous = match_authors(paper, config)
        if matched:
            paper["matched_author"] = matched
            paper["is_ambiguous"] = is_ambiguous
            paper["source"] = "name"
            name_matched_ids.add(aid)
            if is_ambiguous:
                ambiguous.append(paper)
            else:
                clear.append(paper)

    print(f"  {len(clear)} clear name matches, {len(ambiguous)} ambiguous")

    # Step 3b: Semantic filtering (if --semantic)
    semantic_candidates = []
    if args.semantic:
        # Run embedding similarity on ALL new papers
        all_new_list = list(new_papers.values())
        print(f"  Running semantic filter on {len(all_new_list)} papers (threshold={args.threshold})...")
        sem_results = semantic_filter(all_new_list, threshold=args.threshold)
        print(f"  {len(sem_results)} papers above similarity threshold")

        for paper, sim_score in sem_results:
            aid = paper["arxiv_id"]
            if aid not in name_matched_ids:
                paper["source"] = "semantic"
                paper["similarity"] = sim_score
                semantic_candidates.append(paper)

        print(f"  {len(semantic_candidates)} semantic-only candidates (not name-matched)")

    candidates = clear + ambiguous
    name_candidate_count = len(candidates)

    # Step 4: AI filtering (name-matched papers only)
    ai_decisions = {}
    if not args.no_ai and candidates:
        print(f"  Sending {len(candidates)} name-matched papers to AI for review...")
        ai_decisions = ai_filter(candidates, config)

    # Add semantic candidates (they skip AI, go directly to review)
    candidates = candidates + semantic_candidates

    if not candidates:
        print("  No candidates found (name or semantic).")
        return 0

    # Step 5: Interactive review or auto-accept
    if args.review:
        # Export for TUI review
        export_for_review(candidates, ai_decisions, processed)

        ai_accept = sum(1 for v in ai_decisions.values()
                        if (v.get("decision") if isinstance(v, dict) else v) == "ACCEPT")
        ai_reject = sum(1 for v in ai_decisions.values()
                        if (v.get("decision") if isinstance(v, dict) else v) in ("REJECT_PERSON", "REJECT_TOPIC"))
        print(f"\n  === Review summary ===")
        print(f"  {name_candidate_count} papers matched tracked authors")
        if args.semantic:
            print(f"  {len(semantic_candidates)} papers matched by embedding similarity")
        if ai_decisions:
            print(f"  AI pre-filter: {ai_accept} suggested ACCEPT, {ai_reject} suggested REJECT")
            print(f"  AI suggestions are shown in the TUI — you make the final call")
        else:
            print(f"  No AI pre-filter (use without --no-ai to enable)")
        print(f"  Papers sorted newest-first")
        print(f"  Keys: a/v=accept  r/b=reject  s=skip  u=undo  n/p=nav  q=quit (resumable)")
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
            source = p.get("source", "name")
            sim = f" sim={p['similarity']:.3f}" if "similarity" in p else ""
            marker = "✓" if decision == "ACCEPT" else "✗"
            print(f"  [{marker}] [{source}{sim}] {p['arxiv_id']} — {p['title'][:60]}")

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
            safe_id = paper["arxiv_id"].replace("/", "-")
            filename = f"{date_prefix}-{safe_id}.md"
            filepath = OUTPUT_DIR / filename
            filepath.write_text(generate_post(paper))
            append_to_kaggle(paper)
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
    summary = f"\nDone. {len(all_papers)} fetched, {len(new_papers)} new"
    summary += f", {name_candidate_count} name-matched"
    if args.semantic:
        summary += f", {len(semantic_candidates)} semantic-matched"
    print(summary)

    return 0


if __name__ == "__main__":
    sys.exit(main())
