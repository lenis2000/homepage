# Repository Guidelines

## Project Structure & Content Layout
The site runs on Jekyll. `_layouts/` defines page templates, `_includes/` holds reusable partials, and `_config.yml` tracks site metadata and plugin setup. Narrative content belongs in `_posts/` (`YYYY-MM-DD-title.md`), while evergreen sections live under `content/`, `history/`, `research/`, and `teaching/`. Assets stay in `assets/`, `css/`, and `js/`; store large images under `assets/img/` and reference them relatively. Color palettes for lozenge drawings are centralized in `js/colorschemes.js`; update the usage links inside that file whenever you introduce a new scheme. Simulation notes and course material stay in `_simulations/` and `AI-teaching/` to keep private drafts separate from public posts.

## Build, Test, and Development Commands
Install dependencies with `bundle install`. Use `bundle exec jekyll serve --incremental` or `make serve` to preview locally at `http://localhost:4000`. Validate before pushing using `bundle exec jekyll build` (outputs to `_site/`) and `bundle exec jekyll doctor` to catch configuration issues. Run `make deploy` only after a clean build; it commits with `--signoff`, pushes, and triggers CloudFront invalidations.

## Coding Style & Naming Conventions
Write Markdown with YAML front matter (`title`, `layout`, `permalink`) and keep metadata sorted alphabetically. Prefer two-space indentation in Liquid templates and HTML partials under `_includes/`. Name posts `YYYY-MM-DD-topic.md`; name stand-alone pages after their final URL segment (e.g., `content/kpz/index.md`). Reuse selectors from `css/main.css` and keep custom scripts in `js/` with camelCase functions.

## Testing & Validation
Before opening a PR, ensure `bundle exec jekyll build` finishes without warnings. Spot-check the `_site/` output for broken internal links and oversized assets. For new layouts, run `bundle exec jekyll doctor` and browse the local preview across `/research`, `/teaching`, and `/posts` to confirm navigation and includes.

## Commit & Pull Request Guidelines
Write short, imperative commit messages that describe the visible change (`Add KPZ seminar notes`, `Fix header nav spacing`). If you use `make deploy`, sign-offs are added automatically; otherwise run `git commit --signoff`. Group related edits per commit, link issues in the body when applicable, and mention affected URLs. Pull requests should summarize the change, note any new assets or configuration updates, and include screenshots for visual tweaks. Confirm the local build command you ran so reviewers can reproduce quickly.

## Deployment Notes
Deployment assumes AWS credentials capable of invalidating the two CloudFront distributions referenced in the Makefile. Run `make invalidate` separately if you need to refresh caches without redeploying. Avoid manual edits inside `_site/`; it is regenerated on every build.
