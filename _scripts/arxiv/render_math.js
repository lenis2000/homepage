#!/usr/bin/env node
/**
 * Pre-render LaTeX math in arXiv abstracts to MathML using KaTeX.
 *
 * Batch mode: reads JSON array of {id, text} from stdin,
 * outputs JSON array of {id, rendered, warnings} to stdout.
 *
 * Usage:
 *   echo '[{"id":"test","text":"$\\lambda$"}]' | node render_math.js
 */

const katex = require('katex');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  const items = JSON.parse(input);
  const results = items.map(item => {
    const warnings = [];
    const rendered = renderMath(item.text, warnings);
    return { id: item.id, rendered, warnings };
  });
  process.stdout.write(JSON.stringify(results));
});

function renderMath(text, warnings) {
  const result = [];
  let i = 0;

  while (i < text.length) {
    // Check for display math $$...$$
    if (text[i] === '$' && text[i + 1] === '$') {
      const start = i + 2;
      const end = findClosingDelim('$$', text, start);
      if (end !== -1) {
        const latex = text.slice(start, end);
        result.push(renderExpression(latex, true, warnings));
        i = end + 2;
        continue;
      }
    }

    // Check for inline math $...$
    if (text[i] === '$') {
      const start = i + 1;
      const end = findClosingDelim('$', text, start);
      if (end !== -1) {
        const latex = text.slice(start, end);
        result.push(renderExpression(latex, false, warnings));
        i = end + 1;
        continue;
      }
    }

    result.push(text[i]);
    i++;
  }

  return result.join('');
}

function findClosingDelim(delim, text, start) {
  let depth = 0;
  for (let j = start; j < text.length; j++) {
    const ch = text[j];
    if (depth <= 0 && text.slice(j, j + delim.length) === delim) {
      return j;
    }
    if (ch === '\\') { j++; continue; }
    if (ch === '{') { depth++; }
    if (ch === '}') { depth--; }
  }
  return -1;
}

// Common arXiv abstract macros that KaTeX doesn't know natively.
// These appear frequently in math-ph, hep-th, integrable probability papers.
const ARXIV_MACROS = {
  // Blackboard bold shortcuts
  '\\Integer': '\\mathbb{Z}',
  '\\Natural': '\\mathbb{N}',
  '\\Real': '\\mathbb{R}',
  '\\Complex': '\\mathbb{C}',
  '\\Rational': '\\mathbb{Q}',
  '\\Field': '\\mathbb{F}',
  '\\Expect': '\\mathbb{E}',
  '\\Prob': '\\mathbb{P}',
  // Lie algebras / groups
  '\\g': '\\mathfrak{g}',
  '\\h': '\\mathfrak{h}',
  '\\n': '\\mathfrak{n}',  // careful — only inside math
  '\\GL': '\\mathrm{GL}',
  '\\SL': '\\mathrm{SL}',
  '\\SO': '\\mathrm{SO}',
  '\\SU': '\\mathrm{SU}',
  '\\Sp': '\\mathrm{Sp}',
  '\\U': '\\mathrm{U}',
  '\\PGL': '\\mathrm{PGL}',
  '\\PSL': '\\mathrm{PSL}',
  '\\Lie': '\\mathrm{Lie}',
  // Calligraphic shortcuts
  '\\W': '\\mathcal{W}',
  '\\A': '\\mathcal{A}',
  '\\B': '\\mathcal{B}',
  '\\F': '\\mathcal{F}',
  '\\G': '\\mathcal{G}',
  '\\M': '\\mathcal{M}',
  '\\N': '\\mathcal{N}',
  '\\T': '\\mathcal{T}',
  '\\Z': '\\mathcal{Z}',
  // Common abbreviations
  '\\eps': '\\varepsilon',
  '\\vep': '\\varepsilon',
  '\\half': '\\tfrac{1}{2}',
  '\\affsl': '\\widehat{\\mathfrak{sl}}',
  '\\affgl': '\\widehat{\\mathfrak{gl}}',
  '\\id': '\\mathrm{id}',
  '\\Id': '\\mathrm{Id}',
  '\\Tr': '\\operatorname{Tr}',
  '\\tr': '\\operatorname{tr}',
  '\\diag': '\\operatorname{diag}',
  '\\End': '\\operatorname{End}',
  '\\Hom': '\\operatorname{Hom}',
  '\\Aut': '\\operatorname{Aut}',
  '\\rank': '\\operatorname{rank}',
  '\\sgn': '\\operatorname{sgn}',
  '\\supp': '\\operatorname{supp}',
  '\\Var': '\\operatorname{Var}',
  '\\Cov': '\\operatorname{Cov}',
};

function renderExpression(latex, displayMode, warnings) {
  try {
    return katex.renderToString(latex, {
      output: 'mathml',
      displayMode: displayMode,
      throwOnError: true,
      strict: false,
      macros: {...ARXIV_MACROS},
    });
  } catch (e) {
    const delim = displayMode ? '$$' : '$';
    warnings.push(`KaTeX failed on: ${delim}${latex}${delim} — ${e.message}`);
    return delim + latex + delim;
  }
}
