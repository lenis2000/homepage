# Homepage Project

- Color patterns are defined in `js/colorschemes.js` and used in lozenge/domino drawing files. This file contains links to the files which use these color patterns.
- For cpp compile, look at their preambles
- Simulation-specific documentation is in `_simulations/CLAUDE.md`
- Simulation pages use `a11y-description` front matter for screen reader descriptions (rendered as visually-hidden text by `_layouts/sim_page.html`). Add this field when creating new simulation pages.

## Paper Posts & S3 Storage

### Adding a New Paper
1. Create `_posts/papers/YYYY-MM-DD-slug.md` with front matter (see existing posts for template)
2. Upload PDF to S3: `aws s3 cp paper.pdf s3://lpetrov.cc.storage/papers/NN-slug.pdf`
3. PDF naming: `{cv-number}-{slug}.pdf` (e.g., `50-colored-interlacing-genocchi.pdf`)
4. Commit and push — GitHub Actions builds Jekyll and deploys site to `s3://lpetrov.cc` with CloudFront invalidation

### Paper Post Front Matter Template
```yaml
layout: post
title: "Paper Title"
arXiv: YYMM.NNNNN [math.XX]
coauthors:
  - name: Coauthor Name
    web: https://...       # optional, use 'noweb: true' if no website
  - name: Leonid Petrov
categories: blog math preprint   # use 'paper' once published
journal-ref: ...                 # add when published
journal-web: https://...         # DOI link
journal-year: YYYY               # publication year (extracted from journal-ref)
image: __STORAGE_URL__/img/papers/image.png   # optional
show-date: true
pdf: NN-slug.pdf
post-pdf: true
pages: NN
cv-number: NN
published: true
simulations: simulations/YYYY-MM-DD-slug/    # optional
```

### journal-year Field
- Every published paper post should have a `journal-year:` field with the publication year
- For preprints, add commented-out placeholder: `# journal-year:`
- This field is used by the coauthors sidebar on the research page
- The post date corresponds to the arXiv submission date, NOT the journal publication date

