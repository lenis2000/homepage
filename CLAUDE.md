# Homepage Project

- Color patterns are defined in `js/colorschemes.js` and used in lozenge/domino drawing files. This file contains links to the files which use these color patterns.
- For cpp compile, look at their preambles
- Simulation-specific documentation is in `_simulations/CLAUDE.md`

## Talk Slides (waterfall talk)

- Slides are in `_includes/talk/waterfall/*.html`
- Each slide is a separate HTML file with `id` matching the URL hash (e.g., `#spectral-projection` → `spectral-projection.html`)

### Pane Colors
- **Orange/accent panes**: `background: #f5f5f5; border-left: 4px solid var(--slide-accent);` with `color: var(--slide-accent);` for titles
- **Blue/navy panes**: `background: #e3f2fd; border-left: 4px solid var(--slide-navy);` with `color: var(--slide-navy);` for titles
- **Yellow/warning panes**: `background: #fff3e0; border-left: 4px solid #E57200;` with `color: #E57200;` for titles

### Citation Style
- **Inline citations** (after pane titles): `<strong style="color: var(--slide-accent);">Title</strong> <span style="color: var(--slide-muted);">[Author Year]</span>`
- **Inline citations** (within text): `<span style="color: var(--slide-muted);">[Author Year]</span>`
- **References section**: `<strong style="color: var(--slide-accent);">References:</strong>` followed by citations in muted color (inherited from parent div with `color: var(--slide-muted);`)
