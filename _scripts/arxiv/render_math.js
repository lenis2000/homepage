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
    if (depth === 0 && text.slice(j, j + delim.length) === delim) {
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
  '\\RR': '\\mathbb{R}',
  '\\CC': '\\mathbb{C}',
  '\\ZZ': '\\mathbb{Z}',
  '\\QQ': '\\mathbb{Q}',
  '\\NN': '\\mathbb{N}',
  '\\FF': '\\mathbb{F}',
  '\\EE': '\\mathbb{E}',
  '\\PP': '\\mathbb{P}',
  '\\C': '\\mathbb{C}',
  '\\R': '\\mathbb{R}',
  '\\Q': '\\mathbb{Q}',
  '\\Zd': '\\mathbb{Z}^d',
  // Lie algebras / groups
  '\\g': '\\mathfrak{g}',
  '\\h': '\\mathfrak{h}',
  '\\n': '\\mathfrak{n}',
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
  '\\H': '\\mathcal{H}',
  '\\M': '\\mathcal{M}',
  '\\N': '\\mathcal{N}',
  '\\T': '\\mathcal{T}',
  '\\V': '\\mathcal{V}',
  '\\Z': '\\mathcal{Z}',
  // Random matrix ensembles
  '\\CUE': '\\mathrm{CUE}',
  '\\GUE': '\\mathrm{GUE}',
  '\\GOE': '\\mathrm{GOE}',
  '\\GSE': '\\mathrm{GSE}',
  // Common abbreviations
  '\\eps': '\\varepsilon',
  '\\e': '\\varepsilon',
  '\\vep': '\\varepsilon',
  '\\b': '\\beta',
  '\\half': '\\tfrac{1}{2}',
  '\\ra': '\\rightarrow',
  '\\la': '\\leftarrow',
  '\\lra': '\\leftrightarrow',
  '\\iy': '\\infty',
  '\\affsl': '\\widehat{\\mathfrak{sl}}',
  '\\affgl': '\\widehat{\\mathfrak{gl}}',
  '\\id': '\\mathrm{id}',
  '\\Id': '\\mathrm{Id}',
  // Calligraphic \c shortcuts (e.g. \cB = \mathcal{B})
  '\\cA': '\\mathcal{A}',
  '\\cB': '\\mathcal{B}',
  '\\cC': '\\mathcal{C}',
  '\\cD': '\\mathcal{D}',
  '\\cE': '\\mathcal{E}',
  '\\cF': '\\mathcal{F}',
  '\\cG': '\\mathcal{G}',
  '\\cH': '\\mathcal{H}',
  '\\cL': '\\mathcal{L}',
  '\\cM': '\\mathcal{M}',
  '\\cN': '\\mathcal{N}',
  '\\cO': '\\mathcal{O}',
  '\\cP': '\\mathcal{P}',
  '\\cS': '\\mathcal{S}',
  '\\cT': '\\mathcal{T}',
  '\\cX': '\\mathcal{X}',
  // Bold shortcuts for vectors
  '\\x': '\\mathbf{x}',
  '\\y': '\\mathbf{y}',
  '\\m': '\\mathbf{m}',
  '\\dd': '\\mathbf{d}',
  '\\rr': '\\mathbf{r}',
  '\\zz': '\\mathbf{z}',
  '\\xx': '\\mathbf{x}',
  '\\yy': '\\mathbf{y}',
  '\\nn': '\\mathbf{n}',
  // Operators
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
  '\\dist': '\\operatorname{dist}',
  '\\per': '\\operatorname{per}',
  '\\ex': '\\mathbb{E}',
  // Calculus
  '\\diff': '\\mathrm{d}',
  '\\d': '\\mathrm{d}',
  // Spacing: \* is used as \cdot in some TeX setups
  '\\*': '\\cdot',
  // Text shortcuts
  '\\tf': '\\mathrm{tf}',
  '\\ts': '\\times',
  // \mbox and \hbox → \text (KaTeX equivalent)
  '\\mbox': '\\text',
  '\\hbox': '\\text',
  // \op → \operatorname
  '\\op': '\\operatorname',
  // More operator/function shortcuts
  '\\des': '\\operatorname{des}',
  '\\inv': '\\operatorname{inv}',
  '\\maj': '\\operatorname{maj}',
  // Greek/symbol shortcuts
  '\\om': '\\omega',
  '\\a': '\\alpha',
  '\\al': '\\alpha',
  '\\be': '\\beta',
  '\\ga': '\\gamma',
  '\\de': '\\delta',
  '\\si': '\\sigma',
  '\\s': '\\sigma',
  '\\lam': '\\lambda',
  // Partial derivative shortcut
  '\\pl': '\\partial',
  // Misc
  '\\La': '\\Lambda',
  '\\Lb': '\\Lambda',
  '\\wide': '\\widehat',
  // Lie algebra lowercase
  '\\gl': '\\mathfrak{gl}',
  '\\sl': '\\mathfrak{sl}',
  '\\sln': '\\mathfrak{sl}_n',
  '\\so': '\\mathfrak{so}',
  '\\sp': '\\mathfrak{sp}',
  '\\su': '\\mathfrak{su}',
  // More blackboard bold variants
  '\\bbR': '\\mathbb{R}',
  '\\bbC': '\\mathbb{C}',
  '\\bbZ': '\\mathbb{Z}',
  '\\bbN': '\\mathbb{N}',
  '\\bbQ': '\\mathbb{Q}',
  '\\DD': '\\mathbb{D}',
  '\\LL': '\\mathbb{L}',
  // Script/calligraphic
  '\\Cal': '\\mathcal',
  '\\sN': '\\mathcal{N}',
  // Probability/statistics
  '\\Exp': '\\mathbb{E}',
  // Special functions / roman
  '\\rme': '\\mathrm{e}',
  '\\ud': '\\mathrm{d}',
  '\\sinf': '\\liminf',
  // Argmax/argmin
  '\\argmax': '\\operatorname{arg\\,max}',
  '\\argmin': '\\operatorname{arg\\,min}',
  // Airy process
  '\\aip': '\\mathcal{A}',
  '\\ct': '\\mathfrak{t}',
  // Combinatorial
  '\\polygon': '\\mathrm{polygon}',
  '\\fl': '\\lfloor',
  '\\ce': '\\lceil',
  // Grassmannian, stabilizer
  '\\Gr': '\\operatorname{Gr}',
  '\\Stab': '\\operatorname{Stab}',
  // More blackboard bold
  '\\HH': '\\mathbb{H}',
  '\\E': '\\mathbb{E}',
  // Numeric fraction shortcuts (hep-th convention)
  '\\2': '\\frac{1}{2}',
  // q-binomial
  '\\qbinom': '\\binom',
};

function renderExpression(latex, displayMode, warnings) {
  // Bare # is common in arXiv abstracts (cardinality), but KaTeX needs \#
  latex = latex.replace(/(?<!\\)#/g, '\\#');
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
