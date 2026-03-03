# Full arXiv Semantic Search — Finding Missed Papers

## Goal

Scan the entire Kaggle arXiv metadata (~3M papers) to find integrable probability papers not yet in the feed, using bge-m3 embeddings and cosine similarity against the known ~4,068 papers.

## What exists

| File | Purpose |
|------|---------|
| `build_arxiv_embeddings.py` | Embeds our ~4k papers (raw LaTeX from Kaggle), computes pairwise similarity, writes `related-papers:` into post front matter |
| `scan_full_arxiv.py` | Scans full Kaggle DB (~3M papers), finds candidates similar to our papers |
| `.embedding-cache.json` | JSON cache for the 4k paper embeddings (small, portable) |
| `.embedding-cache-full.db` | SQLite cache for the full 3M scan (incremental writes, no full load) |
| `candidates.csv` | Output: ranked list of missed paper candidates |
| `arxiv-vectors.npy` | 4068×1024 float32 matrix of known paper vectors (reference set) |

## Makefile targets

| Target | What it does |
|--------|-------------|
| `make arxiv-related` | Embed 4k papers, compute related-papers, write into posts |
| `make arxiv-scan ARGS="--threshold 0.65"` | Scan full Kaggle DB for missed papers |
| `make arxiv-rebuild` | Rebuild search index + related papers (no API fetch) |
| `make arxiv-kaggle` | Download latest Kaggle arXiv snapshot |

## How `scan_full_arxiv.py` works

1. Load reference vectors (`arxiv-vectors.npy`) — our ~4k known int-prob papers
2. Stream Kaggle JSON-lines (~3M papers), skip already-tracked IDs
3. For each paper: `text = "{title}. {abstract}"` (raw LaTeX)
4. Check SQLite cache by SHA-256 key; batch-embed uncached papers with bge-m3
5. Compute similarity in chunks (10k papers × 4068 reference): `max_sim = max(vec @ ref.T)`
6. Candidates above threshold → `candidates.csv` sorted by similarity descending
7. Cache writes are incremental (SQLite WAL mode) — safe to interrupt and resume

## Running on Ryzen (64G RAM)

```bash
# Everything is in the repo, just pull and run:
git pull
make arxiv-venv
make arxiv-scan ARGS="--threshold 0.65 --batch-size 128"

# Results appear in _scripts/arxiv/candidates.csv
# The SQLite cache persists for re-runs with different thresholds
```

Adjusting threshold after a full run is instant — re-run with a different `--threshold` and only the CSV output changes (all embeddings cached in SQLite).

## Performance estimates

| Step | 64G Ryzen (CPU) | Mac (MPS) |
|------|-----------------|-----------|
| Embed ~3M papers (first run) | ~4-6 hours (batch=128) | ~12-15 hours (batch=4) |
| Re-run with different threshold | ~2 min (all cached) | ~2 min |
| Similarity (streamed in 10k chunks) | ~30 sec | ~30 sec |

- RAM: streams in 10k chunks, never loads full 3M matrix
- SQLite cache: ~5-8 GB on disk (BLOB-packed float32, much smaller than JSON)
- Safe to interrupt: SQLite WAL mode, resumes from cache on next run

## After getting candidates

1. Review `candidates.csv` — find where results turn to garbage, pick threshold
2. Add accepted papers: extend `backfill_kaggle.py` to accept a list of arXiv IDs, or create posts manually
3. Run `make arxiv-rebuild` to update search index + related papers
