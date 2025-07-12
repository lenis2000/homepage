---
title: Bibliography (.bbl) Sorting Tool
model: misc
author: Leo Petrov
layout: sim_page
code:
  - link: https://github.com/leopteryxin/Homepage/blob/master/_simulations/misc/2025-07-12-bbl_sorting_tool.md
    txt: Interactive bibliography sorting tool for LaTeX .bbl files
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
        This tool sorts entries alphabetically by author names, and—for identical author lists—chronologically from oldest to newest.
        It handles complex author formats including initials, surname prefixes (de, von, van), and multiple authors.
    </p>

    <section>
        <div class="section-title">Input (.bbl file content)</div>
        <textarea id="inputArea" placeholder="Paste your .bbl file content here..."></textarea>
        <div class="stats" id="inputStats"></div>
    </section>

    <div class="button-group">
        <button class="btn btn-primary" onclick="sortBibliography()">Sort Bibliography</button>
        <button class="btn btn-secondary" onclick="clearAll()">Clear All</button>
        <button class="btn btn-secondary" onclick="loadExample()">Load Example</button>
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
    let auth = str.trim().replace(/[~,]|\.$/g, '').replace(/~/g, ' ');
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
    let auth = str.trim().replace(/[~,]|\.$/g, '').replace(/~/g, ' ');
    const idx = last ? auth.lastIndexOf(last) : -1;
    let first = idx !== -1 ? auth.slice(0, idx) : auth;
    return first.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
}

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

function entryKey(entry) {
    const authors = parseAuthors(entry);
    const key = [];
    for (const a of authors) {
        const last = getLastName(a);
        const first = getFirstNamePart(a, last);
        key.push(last.replace(/[{}\\'~]/g, '').toLowerCase());
        key.push(first.replace(/[{}\\'~]/g, '').toLowerCase());
    }
    return key.join('\u0000'); // cheap tuple
}

// --- NEW: first 4-digit year (1900-2099); Infinity if none
function extractYear(entry) {
    const m = entry.join(' ').match(/(?:19|20)\d{2}/);
    return m ? parseInt(m[0], 10) : Infinity;
}

function sortBibliography() {
    const input = document.getElementById('inputArea').value;
    if (!input.trim()) {
        document.getElementById('message').innerHTML = '<div class="error">Please enter bibliography content to sort.</div>';
        return;
    }
    
    const lines = input.split(/\r?\n/);
    const header = [];
    const entries = [];
    let curr = null;
    let footer = '';
    
    let inHeader = true;
    for (const line of lines) {
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
            footer = line;
            curr = null;
        } else if (curr) {
            curr.push(line);
        }
    }
    if (curr) entries.push(curr);
    
    entries.sort((a, b) => {
        const ka = entryKey(a);
        const kb = entryKey(b);
        if (ka !== kb)                       // primary: authors A-Z
            return ka < kb ? -1 : 1;
        // secondary: year ↑ within identical‐author group
        const ya = extractYear(a);
        const yb = extractYear(b);
        return ya - yb;
    });
    
    const outLines = [
        ...header,
        ...entries.flatMap(e => [...e, '']),
        footer,
        ''
    ];
    
    const output = outLines.join('\n');
    document.getElementById('outputArea').value = output;
    document.getElementById('message').innerHTML = '<div class="success">Bibliography sorted successfully!</div>';
    updateStats();
}

// Example bibliography for testing
const exampleBbl = `\\begin{thebibliography}{99}

\\bibitem{Bob12}
A. I. Bobenko and F. Schray.
\\newblock Discrete conformal maps and ideal hyperbolic polyhedra.
\\newblock \\emph{Geom. Topol.}, 19(4):2155--2215, 2015.

\\bibitem{DeTi06}
B. de Tili�re.
\\newblock Scaling limit of isoradial dimer models and the case of triangular quadri-tilings.
\\newblock \\emph{Ann. Inst. Henri Poincar� Probab. Stat.}, 43(6):729--750, 2007.

\\bibitem{AB03}
M. Aissen and I. J. Benitez.
\\newblock A generalization of the Schur function.
\\newblock \\emph{J. Algebra}, 278(1):123--145, 2004.

\\end{thebibliography}`;

function loadExample() {
    document.getElementById('inputArea').value = exampleBbl;
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
    
    const inputEntries = (input.match(/\\\\bibitem/g) || []).length;
    document.getElementById('inputStats').textContent = inputEntries ? `${inputEntries} entries` : '';
    
    const outputEntries = (output.match(/\\\\bibitem/g) || []).length;
    document.getElementById('outputStats').textContent = outputEntries ? `${outputEntries} entries sorted` : '';
}

// Update stats on input
document.getElementById('inputArea').addEventListener('input', updateStats);

// Initialize
updateStats();
</script>