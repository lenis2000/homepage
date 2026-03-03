#!/bin/bash
# arXiv backfill commands — run one at a time, each includes TUI review
#
# Kaggle dataset: faster than arXiv API (no rate limits, offline, one pass)
# Download: kaggle datasets download -d Cornell-University/arxiv
# Unzip to get: arxiv-metadata-oai-snapshot.json (~5GB)

cd "$(git rev-parse --show-toplevel)"
source .venv/bin/activate

KAGGLE="${ARXIV_KAGGLE:-$HOME/Data/arxiv/arxiv-metadata-oai-snapshot.json}"

# --- Kuniba, Okada, Povolotsky, Mangazeev (March 2026) ---
python3 _scripts/arxiv/backfill_kaggle.py $KAGGLE \
  --authors "Atsuo Kuniba,Soichi Okada,Alexander Povolotsky,Vladimir Mangazeev" \
  --after 1993-01-01 --before 2026-04-01 --review
python3 _scripts/arxiv/build_search_index.py
