# Homepage Arxiv: Pre-computed Related Papers

## Overview

The Homepage arxiv feed is public (no auth), so browser-side models are too heavy.
Instead: pre-compute a **paper similarity graph** at build time.

## How it works

1. `build_arxiv_embeddings.py` embeds all papers with **BAAI/bge-m3** (build-only — no browser inference needed)
2. Computes pairwise cosine similarity (or top-k via matrix multiply)
3. Stores top 5 neighbors per paper → `assets/data/arxiv-related.json`
4. Format: `{"2602.24063": ["2601.12345", "2512.09876", ...], ...}`
5. File size: ~1,500 papers × 5 neighbors × ~15 bytes ≈ **~110KB**

## Build integration

```makefile
# In Homepage Makefile
arxiv-venv:
	@test -d _scripts/arxiv/venv || (python3 -m venv _scripts/arxiv/venv && \
	  _scripts/arxiv/venv/bin/pip install -r _scripts/arxiv/requirements-semantic.txt)

arxiv-embed: arxiv-venv
	@_scripts/arxiv/venv/bin/python _scripts/arxiv/build_arxiv_embeddings.py

arxiv:
	python3 _scripts/arxiv/fetch_arxiv.py --days $(or $(DAYS),30) --review
	python3 _scripts/arxiv/build_search_index.py
	$(MAKE) arxiv-embed
```

## Frontend integration

- `arxiv-feed.js`: fetch `arxiv-related.json` alongside `arxiv-index.json`
- When a paper is expanded (details open), show "Related papers" section
- Each related paper links to its entry on the same page (scroll to it)
- Minimal UI: small list below the abstract, e.g. "Similar: [Paper Title 1], [Paper Title 2], ..."

## New files (in ~/Homepage)

- `_scripts/arxiv/build_arxiv_embeddings.py` — embed papers, compute neighbors, write JSON
- `_scripts/arxiv/requirements-semantic.txt` — `sentence-transformers`, `numpy`, `torch`
- `_scripts/arxiv/venv/` — Python venv (gitignored)
- `assets/data/arxiv-related.json` — neighbor graph (gitignored, built)
- `assets/data/arxiv-vectors.npy` — raw vectors for incremental rebuilds (gitignored, local)

## Model choice

Homepage uses **BAAI/bge-m3** (568M params, 1024 dims) for build-time embedding.
No browser inference needed — only pre-computed related papers served as static JSON.

**Why bge-m3** (validated in notes repo, March 2026):
- Qwen3-Embedding-0.6B is **garbage for math terminology** — "tasep past" returned
  pesto recipes and driver's license notes instead of TASEP papers
- bge-small-en-v1.5 (33M, 384 dims) works well but bge-m3 is better for nuanced queries
- bge-m3 correctly ranks "Mapping TASEP back in time" as #1 for "tasep past"
- Both bge models handle technical acronyms (TASEP, KPZ, etc.) far better than Qwen

## Incremental caching

Cache embeddings by content hash (`sha256(text) → vector`) in a local JSON file
(e.g., `_scripts/arxiv/.embedding-cache.json`). On rebuild:
- Unchanged papers → reuse cached vectors (instant)
- New/changed papers → embed only those

First build: ~2 min for bge-m3 on MPS with batch_size=4 (~1,500 papers).
Incremental rebuilds (e.g., 20 new papers) take ~5-10 seconds.

**Lessons from notes implementation (March 2026):**
- **Do NOT use Qwen3-Embedding-0.6B** — terrible at math acronyms (TASEP, KPZ, etc.)
- bge-m3 (568M params, 1024 dims): ~6.5 min for ~4,900 chunks on MPS with batch_size=4
- bge-small-en-v1.5 (33M params, 384 dims): ~12s for same data — good fallback
- Use `batch_size=4` for bge-m3 on Apple Silicon MPS — larger batches cause OOM/stalls
- MPS (`device="mps"`) helps but not as dramatically as expected for 500M+ param models
- Cache by content hash (`sha256(text) → vector`) saves huge time on incremental rebuilds
- Homepage has ~1,500 papers → bge-m3 first build ~2 min, incremental ~5-10s

## Implementation

**Separate task** — independent from the notes semantic search.
Independent build, independent venv. The notes plan does NOT depend on this.
