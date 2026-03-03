#!/bin/bash
# arXiv backfill commands — run one at a time, each includes TUI review
#
# Kaggle dataset: faster than arXiv API (no rate limits, offline, one pass)
# Download: kaggle datasets download -d Cornell-University/arxiv
# Unzip to get: arxiv-metadata-oai-snapshot.json (~5GB)

KAGGLE=~/Downloads/arxiv-metadata-oai-snapshot.json

# 1993–2000: earliest arXiv papers (Tracy-Widom, Deift, Johansson, Okounkov, etc.)
python3 _scripts/arxiv/backfill_kaggle.py $KAGGLE --after 1993-01-01 --before 2000-01-01 --review
python3 _scripts/arxiv/build_search_index.py

# 2000–2008: growth of integrable probability (Borodin, Corwin-era beginnings, etc.)
python3 _scripts/arxiv/backfill_kaggle.py $KAGGLE --after 2000-01-01 --before 2008-01-01 --review
python3 _scripts/arxiv/build_search_index.py

# 2008–2016: up to where FRG import starts
python3 _scripts/arxiv/backfill_kaggle.py $KAGGLE --after 2008-01-01 --before 2016-01-01 --review
python3 _scripts/arxiv/build_search_index.py

# 2016–present: catch papers by newly added authors not in the FRG import
# (FRG covered a smaller author set; this fills gaps for authors added later)
# Already-processed papers are skipped automatically via processed.json
python3 _scripts/arxiv/backfill_kaggle.py $KAGGLE --after 2016-01-01 --before 2026-04-01 --review
python3 _scripts/arxiv/build_search_index.py

# --- API-based backfill (legacy, slower) ---
# python3 _scripts/arxiv/fetch_arxiv.py --after 1993-01-01 --before 2000-01-01 --backfill --review
# python3 _scripts/arxiv/fetch_arxiv.py --after 2000-01-01 --before 2008-01-01 --backfill --review
# python3 _scripts/arxiv/fetch_arxiv.py --after 2008-01-01 --before 2016-01-01 --backfill --review
# python3 _scripts/arxiv/fetch_arxiv.py --after 2016-01-01 --before 2026-04-01 --review
