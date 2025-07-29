---
title: Bibliography (.bbl) Sorting Tool
model: misc
author: Leo Petrov
layout: sim_page
code:
  - link: https://github.com/lenis2000/homepage/blob/master/_simulations/misc/2025-07-12-bbl_sorting_tool.md
    txt: Interactive bibliography sorting tool for LaTeX .bbl and amsrefs files
---

<style>
.bbl-tool textarea {
    width: 100%;
    min-height: 280px;
    padding: 16px;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.4;
    resize: vertical;
    transition: border-color 0.2s ease;
    background: #fafbfc;
    box-sizing: border-box;
}

.bbl-tool textarea:focus {
    outline: none;
    border-color: #3498db;
    background: white;
}

.bbl-tool .button-group {
    display: flex;
    gap: 12px;
    margin: 25px 0;
    flex-wrap: wrap;
}

.bbl-tool .stats {
    color: #6c757d;
    font-size: 13px;
    margin-top: 8px;
    font-weight: 500;
}

.bbl-tool .error {
    color: #e74c3c;
    margin: 15px 0;
    padding: 12px 16px;
    background: #fdf2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-weight: 500;
}

.bbl-tool .success {
    color: #27ae60;
    margin: 15px 0;
    padding: 12px 16px;
    background: #f0f9f4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    font-weight: 500;
}

.bbl-tool #outputArea {
    background: #f8f9fa;
}

.bbl-tool section {
    margin-bottom: 30px;
}

.bbl-tool .section-title {
    font-weight: 600;
    margin-bottom: 12px;
    color: #2c3e50;
    font-size: 1.1em;
}
</style>

<div class="bbl-tool">
    <p class="lead">
        This tool sorts bibliography entries alphabetically by author names, and—for identical author lists—chronologically from oldest to newest.
        It supports both standard LaTeX bibliography (.bbl) and amsrefs formats, handling complex author formats including initials, surname prefixes (de, von, van), and multiple authors.
    </p>

    <section>
        <div class="section-title">Input (.bbl file content)</div>
        <textarea id="inputArea" placeholder="Paste your .bbl file content here..."></textarea>
        <div class="stats" id="inputStats"></div>
    </section>

    <div class="button-group">
        <button class="btn btn-primary" onclick="sortBibliography()">Sort Bibliography</button>
        <button class="btn btn-secondary" onclick="clearAll()">Clear All</button>
        <button class="btn btn-secondary" onclick="loadExample()">Load Standard Example</button>
        <button class="btn btn-secondary" onclick="loadAmsrefsExample()">Load Amsrefs Example</button>
    </div>

    <div id="message"></div>

    <section>
        <div class="section-title">Sorted Output</div>
        <textarea id="outputArea" placeholder="Sorted bibliography will appear here..." readonly></textarea>
        <div class="stats" id="outputStats"></div>
    </section>
</div>

<script>
// Bibliography sorting functions (based on Python implementation)

function getLastName(str) {
    let auth = str.trim().replace(/~/g, ' ');
    
    // Handle "Last, First" format (common in bibliographies)
    if (auth.includes(',')) {
        const parts = auth.split(',');
        return parts[0].trim().replace(/\.$/, '');
    }
    
    // Original logic for other formats
    auth = auth.replace(/\.$/g, '');
    const m = auth.match(/^(?:[A-Z]\.\s*)+(.+)/);
    if (m) return m[1].trim();
    const t = auth.split(/\s+/);
    if (t.length <= 1) return t[0] || '';
    let i = t.length - 1;
    for (let k = 1; k < t.length; ++k) {
        if (t[k][0] === t[k][0].toLowerCase()) {
            i = k;
            if (k > 1 && t[k - 1].length <= 3 && /^[A-Z]/.test(t[k - 1])) {
                i = k - 1;
            }
            break;
        }
    }
    if (i === t.length - 1 && t.length >= 3 && t[1].length <= 3) i = 1;
    
    return t.slice(i).join(' ');
}

