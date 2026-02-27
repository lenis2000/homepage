# Homepage Project

- Color patterns are defined in `js/colorschemes.js` and used in lozenge/domino drawing files. This file contains links to the files which use these color patterns.
- For cpp compile, look at their preambles
- Simulation-specific documentation is in `_simulations/CLAUDE.md`

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

## User Preferences
- **No co-author line in commits** — do NOT add `Co-Authored-By: Claude` to git commit messages
- Don't run Jekyll builds - user handles deployment
- Prefer static KaTeX formulas in HTML over dynamic JS rendering
- Keep dynamic value displays (e.g., computed q-binomial values) separate from static formulas
- Avoid redundant status text — show sample counts in ONE place (e.g., under histogram only, not also under the path canvas)
- When switching rendering modes (LEGO, Minecraft), do NOT announce the mode in descriptions — just silently change the visual style while keeping the mathematical description unchanged
- Grid column widths are per-slide — adjust to fit content (e.g., `52vw 40vw` for text-heavy left, `42vw 50vw` for balanced)
