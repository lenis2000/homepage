#!/usr/bin/env python3
"""
Download arXiv paper sources for all papers in the feed.

Downloads from https://export.arxiv.org/e-print/{id}, unpacks locally,
and uploads to s3://lpetrov.cc.storage/arxiv-sources/{id}/.

Resumable: checks actual folders on disk. Safe to Ctrl-C and re-run —
papers with non-empty source dirs are skipped automatically.

Upload status is tracked in sources/manifest.json.

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

from s3_upload_gate import should_upload, record_upload, days_until_next
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
PDF_URL = "https://arxiv.org/pdf/{}"


def _guess_filename(data: bytes) -> str:
    """Guess a filename from file content magic bytes."""
    # PDF (including with leading BOM or whitespace)
    if data[:5] == b"%PDF-" or b"%PDF-" in data[:20]:
        return "main.pdf"
    # PostScript (sometimes preceded by arXiv comment headers)
    if data[:10] == b"%!PS-Adobe" or b"\n%!PS-Adobe" in data[:500]:
        return "main.ps"
    # DVI
    if data[:2] == b"\xf7\x02":
        return "main.dvi"
    # Word .doc (OLE2 Compound Document)
    if data[:8] == b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        return "main.doc"
    # ZIP-based formats (docx, odt, etc.)
    if data[:2] == b"PK":
        if b"word/" in data[:2000]:
            return "main.docx"
        return "source.zip"
    # HTML
    if b"<html" in data[:500].lower() or b"<!doctype html" in data[:500].lower():
        return "main.html"
    # TeX/LaTeX detection: check for common commands in first 10KB
    head = data[:10000]
    tex_markers = (b"\\documentclass", b"\\documentstyle", b"\\begin{document}",
                   b"\\input", b"\\magnification", b"\\hoffset", b"\\voffset",
                   b"\\def\\", b"\\font\\", b"\\baselineskip", b"\\hsize",
                   b"\\catcode", b"\\tolerance")
    if any(m in head for m in tex_markers):
        return "main.tex"
    return "source.raw"


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


def is_downloaded(arxiv_id: str) -> bool:
    """Check if sources exist on disk (non-empty directory)."""
    d = SOURCES_DIR / safe_dirname(arxiv_id)
    return d.is_dir() and any(d.iterdir())


def is_uploaded(arxiv_id: str, manifest: dict) -> bool:
    """Check if sources were already uploaded to S3."""
    return manifest.get(arxiv_id, {}).get("uploaded", False)


def download_pdf(arxiv_id: str, dest_dir: Path) -> bool:
    """Download PDF when source is not public."""
    url = PDF_URL.format(arxiv_id)
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "lpetrov-arxiv-sources/1.0 (academic research)")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
    except urllib.error.HTTPError:
        return False
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / "main.pdf").write_bytes(data)
    (dest_dir / ".pdf-only").write_text("source not public, pdf downloaded\n")
    return True


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
        if e.code == 403:
            # Source not public — fall back to PDF
            return download_pdf(arxiv_id, dest_dir)
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
        (dest_dir / _guess_filename(decompressed)).write_bytes(decompressed)
        return True
    except gzip.BadGzipFile:
        pass

    # Raw file
    (dest_dir / _guess_filename(data)).write_bytes(data)
    return True


def upload_to_s3(arxiv_id: str, local_dir: Path) -> bool:
    safe_id = safe_dirname(arxiv_id)
    s3_path = f"s3://{OUR_S3_BUCKET}/{OUR_S3_PREFIX}/{safe_id}/"
    try:
        subprocess.run(
            ["aws", "s3", "sync", str(local_dir), s3_path, "--quiet", "--size-only"],
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
    parser.add_argument("--fix-extensions", action="store_true",
                        help="Rename mis-detected files (e.g. PS saved as .tex)")
    parser.add_argument("--check", action="store_true",
                        help="Verify uploaded papers exist on S3")
    parser.add_argument("--force-upload", action="store_true",
                        help="Upload even if last upload was < 30 days ago")
    args = parser.parse_args()

    all_ids = get_all_arxiv_ids()
    manifest = load_manifest()

    # Fix-extensions mode: rename mis-detected files in existing source dirs
    if args.fix_extensions:
        fixed = 0
        checked = 0
        for d in sorted(SOURCES_DIR.iterdir()):
            if not d.is_dir():
                continue
            for candidate in ("main.tex", "main.pdf", "source.raw"):
                f = d / candidate
                if not f.exists():
                    continue
                data = f.read_bytes()
                correct = _guess_filename(data)
                if correct != candidate:
                    target = d / correct
                    if args.dry_run:
                        print(f"  would rename: {d.name}/{candidate} -> {correct}")
                    else:
                        f.rename(target)
                        print(f"  {d.name}/{candidate} -> {correct}")
                    fixed += 1
            checked += 1
        print(f"Checked {checked} dirs, {'would fix' if args.dry_run else 'fixed'} {fixed} files")
        return

    # Check mode: verify S3 presence
    if args.check:
        all_ids_set = set(all_ids)
        # Check manifest entries
        uploaded_ids = [aid for aid in all_ids if manifest.get(aid, {}).get("uploaded")]
        print(f"Papers in feed:       {len(all_ids)}")
        print(f"Marked uploaded:      {len(uploaded_ids)}")
        print(f"Not uploaded:         {len(all_ids) - len(uploaded_ids)}")
        print()

        # List all prefixes on S3 to find what's actually there
        print("Listing S3 contents...", flush=True)
        try:
            result = subprocess.run(
                ["aws", "s3", "ls",
                 f"s3://{OUR_S3_BUCKET}/{OUR_S3_PREFIX}/",
                 "--no-cli-pager"],
                check=True, capture_output=True, text=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"ERROR listing S3: {e.stderr}")
            return

        # Parse "PRE dirname/" lines from s3 ls output
        s3_dirs = set()
        for line in result.stdout.splitlines():
            line = line.strip()
            if line.startswith("PRE "):
                dirname = line[4:].rstrip("/")
                s3_dirs.add(dirname)

        # Check: uploaded in manifest but missing from S3
        missing_from_s3 = []
        for aid in uploaded_ids:
            if safe_dirname(aid) not in s3_dirs:
                missing_from_s3.append(aid)

        # Check: on S3 but not in manifest
        manifest_dirs = {safe_dirname(aid) for aid in uploaded_ids}
        orphan_on_s3 = sorted(s3_dirs - manifest_dirs)

        # Check: on S3 but not in feed
        feed_dirs = {safe_dirname(aid) for aid in all_ids}
        not_in_feed = sorted(s3_dirs - feed_dirs)

        print(f"Folders on S3:        {len(s3_dirs)}")
        print()

        ok = True
        if missing_from_s3:
            ok = False
            print(f"MISSING from S3 (manifest says uploaded): {len(missing_from_s3)}")
            for aid in missing_from_s3:
                print(f"  {aid}")
            print()

        if orphan_on_s3:
            print(f"On S3 but not in manifest: {len(orphan_on_s3)}")
            for d in orphan_on_s3[:20]:
                print(f"  {d}")
            if len(orphan_on_s3) > 20:
                print(f"  ... and {len(orphan_on_s3) - 20} more")
            print()

        if not_in_feed:
            print(f"On S3 but not in feed: {len(not_in_feed)}")
            for d in not_in_feed[:20]:
                print(f"  {d}")
            if len(not_in_feed) > 20:
                print(f"  ... and {len(not_in_feed) - 20} more")
            print()

        not_uploaded = [aid for aid in all_ids
                        if not manifest.get(aid, {}).get("uploaded")
                        and safe_dirname(aid) not in s3_dirs]
        if not_uploaded:
            print(f"Not uploaded at all: {len(not_uploaded)}")
            for aid in not_uploaded[:20]:
                print(f"  {aid}")
            if len(not_uploaded) > 20:
                print(f"  ... and {len(not_uploaded) - 20} more")
            print()

        if ok and not missing_from_s3:
            print("All manifest-uploaded papers verified on S3.")
        return

    # Check upload gate for any upload mode
    do_upload = args.upload or args.upload_only
    if do_upload and not should_upload(force=args.force_upload):
        print(f"Skipping S3 upload (next upload in {days_until_next():.0f} days, use --force-upload to override)")
        if args.upload_only:
            return
        # For --upload mode, continue downloading but skip uploads
        args.upload = False

    # Upload-only mode
    if args.upload_only:
        downloaded_ids = [aid for aid in all_ids if is_downloaded(aid)]
        to_upload = [aid for aid in downloaded_ids
                     if not manifest.get(aid, {}).get("uploaded")]
        if args.limit > 0:
            to_upload = to_upload[:args.limit]
        n_uploaded = sum(1 for aid in downloaded_ids
                         if manifest.get(aid, {}).get("uploaded"))
        print(f"Downloaded papers:  {len(downloaded_ids)}")
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
                manifest[arxiv_id] = {"uploaded": True}
                uploaded += 1
                print("OK")
            else:
                print("FAIL")
            save_manifest(manifest)
        if uploaded > 0:
            record_upload()
        print(f"\nUploaded: {uploaded}/{len(to_upload)}")
        return

    # Download mode
    if args.redownload:
        to_download = all_ids
    else:
        to_download = [aid for aid in all_ids
                       if not is_downloaded(aid) and not is_uploaded(aid, manifest)]

    if args.limit > 0:
        to_download = to_download[:args.limit]

    n_local = sum(1 for aid in all_ids if is_downloaded(aid))
    n_uploaded = sum(1 for aid in all_ids if is_uploaded(aid, manifest))
    print(f"Papers in feed:     {len(all_ids)}")
    print(f"Downloaded locally: {n_local}")
    print(f"Uploaded to S3:     {n_uploaded}")
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
            continue

        if ok:
            downloaded += 1
            if args.upload:
                if upload_to_s3(arxiv_id, dest_dir):
                    manifest[arxiv_id] = {"uploaded": True}
                    save_manifest(manifest)
            print("OK")
        else:
            # Mark as unavailable so we don't retry
            dest_dir.mkdir(parents=True, exist_ok=True)
            (dest_dir / ".no-source").write_text("source not public\n")
            failed += 1
            print("NOT FOUND / SOURCE NOT PUBLIC")

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
