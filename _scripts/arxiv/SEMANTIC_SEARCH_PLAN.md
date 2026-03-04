# Full arXiv Semantic Search — Finding Missed Papers

## Goal

Scan the entire Kaggle arXiv metadata (~3M papers) to find integrable probability papers not yet in the feed, using bge-m3 embeddings and cosine similarity against the known ~4,068 papers.

## What exists (in this repo)

| File | Purpose |
|------|---------|
| `_scripts/arxiv/build_arxiv_embeddings.py` | Embeds our ~4k papers (raw LaTeX from Kaggle), computes pairwise similarity, writes `related-papers:` into post front matter |
| `_scripts/arxiv/scan_full_arxiv.py` | Scans full Kaggle DB (~3M papers), finds candidates similar to our papers |
| `_scripts/arxiv/.embedding-cache.json` | JSON cache for the 4k paper embeddings (gitignored) |
| `_scripts/arxiv/requirements-semantic.txt` | Python deps: `sentence-transformers`, `numpy`, `torch` |
| `assets/data/arxiv-vectors.npy` | 4068×1024 float32 reference vectors (gitignored) |

Files created by `scan_full_arxiv.py` (gitignored):
| File | Purpose |
|------|---------|
| `_scripts/arxiv/.embedding-cache-full.db` | SQLite cache for full 3M scan |
| `_scripts/arxiv/candidates.csv` | Output: ranked candidate list |

## Makefile targets

```
make arxiv                                  # name-based fetch + AI filter + TUI review
make arxiv-semantic DAYS=7                  # combined: name + embedding similarity + TUI review
make arxiv-semantic ARGS="--after 2026-02-26"  # semantic with date range
make arxiv-related                          # embed 4k papers, write related-papers into posts
make arxiv-scan ARGS="--threshold 0.65"     # scan full Kaggle DB for missed papers
make arxiv-rebuild                          # rebuild search index + related (no API)
make arxiv-kaggle                           # download latest Kaggle snapshot
make arxiv-venv                             # create venv + install deps
```

## Semantic mode (`--semantic`)

Combined intake that fetches ALL recent papers from the arXiv API (not just by tracked authors) and filters using both name matching and bge-m3 embedding similarity.

### How it works

1. **Fetch**: queries arXiv API day-by-day across 20 categories using `submittedDate` range filters (small per-request payload, respects API rate limits)
2. **Name matching**: same as regular mode — matches against `authors.yml` surnames
3. **Embedding similarity**: embeds all papers via bge-m3, computes cosine similarity against `arxiv-vectors.npy` reference set (threshold default 0.72)
4. **AI triage**: name-matched papers go through Claude AI filtering as usual; semantic-only papers skip AI and go directly to TUI review with similarity score shown
5. **TUI review**: all candidates (name + semantic) appear in the TUI for manual accept/reject
6. **Kaggle DB**: accepted papers are inserted into both SQLite DB (`arxiv-metadata.db`) and JSON-lines file

### Categories scanned

```
math.PR, math-ph, math.CO, math.MP, cond-mat.stat-mech,
math.RT, math.CA, math.QA, hep-th, nlin.SI,
math.AG, math.AP, math.CV, cond-mat, math.FA,
math.NT, q-alg, solv-int, math.ST, math.DS
```

### Performance

- 20 categories x N days, 4s rate limit between requests
- 7 days: ~140 API requests, ~10 min fetch
- 30 days: ~600 API requests, ~40 min fetch
- Embedding: cached in `.embedding-cache-full.db`, only new papers need embedding
- Fetch cache (`fetch_cache.json`) enables interrupt/resume

---

## Step-by-step: Running the full scan on Ryzen

### 1. Set up the Kaggle arXiv dataset

The Kaggle dataset is NOT in the repo. It's a 5GB JSON-lines file with ~3M papers.

**Download it on the Ryzen machine:**

```bash
# Install kaggle CLI
pip install kaggle

# Set API token (already in ~/.zshrc on Mac, add to Ryzen too)
export KAGGLE_API_TOKEN="KGAT_533d97d912e2f2d522ea4411078de003"

# Download and unzip (~5GB)
mkdir -p ~/Data/arxiv
kaggle datasets download -d Cornell-University/arxiv -p ~/Data/arxiv
cd ~/Data/arxiv && unzip arxiv.zip
# Result: ~/Data/arxiv/arxiv-metadata-oai-snapshot.json

# Verify
wc -l ~/Data/arxiv/arxiv-metadata-oai-snapshot.json
# Should show ~2,968,865 lines
head -1 ~/Data/arxiv/arxiv-metadata-oai-snapshot.json | python3 -m json.tool | head -5
# Should show: {"id": "0704.0001", "title": "Calculation of...", ...}
```

If you don't want to use the Kaggle CLI, download manually from:
https://www.kaggle.com/datasets/Cornell-University/arxiv
Click "Download" → unzip → place the JSON file at `~/Data/arxiv/arxiv-metadata-oai-snapshot.json`

