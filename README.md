# Academic Homepage of [Leonid Petrov](http://lpetrov.cc)

## Research interests

Integrable probability, KPZ universality, Yang-Baxter equation, Bethe ansatz, Macdonald processes, symmetric functions, random tilings.

---

## Makefile Reference

### Deployment Targets

#### `make serve`
Start a local Jekyll development server for previewing the site.

```bash
make serve
# => http://localhost:4000
```

#### `make deploy`
Full git-based deployment with interactive commit. If there are uncommitted changes, stages and commits them (opens your editor for the commit message). If the working tree is clean, toggles a `trigger` file to force a CI build. Then pushes to remote and invalidates CloudFront caches.

```bash
# Normal usage — commit changes and deploy
make deploy

# If no changes exist, it creates/removes a "trigger" file to force CI
make deploy
```

#### `make autodeploy`
Quick non-interactive deployment: stages everything, commits with message "autodeploy", pushes, and invalidates CloudFront. No commit message prompt.

```bash
make autodeploy
```

#### `make deploy-local-full`
Build and deploy entirely from the local machine (bypasses GitHub Actions CI):

1. Runs `jekyll build` into `_site/`
2. Strips blank lines from all HTML files
3. Shallow-clones the CV and Syllabi GitHub repos into `/tmp/`, copies PDFs into `_site/research/` and `_site/teaching/`
4. Syncs `_site/` to `s3://lpetrov.cc` with `--delete` — **destructive**: removes any S3 files not present in the local build
5. Invalidates both CloudFront distributions

```bash
# Full rebuild + deploy (removes stale S3 files)
make deploy-local-full
```

#### `make deploy-local`
Same as `deploy-local-full` but syncs with `--size-only` and **no** `--delete`. Safer for incremental updates — only uploads changed files, never removes anything from S3.

```bash
# Incremental deploy (no deletions)
make deploy-local
```

#### `make invalidate`
Invalidates both CloudFront distributions (main site `E1K1ZBQ861G4YS` and storage `E2A7GCNTLDAYXU`) so cached content is refreshed.

```bash
make invalidate
```

---

### arXiv Feed System

The arXiv feed is a multi-stage pipeline for discovering, filtering, reviewing, and publishing papers relevant to integrable probability. It has two main workflows: **daily fetch** (recent papers via arXiv API) and **full scan** (historical discovery via Kaggle metadata + semantic embeddings).

#### Key Data Files

| File | Location | Purpose |
|------|----------|---------|
| `authors.yml` | `_scripts/arxiv/` | Tracked authors config: names, affiliations, topics, disambiguation hints |
| `ai_prompt.txt` | `_scripts/arxiv/` | Prompt template for Claude AI filtering |
| `processed.json` | `_scripts/arxiv/` | Dedup tracker: `{arxiv_id: {source, decision, date}}` |
| `review.json` | `_scripts/arxiv/` | Papers pending interactive TUI review |
| `scan-review.json` | `_scripts/arxiv/` | Candidates from full scan pending TUI review |
| `arxiv-index.json` | `assets/data/` | Client-side search index (committed, ~4 MB) |
| `arxiv-vectors.npy` | `assets/data/` | Reference embeddings for known papers (committed, ~17 MB) |
| `arxiv_authors.yml` | `_data/` | Synced author list for Jekyll |
| `.embedding-cache.json` | `_scripts/arxiv/` | Cached embeddings for ~4K known papers |
| `.embedding-cache-full.db` | `_scripts/arxiv/` | SQLite cache of 3M+ paper embeddings (~5-8 GB) |
| `arxiv-metadata.db` | `~/Data/arxiv/` | SQLite import of full Kaggle arXiv metadata |
| `arxiv-metadata-oai-snapshot.json` | `~/Data/arxiv/` | Raw Kaggle JSON download (~5 GB) |
| `_posts/arxiv/*.md` | project root | Generated Jekyll posts, one per accepted paper |

#### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ARXIV_KAGGLE` | `~/Data/arxiv/arxiv-metadata-oai-snapshot.json` | Path to Kaggle JSON snapshot |
| `ARXIV_KAGGLE_DB` | `~/Data/arxiv/arxiv-metadata.db` | Path to SQLite DB |

---

#### Pipeline 1: Daily Fetch (Recent Papers)

**Goal:** Fetch the latest papers from arXiv, filter by author/topic, review interactively, and generate Jekyll posts.

##### Step 1: Fetch, filter, and review

```bash
make arxiv DAYS=30
```

This runs two scripts in sequence:

1. **`fetch_arxiv.py --days 30 --review`** — Queries the arXiv API for papers in tracked categories (`math.PR`, `math-ph`, `math.RT`, etc.), batching by author surnames (20 per query). For each paper:
   - Deduplicates against `processed.json`
   - Matches authors deterministically against `authors.yml`
   - Sends unmatched/ambiguous papers to Claude AI for `ACCEPT`/`REJECT_PERSON`/`REJECT_TOPIC` decisions
   - Auto-accepts high-confidence AI accepts and generates Jekyll posts
   - Exports medium-confidence papers to `review.json`
   - Launches the **arxiv-review TUI** for interactive decisions

2. **`build_search_index.py`** — Parses all `_posts/arxiv/*.md` files, extracts metadata (id, title, authors, categories, date, plain-text abstract), and writes:
   - `assets/data/arxiv-index.json` — compact search index for client-side JS
   - `_data/arxiv_authors.yml` — synced author list

```bash
# Fetch last 7 days (smaller batch)
make arxiv DAYS=7

# Fetch last 90 days
make arxiv DAYS=90
```

##### Step 2 (if needed): Re-import review decisions

If you quit the TUI and want to re-import your saved decisions later:

```bash
python3 _scripts/arxiv/fetch_arxiv.py --import-review
```

This reads `review.json`, generates posts for papers marked ACCEPT, and updates `processed.json`.

---

#### Pipeline 2: Full Scan (Historical Discovery)

**Goal:** Scan the entire arXiv corpus (~3M papers) using semantic embeddings to find missed papers related to integrable probability.

##### Prerequisites

Before running the full scan, you need:

1. **Kaggle arXiv metadata** — download and import into SQLite
2. **Python venv** with `sentence-transformers`, `numpy`, `torch`
3. **Reference embeddings** — computed from your existing ~4K accepted papers

##### Step 1: Download and import Kaggle data (one-time setup)

```bash
# Download Kaggle arXiv dump (~5 GB) and import into SQLite
make arxiv-kaggle
```

This does two things:
1. Downloads `arxiv-metadata-oai-snapshot.json` from Kaggle to `~/Data/arxiv/`
2. Runs `import_kaggle_to_sqlite.py` to stream the JSON into `~/Data/arxiv/arxiv-metadata.db` (batch insert 10k at a time)

If you already have the JSON and just need to re-import:

```bash
make arxiv-import
```

##### Step 2: Build reference embeddings

```bash
make arxiv-related
```

Runs `build_arxiv_embeddings.py`, which:
1. Loads all paper IDs from `arxiv-index.json`
2. Fetches raw LaTeX abstracts from the Kaggle SQLite DB
3. Embeds each paper with BAAI/bge-m3 (1024-dim), caching in `.embedding-cache.json`
4. Writes `assets/data/arxiv-vectors.npy` (reference vectors for full scan)
5. Computes top-5 related papers per paper (cosine similarity, threshold 0.69)
6. Updates `_posts/arxiv/*.md` front matter with `related-papers:` field

This automatically creates the venv if needed (depends on `arxiv-venv`).

##### Step 3: Run the full scan