function getFirstNamePart(str, last) {
    let auth = str.trim().replace(/~/g, ' ');
    
    // Handle "Last, First" format
    if (auth.includes(',')) {
        const parts = auth.split(',');
        if (parts.length > 1) {
            return parts[1].trim().replace(/\.$/, '');
        }
    }
    
    // Original logic for other formats
    auth = auth.replace(/[,]|\.$/, '');
    const idx = last ? auth.lastIndexOf(last) : -1;
    let first = idx !== -1 ? auth.slice(0, idx) : auth;
    return first.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
}

// Parse authors for standard bbl format
function parseAuthors(lines) {
    if (!lines.length) return [];
    const first = lines[0];
    const brace = first.lastIndexOf('}');
    const list = [];
    if (brace !== -1) {
        const tail = first.slice(brace + 1).trim();
        if (tail) list.push(tail);
    }
    for (const l of lines.slice(1)) {
        const s = l.trim();
        if (s.startsWith('\\newblock') || s === '') break;
        list.push(s);
    }
    const txt = list.join(' ').replace(/\.$/, '').trim();
    if (!txt) return [];
    const and = txt.lastIndexOf(' and ');
    const authors = [];
    if (and !== -1) {
        const pre = txt.slice(0, and).replace(/,$/, '').trim();
        if (pre) pre.split(',').forEach(p => p.trim() && authors.push(p.trim()));
        const last = txt.slice(and + 5).trim();
        last && authors.push(last);
    } else {
        authors.push(txt);
    }
    return authors;
}

// Parse authors for amsrefs format
function parseAmsrefsAuthors(entry) {
    const authors = [];
    const joinedEntry = entry.join('\n');
    const authorRegex = /author=\{([^}]+)\}/g;
    let match;
    while ((match = authorRegex.exec(joinedEntry)) !== null) {
        authors.push(match[1].trim());
    }
    return authors;
}

// Detect if format is amsrefs (has \bib entries)
function isAmsrefsFormat(input) {
    return input.includes('\\bib{') && input.includes('\\begin{bibdiv}');
}

