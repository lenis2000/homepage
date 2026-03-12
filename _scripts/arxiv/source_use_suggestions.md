# arXiv LaTeX Source Processing Ideas

The curated corpus (~5,200 papers, 3.1 GB of LaTeX source) is uniquely valuable because LaTeX is the semantic source code of mathematical thought — PDFs destroy subscripts, mangle fractions, and lose the boundaries between a passing remark and a rigorous proof.

**Architecture note:** Standard RAG is terrible for mathematics (chunking destroys proof logic, embeddings blur notation). Pure agentic search on 37,000 raw files is too slow. The optimal approach: use scripts **offline** to parse LaTeX into structured databases, then let Claude Code query those. Also, citation graphs are redundant with Google Scholar, and notation harmonization is unnecessary for domain experts.

---

### 1. Combinatorial Figure & TikZ Gallery

*(Very High Value / Low-Medium Effort — ~3-5 days)*

A centralized, searchable visual database of all figures (`.eps`, `.png`, and raw `tikzpicture` code) paired with their exact LaTeX `\caption{}` text. A Pinterest-style search page where querying "arctic circle" or "six-vertex model" yields a grid of figures with captions across 30 years of literature, plus a "Copy TikZ" button for natively drawn diagrams.

**Implementation:** Parse `.tex` files for `\begin{figure}` blocks to extract image paths and captions. Batch-convert `.eps`/`.ps` to `.png` via Ghostscript/ImageMagick. Index captions using existing embeddings.

### 2. Semantic Database of Theorems, Identities, & Conjectures

*(High Value / Medium Effort — ~1 week)*

A searchable database constructed only from formal math environments (`theorem`, `lemma`, `definition`, `conjecture`), stripped of narrative prose. Querying "q-Whittaker Cauchy identity" returns the exact formal statement, beautifully rendered via MathJax, not a 60-page paper.

**Implementation:** Parse `\begin{theorem}...\end{theorem}` etc. using TexSoup or regex. Prepend each paper's custom `\newcommand` macros so snippets render correctly. Embed chunks into the existing semantic search system.

### 3. Auxiliary Code & Experimental Math Vault

*(High Value / Low Effort — ~1-2 days)*

Extract all computational scratch work hidden in source tarballs — Mathematica notebooks (`.nb`), Python/Sage scripts, Maple worksheets, numeric data — that never appears in compiled PDFs. Link as "Scripts & Simulations" attachments on paper pages.

**Implementation:** Walk source directories to isolate `.nb`, `.py`, `.sage`, `.m`, `.dat` files. Also regex `.tex` for `\begin{verbatim}` code blocks.

### 4. LaTeX Comment Miner (Private/Local Only)

*(High Value / Low Effort — ~1 weekend)*

**Private tool, never published.** Extract `%` comments from `.tex` files — the unfiltered "cutting room floor" of mathematical research: alternative proof sketches, abandoned generalizations, honest assessments of proof fragility, TODOs between coauthors. This data is uniquely valuable and exists nowhere else, but was never intended to be public.

**Implementation:** Regex-extract comments, use an LLM to filter formatting noise (`% --- Section 2 ---`) from substantive mathematical notes. Store locally for personal research use and agentic search.

### 5. Proof Methodology Tagger

*(Very High Value / Medium Effort — ~few days + ~$20 API)*

An offline AI sweep that reads `\begin{proof}` blocks to catalog the mathematical machinery used (Fredholm determinants, saddle-point method, Bethe Ansatz, RSK insertion, Markov duality), ignoring the actual theorem statement. Adds "Proof Techniques" tags to paper metadata, enabling filtering by *methodology* rather than subject matter.

**Implementation:** Extract proof blocks via AST parser. Batch through LLM API to identify 2-4 standard techniques per proof. Store as tags in paper front matter.
