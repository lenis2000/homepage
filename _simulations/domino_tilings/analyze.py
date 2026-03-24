#!/usr/bin/env python3
"""
Analyze boundary fluctuations from rsk-cli batch output.

Usage:
  ./rsk-cli 100 -B 1000 --q 0.5 > data.m
  python3 analyze.py data.m                    # auto-pick diagonal
  python3 analyze.py data.m --diag 120         # specific diagonal index
  python3 analyze.py data.m -o plots.png       # save figure
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
import sys
import argparse
import re

# Tracy-Widom F2 moments (for Edgeworth overlay)
TW_F2_MEAN = -1.7711
TW_F2_VAR = 0.8132
TW_F2_SKEW = 0.2241
TW_F2_KURT = 0.0934  # excess

def load_mathematica(filename):
    """Load Mathematica-format {{...},{...},...} array."""
    with open(filename) as f:
        text = f.read()
    # Extract comment header
    header = ""
    m = re.search(r'\(\*(.+?)\*\)', text)
    if m:
        header = m.group(1).strip()
    # Strip comments and whitespace
    text = re.sub(r'\(\*.*?\*\)', '', text)
    text = text.strip()
    # Convert Mathematica syntax to Python
    text = text.replace('{', '[').replace('}', ']')
    data = np.array(eval(text))
    return data, header

def edgeworth_pdf(x, mu, sigma, skew, kurt):
    """Edgeworth expansion of PDF given skewness and excess kurtosis."""
    z = (x - mu) / sigma
    phi = np.exp(-z**2 / 2) / np.sqrt(2 * np.pi)
    H3 = z**3 - 3*z
    H4 = z**4 - 6*z**2 + 3
    H6 = z**6 - 15*z**4 + 45*z**2 - 15
    corr = 1 + skew/6 * H3 + kurt/24 * H4 + skew**2/72 * H6
    return np.maximum(0, phi * corr / sigma)

def main():
    parser = argparse.ArgumentParser(description='Analyze q-domino boundary fluctuations')
    parser.add_argument('datafile', help='Mathematica-format batch output from rsk-cli')
    parser.add_argument('--diag', type=int, default=-1,
                        help='Diagonal index to analyze (-1 = auto: first non-frozen + 5)')
    parser.add_argument('-o', '--output', default='', help='Save figure to file')
    parser.add_argument('--show', action='store_true', default=True, help='Show plot (default)')
    parser.add_argument('--no-show', action='store_true', help='Do not show plot')
    args = parser.parse_args()

    data, header = load_mathematica(args.datafile)
    nsamples, ndiags = data.shape
    n = (ndiags + 1) // 2
    print(f"Loaded {nsamples} samples, n={n}, {ndiags} diagonals")
    if header:
        print(f"Header: {header}")

    # Pick diagonal
    mean_curve = data.mean(axis=0)
    if args.diag < 0:
        # First diagonal where mean < n - 1
        frozen_end = np.argmax(mean_curve < n - 1)
        diag = min(frozen_end + 5, ndiags - 1)
    else:
        diag = args.diag
    print(f"Measuring at diagonal {diag}")

    vals = data[:, diag].astype(float)
    mu = vals.mean()
    sigma = vals.std(ddof=1)
    skew = stats.skew(vals)
    kurt = stats.kurtosis(vals)  # excess
    centered = vals - mu

    # Jarque-Bera
    jb_stat, jb_p = stats.jarque_bera(vals)
    # KS test against normal
    ks_stat, ks_p = stats.kstest(vals, 'norm', args=(mu, sigma))
    # Shapiro-Wilk (up to 5000 samples)
    if len(vals) <= 5000:
        sw_stat, sw_p = stats.shapiro(vals)
    else:
        sw_stat, sw_p = np.nan, np.nan

    print(f"\n=== Statistics at diagonal {diag} ===")
    print(f"  Mean:           {mu:.4f}")
    print(f"  Std Dev:        {sigma:.4f}")
    print(f"  Skewness:       {skew:.4f}")
    print(f"  Excess Kurt:    {kurt:.4f}")
    print(f"  Jarque-Bera:    JB={jb_stat:.2f}  p={jb_p:.4g}")
    print(f"  KS (normal):    D={ks_stat:.4f}  p={ks_p:.4g}")
    if not np.isnan(sw_p):
        print(f"  Shapiro-Wilk:   W={sw_stat:.4f}  p={sw_p:.4g}")

    # ---- Plots ----
    fig, axes = plt.subplots(2, 2, figsize=(12, 9))
    fig.suptitle(f'Boundary fluctuations: n={n}, diag={diag}, {nsamples} samples\n{header}',
                 fontsize=12)

    # 1. Histogram + overlays
    ax = axes[0, 0]
    ax.hist(centered, bins='auto', density=True, color='#232D4B', alpha=0.8,
            edgecolor='white', linewidth=0.5, label='Data')
    xr = np.linspace(centered.min() - 1, centered.max() + 1, 300)
    # Gaussian
    ax.plot(xr, stats.norm.pdf(xr, 0, sigma), 'g--', lw=1.5, label='Gaussian')
    # TW F2 Edgeworth
    ax.plot(xr, edgeworth_pdf(xr, 0, sigma, TW_F2_SKEW, TW_F2_KURT),
            'r-', lw=2, label='TW $F_2$')
    ax.axvline(0, color='gray', ls=':', lw=0.8)
    ax.set_xlabel('h − E[h]')
    ax.set_ylabel('Density')
    ax.set_title(f'Histogram (sd={sigma:.3f}, skew={skew:.3f}, kurt={kurt:.3f})')
    ax.legend(fontsize=9)

    # 2. Mean boundary curve ± SD
    ax = axes[0, 1]
    sd_curve = data.std(axis=0, ddof=1)
    x_ax = np.arange(ndiags)
    ax.plot(x_ax, mean_curve, 'b-', lw=1.5, label='Mean f(k)')
    ax.fill_between(x_ax, mean_curve - sd_curve, mean_curve + sd_curve,
                    alpha=0.2, color='blue')
    ax.axvline(diag, color='red', ls='--', lw=1, label=f'diag={diag}')
    ax.set_xlabel('Diagonal index k')
    ax.set_ylabel('f(k) = topPos')
    ax.set_title('Mean boundary ± 1 SD')
    ax.legend(fontsize=9)

    # 3. QQ plot
    ax = axes[1, 0]
    osm, osr = stats.probplot(centered, dist='norm', fit=False)
    ax.plot(osm, osr, 'ko', ms=2, alpha=0.5)
    qmin, qmax = osm.min(), osm.max()
    ax.plot([qmin, qmax], [qmin * sigma, qmax * sigma], 'r-', lw=1.5)
    ax.set_xlabel('Theoretical quantiles')
    ax.set_ylabel('Sample quantiles')
    ax.set_title('QQ plot (normal)')
    ax.grid(True, alpha=0.3)

    # 4. SD profile across diagonals
    ax = axes[1, 1]
    ax.plot(x_ax, sd_curve, color='darkorange', lw=1.5)
    ax.axvline(diag, color='red', ls='--', lw=1)
    ax.plot(diag, sigma, 'ro', ms=8, zorder=5)
    ax.set_xlabel('Diagonal index k')
    ax.set_ylabel('Std Dev of f(k)')
    ax.set_title('Fluctuation profile')
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    if args.output:
        plt.savefig(args.output, dpi=150, bbox_inches='tight')
        print(f"\nSaved {args.output}")
    if not args.no_show:
        plt.show()

if __name__ == '__main__':
    main()
