# Full arXiv Semantic Search — Finding Missed Papers

## Goal

Scan the entire Kaggle arXiv metadata (~3M papers) to find integrable probability papers not yet in the feed, using bge-m3 embeddings and cosine similarity against the known 4,068 papers.

## What exists already

- `build_arxiv_embeddings.py` — embeds our 4,068 papers using raw LaTeX from Kaggle DB, computes pairwise similarity, writes `related-papers:` into post front matter
- `.embedding-cache.json` — SHA-256-keyed cache of all computed embeddings (portable between machines)
- `assets/data/arxiv-vectors.npy` — 4068×1024 float32 matrix of known paper vectors
- `make arxiv-related` — runs the above
- `make arxiv-kaggle` — downloads latest Kaggle snapshot

## Plan

### Step 1: Build full-database embedding script

Create `_scripts/arxiv/scan_full_arxiv.py`:

1. Load the 4,068 known vectors from `arxiv-vectors.npy` (the "reference set")
2. Load the set of already-tracked arXiv IDs (to skip them)
3. Stream Kaggle JSON-lines file (~3M papers)
4. For each paper:
   - Skip if already tracked
   - Build text: `"{title}. {abstract}"` (raw LaTeX)
   - Check embedding cache; if miss, queue for batch embedding
5. Embed in batches (batch_size=64 or 128 on 64G machine)
   - Save cache incrementally every N batches (e.g., every 1000)
   - Print progress: papers processed, cache hits, elapsed time
6. For each embedded paper, compute max cosine similarity against reference set:
   - `max_sim = max(paper_vec @ reference_matrix.T)`
7. Collect candidates above threshold (start with 0.65, adjustable)
8. Output sorted CSV: `similarity, arxiv_id, title, categories, authors`

### Step 2: Run on Ryzen machine

```bash
# Copy to Ryzen machine:
scp _scripts/arxiv/scan_full_arxiv.py ryzen:Homepage/_scripts/arxiv/
scp _scripts/arxiv/.embedding-cache.json ryzen:Homepage/_scripts/arxiv/
scp assets/data/arxiv-vectors.npy ryzen:Homepage/assets/data/

# On Ryzen:
make arxiv-venv
_scripts/arxiv/venv/bin/python _scripts/arxiv/scan_full_arxiv.py

# Copy results back:
scp ryzen:Homepage/_scripts/arxiv/.embedding-cache.json _scripts/arxiv/
scp ryzen:Homepage/_scripts/arxiv/candidates.csv _scripts/arxiv/
```

### Step 3: Review candidates

- Open `candidates.csv`, review by descending similarity
- Pick threshold where results turn to garbage
- Decide which papers to add to the feed

### Step 4: Add accepted papers

- Either manually create posts, or extend `backfill_kaggle.py` to accept a list of arXiv IDs
- Run `make arxiv-rebuild` to update search index + related papers

## Performance estimates

| Step | Time (64G Ryzen, CPU) | Time (Mac, MPS) |
|------|----------------------|-----------------|
| Embed 3M papers (batch=128) | ~4-6 hours | ~12-15 hours |
| Similarity (3M × 4068) | ~30 seconds | ~30 seconds |
| Cache save (3M entries) | ~2 minutes | ~2 minutes |

- RAM: 3M × 1024 × 4 bytes = ~12GB for full vector matrix (fits in 64G)
- Cache file: ~15-20GB JSON (could switch to numpy format if too large)
- Can stream similarity computation in chunks if RAM is tight

## Cache format consideration

The current cache is JSON (`{sha256: [float, ...], ...}`). At 3M entries this would be ~20GB. Consider:
- **Option A**: Keep JSON, accept large file (simple, portable)
- **Option B**: Switch to numpy `.npy` with a separate ID mapping (compact, ~12GB)
- **Option C**: Use SQLite with BLOB values (incremental, no full load)

Recommend **Option C** (SQLite) for the full scan — incremental writes, no need to load entire cache into memory.

## Makefile target

```makefile
arxiv-scan:
	@_scripts/arxiv/venv/bin/python _scripts/arxiv/scan_full_arxiv.py
```
