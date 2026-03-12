#!/usr/bin/env python3
"""
Build a manifest of arxiv source files for the web viewer.

Scans local source directories first, falls back to S3 listing
for papers not found locally.

Output: assets/data/arxiv-sources-manifest.json
Format: {"arxiv-id": [{"name": "main.tex", "size": 12345}, ...], ...}

Usage:
    python3 build_sources_manifest.py              # build manifest
    python3 build_sources_manifest.py --s3-only    # only use S3 listings
    python3 build_sources_manifest.py --dry-run    # show stats, don't write
"""

import argparse
import json
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
SOURCES_DIR = SCRIPT_DIR / "sources"
OUTPUT_FILE = REPO_ROOT / "assets" / "data" / "arxiv-sources-manifest.json"
ARXIV_DIR = REPO_ROOT / "_arxiv"

OUR_S3_BUCKET = "lpetrov.cc.storage"
OUR_S3_PREFIX = "arxiv-sources"

# Files to exclude from the manifest (not useful for viewing)
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", ".no-source", ".pdf-only", "manifest.json"}
EXCLUDE_EXTENSIONS = {".aux", ".log", ".out", ".synctex.gz", ".toc", ".nav", ".snm"}


def safe_dirname(arxiv_id: str) -> str:
    return arxiv_id.replace("/", "-")


def get_all_arxiv_ids() -> list[str]:
    """Read arxiv-id from all _arxiv/ post front matter."""
    ids = []
    for path in sorted(ARXIV_DIR.glob("*.md")):
        with open(path) as f:
            in_front_matter = False
            for line in f:
                line = line.strip()
                if line == "---":
                    if not in_front_matter:
                        in_front_matter = True
                        continue
                    else:
                        break
                if in_front_matter and line.startswith("arxiv-id:"):
                    arxiv_id = line.split(":", 1)[1].strip().strip('"').strip("'")
                    ids.append(arxiv_id)
                    break
    return ids


def scan_local_dir(arxiv_id: str) -> list[dict] | None:
    """Scan local source directory for file listing. Returns None if not found."""
    d = SOURCES_DIR / safe_dirname(arxiv_id)
    if not d.is_dir():
        return None

    files = []
    for f in sorted(d.rglob("*")):
        if not f.is_file():
            continue
        if f.name in EXCLUDE_FILES:
            continue
        if f.suffix.lower() in EXCLUDE_EXTENSIONS:
            continue
        # Use relative path from the paper dir (preserves subdirectory structure)
        rel = str(f.relative_to(d))
        files.append({"name": rel, "size": f.stat().st_size})

    return files if files else None


def scan_s3_dir(arxiv_id: str) -> list[dict] | None:
    """List files from S3 for a given arxiv paper."""
    safe_id = safe_dirname(arxiv_id)
    s3_path = f"s3://{OUR_S3_BUCKET}/{OUR_S3_PREFIX}/{safe_id}/"
    try:
        result = subprocess.run(
            ["aws", "s3", "ls", s3_path, "--no-cli-pager"],
            check=True, capture_output=True, text=True, timeout=30,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None

    files = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 4:
            size = int(parts[2])
            name = parts[3]
            if name in EXCLUDE_FILES:
                continue
            ext = Path(name).suffix.lower()
            if ext in EXCLUDE_EXTENSIONS:
                continue
            files.append({"name": name, "size": size})

    return sorted(files, key=lambda f: f["name"]) if files else None


def main():
    parser = argparse.ArgumentParser(description="Build arxiv sources manifest")
    parser.add_argument("--s3-only", action="store_true",
                        help="Only use S3 listings, skip local scan")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show stats without writing output")
    args = parser.parse_args()

    all_ids = get_all_arxiv_ids()
    manifest = {}
    local_count = 0
    s3_count = 0
    missing_count = 0

    print(f"Papers in feed: {len(all_ids)}")

    for i, arxiv_id in enumerate(all_ids):
        files = None

        # Try local first
        if not args.s3_only:
            files = scan_local_dir(arxiv_id)
            if files:
                local_count += 1

        # Fall back to S3
        if files is None:
            files = scan_s3_dir(arxiv_id)
            if files:
                s3_count += 1

        if files:
            manifest[arxiv_id] = files
        else:
            missing_count += 1

        if (i + 1) % 500 == 0:
            print(f"  processed {i+1}/{len(all_ids)}...")

    print(f"\nLocal:   {local_count}")
    print(f"S3:      {s3_count}")
    print(f"Missing: {missing_count}")
    print(f"Total in manifest: {len(manifest)}")

    if args.dry_run:
        print("(dry run — not writing output)")
        return

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, separators=(",", ":"), sort_keys=True))
    tmp.rename(OUTPUT_FILE)
    size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    print(f"Wrote {OUTPUT_FILE} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
