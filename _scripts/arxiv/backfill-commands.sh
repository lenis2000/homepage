#!/bin/bash
# arXiv backfill commands — run one at a time, each includes TUI review

# 1993–2000: earliest arXiv papers (Tracy-Widom, Deift, Johansson, Okounkov, etc.)
python3 _scripts/arxiv/fetch_arxiv.py --after 1993-01-01 --before 2000-01-01 --backfill --review

# 2000–2008: growth of integrable probability (Borodin, Corwin-era beginnings, etc.)
python3 _scripts/arxiv/fetch_arxiv.py --after 2000-01-01 --before 2008-01-01 --backfill --review

# 2008–2016: up to where FRG import starts
python3 _scripts/arxiv/fetch_arxiv.py --after 2008-01-01 --before 2016-01-01 --backfill --review

# After each chunk, rebuild the search index:
# python3 _scripts/arxiv/build_search_index.py
