#!/usr/bin/env python3
"""
Convert PS/EPS files in arxiv source dirs to PDF using ps2pdf.

Idempotent: skips files that already have a .pdf counterpart.
Optionally uploads converted PDFs to S3.

Usage:
    python3 convert_ps_to_pdf.py                # convert all
    python3 convert_ps_to_pdf.py --upload       # convert + upload to S3
    python3 convert_ps_to_pdf.py --dry-run      # show what would be converted
"""

import argparse
import subprocess
import shutil
from datetime import datetime
from pathlib import Path

from s3_upload_gate import should_upload, record_upload, days_until_next

SCRIPT_DIR = Path(__file__).resolve().parent
SOURCES_DIR = SCRIPT_DIR / "sources"
LOG_FILE = SOURCES_DIR / "convert-ps-failures.log"

OUR_S3_BUCKET = "lpetrov.cc.storage"
OUR_S3_PREFIX = "arxiv-sources"

PS_EXTENSIONS = {".ps", ".eps"}


def convert_file(ps_path: Path, log_fh=None) -> bool:
    """Convert a PS/EPS file to PDF. Returns True on success."""
    pdf_path = ps_path.with_suffix(".pdf")
    try:
        subprocess.run(
            ["ps2pdf", "-dEPSCrop", str(ps_path), str(pdf_path)],
            check=True, capture_output=True, timeout=60,
        )
        return True
    except subprocess.CalledProcessError as e:
        msg = e.stderr.decode()[:200]
        print(f"  ERROR converting {ps_path.name}: {msg}")
        if log_fh:
            log_fh.write(f"ERROR\t{ps_path.parent.name}/{ps_path.name}\t{msg}\n")
        return False
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT converting {ps_path.name}")
        pdf_path.unlink(missing_ok=True)
        if log_fh:
            log_fh.write(f"TIMEOUT\t{ps_path.parent.name}/{ps_path.name}\n")
        return False


def upload_dir_to_s3(arxiv_dir: Path) -> bool:
    """Sync a source dir to S3 (uploads new/changed files only)."""
    s3_path = f"s3://{OUR_S3_BUCKET}/{OUR_S3_PREFIX}/{arxiv_dir.name}/"
    try:
        subprocess.run(
            ["aws", "s3", "sync", str(arxiv_dir), s3_path, "--quiet", "--size-only"],
            check=True, capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ERROR uploading {arxiv_dir.name}: {e.stderr.decode()[:200]}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Convert PS/EPS to PDF in arxiv sources")
    parser.add_argument("--upload", action="store_true",
                        help="Upload converted PDFs to S3")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be converted")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max dirs to process (0=all)")
    parser.add_argument("--force-upload", action="store_true",
                        help="Upload even if last upload was < 30 days ago")
    args = parser.parse_args()

    if not shutil.which("ps2pdf"):
        print("ERROR: ps2pdf not found. Install Ghostscript.")
        return

    if not SOURCES_DIR.is_dir():
        print(f"ERROR: Sources directory not found: {SOURCES_DIR}")
        return

    # Find all PS/EPS files that lack a PDF counterpart (recursive)
    to_convert = []
    for d in sorted(SOURCES_DIR.iterdir()):
        if not d.is_dir():
            continue
        for f in d.rglob("*"):
            if f.is_file() and f.suffix.lower() in PS_EXTENSIONS and not f.with_suffix(".pdf").exists():
                to_convert.append(f)

    print(f"PS/EPS files needing conversion: {len(to_convert)}")

    if args.limit > 0:
        to_convert = to_convert[:args.limit]

    if args.dry_run:
        for f in to_convert[:30]:
            print(f"  would convert: {f.parent.name}/{f.name}")
        if len(to_convert) > 30:
            print(f"  ... and {len(to_convert) - 30} more")
        return

    if not to_convert:
        print("Nothing to convert.")
        return

    converted = 0
    failed = 0
    dirs_to_upload = set()

    log_fh = open(LOG_FILE, "w")
    log_fh.write(f"# ps2pdf conversion failures — {datetime.now().isoformat()}\n")

    for i, ps_path in enumerate(to_convert):
        print(f"[{i+1}/{len(to_convert)}] {ps_path.parent.name}/{ps_path.name}...",
              end=" ", flush=True)
        if convert_file(ps_path, log_fh):
            converted += 1
            # Find the top-level paper dir (direct child of SOURCES_DIR)
            rel = ps_path.relative_to(SOURCES_DIR)
            paper_dir = SOURCES_DIR / rel.parts[0]
            dirs_to_upload.add(paper_dir)
            print("OK")
        else:
            failed += 1

        if (i + 1) % 500 == 0:
            print(f"  --- {converted} OK, {failed} failed ---")

    log_fh.close()
    print(f"\nConverted: {converted}, Failed: {failed}")
    if failed:
        print(f"Failure log: {LOG_FILE}")

    if args.upload and dirs_to_upload:
        if not should_upload(force=args.force_upload):
            print(f"\nSkipping S3 upload (next upload in {days_until_next():.0f} days, use --force-upload to override)")
        else:
            print(f"\nUploading {len(dirs_to_upload)} dirs to S3...")
            uploaded = 0
            for i, d in enumerate(sorted(dirs_to_upload)):
                print(f"[{i+1}/{len(dirs_to_upload)}] {d.name}...", end=" ", flush=True)
                if upload_dir_to_s3(d):
                    uploaded += 1
                    print("OK")
                else:
                    print("FAIL")
            if uploaded > 0:
                record_upload()
            print(f"Uploaded: {uploaded}/{len(dirs_to_upload)}")


if __name__ == "__main__":
    main()
