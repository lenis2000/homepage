#!/usr/bin/env python3
"""
Export the arXiv feed as a machine-generated BibTeX file.

Usage:
    python3 _scripts/arxiv/export_bibtex.py

Output:
    assets/data/arxiv-all.bib
"""

import re
import sqlite3
import unicodedata
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
POSTS_DIR = REPO_ROOT / "_arxiv"
OUTPUT_FILE = REPO_ROOT / "assets" / "data" / "arxiv-all.bib"
CACHE_DB = SCRIPT_DIR / ".journal-refs-cache.db"

PARTICLES = {
    "da", "de", "del", "della", "den", "der", "di", "du",
    "la", "le", "st", "st.", "ter", "van", "von",
}
SUFFIXES = {"jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"}
_DASH_RE = re.compile(r"[\u2010-\u2015\u2212]")
_SINGLE_HYPHEN_RE = re.compile(r"(?<!-)\s*-\s*(?!-)")
_MULTI_SPACE_RE = re.compile(r"\s+")


def ascii_fold(text):
    normalized = unicodedata.normalize("NFKD", text or "")
    return normalized.encode("ascii", "ignore").decode("ascii")


def normalize_key_piece(text):
    folded = ascii_fold(text)
    parts = re.findall(r"[A-Za-z0-9]+", folded)
    return "".join(part[:1].upper() + part[1:] for part in parts if part)


def surname_for_key(full_name):
    name = _MULTI_SPACE_RE.sub(" ", (full_name or "").strip())
    if not name:
        return "Unknown"

    if "," in name:
        return normalize_key_piece(name.split(",", 1)[0])

    tokens = name.split(" ")
    while tokens and tokens[-1].lower() in SUFFIXES:
        tokens.pop()
    if not tokens:
        return "Unknown"

    surname_tokens = [tokens[-1]]
    idx = len(tokens) - 2
    while idx >= 0:
        token = tokens[idx]
        low = token.lower()
        if low in PARTICLES or token[:1].islower():
            surname_tokens.insert(0, token)
            idx -= 1
            continue
        break
    return normalize_key_piece(" ".join(surname_tokens))


def citation_key(authors, arxiv_id):
    pieces = [surname_for_key(author) for author in (authors or [])[:4]]
    if not pieces:
        pieces = ["Unknown"]
    safe_id = (arxiv_id or "").replace("/", "-")
    return "".join(pieces) + "_" + safe_id


def normalize_pages(pages):
    if not pages:
        return ""
    normalized = _DASH_RE.sub("-", pages.strip())
    normalized = _SINGLE_HYPHEN_RE.sub("--", normalized)
    normalized = _MULTI_SPACE_RE.sub(" ", normalized)
    return normalized


def clean_doi(doi):
    value = (doi or "").strip()
    if not value:
        return ""
    return "" if value.lower().startswith("10.48550/arxiv") else value


def escape_field(text):
    return (text or "").replace("&", r"\&")


def parse_year(date_value):
    if date_value is None:
        return ""
    return str(date_value)[:4]


def parse_journal_ref(journal_ref):
    parsed = {"volume": "", "pages": "", "year": ""}
    if not journal_ref:
        return parsed

    vol_match = re.search(r"\bvol\.\s*([^,()]+)", journal_ref)
    if vol_match:
        parsed["volume"] = vol_match.group(1).strip()

    pages_match = re.search(r"\bpp\.\s*([^,()]+)", journal_ref)
    if pages_match:
        parsed["pages"] = normalize_pages(pages_match.group(1))

    years = re.findall(r"\((\d{4})\)", journal_ref)
    if years:
        parsed["year"] = years[-1]

    return parsed


def load_cache():
    if not CACHE_DB.exists():
        return {}

    conn = sqlite3.connect(str(CACHE_DB))
    rows = conn.execute(
        """
        SELECT arxiv_id,
               journal_volume,
               journal_pages,
               doi,
               COALESCE(crossref_year, pub_year)
        FROM journal_refs
        """
    ).fetchall()
    conn.close()

    cached = {}
    for arxiv_id, volume, pages, doi, year in rows:
        cached[arxiv_id] = {
            "volume": (volume or "").strip(),
            "pages": normalize_pages(pages or ""),
            "doi": clean_doi(doi),
            "year": str(year) if year else "",
        }
    return cached


def load_post(filepath):
    text = filepath.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    front_matter = yaml.safe_load(parts[1]) or {}
    arxiv_id = front_matter.get("arxiv-id")
    if not arxiv_id:
        return None
    authors = front_matter.get("authors") or []
    if not isinstance(authors, list):
        authors = [str(authors)]
    categories = front_matter.get("arxiv-categories") or []
    if not isinstance(categories, list):
        categories = [str(categories)]
    return {
        "id": str(arxiv_id),
        "title": str(front_matter.get("title", "")).strip(),
        "authors": [str(author).strip() for author in authors if str(author).strip()],
        "categories": [str(cat).strip() for cat in categories if str(cat).strip()],
        "date_year": parse_year(front_matter.get("date")),
        "journal_name": str(front_matter.get("journal-name", "")).strip(),
        "journal_ref": str(front_matter.get("journal-ref", "")).strip(),
        "doi": clean_doi(front_matter.get("doi", "")),
    }


def build_entry(post, cache_entry):
    journal_name = escape_field(post["journal_name"])
    journal_ref = post["journal_ref"]
    parsed_ref = parse_journal_ref(journal_ref)
    is_published = bool(journal_name)

    volume = (cache_entry.get("volume") or parsed_ref["volume"]).strip() if cache_entry else parsed_ref["volume"]
    pages = (cache_entry.get("pages") or parsed_ref["pages"]).strip() if cache_entry else parsed_ref["pages"]
    year = (cache_entry.get("year") or parsed_ref["year"]).strip() if cache_entry else parsed_ref["year"]
    doi = post["doi"] or (cache_entry.get("doi") if cache_entry else "")

    if not year:
        year = post["date_year"]

    note = "arXiv:" + post["id"]
    if post["categories"]:
        note += " [" + post["categories"][0] + "]"

    fields = [
        ("author", " and ".join(post["authors"])),
        ("title", "{" + escape_field(post["title"]) + "}"),
    ]

    if is_published:
        fields.append(("journal", journal_name))
        if volume:
            fields.append(("volume", volume))
        if pages:
            fields.append(("pages", pages))
        if year:
            fields.append(("year", year))
        if doi:
            fields.append(("doi", doi))
        fields.append(("note", note))
    else:
        fields.append(("journal", "arXiv preprint"))
        if year:
            fields.append(("year", year))
        fields.append(("note", note))

    lines = [f"@article{{{citation_key(post['authors'], post['id'])},"]
    for idx, (field, value) in enumerate(fields):
        suffix = "," if idx < len(fields) - 1 else ""
        lines.append(f"  {field} = {{{value}}}{suffix}")
    lines.append("}")
    return "\n".join(lines)


def main():
    cache = load_cache()
    posts = []
    for filepath in sorted(POSTS_DIR.glob("*.md"), reverse=True):
        post = load_post(filepath)
        if post:
            posts.append(post)

    entries = [build_entry(post, cache.get(post["id"], {})) for post in posts]
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text("\n\n".join(entries) + "\n", encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
