#!/usr/bin/env python3
"""
Fetch journal publication data for arXiv feed papers.

Cross-references three sources:
  1. Semantic Scholar batch API (best coverage, DOIs, structured journal data)
  2. arXiv API (journal_ref field, when authors update their submissions)
  3. CrossRef API (authoritative journal publication year from DOI)

Usage:
    python3 _scripts/arxiv/fetch_journal_refs.py              # fetch + update posts + rebuild index
    python3 _scripts/arxiv/fetch_journal_refs.py --dry-run    # preview only
    python3 _scripts/arxiv/fetch_journal_refs.py --refresh    # ignore cache, re-fetch all
    python3 _scripts/arxiv/fetch_journal_refs.py --refresh-empty  # re-fetch only papers with no journal ref
    python3 _scripts/arxiv/fetch_journal_refs.py --stats      # show stats only
    python3 _scripts/arxiv/fetch_journal_refs.py --no-update  # fetch + cache, skip file updates

Requires S2_API_KEY environment variable.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

from journal_names import normalize_journal_name

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
POSTS_DIR = REPO_ROOT / "_arxiv"
CACHE_DB = SCRIPT_DIR / ".journal-refs-cache.db"
INDEX_FILE = REPO_ROOT / "assets" / "data" / "arxiv-index.json"

S2_API_KEY = os.environ.get("S2_API_KEY", "")
S2_BATCH_URL = "https://api.semanticscholar.org/graph/v1/paper/batch"
S2_FIELDS = "externalIds,journal,venue,publicationVenue,year"
S2_BATCH_SIZE = 500
S2_RATE_LIMIT = 1.1  # seconds between requests

ARXIV_API = "https://export.arxiv.org/api/query"
ARXIV_BATCH_SIZE = 200  # IDs per request (comma-separated in id_list)
ARXIV_RATE_LIMIT = 3.5  # arXiv asks for >=3s between requests
ARXIV_NS = {
    "a": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}

CROSSREF_API = "https://api.crossref.org/works"
CROSSREF_RATE_LIMIT = 0.05  # 20 req/s with polite pool (mailto in User-Agent)
CROSSREF_MAILTO = "petrov@virginia.edu"
CROSSREF_BATCH_SIZE = 40  # DOIs per batch filter request


# ── Cache ──────────────────────────────────────────────────────────────

def init_cache():
    db = sqlite3.connect(str(CACHE_DB))
    db.execute("""CREATE TABLE IF NOT EXISTS journal_refs (
        arxiv_id TEXT PRIMARY KEY,
        journal_name TEXT,
        journal_volume TEXT,
        journal_pages TEXT,
        doi TEXT,
        venue TEXT,
        pub_year INTEGER,
        source TEXT,
        fetched_at TEXT DEFAULT (datetime('now')),
        raw_json TEXT
    )""")
    # Add crossref_year column (migration for existing caches)
    try:
        db.execute("ALTER TABLE journal_refs ADD COLUMN crossref_year INTEGER")
    except sqlite3.OperationalError:
        pass  # column already exists
    db.commit()
    return db


def get_cached(db, arxiv_ids):
    cached = {}
    for i in range(0, len(arxiv_ids), 500):
        batch = arxiv_ids[i:i + 500]
        placeholders = ",".join("?" * len(batch))
        rows = db.execute(
            f"SELECT arxiv_id, journal_name, journal_volume, journal_pages, doi, venue, pub_year, crossref_year "
            f"FROM journal_refs WHERE arxiv_id IN ({placeholders})",
            batch,
        ).fetchall()
        for row in rows:
            cached[row[0]] = {
                "journal_name": row[1] or "",
                "journal_volume": row[2] or "",
                "journal_pages": row[3] or "",
                "doi": row[4] or "",
                "venue": row[5] or "",
                "pub_year": row[7] if row[7] else row[6],  # prefer crossref_year
            }
    return cached


def save_to_cache(db, results):
    db.executemany(
        """INSERT INTO journal_refs
           (arxiv_id, journal_name, journal_volume, journal_pages, doi, venue, pub_year, source, raw_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(arxiv_id) DO UPDATE SET
             journal_name=excluded.journal_name,
             journal_volume=excluded.journal_volume,
             journal_pages=excluded.journal_pages,
             doi=excluded.doi,
             venue=excluded.venue,
             pub_year=excluded.pub_year,
             source=excluded.source,
             raw_json=excluded.raw_json,
             fetched_at=datetime('now')""",
        results,
    )
    db.commit()


# ── Semantic Scholar ───────────────────────────────────────────────────

def s2_fetch_batch(arxiv_ids):
    """Query S2 batch API. Returns list of (arxiv_id, entry_or_None)."""
    s2_ids = [f"ArXiv:{aid}" for aid in arxiv_ids]
    payload = json.dumps({"ids": s2_ids}).encode()

    req = urllib.request.Request(
        f"{S2_BATCH_URL}?fields={S2_FIELDS}",
        data=payload,
        headers={"Content-Type": "application/json", "x-api-key": S2_API_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  S2 API error {e.code}: {body[:200]}")
        return [(aid, None) for aid in arxiv_ids]
    except Exception as e:
        print(f"  S2 request failed: {e}")
        return [(aid, None) for aid in arxiv_ids]

    return list(zip(arxiv_ids, data))


def parse_s2_entry(entry):
    """Extract journal info from S2 response. Returns dict or None."""
    if entry is None:
        return None

    journal = entry.get("journal") or {}
    j_name = (journal.get("name") or "").strip()
    j_volume = (journal.get("volume") or "").strip()
    j_pages = (journal.get("pages") or "").strip().strip()

    # Filter arXiv-only and S2 category labels (e.g. "arXiv: Probability")
    if j_name.lower() in ("arxiv", "arxiv.org", "") or j_name.lower().startswith("arxiv:"):
        j_name = ""
    if j_volume.startswith("abs/"):
        j_volume = ""

    doi = (entry.get("externalIds") or {}).get("DOI", "")
    # Filter arXiv DOIs (10.48550/arXiv.*)
    if doi and "48550/arxiv" in doi.lower():
        doi = ""

    venue = (entry.get("venue") or "").strip()
    if venue.lower() in ("arxiv.org", "arxiv", ""):
        venue = ""
    pub_year = entry.get("year")

    return {
        "journal_name": j_name,
        "journal_volume": j_volume,
        "journal_pages": j_pages,
        "doi": doi,
        "venue": venue,
        "pub_year": pub_year,
    }


# ── arXiv API ──────────────────────────────────────────────────────────

def arxiv_fetch_batch(arxiv_ids):
    """Query arXiv API for journal_ref and doi. Returns dict of id -> info."""
    id_list = ",".join(arxiv_ids)
    url = f"{ARXIV_API}?id_list={id_list}&max_results={len(arxiv_ids)}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=60) as resp:
            xml_data = resp.read()
    except Exception as e:
        print(f"  arXiv API failed: {e}")
        return {}

    tree = ET.fromstring(xml_data)
    results = {}
    for entry in tree.findall(".//a:entry", ARXIV_NS):
        id_el = entry.find("a:id", ARXIV_NS)
        if id_el is None:
            continue
        # Extract clean arXiv ID from URL
        raw_id = id_el.text.strip().split("/")[-1]
        # Remove version suffix
        aid = re.sub(r"v\d+$", "", raw_id)

        jr_el = entry.find("arxiv:journal_ref", ARXIV_NS)
        doi_el = entry.find("arxiv:doi", ARXIV_NS)

        journal_ref = jr_el.text.strip() if jr_el is not None and jr_el.text else ""
        doi = doi_el.text.strip() if doi_el is not None and doi_el.text else ""

        if journal_ref or doi:
            results[aid] = {"journal_ref_raw": journal_ref, "doi": doi}

    return results


# ── CrossRef API ──────────────────────────────────────────────────────

def crossref_fetch_year(doi):
    """Query CrossRef for the publication year of a single DOI. Returns year or None."""
    url = f"{CROSSREF_API}/{urllib.request.quote(doi, safe='')}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": f"FetchJournalRefs/1.0 (mailto:{CROSSREF_MAILTO})"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except Exception:
        return None

    msg = data.get("message", {})
    # Prefer published-print > published-online > issued
    for field in ("published-print", "published-online", "issued"):
        parts = (msg.get(field) or {}).get("date-parts")
        if parts and parts[0] and parts[0][0]:
            return int(parts[0][0])
    return None


def crossref_fetch_batch(dois):
    """Query CrossRef for publication years of multiple DOIs using filter API.
    Returns dict of doi -> year."""
    results = {}
    # CrossRef filter supports multiple DOIs comma-separated
    filter_str = ",".join(f"doi:{d}" for d in dois)
    params = urllib.parse.urlencode({
        "filter": filter_str,
        "select": "DOI,published-print,published-online,issued",
        "rows": len(dois),
    })
    url = f"{CROSSREF_API}?{params}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": f"FetchJournalRefs/1.0 (mailto:{CROSSREF_MAILTO})"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  CrossRef batch failed: {e}")
        return results

    for item in data.get("message", {}).get("items", []):
        doi_key = item.get("DOI", "")
        for field in ("published-print", "published-online", "issued"):
            parts = (item.get(field) or {}).get("date-parts")
            if parts and parts[0] and parts[0][0]:
                results[doi_key.lower()] = int(parts[0][0])
                break
    return results


# ── Merge logic ────────────────────────────────────────────────────────

def merge_sources(s2_info, arxiv_info):
    """Merge S2 and arXiv data, preferring S2 structured data but filling gaps."""
    result = {
        "journal_name": "",
        "journal_volume": "",
        "journal_pages": "",
        "doi": "",
        "venue": "",
        "pub_year": None,
    }

    if s2_info:
        result.update({k: v for k, v in s2_info.items() if v})

    if arxiv_info:
        # Fill in DOI from arXiv if S2 didn't have it
        if not result["doi"] and arxiv_info.get("doi"):
            result["doi"] = arxiv_info["doi"]
        # If S2 had no journal name, try to parse arXiv journal_ref
        if not result["journal_name"] and arxiv_info.get("journal_ref_raw"):
            result["journal_name"] = arxiv_info["journal_ref_raw"]

    return result


# ── Post I/O ───────────────────────────────────────────────────────────

def get_all_arxiv_ids():
    ids = []
    for f in sorted(POSTS_DIR.glob("*.md")):
        text = f.read_text(encoding="utf-8")
        m = re.search(r'^arxiv-id:\s*"?([^"\s]+)"?', text, re.MULTILINE)
        if m:
            ids.append(m.group(1))
    return ids


def format_journal_ref(info):
    """Format structured journal info into a display string using normalized name."""
    name = info.get("journal_name", "")
    if not name:
        return "", ""
    badge, canonical = normalize_journal_name(name)
    parts = [canonical]
    vol = info.get("journal_volume", "")
    if vol:
        parts.append(f"vol. {vol}")
    pages = info.get("journal_pages", "")
    if pages:
        parts.append(f"pp. {pages}")
    year = info.get("pub_year")
    if year:
        parts.append(f"({year})")
    return badge, ", ".join(parts)


def yaml_quote(s):
    """Safely quote a string for YAML front matter.

    Handles embedded quotes, colons, newlines, and other YAML-breaking chars.
    """
    if not s:
        return '""'
    # Collapse whitespace/newlines to single spaces
    s = re.sub(r'\s+', ' ', s).strip()
    # If it contains double quotes, use single quotes (and escape single quotes)
    if '"' in s:
        return "'" + s.replace("'", "''") + "'"
    return '"' + s + '"'


def update_post_frontmatter(filepath, journal_name, journal_ref, doi):
    """Add journal-name, journal-ref, and doi to post YAML front matter. Returns True if changed."""
    text = filepath.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return False

    front = parts[1]

    # Skip posts with manually curated journal data
    if re.search(r'\njournal-locked:\s*true', front):
        return False

    # Remove old fields
    front_new = re.sub(r'\njournal-name:.*', '', front)
    front_new = re.sub(r'\njournal-ref:.*', '', front_new)
    front_new = re.sub(r'\ndoi:.*', '', front_new)

    additions = ""
    if journal_name:
        additions += f'\njournal-name: {yaml_quote(journal_name)}'
    if journal_ref:
        additions += f'\njournal-ref: {yaml_quote(journal_ref)}'
    if doi:
        additions += f'\ndoi: {yaml_quote(doi)}'

    if not additions:
        return False

    front_new = front_new.rstrip("\n") + additions + "\n"
    if front_new == front:
        return False

    filepath.write_text("---" + front_new + "---" + parts[2], encoding="utf-8")
    return True


def update_search_index(all_cached):
    """Add journal-ref (jr) and doi (d2) fields to arxiv-index.json."""
    if not INDEX_FILE.exists():
        print("Warning: arxiv-index.json not found, skipping index update")
        return 0

    index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    updated = 0
    for entry in index:
        aid = entry.get("id", "")
        info = all_cached.get(aid)
        if info and info["journal_name"]:
            badge, jr = format_journal_ref(info)
            doi = info.get("doi", "")
            if badge:
                entry["jn"] = badge  # journal name badge
            if jr:
                entry["jr"] = jr  # full journal ref (tooltip)
                updated += 1
            if doi:
                entry["d2"] = doi  # DOI
        else:
            # No API data — preserve existing fields (API may be temporarily empty)
            pass

    INDEX_FILE.write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Updated arxiv-index.json: {updated} entries with journal refs")
    return updated


# ── Stats ──────────────────────────────────────────────────────────────

def show_stats(db, all_ids):
    cached = get_cached(db, all_ids)
    total = len(all_ids)
    in_cache = len(cached)
    has_journal = sum(1 for v in cached.values() if v["journal_name"])
    has_doi = sum(1 for v in cached.values() if v["doi"])
    no_journal = in_cache - has_journal

    print(f"\nTotal papers in feed:    {total}")
    print(f"Looked up:               {in_cache}")
    print(f"  With journal ref:      {has_journal} ({100*has_journal/max(in_cache,1):.0f}%)")
    print(f"  With DOI:              {has_doi}")
    print(f"  No journal (preprint): {no_journal}")
    print(f"Not yet looked up:       {total - in_cache}")

    if has_journal:
        journals = {}
        for v in cached.values():
            j = v["journal_name"]
            if j:
                journals[j] = journals.get(j, 0) + 1
        print(f"\nTop journals:")
        for j, count in sorted(journals.items(), key=lambda x: -x[1])[:20]:
            print(f"  {count:4d}  {j}")


# ── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch journal refs from S2 + arXiv")
    parser.add_argument("--dry-run", action="store_true", help="Preview without modifying files")
    parser.add_argument("--refresh", action="store_true", help="Re-fetch all, ignoring cache")
    parser.add_argument("--refresh-empty", action="store_true",
                        help="Re-fetch only papers with no journal ref in cache")
    parser.add_argument("--stats", action="store_true", help="Show statistics only")
    parser.add_argument("--no-update", action="store_true", help="Fetch and cache only")
    args = parser.parse_args()

    if not S2_API_KEY:
        print("ERROR: Set S2_API_KEY environment variable")
        sys.exit(1)

    db = init_cache()
    all_ids = get_all_arxiv_ids()
    print(f"Found {len(all_ids)} papers in {POSTS_DIR}")

    if args.stats:
        show_stats(db, all_ids)
        db.close()
        return 0

    # Determine which IDs need fetching
    if args.refresh:
        to_fetch = all_ids
    elif args.refresh_empty:
        cached = get_cached(db, all_ids)
        to_fetch = [aid for aid in all_ids
                    if aid not in cached or not cached[aid]["journal_name"]]
    else:
        cached = get_cached(db, all_ids)
        to_fetch = [aid for aid in all_ids if aid not in cached]

    print(f"Need to fetch: {len(to_fetch)} (cached: {len(all_ids) - len(to_fetch)})")

    if to_fetch and not args.dry_run:
        # ── Phase 1: Semantic Scholar ──
        print("\n=== Phase 1: Semantic Scholar ===")
        s2_data = {}  # arxiv_id -> parsed info
        for i in range(0, len(to_fetch), S2_BATCH_SIZE):
            batch = to_fetch[i:i + S2_BATCH_SIZE]
            n = i // S2_BATCH_SIZE + 1
            total = (len(to_fetch) + S2_BATCH_SIZE - 1) // S2_BATCH_SIZE
            print(f"  S2 batch {n}/{total}: {len(batch)} papers...")

            results = s2_fetch_batch(batch)
            for aid, entry in results:
                info = parse_s2_entry(entry)
                if info:
                    s2_data[aid] = info

            if i + S2_BATCH_SIZE < len(to_fetch):
                time.sleep(S2_RATE_LIMIT)

        s2_found = sum(1 for v in s2_data.values() if v.get("journal_name"))
        print(f"  S2: {s2_found} with journal data out of {len(to_fetch)}")

        # ── Phase 2: arXiv API (always, for cross-checking) ──
        print(f"\n=== Phase 2: arXiv API (all {len(to_fetch)} papers) ===")
        arxiv_data = {}  # arxiv_id -> {journal_ref_raw, doi}
        for i in range(0, len(to_fetch), ARXIV_BATCH_SIZE):
            batch = to_fetch[i:i + ARXIV_BATCH_SIZE]
            n = i // ARXIV_BATCH_SIZE + 1
            total = (len(to_fetch) + ARXIV_BATCH_SIZE - 1) // ARXIV_BATCH_SIZE
            print(f"  arXiv batch {n}/{total}: {len(batch)} papers...")

            batch_results = arxiv_fetch_batch(batch)
            arxiv_data.update(batch_results)

            if i + ARXIV_BATCH_SIZE < len(to_fetch):
                time.sleep(ARXIV_RATE_LIMIT)

        arxiv_found = len(arxiv_data)
        print(f"  arXiv: {arxiv_found} with journal/DOI data")

        # ── Merge and cache ──
        print("\n=== Merging and caching ===")
        cache_rows = []
        both_agree = 0
        s2_only = 0
        arxiv_only = 0
        for aid in to_fetch:
            merged = merge_sources(s2_data.get(aid), arxiv_data.get(aid))
            s2_has = bool(s2_data.get(aid, {}).get("journal_name"))
            arxiv_has = bool(arxiv_data.get(aid, {}).get("journal_ref_raw") or
                            arxiv_data.get(aid, {}).get("doi"))
            if s2_has and arxiv_has:
                both_agree += 1
                source = "both"
            elif s2_has:
                s2_only += 1
                source = "s2"
            elif arxiv_has:
                arxiv_only += 1
                source = "arxiv"
            else:
                source = "none"
            raw = json.dumps(s2_data.get(aid)) if aid in s2_data else None
            cache_rows.append((
                aid,
                merged["journal_name"],
                merged["journal_volume"],
                merged["journal_pages"],
                merged["doi"],
                merged["venue"],
                merged["pub_year"],
                source,
                raw,
            ))

        save_to_cache(db, cache_rows)
        print(f"Cached {len(cache_rows)} entries")
        print(f"  Both sources agree: {both_agree}")
        print(f"  S2 only:            {s2_only}")
        print(f"  arXiv only:         {arxiv_only}")

    elif to_fetch and args.dry_run:
        total_s2 = (len(to_fetch) + S2_BATCH_SIZE - 1) // S2_BATCH_SIZE
        total_ax = (len(to_fetch) + ARXIV_BATCH_SIZE - 1) // ARXIV_BATCH_SIZE
        print(f"[dry-run] Would make {total_s2} S2 + {total_ax} arXiv batch requests")

    # ── Phase 3: CrossRef publication years ──
    if not args.dry_run:
        # Find all cached entries with DOIs but no crossref_year
        rows = db.execute(
            "SELECT arxiv_id, doi FROM journal_refs WHERE doi != '' AND doi IS NOT NULL AND crossref_year IS NULL"
        ).fetchall()
        doi_to_aids = {}  # doi_lower -> [arxiv_ids]
        for aid, doi in rows:
            doi_to_aids.setdefault(doi.lower(), []).append(aid)

        if doi_to_aids:
            dois_to_fetch = list(doi_to_aids.keys())
            print(f"\n=== Phase 3: CrossRef publication years ({len(dois_to_fetch)} DOIs) ===")
            cr_results = {}  # doi_lower -> year
            for i in range(0, len(dois_to_fetch), CROSSREF_BATCH_SIZE):
                batch = dois_to_fetch[i:i + CROSSREF_BATCH_SIZE]
                n = i // CROSSREF_BATCH_SIZE + 1
                total_batches = (len(dois_to_fetch) + CROSSREF_BATCH_SIZE - 1) // CROSSREF_BATCH_SIZE
                if n % 25 == 1 or n == total_batches:
                    print(f"  CrossRef batch {n}/{total_batches}...")

                batch_results = crossref_fetch_batch(batch)
                cr_results.update(batch_results)

                # Fall back to individual requests for misses
                for doi in batch:
                    if doi.lower() not in cr_results:
                        year = crossref_fetch_year(doi)
                        if year:
                            cr_results[doi.lower()] = year

                if i + CROSSREF_BATCH_SIZE < len(dois_to_fetch):
                    time.sleep(CROSSREF_RATE_LIMIT)

            # Update cache with crossref years
            updates = []
            for doi_lower, year in cr_results.items():
                for aid in doi_to_aids.get(doi_lower, []):
                    updates.append((year, aid))
            if updates:
                db.executemany(
                    "UPDATE journal_refs SET crossref_year = ? WHERE arxiv_id = ?",
                    updates,
                )
                db.commit()
            cr_found = len(cr_results)
            print(f"  CrossRef: {cr_found} publication years found, {len(updates)} cache entries updated")

    # ── Update files ──
    if args.dry_run or args.no_update:
        show_stats(db, all_ids)
        db.close()
        return 0

    print("\n=== Updating post front matter ===")
    all_cached = get_cached(db, all_ids)
    updated = 0
    for f in sorted(POSTS_DIR.glob("*.md")):
        text = f.read_text(encoding="utf-8")
        m = re.search(r'^arxiv-id:\s*"?([^"\s]+)"?', text, re.MULTILINE)
        if not m:
            continue
        aid = m.group(1)
        info = all_cached.get(aid)
        if not info or not info["journal_name"]:
            continue

        badge, journal_ref = format_journal_ref(info)
        doi = info.get("doi", "")
        if update_post_frontmatter(f, badge, journal_ref, doi):
            updated += 1

    print(f"Updated {updated} posts")

    print("\n=== Updating search index ===")
    update_search_index(all_cached)

    show_stats(db, all_ids)
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
