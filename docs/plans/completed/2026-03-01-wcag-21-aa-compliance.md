# WCAG 2.1 AA Compliance for lpetrov.cc

## Overview

Bring the Jekyll academic website to WCAG 2.1 AA conformance, focusing on infrastructure (layouts/includes used site-wide), then root-level pages (index, research, teaching), then batch-treating simulation pages with screen reader descriptions for canvas-based interactive content.

## Context

- Files involved: `_layouts/default.html`, `_layouts/sim_page.html`, `_includes/navbar.html`, `_includes/header.html`, `_includes/footer.html`, `css/main.css`, `index.html`, `research/research.html`, `teaching/teaching.html`, `_includes/sims.html`, `_includes/contact.html`, `_includes/students.html`, `js/theme-toggle.js`, plus ~60 simulation .md files
- Site uses: Bootstrap 4 alpha 6, Font Awesome 6, KaTeX, custom Franklin Gothic typography
- Current state: `lang="en"` present, some `aria-hidden` on decorative icons, research search has `aria-label`, but no skip links, no landmarks, no visible focus indicators, many icon-only links lack accessible names

## Development Approach

- Work infrastructure-first (layouts/includes/CSS) for maximum reach
- No automated test suite exists for this static Jekyll site; validation via manual checklist
- Each task modifies a small set of related files
- For simulations: add a reusable pattern in `sim_page.html` layout plus front matter descriptions

## Implementation Steps

### Task 1: Add skip navigation and landmark structure to layouts

**Files:**
- Modify: `_layouts/default.html`
- Modify: `_layouts/sim_page.html`
- Modify: `_includes/navbar.html`
- Modify: `_includes/footer.html`
- Modify: `css/main.css`

- [x] Add a visually-hidden "Skip to main content" link as the first focusable element in both layout files, targeting `#main-content`
- [x] Add `role="navigation" aria-label="Main navigation"` to `<nav>` in navbar.html
- [x] Wrap page content in `<main id="main-content">` in both layout files (replacing the bare `<div class="container">`)
- [x] Add `role="contentinfo"` to `<footer>` in footer.html
- [x] Add CSS for `.skip-link` (visually hidden, becomes visible on focus, positioned at top of page)

### Task 2: Fix focus visibility across the site

**Files:**
- Modify: `css/main.css`

- [x] Add a global `:focus-visible` outline style (e.g., `outline: 3px solid var(--accent-color); outline-offset: 2px`) that applies to all interactive elements
- [x] Remove any `outline: none` or `outline: 0` if present
- [x] Add a focus ring style for the theme toggle slider (currently invisible to keyboard users)
- [x] Add `prefers-reduced-motion: reduce` media query to disable CSS transitions (theme toggle slide, any transition properties)

### Task 3: Fix accessible names for icon-only links and controls

**Files:**
- Modify: `_includes/footer.html`
- Modify: `_includes/navbar.html`
- Modify: `_includes/sims.html`

- [x] Add `<span class="sr-only">GitHub repository</span>` (or use `aria-label`) to the GitHub icon link in footer (both mobile and desktop versions)
- [x] Add `<span class="sr-only">RSS feed</span>` to the RSS icon link in footer
- [x] Add accessible text to theme toggle: add `<span class="sr-only">Toggle dark/light theme</span>` inside the label, or `aria-label` on the input
- [x] Add `aria-hidden="true"` to decorative SVGs in sims.html cards (the lozenge/domino icons)
- [x] Add `aria-hidden="true"` to the `<i class="fas fa-dice">` icons in sims.html (they are decorative)

### Task 4: Fix heading hierarchy and semantic structure

**Files:**
- Modify: `index.html`
- Modify: `research/research.html`
- Modify: `_includes/contact.html`

- [x] Replace `<a name="preprints">` anchors with `id` attributes on the `<h1>` elements in research.html (e.g., `<h1 id="preprints">`)
- [x] Add `<h2>` level headings where h3 is used directly under an implied h1 on index.html (the page title is the implicit h1; "About", "Teaching", "Recent news" are h3 but should be h2 for proper hierarchy)
- [x] Add proper `<caption>` or `aria-label` to tables in contact.html (contact info, office info tables)
- [x] Ensure the "Keywords" section on index.html is not bare text - wrap in a paragraph or use a heading

### Task 5: Improve link context and image accessibility

**Files:**
- Modify: `research/research.html`
- Modify: `index.html`
- Modify: `_includes/sims.html`

- [x] Add `aria-label` to ambiguous "PDF", "TeX", "Visualizations" links in research.html paper listings so screen readers get context (e.g., `aria-label="PDF of paper title"` using Liquid variable `{{post.title}}`)
- [x] Add meaningful `alt` text to the heart/tiling image link on index.html (currently "Random tiling" - improve to describe what clicking does, e.g., "Random lozenge tiling - visit simulations gallery")
- [x] Ensure all `<img>` tags in research paper listings have `alt` attributes (they use `post.image-alt` which may be null - add fallback)

### Task 6: Simulation pages - add screen reader descriptions via layout and front matter

**Files:**
- Modify: `_layouts/sim_page.html`
- Modify: All simulation .md files (batch: add `a11y-description` front matter field)

- [x] Add a `visually-hidden` description block in sim_page.html that renders `page.a11y-description` if present, placed before the simulation content, using `<div class="sr-only" role="note" aria-label="Simulation description">{{ page.a11y-description }}</div>`
- [x] Add `a11y-description` front matter to each simulation .md file with an accurate text description of what the simulation shows and does. Group by category:
  - Domino tilings (~20 files): describe the Aztec diamond / domino tiling being visualized
  - Lozenge tilings (~10 files): describe the hexagonal region / lozenge tiling
  - Random matrices (~5 files): describe eigenvalue distributions / semicircle law
  - Permutations (~7 files): describe RSK / pipe dreams / tableaux
  - Vertex models (~5 files): describe the lattice model
  - TASEP-like (~6 files): describe the particle system
  - Misc (~9 files): individual descriptions
- [x] For the two "ultimate" draw tools (lozenge-draw, domino-draw) that already have extensive ARIA, just add the front matter description for consistency

### Task 7: Verify and fix color contrast

**Files:**
- Modify: `css/main.css`

- [x] Verify `--text-secondary` (#6c757d) on `--bg-primary` (#ffffff) meets 4.5:1 ratio for normal text - it is 4.6:1 which barely passes, but darken slightly to be safe (e.g., #636b73 = 5.0:1)
- [x] Fix `.search-highlight` - yellow on white has poor contrast; change to a bordered/outlined highlight or darker background
- [x] Verify dark mode contrast ratios: `--text-secondary` (#b3b3b3) on `--bg-primary` (#1a1a1a) = ~8.3:1, passes
- [x] Ensure `.highlighted-item` green (#1e6a06) passes on both light and dark backgrounds

### Task 8: Final verification checklist

- [x] Keyboard navigation: tab through all pages, verify all interactive elements are reachable and focus is visible
- [x] Screen reader: verify skip link works, landmarks are announced, simulation descriptions are read
- [x] Check that `<details>`/`<summary>` elements (used for paper abstracts) are keyboard accessible
- [x] Verify cookie banner (third-party cookiebanner.js) is keyboard-dismissible - if not, note as known limitation
- [x] Verify the research search input, clear button, and filter buttons are keyboard accessible and announce state changes

### Task 9: Update documentation

- [x] Update CLAUDE.md if internal patterns changed (e.g., note a11y-description front matter convention)
- [x] Move this plan to `docs/plans/completed/`