// Normalize LaTeX accents and special characters for sorting
function normalizeForSorting(str) {
    return str
        .replace(/\{\\\"([aeiouAEIOU])\}/g, '$1')     // {\"o} -> o
        .replace(/\{\\`([aeiouAEIOU])\}/g, '$1')      // {\`a} -> a  
        .replace(/\{\\\'([aeiouAEIOU])\}/g, '$1')     // {\´a} -> a
        .replace(/\{\\\^([aeiouAEIOU])\}/g, '$1')     // {\^a} -> a
        .replace(/\{\\~([aeiouAEIOU])\}/g, '$1')      // {\~a} -> a
        .replace(/\{\\c\{([cC])\}\}/g, '$1')         // {\c{c}} -> c
        .replace(/\{\\([aeiouAEIOU])\}/g, '$1')       // {\o} -> o
        .replace(/\{([^}]+)\}/g, '$1')               // Remove remaining braces
        .replace(/[\\~]/g, '')                       // Remove backslashes and tildes
        .toLowerCase();
}

function entryKey(entry, isAmsrefs = false) {
    const authors = isAmsrefs ? parseAmsrefsAuthors(entry) : parseAuthors(entry);
    
    if (authors.length === 0) return '';
    
    // Standard bibliography sorting: 
    // 1. First author's last name
    // 2. First author's first name/initials
    // 3. Year (handled separately)
    // 4. Additional authors (for tie-breaking)
    
    const firstAuthor = authors[0];
    const firstLast = getLastName(firstAuthor);
    const firstFirst = getFirstNamePart(firstAuthor, firstLast);
    
    // Create sort key with proper accent normalization
    const key = [
        normalizeForSorting(firstLast),
        normalizeForSorting(firstFirst)
    ];
    
    // Add remaining authors for tie-breaking
    for (let i = 1; i < authors.length; i++) {
        const a = authors[i];
        const last = getLastName(a);
        key.push(normalizeForSorting(last));
    }
    
    return key.join('\u0000');
}

// --- NEW: first 4-digit year (1900-2099); Infinity if none
function extractYear(entry, isAmsrefs = false) {
    const joinedEntry = entry.join(' ');
    if (isAmsrefs) {
        // Look for date={YYYY} pattern in amsrefs
        const dateMatch = joinedEntry.match(/date=\{(\d{4})\}/);
        if (dateMatch) return parseInt(dateMatch[1], 10);
    }
    // Fallback to general year search
    const m = joinedEntry.match(/(?:19|20)\d{2}/);
    return m ? parseInt(m[0], 10) : Infinity;
}

function sortBibliography() {
    const input = document.getElementById('inputArea').value;
    if (!input.trim()) {
        document.getElementById('message').innerHTML = '<div class="error">Please enter bibliography content to sort.</div>';
        return;
    }

    const isAmsrefs = isAmsrefsFormat(input);
    const lines = input.split(/\r?\n/);
    const header = [];
    const entries = [];
    let curr = null;
    let footer = [];
    let footerStarted = false;

    let inHeader = true;
    for (const line of lines) {
        // Handle amsrefs format
        if (isAmsrefs) {
            if (line.trim().startsWith('\\begin{bibdiv}') || line.trim().startsWith('\\begin{biblist}')) {
                header.push(line);
                inHeader = false;
                continue;
            }
            if (inHeader) {
                header.push(line);
                continue;
            }
            if (line.trim().startsWith('\\bib{')) {
                if (curr) entries.push(curr);
                curr = [line];
            } else if (line.trim() === '}' && curr && curr.length > 0) {
                // End of amsrefs entry
                curr.push(line);
                entries.push(curr);
                curr = null;
            } else if (line.trim().startsWith('\\end{biblist}') || line.trim().startsWith('\\end{bibdiv}')) {
                if (curr) {
                    entries.push(curr);
                    curr = null;
                }
                footerStarted = true;
                footer.push(line);
            } else if (footerStarted) {
                footer.push(line);
            } else if (curr) {
                curr.push(line);
            }
        } else {
            // Handle standard format
            if (line.trim().startsWith('\\begin{thebibliography}')) {
                header.push(line);
                inHeader = false;
                continue;
            }
            if (inHeader) {
                header.push(line);
                continue;
            }
            if (line.trim().startsWith('\\bibitem')) {
                if (curr) entries.push(curr);
                curr = [line];
            } else if (line.trim().startsWith('\\end{thebibliography}')) {
                if (curr) entries.push(curr);
                footer.push(line);
                curr = null;
            } else if (curr) {
                curr.push(line);
            }
        }
    }
    if (curr) entries.push(curr);

    entries.sort((a, b) => {
        const ka = entryKey(a, isAmsrefs);
        const kb = entryKey(b, isAmsrefs);
        
        if (ka !== kb)                       // primary: authors A-Z
            return ka < kb ? -1 : 1;
        // secondary: year ↑ within identical‐author group
        const ya = extractYear(a, isAmsrefs);
        const yb = extractYear(b, isAmsrefs);
        return ya - yb;
    });

    const outLines = [
        ...header,
        ...entries.flatMap((e, i) => {
            if (isAmsrefs) {
                // For amsrefs, entries already include their closing }
                // Add blank line after each entry except the last
                return i < entries.length - 1 ? [...e, ''] : e;
            } else {
                // For standard format, add blank line after each entry
                return [...e, ''];
            }
        }),
        ...footer
    ];

    const output = outLines.join('\n');
    document.getElementById('outputArea').value = output;
    document.getElementById('message').innerHTML = '<div class="success">Bibliography sorted successfully!</div>';
    updateStats();
}

// Example bibliography for testing
const exampleBbl = `\\begin{thebibliography}{99}

\\bibitem{EinBoh1955}
A. Einstein and N. Bohr.
\\newblock Unified field theory and the proper way to organize one's sock drawer.
\\newblock \\emph{Princeton Advanced Studies Quarterly}, 12(3):42--108, 1955.

\\bibitem{EinMax1900}
A. Einstein and M. Planck.
\\newblock On blackbody radiation and why my office is always too cold.
\\newblock \\emph{Ann. Physik}, 4(3):553--563, 1900.

\\bibitem{Ein1905}
A. Einstein.
\\newblock On the electrodynamics of moving bodies, with special attention to my wild hair.
\\newblock \\emph{Ann. Physik}, 17(10):891--921, 1905.

\\bibitem{EinNewt1687}
A. Einstein and I. Newton.
\\newblock Principia mathematica: Now with 100% more relativity and significantly better notation.
\\newblock \\emph{Philosophiae Naturalis Principia Mathematica (Revised Edition)}, Royal Society of London, 1687.

\\bibitem{EinPod1935}
A. Einstein and B. Podolsky.
\\newblock Can quantum-mechanical description of physical reality be considered complete? Also, why is my hair like this?
\\newblock \\emph{Phys. Rev.}, 47(10):777--780, 1935.

\\end{thebibliography}`;

const exampleAmsrefs = `% \\bib, bibdiv, biblist are defined by the amsrefs package.
\\begin{bibdiv}
\\begin{biblist}

\\bib{aggarwal2019universality}{article}{
      author={Aggarwal, A.},
       title={{Universality for Lozenge Tiling Local Statistics}},
        date={2023},
     journal={Ann. of Math. (2)},
      volume={198},
      number={3},
       pages={881\\ndash 1012},
        note={arXiv:1907.09991 [math.PR]},
}

\\bib{aggarwal2022gaussian}{article}{
      author={Aggarwal, A.},
      author={Gorin, V.},
       title={{Gaussian unitary ensemble in random lozenge tilings}},
        date={2022},
     journal={Prob. Theory Relat. Fields},
      volume={184},
      number={4},
       pages={1139\\ndash 1166},
        note={arXiv:2106.07589 [math.PR]},
}

\\bib{BG2011non}{article}{
      author={Borodin, A.},
      author={Gorin, V.},
       title={{Markov processes of infinitely many nonintersecting random walks}},
        date={2013},
     journal={Probab. Theory Relat. Fields},
      volume={155},
      number={3-4},
       pages={935\\ndash 997},
        note={arXiv:1106.1299 [math.PR]},
}

\\bib{borodin-gr2009q}{article}{
      author={Borodin, A.},
      author={Gorin, V.},
      author={Rains, E.},
       title={{q-Distributions on boxed plane partitions}},
        date={2010},
     journal={Selecta Math.},
      volume={16},
      number={4},
       pages={731\\ndash 789},
        note={arXiv:0905.0679 [math-ph]},
}

\\end{biblist}
\\end{bibdiv}`;

function loadExample() {
    document.getElementById('inputArea').value = exampleBbl;
    updateStats();
}

function loadAmsrefsExample() {
    document.getElementById('inputArea').value = exampleAmsrefs;
    updateStats();
}

function clearAll() {
    document.getElementById('inputArea').value = '';
    document.getElementById('outputArea').value = '';
    document.getElementById('message').innerHTML = '';
    updateStats();
}

function updateStats() {
    const input = document.getElementById('inputArea').value;
    const output = document.getElementById('outputArea').value;

    // Count entries for both formats
    const inputBibitemCount = (input.match(/\\\\bibitem/g) || []).length;
    const inputBibCount = (input.match(/\\\\bib\{/g) || []).length;
    const inputEntries = inputBibitemCount + inputBibCount;
    document.getElementById('inputStats').textContent = inputEntries ? `${inputEntries} entries` : '';

    const outputBibitemCount = (output.match(/\\\\bibitem/g) || []).length;
    const outputBibCount = (output.match(/\\\\bib\{/g) || []).length;
    const outputEntries = outputBibitemCount + outputBibCount;
    document.getElementById('outputStats').textContent = outputEntries ? `${outputEntries} entries sorted` : '';
}

// Update stats on input
document.getElementById('inputArea').addEventListener('input', updateStats);

// Initialize
updateStats();
</script>