### S3 Buckets
- **Site**: `s3://lpetrov.cc` (deployed by GitHub Actions, don't push PDFs here)
- **Storage**: `s3://lpetrov.cc.storage` — paper PDFs go to `papers/` prefix, served at `https://storage.lpetrov.cc`

### Current Paper Count
- Latest cv-number: 50 (as of Feb 2026)

## Talk Slides

- Talk-specific documentation is in `talk/CLAUDE.md`

## Coauthors Sidebar (research page)
- Auto-generated from paper/preprint post front matter via Liquid in `research/research.html`
- Sorted by last name using `LastName^FullName^Year` entries
- Shows: `[count] Name (≤year)` — year is journal-year if available, else arXiv year
- Includes a "Solo" entry for sole-authored papers
- Uses `{%- -%}` whitespace-stripping Liquid tags to prevent unwanted line breaks
- Uses `&nbsp;` for spaces inside stripped blocks (regular spaces get eaten)
- Styled with `list-group-sm` / `list-group-item` to match other sidebar sections

## arXiv Submission Workflow
- Create `arXiv_vN/` folder with flat structure (no subdirectories)
- Copy: `.tex`, `.bib`, `.bbl`, and all referenced images
- Update `\includegraphics` paths if they reference subdirectories
- Create `abstract.txt` with plain text title, authors, and abstract (keep `$...$` math)
- Use single hyphens in abstract (arXiv style), not `--` em-dashes

## Travel Page
- Travel posts live in `_posts/travel/`, one per year (e.g., `2025-07-25-travel-2026.md`)
- Format: `##### Month` headers, entries as `dates &bull; location &bull; [Event Name](url) description`
- Empty months are commented out: `<!-- ##### Month -->`
- Category: `travel travel-plans blog`

## CV (LaTeX)
- CV source: `/Users/leo/__FORMER_DPBX/Sci/CV_GitHub/__petrovCV__.tex`
- Publication list generated from Jekyll via `_includes/cv_publist.html`
- Key CV sections (in order): Publications, Students/postdocs, Organization/service, Talks and conferences (commented-out numbered list), Seminar talks (`longtable`), Conference talks (`etaremune`), Research programs (`etaremune`)
- When adding travel/events, update BOTH the homepage travel post AND the CV — they are separate files
- Research programs/thematic programmes go in "Research programs and focused collaborations" section
- Conference/workshop talks go in "Conference talks" section
- Seminar/colloquium talks go in "Seminar talks" section

## Images & S3 Storage for Non-Paper Assets
- Upload images to `s3://lpetrov.cc.storage/img/` (served at `https://storage.lpetrov.cc/img/`)
- Reference via `{{site.storage_url}}/img/filename.jpg` in templates
- Convert HEIC to JPEG with `sips -s format jpeg -s formatOptions 85 -Z <maxdim> input.heic --out output.jpg`
- Rotate/flip with `sips -r <degrees>` and `sips -f vertical|horizontal`
- Don't store images in the repo — use S3 storage bucket

## Simulations Page (`simulations.md`)
- Featured cards are in `_includes/sims.html` (shared with `index.html`)
- `sims.html` uses `d-none d-md-block` — hidden on mobile on index, but simulations page overrides with CSS `display: block !important` at ≤991px
- Cards use `col-6` with zero-padding CSS override (Bootstrap's `.col-6` has default 15px padding)
- For responsive show/hide, use Bootstrap classes (`d-none d-lg-block`, `d-lg-none`) — custom media query `display:none` often fails due to specificity
- Two-image pattern for responsive layouts: separate desktop/mobile `<figure>` elements with Bootstrap visibility classes, not CSS transform hacks
- CSS `transform: rotate()` does NOT change layout box — use a separate pre-rotated image file instead

## Bootstrap Gotchas (this site uses Bootstrap 4-style col padding)
- `d-md-block` overrides `.row`'s `display: flex` — use explicit `col-6` classes instead of `row-cols-2`
- `.col` class has `flex: 1 0 0%` which can override `row-cols-*` width
- Zero-gap grid: need explicit CSS `.col-6 { padding: 0; }` and `.row { margin: 0; }` — `g-0` alone doesn't remove all gutters
- Floated images that are too tall push all subsequent content below — constrain with `max-height`

## arXiv Source Viewer (`arxiv/source.html`)
- Standalone page at `/arxiv/source/?id=XXXX.XXXXX` — loads files from S3, no Jekyll-rendered per-paper pages
- Per-paper `_files.json` on S3 lists available files; `arxiv-sources-ids.json` controls badge visibility on feed
- **Input flattening**: `\input{...}` commands are resolved client-side — fetches referenced `.tex` files from S3 and inlines them before rendering
- **Auto-select logic**: `main.tex` → `.tex` file containing `\input{}` → largest `.tex` → first file
- **Section folding**: Sections are numbered (1., 1.1., etc.) and collapsible; Cmd-F expands all, Escape collapses
- Source files on S3 are never modified — all processing (flattening, folding, numbering) is client-side JS

## arXiv Scanning & Embeddings
- Kaggle DB scan: `make arxiv-scan ARGS="--id-prefix YY --threshold 0.8"` scans by year prefix
- Embedding cache at `_scripts/arxiv/.embedding-cache-full.db` — cached papers are fast, uncached require model computation
- `processed.json` tracks accepted/rejected papers — re-scanning already-processed years just iterates cached rows
- Source use ideas tracked in `_scripts/arxiv/source_use_suggestions.md`

## Schur/GT Pattern Simulation (`2026-04-06-schur-gt-enumeration.md`)

### Particle-Partition Bijection (Aztec Diamond)
- Partition λ with h particles: positions s_i = λ_{h+1-i} + i for i=1,...,h
- **h is NOT the number of nonzero parts** — it's fixed by the diagonal: h = nn - ⌊d_code/2⌋
- Empty partition ∅ with h=n means ALL n positions are particles (tightest packing)
- nn (Aztec size) = max over all config entries of (ℓ+level for μ, ℓ+level-1 for λ)

### Diagonal Sort Order (CRITICAL)
- At same level, λ comes BEFORE μ: `a.type === 'lam' ? -1 : 1`
- λ^j is at diagonal 2j-1, μ^j is at diagonal 2j. λ has lower d_code.
- Getting this backwards swaps nLam/nMu assignments and breaks particle counts

### Domino Reconstruction from GT Patterns
- For each μ row: particles match UP to λ above, holes match DOWN to λ below
- Between (μ,λ) going up: particle↔particle dominos
- Between (λ,μ) going up: hole↔hole dominos
- Bipartite matching: μ pos j → λ pos j or j+1 (midIsBigger=false)

### 2×2 Periodic Weights (parameter a)
- isAlpha: horizontal + black-left/white-right + (gx+gy)%4===2 + gx parity (toggle)
- x-odd vs x-even gives two different polynomials
- Setting a=1 recovers standard (unweighted) polynomial

### KaTeX on This Site
- Version 0.7.1, loaded async — use retry with setTimeout for initial render
- Inline mode (`displayMode: false`) with `\displaystyle` prefix allows natural line wrapping
- Add `.katex { white-space: normal !important; }` CSS for wrapping
- Truncate polynomials >60 terms with "... (N more terms)" to avoid KaTeX crashes

## User Preferences
- **No co-author line in commits** — do NOT add `Co-Authored-By: Claude` to git commit messages
- Don't run Jekyll builds - user handles deployment; Jekyll rebuild takes ~15s
- Prefer static KaTeX formulas in HTML over dynamic JS rendering
- Keep dynamic value displays (e.g., computed q-binomial values) separate from static formulas
- Avoid redundant status text — show sample counts in ONE place (e.g., under histogram only, not also under the path canvas)
- When switching rendering modes (LEGO, Minecraft), do NOT announce the mode in descriptions — just silently change the visual style while keeping the mathematical description unchanged
- Grid column widths are per-slide — adjust to fit content (e.g., `52vw 40vw` for text-heavy left, `42vw 50vw` for balanced)
- Wait for Jekyll rebuild (~15s) before taking agent-browser screenshots after file changes
