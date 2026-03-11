#!/usr/bin/env python3
"""
Download arXiv paper sources for all papers in the feed.

Downloads from https://export.arxiv.org/e-print/{id}, unpacks locally,
and uploads to s3://lpetrov.cc.storage/arxiv-sources/{id}/.

Resumable: tracks progress in sources/manifest.json. Safe to Ctrl-C
and re-run — picks up where it left off.

Usage:
    python3 download_sources.py              # download missing papers
    python3 download_sources.py --upload     # also upload to S3
    python3 download_sources.py --upload-only  # upload already-downloaded
    python3 download_sources.py --dry-run    # show what would be downloaded
    python3 download_sources.py --limit 50   # download at most 50 papers
"""

import argparse
import gzip
import io
import json
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
ARXIV_DIR = REPO_ROOT / "_arxiv"
SOURCES_DIR = SCRIPT_DIR / "sources"
MANIFEST_FILE = SOURCES_DIR / "manifest.json"

OUR_S3_BUCKET = "lpetrov.cc.storage"
OUR_S3_PREFIX = "arxiv-sources"

RATE_LIMIT_SECONDS = 3
EPRINT_URL = "https://export.arxiv.org/e-print/{}"


def load_manifest() -> dict:
    if MANIFEST_FILE.exists():
        return json.loads(MANIFEST_FILE.read_text())
    return {}


def save_manifest(manifest: dict):
    SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    tmp = MANIFEST_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, indent=2, sort_keys=True))
    tmp.rename(MANIFEST_FILE)


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


def safe_dirname(arxiv_id: str) -> str:
    return arxiv_id.replace("/", "-")


def download_and_unpack(arxiv_id: str, dest_dir: Path) -> bool:
    """Download source from arXiv and unpack into dest_dir."""
    url = EPRINT_URL.format(arxiv_id)
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "lpetrov-arxiv-sources/1.0 (academic research)")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise

    dest_dir.mkdir(parents=True, exist_ok=True)

    # Try tar.gz first (multi-file submission)
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
            members = [m for m in tar.getmembers()
                       if not m.name.startswith("/") and ".." not in m.name]
            tar.extractall(path=dest_dir, members=members)
            return True
    except tarfile.TarError:
        pass

    # Plain gzip (single-file submission)
    try:
        decompressed = gzip.decompress(data)
        if decompressed[:5] == b"%PDF-":
            (dest_dir / "main.pdf").write_bytes(decompressed)
        else:
            (dest_dir / "main.tex").write_bytes(decompressed)
        return True
    except gzip.BadGzipFile:
        pass

    # Raw file
    if data[:5] == b"%PDF-":
        (dest_dir / "main.pdf").write_bytes(data)
    elif b"\\documentclass" in data[:2000] or b"\\begin{document}" in data[:5000]:
        (dest_dir / "main.tex").write_bytes(data)
    else:
        (dest_dir / "source.raw").write_bytes(data)
    return True