The script reads the path from `$ARXIV_KAGGLE` env var (defaults to `~/Data/arxiv/arxiv-metadata-oai-snapshot.json`).

### 2. Clone the repo and set up the venv

```bash
# On Ryzen:
git clone git@github.com:lenis2000/homepage.git ~/Homepage
cd ~/Homepage
git pull   # if already cloned

# Create Python venv with dependencies
make arxiv-venv
# This creates _scripts/arxiv/venv/ and installs:
#   sentence-transformers (includes transformers, huggingface-hub)
#   numpy
#   torch (~2GB download on first install)
```

### 3. Generate the reference vectors (if not present)

The scan script needs `assets/data/arxiv-vectors.npy` — the embeddings of our ~4k known papers. This file is gitignored so it won't be in the clone.

**Option A: Copy from Mac**
```bash
# On Mac:
scp ~/Homepage/assets/data/arxiv-vectors.npy ryzen:~/Homepage/assets/data/
scp ~/Homepage/_scripts/arxiv/.embedding-cache.json ryzen:~/Homepage/_scripts/arxiv/
```

**Option B: Regenerate on Ryzen** (needs the Kaggle DB + search index)
```bash
# Copy the search index (this IS in the repo, should already be there)
ls ~/Homepage/assets/data/arxiv-index.json   # verify it exists

# Run the 4k embedding (uses CPU on Ryzen, takes ~10-15 min)
make arxiv-related
```

### 4. Run the full scan

```bash
cd ~/Homepage

# First run: embeds ~3M papers, takes 4-6 hours on CPU with batch=128
make arxiv-scan ARGS="--threshold 0.65 --batch-size 128"

# The script prints progress every 100k papers:
# [  120.3s]   100,000 processed, 0 cache hits, 96,000 embedded, 47 candidates
# [  245.1s]   200,000 processed, 0 cache hits, 196,000 embedded, 112 candidates
# ...
```

**Safe to interrupt!** The SQLite cache (`.embedding-cache-full.db`) saves incrementally. If you kill the process and restart, it resumes from where it left off (all previously embedded papers are cached).

### 5. Re-run with different threshold (instant)

After the first full run, all embeddings are in SQLite. Changing the threshold only re-scans the cached vectors:

```bash
# Try different thresholds to find the sweet spot
make arxiv-scan ARGS="--threshold 0.70 --batch-size 128"   # stricter
make arxiv-scan ARGS="--threshold 0.60 --batch-size 128"   # looser

# Each re-run takes ~2 minutes (no embedding, just cache reads + similarity)
```

### 6. Review candidates

```bash
# Output is at _scripts/arxiv/candidates.csv
# Format: similarity,arxiv_id,categories,title,authors
head -20 _scripts/arxiv/candidates.csv

# The script also prints top 20 at the end:
# [7234.1s] Top 20 candidates (threshold=0.65):
# [7234.1s]   0.847  2601.12345  math.PR   Exactly solvable models of...
# [7234.1s]   0.821  2503.04567  math.PR   Asymptotic fluctuations in...
```

Copy the CSV to review on Mac:
```bash
# On Mac:
scp ryzen:~/Homepage/_scripts/arxiv/candidates.csv ~/Desktop/
open ~/Desktop/candidates.csv   # opens in Numbers/Excel
```

### 7. Add accepted papers to the feed

After reviewing candidates and deciding which to add:
- Use `backfill_kaggle.py` with a list of IDs, or create posts manually
- Run `make arxiv-rebuild` to update search index + related papers

---

## Performance estimates

| Step | 64G Ryzen (CPU) | Mac M-series (MPS) |
|------|-----------------|-----------|
| Embed ~3M papers (first run) | ~4-6 hours (batch=128) | ~12-15 hours (batch=4) |
| Re-run with different threshold | ~2 min (all cached) | ~2 min |
| Similarity (streamed in 10k chunks) | ~30 sec | ~30 sec |

- **RAM**: streams in 10k-paper chunks, never builds the full 3M vector matrix
- **Disk**: SQLite cache ~5-8 GB (BLOB-packed float32, much smaller than JSON would be)
- **Model download**: bge-m3 is ~2GB, downloaded automatically on first run by huggingface

## How the scan script works internally

1. Load reference vectors (`arxiv-vectors.npy`) — our ~4k known int-prob papers
2. Open SQLite cache (`WAL` mode for concurrent reads/writes)
3. Stream Kaggle JSON-lines file line by line
4. For each paper not already tracked:
   - `text = "{title}. {abstract}"` (raw LaTeX, whitespace normalized)
   - `key = sha256(text)` — check SQLite cache
   - If uncached: queue for batch embedding
5. Every 10k papers: flush batch to model, write vectors to SQLite, compute similarity
   - `sims = chunk_vectors @ reference_vectors.T` → shape (10k, 4068)
   - `max_sim = sims.max(axis=1)` → best match for each paper
   - Papers above threshold → candidates list
6. Output `candidates.csv` sorted by similarity descending
