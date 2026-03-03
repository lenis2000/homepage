#!/bin/bash
# arXiv backfill commands — run one at a time, each includes TUI review
#
# Kaggle dataset: faster than arXiv API (no rate limits, offline, one pass)
# Download: kaggle datasets download -d Cornell-University/arxiv
# Unzip to get: arxiv-metadata-oai-snapshot.json (~5GB)

KAGGLE="${ARXIV_KAGGLE:-$HOME/Data/arxiv/arxiv-metadata-oai-snapshot.json}"

# --- Backfill for newly added authors (March 2026) ---
# These authors were added after the initial backfill runs.
# Already-processed papers are skipped, so this only fetches new matches.
# Zero or very few posts: Kirillov, Schütz, P. Ferrari, Novak, Pimentel,
#   Voiculescu, Holcomb, Dołęga, Girotti, Krasovsky
# May also pick up missed solo papers for other recently added authors:
#   Its, Basor, Guionnet, Soshnikov, Reshetikhin, Kuperberg, Propp,
#   Krattenthaler, Duits, Claeys, Adler, van Moerbeke, Rider, Dumitriu,
#   Hairer, Giardina, Redig, Cator, Sheffield, Gnedin, Rizzolo, Angel,
#   Romik, Aldous, Pitman, Pak
python3 _scripts/arxiv/backfill_kaggle.py $KAGGLE \
  --authors "Anatol Kirillov,Günter Schütz,Pablo Ferrari,Jon Novak,Leandro Pimentel,Dan Voiculescu,Diane Holcomb,Maciej Dołęga,Manuela Girotti,Igor Krasovsky,Alexander Its,Estelle Basor,Alice Guionnet,Alexander Soshnikov,Nicolai Reshetikhin,Greg Kuperberg,James Propp,Christian Krattenthaler,Maurice Duits,Tom Claeys,Mark Adler,Pierre van Moerbeke,Brian Rider,Ioana Dumitriu,Martin Hairer,Cristian Giardina,Frank Redig,Eric Cator,Scott Sheffield,Alexander Gnedin,Douglas Rizzolo,Omer Angel,Dan Romik,David Aldous,Jim Pitman,Igor Pak" \
  --after 1993-01-01 --before 2026-04-01 --review
python3 _scripts/arxiv/build_search_index.py