```bash
# Scan all 3M+ papers (takes 3-6 hours on CPU)
make arxiv-scan

# Scan only papers from a specific month
make arxiv-scan ARGS="--id-prefix 2601"

# Adjust similarity threshold (default 0.65)
make arxiv-scan ARGS="--threshold 0.60"
```

Runs `scan_full_arxiv.py`, which:
1. Loads reference vectors from `arxiv-vectors.npy`
2. Streams the Kaggle SQLite DB in 100-paper chunks
3. Filters to relevant arXiv categories
4. Embeds uncached papers (stores in `.embedding-cache-full.db`, ~5-8 GB SQLite)
5. Computes max cosine similarity to any reference paper
6. Papers above threshold become candidates in `scan-review.json`

##### Step 4: Review scan candidates

```bash
# Open the TUI to review scan candidates
arxiv-review scan-review.json
```

Use the TUI to ACCEPT/REJECT each candidate (keybindings: `a`=accept, `r`=reject, `s`=skip, `o`=open PDF, `q`=quit and save).

##### Step 5: Import accepted papers

```bash
make arxiv-scan-import
```

Runs `scan_full_arxiv.py --import-accepted`, which reads decisions from `scan-review.json` and generates Jekyll posts for accepted papers.

##### Step 6: Rebuild indices

```bash
make arxiv-rebuild
```

Runs `build_search_index.py` then `arxiv-related` to update both the search index and the related-papers embeddings with the newly added papers.

---

#### Pipeline 3: Rebuild Without Fetching

**Goal:** Regenerate search index and related-paper links from existing posts (e.g., after manual edits).

```bash
make arxiv-rebuild
```

This runs:
1. `build_search_index.py` — regenerate `arxiv-index.json` and `_data/arxiv_authors.yml`
2. `make arxiv-related` — recompute embeddings and update `related-papers:` in post front matter

---

#### Individual Targets

##### `make arxiv-install`
Build the Go-based `arxiv-review` TUI and copy the binary to `~/bin/`.

```bash
make arxiv-install
# Builds _scripts/arxiv/arxiv-review/main.go
# Installs to ~/bin/arxiv-review
```

The TUI uses Charmbracelet Bubble Tea. Key bindings:
- `a`/`v` = ACCEPT, `r`/`b` = REJECT, `s` = SKIP
- `n`/`p` = next/prev paper, `N`/`P` = next/prev author group
- `A`/`R` = accept/reject all undecided in current group
- `j`/`k` = scroll abstract, `o` = open PDF in browser
- `u` = undo last decision, `q` = quit (saves)

##### `make arxiv-venv`
Create the Python venv at `_scripts/arxiv/venv/` with semantic-search dependencies (`sentence-transformers`, `numpy`, `torch`). Only runs if the venv doesn't already exist.

```bash
make arxiv-venv
```

##### `make arxiv-related`
Recompute paper embeddings and update `related-papers:` front matter. Automatically runs `arxiv-venv` first.

```bash
make arxiv-related
```

---

#### Typical Workflows

##### Weekly paper check
```bash
make arxiv              # fetch, AI filter, review in TUI, build index
make autodeploy         # push to site
```

##### After adding papers manually
```bash
make arxiv-rebuild      # rebuild search index + related papers
make autodeploy
```

##### First-time full scan setup
```bash
make arxiv-install      # build TUI binary
make arxiv-kaggle       # download + import Kaggle data (one-time, ~5 GB)
make arxiv-related      # build reference embeddings
make arxiv-scan         # run full scan (hours)
arxiv-review _scripts/arxiv/scan-review.json   # review candidates
make arxiv-scan-import  # import accepted
make arxiv-rebuild      # update indices
make autodeploy
```

##### Periodic re-scan (after Kaggle data updated)
```bash
make arxiv-kaggle       # re-download latest Kaggle dump
make arxiv-scan         # scan for new candidates
arxiv-review _scripts/arxiv/scan-review.json
make arxiv-scan-import
make arxiv-rebuild
make autodeploy
```
