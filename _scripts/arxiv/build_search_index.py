#!/usr/bin/env python3
"""
Build a compact JSON search index from _arxiv/ for fast client-side search.

Usage:
    python3 _scripts/arxiv/build_search_index.py

Outputs:
    assets/data/arxiv-index.json
    assets/data/arxiv-all.bib
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

_TAG_RE = re.compile(r'<[^>]+>')
_JINJA_RE = re.compile(r'\{%.*?%\}')
_MULTI_SPACE = re.compile(r'\s+')


def _strip_to_plain(html):
    """Strip HTML/MathML to plain text for search indexing.

    Extracts LaTeX from <annotation> tags, strips all other HTML,
    removes Jinja tags, and collapses whitespace.
    """
    # Replace <annotation encoding="application/x-tex">LATEX</annotation> with $LATEX$
    text = re.sub(
        r'<annotation[^>]*>(.*?)</annotation>',
        lambda m: '$' + m.group(1) + '$',
        html,
    )
    # Remove all remaining HTML tags
    text = _TAG_RE.sub(' ', text)
    # Remove Jinja {% raw %} / {% endraw %} etc
    text = _JINJA_RE.sub('', text)
    # Collapse whitespace
    text = _MULTI_SPACE.sub(' ', text).strip()
    return text


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
POSTS_DIR = REPO_ROOT / "_arxiv"
OUTPUT_FILE = REPO_ROOT / "assets" / "data" / "arxiv-index.json"
AUTHORS_FILE = SCRIPT_DIR / "authors.yml"
AUTHORS_DATA_FILE = REPO_ROOT / "_data" / "arxiv_authors.yml"
BIB_EXPORT_SCRIPT = SCRIPT_DIR / "export_bibtex.py"


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
                # Unescape YAML double-quoted string backslashes
                fm[key] = val.replace('\\\\', '\\')

    arxiv_id = fm.get("arxiv-id", "")
    if not arxiv_id:
        return None

    title = fm.get("title", "")
    authors = fm.get("authors", [])
    cats = fm.get("arxiv-categories", [])
    date = fm.get("date", "")
    date_short = date.split("T")[0] if "T" in date else date

    # Extract plain-text abstract from post body (for search)
    body = parts[2] if len(parts) > 2 else ""
    abstract = _strip_to_plain(body)

    entry = {
        "id": arxiv_id,
        "t": title,
        "a": ", ".join(authors) if isinstance(authors, list) else str(authors),
        "c": " ".join(cats) if isinstance(cats, list) else str(cats),
        "y": date_short[:4],
        "d": date_short,
        "s": abstract,
    }

    # Journal metadata (only include if present to keep index compact)
    jn = fm.get("journal-name", "")
    if jn:
        entry["jn"] = jn
    jr = fm.get("journal-ref", "")
    if jr:
        entry["jr"] = jr
    doi = fm.get("doi", "")
    if doi:
        entry["doi"] = doi

    return entry


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

    # Sync author names to Jekyll _data/
    if AUTHORS_FILE.exists():
        with open(AUTHORS_FILE) as f:
            config = yaml.safe_load(f)
        names = sorted(
            [a["name"] for a in config["authors"]],
            key=lambda n: n.split()[-1].lower(),
        )
        AUTHORS_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(AUTHORS_DATA_FILE, "w") as f:
            for n in names:
                f.write(f'- "{n}"\n')
        print(f"Synced {len(names)} author names to {AUTHORS_DATA_FILE}")

    subprocess.run([sys.executable, str(BIB_EXPORT_SCRIPT)], check=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