def upload_to_s3(arxiv_id: str, local_dir: Path) -> bool:
    safe_id = safe_dirname(arxiv_id)
    s3_path = f"s3://{OUR_S3_BUCKET}/{OUR_S3_PREFIX}/{safe_id}/"
    try:
        subprocess.run(
            ["aws", "s3", "sync", str(local_dir), s3_path, "--quiet"],
            check=True, capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ERROR uploading {arxiv_id}: {e.stderr.decode()}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Download arXiv paper sources")
    parser.add_argument("--upload", action="store_true",
                        help="Also upload to S3 after download")
    parser.add_argument("--upload-only", action="store_true",
                        help="Upload already-downloaded papers to S3")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be downloaded/uploaded")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max papers to process (0=all)")
    parser.add_argument("--redownload", action="store_true",
                        help="Re-download already downloaded papers")
    args = parser.parse_args()

    all_ids = get_all_arxiv_ids()
    manifest = load_manifest()

    # Upload-only mode
    if args.upload_only:
        to_upload = [aid for aid, v in manifest.items()
                     if v.get("status") == "downloaded" and not v.get("uploaded")]
        if args.limit > 0:
            to_upload = to_upload[:args.limit]
        n_downloaded = sum(1 for v in manifest.values()
                          if v.get("status") == "downloaded")
        n_uploaded = sum(1 for v in manifest.values() if v.get("uploaded"))
        print(f"Downloaded papers:  {n_downloaded}")
        print(f"Already uploaded:   {n_uploaded}")
        print(f"To upload:          {len(to_upload)}")
        if args.dry_run:
            for aid in to_upload[:20]:
                print(f"  would upload: {aid}")
            if len(to_upload) > 20:
                print(f"  ... and {len(to_upload) - 20} more")
            return
        uploaded = 0
        for i, arxiv_id in enumerate(to_upload):
            safe_id = safe_dirname(arxiv_id)
            local_dir = SOURCES_DIR / safe_id
            print(f"[{i+1}/{len(to_upload)}] uploading {arxiv_id}...",
                  end=" ", flush=True)
            if upload_to_s3(arxiv_id, local_dir):
                manifest[arxiv_id]["uploaded"] = True
                uploaded += 1
                print("OK")
            else:
                print("FAIL")
            save_manifest(manifest)
        print(f"\nUploaded: {uploaded}/{len(to_upload)}")
        return

    # Download mode
    if args.redownload:
        to_download = all_ids
    else:
        to_download = [aid for aid in all_ids if aid not in manifest]

    if args.limit > 0:
        to_download = to_download[:args.limit]

    print(f"Papers in feed:     {len(all_ids)}")
    print(f"Already downloaded: {len(manifest)}")
    print(f"To download:        {len(to_download)}")
    if to_download:
        est_hours = len(to_download) * RATE_LIMIT_SECONDS / 3600
        print(f"Estimated time:     {est_hours:.1f} hours")

    if args.dry_run:
        for aid in to_download[:20]:
            print(f"  would download: {aid}")
        if len(to_download) > 20:
            print(f"  ... and {len(to_download) - 20} more")
        return

    if not to_download:
        print("Nothing to download.")
        return

    SOURCES_DIR.mkdir(parents=True, exist_ok=True)
    downloaded = 0
    failed = 0
    last_request_time = 0
    start_time = time.time()

    for i, arxiv_id in enumerate(to_download):
        safe_id = safe_dirname(arxiv_id)
        dest_dir = SOURCES_DIR / safe_id

        # Rate limit
        elapsed = time.time() - last_request_time
        if elapsed < RATE_LIMIT_SECONDS:
            time.sleep(RATE_LIMIT_SECONDS - elapsed)

        print(f"[{i+1}/{len(to_download)}] {arxiv_id}...", end=" ", flush=True)
        last_request_time = time.time()

        try:
            ok = download_and_unpack(arxiv_id, dest_dir)
        except Exception as e:
            print(f"ERROR: {e}")
            failed += 1
            manifest[arxiv_id] = {
                "status": "error",
                "error": str(e),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            save_manifest(manifest)
            continue

        if ok:
            entry = {
                "status": "downloaded",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "local_path": str(dest_dir),
            }
            if args.upload:
                if upload_to_s3(arxiv_id, dest_dir):
                    entry["uploaded"] = True
            manifest[arxiv_id] = entry
            downloaded += 1
            print("OK")
        else:
            manifest[arxiv_id] = {
                "status": "not_found",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            failed += 1
            print("NOT FOUND")

        save_manifest(manifest)

        # Progress every 100 papers
        if (i + 1) % 100 == 0:
            elapsed_min = (time.time() - start_time) / 60
            rate = downloaded / elapsed_min * 60 if elapsed_min > 0 else 0
            remaining = (len(to_download) - i - 1) / rate if rate > 0 else 0
            print(f"  --- {downloaded} OK, {failed} failed, "
                  f"{elapsed_min:.0f}m elapsed, ~{remaining:.1f}h remaining ---")

    elapsed_min = (time.time() - start_time) / 60
    print(f"\nDone! Downloaded: {downloaded}, Failed: {failed}")
    print(f"Total time: {elapsed_min:.1f} minutes")


if __name__ == "__main__":
    main()
