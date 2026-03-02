#!/usr/bin/env python3
"""
Pre-render LaTeX math in arXiv abstract posts to MathML using KaTeX.

Processes all posts in _posts/arxiv/, extracts abstracts, renders
$...$ and $$...$$ math to MathML via a single batched Node.js call,
and updates the post files.

Usage:
    python3 _scripts/arxiv/render_abstracts.py
    python3 _scripts/arxiv/render_abstracts.py --dry-run
    python3 _scripts/arxiv/render_abstracts.py --force   # re-render already-rendered posts
"""

import argparse
import glob
import json
import re
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
RENDER_JS = SCRIPT_DIR / "render_math.js"
POSTS_DIR = Path("_posts/arxiv")


def has_raw_math(text):
    """Check if text has unrendered $...$ math ($ not inside HTML tags)."""
    in_tag = False
    for ch in text:
        if ch == '<':
            in_tag = True
        elif ch == '>':
            in_tag = False
        elif ch == '$' and not in_tag:
            return True
    return False


def extract_abstract(filepath):
    """Extract abstract text from a post file. Returns (front_matter, abstract) or None."""
    text = filepath.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None

    body = parts[2].strip()
    if not body:
        return None

    # Match {% raw %}<p>...</p>{% endraw %}
    m = re.match(
        r"\{%\s*raw\s*%\}\s*<p>(.*?)</p>\s*\{%\s*endraw\s*%\}", body, re.DOTALL
    )
    if not m:
        return None

    return parts[1], m.group(1)


def main():
    parser = argparse.ArgumentParser(description="Render math in arXiv abstracts")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true",
                        help="Re-render already-rendered posts")
    parser.add_argument("files", nargs="*",
                        help="Specific files to process (default: all)")
    args = parser.parse_args()

    if args.files:
        paths = [Path(f) for f in args.files]
    else:
        paths = sorted(Path(p) for p in glob.glob(str(POSTS_DIR / "*.md")))

    # Phase 1: Collect abstracts that need rendering
    to_render = {}  # filepath -> (front_matter, abstract)
    for filepath in paths:
        result = extract_abstract(filepath)
        if result is None:
            continue
        front_matter, abstract = result
        if not has_raw_math(abstract):
            if not args.force:
                continue
        to_render[filepath] = (front_matter, abstract)

    print(f"Found {len(to_render)} posts with math to render (of {len(paths)} total)")

    if not to_render:
        print("Nothing to do.")
        return

    # Phase 2: Batch render via single Node.js call
    batch = [{"id": str(fp), "text": abstract}
             for fp, (_, abstract) in to_render.items()]

    print(f"Rendering math via KaTeX...")
    result = subprocess.run(
        ["node", str(RENDER_JS)],
        input=json.dumps(batch),
        capture_output=True,
        text=True,
        timeout=300,
    )

    if result.returncode != 0:
        print(f"ERROR: Node.js failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    rendered_items = json.loads(result.stdout)
    rendered_map = {item["id"]: item for item in rendered_items}

    # Phase 3: Write updated files
    updated = 0
    warnings = 0
    for filepath, (front_matter, original) in to_render.items():
        item = rendered_map.get(str(filepath))
        if not item:
            print(f"  SKIP: {filepath.name} (no render result)")
            continue

        rendered = item["rendered"]
        if item["warnings"]:
            for w in item["warnings"]:
                print(f"  WARN [{filepath.name}]: {w}")
            warnings += len(item["warnings"])

        if rendered == original:
            continue

        if args.dry_run:
            print(f"  [DRY] {filepath.name}")
            updated += 1
            continue

        new_text = f"---{front_matter}---\n{{% raw %}}<p>{rendered}</p>{{% endraw %}}\n"
        filepath.write_text(new_text, encoding="utf-8")
        updated += 1

    print(f"\nDone: {updated} {'would update' if args.dry_run else 'updated'}, {warnings} warnings")


if __name__ == "__main__":
    main()
