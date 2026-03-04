# arXiv Intake Pipeline

Fetches papers from the arXiv API, filters by author names and/or embedding similarity, and generates Jekyll posts for the homepage feed.

## Three intake modes

### 1. Name-based (default)

Queries arXiv API by tracked author surnames, then AI-filters matches.

```bash
make arxiv                      # last 30 days, TUI review
make arxiv DAYS=7               # last 7 days
```

### 2. Semantic (combined name + embeddings)

Fetches ALL papers from 20 categories via the arXiv API, filters by both author names AND bge-m3 embedding similarity against ~4k known int-prob papers.

```bash
make arxiv-semantic DAYS=7                     # last 7 days
make arxiv-semantic ARGS="--after 2026-02-26"  # specific date range
make arxiv-semantic ARGS="--after 2026-02-26 --threshold 0.70"  # stricter
```

**Flow:**
- Fetches day-by-day using `submittedDate` range filter (respects API rate limits)
- Name-matched papers: AI triage via Claude, then TUI review
- Semantic-only papers (above threshold 0.72, not name-matched): skip AI, go directly to TUI with similarity score
- Accepted papers are added to both SQLite DB and JSON-lines Kaggle file

**Requires:** `make arxiv-venv` (installs sentence-transformers, torch, numpy) and `assets/data/arxiv-vectors.npy` (generate with `make arxiv-related`).

### 3. Full Kaggle scan

Scans the entire Kaggle arXiv metadata SQLite DB (~3M papers) using embeddings. Good for historical backfill; see `SEMANTIC_SEARCH_PLAN.md` for details.

```bash
make arxiv-scan ARGS="--threshold 0.65"
make arxiv-scan-import                   # import accepted from scan-review.json
```

## Key files

| File | Purpose |
|------|---------|
| `fetch_arxiv.py` | Main pipeline: fetch, match, AI filter, generate posts |
| `scan_full_arxiv.py` | Full Kaggle DB scan with embeddings |
| `build_search_index.py` | Rebuild `arxiv-index.json` from posts |
| `build_arxiv_embeddings.py` | Embed our ~4k papers, compute related-papers |
| `import_kaggle_to_sqlite.py` | Import Kaggle JSON-lines into SQLite |
| `authors.yml` | Tracked authors with arxiv names and topics |
| `ai_prompt.txt` | Prompt template for Claude AI filtering |
| `processed.json` | Cache of already-processed paper IDs |

## Data files (gitignored)

| File | Purpose |
|------|---------|
| `assets/data/arxiv-vectors.npy` | Reference vectors for ~4k known papers (1024-dim bge-m3) |
| `assets/data/arxiv-index.json` | Search index of all feed papers |
| `.embedding-cache-full.db` | SQLite cache for paper embeddings |
| `fetch_cache.json` | Resumable fetch cache (cleared after import) |
| `review.json` | Pending TUI review items |
| `venv/` | Python virtualenv with ML dependencies |

## External data

| Path | Purpose |
|------|---------|
| `~/Data/arxiv/arxiv-metadata.db` | Kaggle arXiv SQLite DB (~3-4 GB) |
| `~/Data/arxiv/arxiv-metadata-oai-snapshot.json` | Kaggle JSON-lines (~5 GB, legacy) |

Override paths via `$ARXIV_KAGGLE_DB` and `$ARXIV_KAGGLE` env vars.

## TUI review tool

```bash
make arxiv-install    # builds Go binary → ~/bin/arxiv-review
```

Keys: `a`/`v` accept, `r`/`b` reject, `s` skip, `u` undo, `n`/`p` navigate, `q` quit (resumable).
