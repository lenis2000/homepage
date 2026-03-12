#!/usr/bin/env python3
"""
Build arxiv source file listings for the web viewer.

Outputs:
  1. Per-paper _files.json in each local source dir (uploaded to S3)
     — used by the source viewer page for instant loading
  2. assets/data/arxiv-sources-ids.json — lightweight ID list
     — used by the arxiv feed to show/hide "src" badges

Usage:
    python3 build_sources_manifest.py              # build + upload _files.json
    python3 build_sources_manifest.py --dry-run    # show stats, don't write
    python3 build_sources_manifest.py --no-upload  # build locally only
"""

import argparse
import json
import subprocess
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
SOURCES_DIR = SCRIPT_DIR / "sources"
IDS_FILE = REPO_ROOT / "assets" / "data" / "arxiv-sources-ids.json"
ARXIV_DIR = REPO_ROOT / "_arxiv"

OUR_S3_BUCKET = "lpetrov.cc.storage"
OUR_S3_PREFIX = "arxiv-sources"

# Files to exclude from the manifest (not useful for viewing)
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", ".no-source", ".pdf-only",
                 "manifest.json", "_files.json"}
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


def write_files_json(arxiv_id: str, files: list[dict]) -> Path:
    """Write _files.json into the local source dir."""
    d = SOURCES_DIR / safe_dirname(arxiv_id)
    fpath = d / "_files.json"
    fpath.write_text(json.dumps(files, separators=(",", ":")))
    return fpath



def main():
    parser = argparse.ArgumentParser(description="Build arxiv sources manifest")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show stats without writing output")
    parser.add_argument("--no-upload", action="store_true",
                        help="Don't upload _files.json to S3")
    args = parser.parse_args()

    all_ids = get_all_arxiv_ids()
    source_ids = []
    written = 0
    missing_count = 0

    print(f"Papers in feed: {len(all_ids)}")

    # Step 1: Write _files.json locally for each paper
    for i, arxiv_id in enumerate(all_ids):
        files = scan_local_dir(arxiv_id)

        if files:
            source_ids.append(arxiv_id)
            if not args.dry_run:
                write_files_json(arxiv_id, files)
                written += 1
        else:
            missing_count += 1

        if (i + 1) % 1000 == 0:
            print(f"  scanned {i+1}/{len(all_ids)}...")

    print(f"\nWith sources: {len(source_ids)}")
    print(f"Missing:      {missing_count}")

    if args.dry_run:
        print("(dry run — nothing written)")
        return

    print(f"Wrote _files.json: {written}")

    # Step 2: Bulk upload all _files.json to S3 via sync
    if not args.no_upload:
        print("Uploading _files.json to S3 (bulk sync)...", flush=True)
        try:
            subprocess.run(
                ["aws", "s3", "sync", str(SOURCES_DIR),
                 f"s3://{OUR_S3_BUCKET}/{OUR_S3_PREFIX}/",
                 "--exclude", "*", "--include", "*/_files.json",
                 "--size-only"],
                check=True,
            )
            print("Upload complete.")
        except subprocess.CalledProcessError as e:
            print(f"ERROR uploading: {e}")

    # Step 3: Write lightweight ID list for feed badges
    IDS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = IDS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(source_ids, separators=(",", ":")))
    tmp.rename(IDS_FILE)
    size_kb = IDS_FILE.stat().st_size / 1024
    print(f"Wrote {IDS_FILE} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
