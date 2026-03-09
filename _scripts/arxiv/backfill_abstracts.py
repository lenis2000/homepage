#!/usr/bin/env python3
"""
Backfill abstracts for existing arXiv feed posts by querying the arXiv API.

Reads all posts in _arxiv/, extracts arXiv IDs, fetches abstracts
in batches, and updates the post body with the abstract text.

Usage:
    python3 _scripts/arxiv/backfill_abstracts.py
    python3 _scripts/arxiv/backfill_abstracts.py --dry-run
"""

import re
import sys
import time
import argparse
import urllib.request
from pathlib import Path

try:
    import feedparser
except ImportError:
    print("ERROR: feedparser not installed. Run: pip3 install feedparser")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
POSTS_DIR = REPO_ROOT / "_arxiv"

ARXIV_API = "https://export.arxiv.org/api/query"
BATCH_SIZE = 20
RATE_LIMIT_SECONDS = 3


def extract_arxiv_id(filepath):
    """Extract arXiv ID from post front matter."""
    text = filepath.read_text(encoding="utf-8")
    m = re.search(r'^arxiv-id:\s*"([^"]+)"', text, re.MULTILINE)
    return m.group(1) if m else None


def has_abstract(filepath):
    """Check if the post body already has abstract content (non-trivial)."""
    text = filepath.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return False
    body = parts[2].strip()
    # Strip raw/endraw tags for length check
    body = body.replace("{% raw %}", "").replace("{% endraw %}", "").strip()
    return len(body) > 10


def fetch_abstracts(arxiv_ids):
    """Fetch abstracts for a list of arXiv IDs. Returns {id: abstract}."""
    results = {}
    for i in range(0, len(arxiv_ids), BATCH_SIZE):
        batch = arxiv_ids[i:i + BATCH_SIZE]
        id_list = ",".join(batch)
        url = f"{ARXIV_API}?id_list={id_list}&max_results={len(batch)}"

        print(f"  Fetching batch {i // BATCH_SIZE + 1} "
              f"({len(batch)} papers)...")

        response = urllib.request.urlopen(url).read()
        feed = feedparser.parse(response)

        for entry in feed.entries:
            arxiv_id = entry.id.split("/abs/")[-1].split("v")[0]
            abstract = entry.get("summary", "").strip()
            # Clean up whitespace
            abstract = re.sub(r"\s+", " ", abstract)
            if abstract:
                results[arxiv_id] = abstract

        if i + BATCH_SIZE < len(arxiv_ids):
            time.sleep(RATE_LIMIT_SECONDS)

    return results


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
    import json
    import subprocess
    render_js = Path(__file__).parent / "render_math.js"
    try:
        batch = json.dumps([{"id": "0", "text": text}])
        result = subprocess.run(
            ["node", str(render_js)],
            input=batch, capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            items = json.loads(result.stdout)
            return items[0]["rendered"]
    except Exception as e:
        print(f"  WARN: Math rendering failed: {e}")
    return text


def update_post(filepath, abstract):
    """Replace the post body with the abstract, keeping front matter."""
    text = filepath.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return False

    front_matter = parts[1]
    abstract = _fix_unicode_greek_in_math(abstract)
    abstract = _render_math(abstract)
    # Wrap in <p> inside {% raw %} — <p> prevents kramdown processing,
    # {% raw %} prevents Liquid from parsing LaTeX {{ }}
    new_text = f"---{front_matter}---\n{{% raw %}}<p>{abstract}</p>{{% endraw %}}\n"
    filepath.write_text(new_text, encoding="utf-8")
    return True


def main():
    parser = argparse.ArgumentParser(description="Backfill abstracts")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without writing files")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing abstracts")
    args = parser.parse_args()

    posts = sorted(POSTS_DIR.glob("*.md"))
    print(f"Found {len(posts)} posts in {POSTS_DIR}")

    # Collect IDs that need abstracts
    need_abstract = {}
    for filepath in posts:
        if not args.force and has_abstract(filepath):
            continue
        arxiv_id = extract_arxiv_id(filepath)
        if arxiv_id:
            need_abstract[arxiv_id] = filepath

    print(f"  {len(need_abstract)} posts need abstracts")

    if not need_abstract:
        print("All posts already have abstracts.")
        return 0

    # Fetch abstracts from arXiv API
    print("Fetching abstracts from arXiv API...")
    abstracts = fetch_abstracts(list(need_abstract.keys()))
    print(f"  Got {len(abstracts)} abstracts")

    # Update posts
    updated = 0
    missing = 0
    for arxiv_id, filepath in need_abstract.items():
        abstract = abstracts.get(arxiv_id)
        if not abstract:
            missing += 1
            continue

        if args.dry_run:
            print(f"  [DRY] {filepath.name} — {abstract[:80]}...")
        else:
            update_post(filepath, abstract)
        updated += 1

    print(f"\nDone: {updated} updated, {missing} missing abstracts")
    return 0


if __name__ == "__main__":
    sys.exit(main())
