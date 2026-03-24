#!/usr/bin/env python3
"""
Test scaling of boundary fluctuations across multiple n values.

Usage:
  # Generate data at several n:
  ./rsk-cli 50  -B 5000 --q 0.5 > data50.m
  ./rsk-cli 100 -B 2000 --q 0.5 > data100.m
  ./rsk-cli 200 -B 1000 --q 0.5 > data200.m
  ./rsk-cli 500 -B 200  --q 0.5 > data500.m

  # Run scaling analysis:
  python3 scaling.py data50.m data100.m data200.m data500.m
  python3 scaling.py data*.m -o scaling.png
  python3 scaling.py data*.m --diag-frac 0.6   # measure at 60% of 2n
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats, optimize
import argparse
import re
import glob

def load_mathematica(filename):
    with open(filename) as f:
        text = f.read()
    header = ""
    m = re.search(r'\(\*(.+?)\*\)', text)
    if m:
        header = m.group(1).strip()
    text = re.sub(r'\(\*.*?\*\)', '', text)
    text = text.strip().replace('{', '[').replace('}', ']')
    data = np.array(eval(text))
    return data, header

def extract_params(header):
    """Parse n= q= alpha= from header comment."""
    params = {}
    for m in re.finditer(r'(\w+)=([\d.]+)', header):
        params[m.group(1)] = float(m.group(2))
    return params

def main():
    parser = argparse.ArgumentParser(description='Scaling analysis of boundary fluctuations')
    parser.add_argument('datafiles', nargs='+', help='Mathematica-format batch files')
    parser.add_argument('--diag-frac', type=float, default=-1,
                        help='Measure at this fraction of 2n (e.g. 0.6). Default: auto (first non-frozen + 5)')
    parser.add_argument('--diag-from-end', type=int, default=-1,
                        help='Measure at (2n - this) diagonal. Overrides --diag-frac.')
    parser.add_argument('-o', '--output', default='', help='Save figure')
    parser.add_argument('--no-show', action='store_true')
    args = parser.parse_args()

    results = []  # (n, q, alpha, nsamples, diag, mean, sd, skew, kurt)

    for fname in sorted(args.datafiles):
        data, header = load_mathematica(fname)
        params = extract_params(header)
        nsamples, ndiags = data.shape
        n = (ndiags + 1) // 2
        q = params.get('q', 0)
        alpha = params.get('alpha', 1)

        mean_curve = data.mean(axis=0)

        if args.diag_from_end >= 0:
            diag = ndiags - 1 - args.diag_from_end
        elif args.diag_frac >= 0:
            diag = int(args.diag_frac * (ndiags - 1))
        else:
            frozen_end = np.argmax(mean_curve < n - 1)
            diag = min(frozen_end + 5, ndiags - 1)

        vals = data[:, diag].astype(float)
        mu = vals.mean()
        sigma = vals.std(ddof=1)
        skew = stats.skew(vals)
        kurt = stats.kurtosis(vals)
        jb_stat, jb_p = stats.jarque_bera(vals)

        results.append({
            'file': fname, 'n': n, 'q': q, 'alpha': alpha,
            'nsamples': nsamples, 'diag': diag,
            'mean': mu, 'sd': sigma, 'skew': skew, 'kurt': kurt,
            'jb': jb_stat, 'jb_p': jb_p
        })

        print(f"{fname}: n={n} q={q} alpha={alpha} samples={nsamples} "
              f"diag={diag} mean={mu:.2f} sd={sigma:.4f} skew={skew:.3f} kurt={kurt:.3f} "
              f"JB_p={jb_p:.4g}")

    if len(results) < 2:
        print("\nNeed at least 2 data files for scaling analysis.")
        return

    ns = np.array([r['n'] for r in results])
    sds = np.array([r['sd'] for r in results])
    skews = np.array([r['skew'] for r in results])
    kurts = np.array([r['kurt'] for r in results])

    # Fit SD ~ C * n^alpha
    log_n = np.log(ns)
    log_sd = np.log(sds)
    slope, intercept, r_value, p_value, std_err = stats.linregress(log_n, log_sd)
    C = np.exp(intercept)

    print(f"\n=== Scaling fit: SD ~ C * n^alpha ===")
    print(f"  alpha = {slope:.4f} ± {std_err:.4f}")
    print(f"  C     = {C:.4f}")
    print(f"  R²    = {r_value**2:.6f}")
    print(f"  (KPZ prediction: alpha = 1/3 ≈ 0.3333)")
    print(f"  (Gaussian/CLT:   alpha = 1/2 = 0.5)")

    # ---- Plots ----
    fig, axes = plt.subplots(2, 2, figsize=(12, 9))
    q_val = results[0]['q']
    alpha_val = results[0]['alpha']
    fig.suptitle(f'Scaling analysis: q={q_val}, alpha={alpha_val}', fontsize=13)

    # 1. SD vs n (log-log)
    ax = axes[0, 0]
    ax.loglog(ns, sds, 'ko', ms=8, zorder=5)
    n_fit = np.linspace(ns.min() * 0.8, ns.max() * 1.2, 100)
    ax.loglog(n_fit, C * n_fit**slope, 'r-', lw=2,
              label=f'fit: $n^{{{slope:.3f} \\pm {std_err:.3f}}}$')
    # Reference lines
    ax.loglog(n_fit, C * n_fit**(1/3), 'b--', lw=1, alpha=0.5, label='$n^{1/3}$ (KPZ)')
    ax.loglog(n_fit, sds[0] / ns[0]**0.5 * n_fit**0.5, 'g--', lw=1, alpha=0.5,
              label='$n^{1/2}$ (CLT)')
    ax.set_xlabel('n')
    ax.set_ylabel('Std Dev')
    ax.set_title(f'SD vs n: exponent = {slope:.3f}')
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3, which='both')

    # 2. Skewness vs n
    ax = axes[0, 1]
    ax.semilogx(ns, skews, 'ko-', ms=8)
    ax.axhline(0, color='green', ls='--', lw=1, label='Gaussian (0)')
    ax.axhline(0.2241, color='red', ls='--', lw=1, label='TW $F_2$ (0.224)')
    ax.set_xlabel('n')
    ax.set_ylabel('Skewness')
    ax.set_title('Skewness vs n')
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)

    # 3. Excess kurtosis vs n
    ax = axes[1, 0]
    ax.semilogx(ns, kurts, 'ko-', ms=8)
    ax.axhline(0, color='green', ls='--', lw=1, label='Gaussian (0)')
    ax.axhline(0.0934, color='red', ls='--', lw=1, label='TW $F_2$ (0.093)')
    ax.set_xlabel('n')
    ax.set_ylabel('Excess kurtosis')
    ax.set_title('Kurtosis vs n')
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)

    # 4. Scaled distribution overlay
    ax = axes[1, 1]
    for r in results:
        data_r, _ = load_mathematica(r['file'])
        vals_r = data_r[:, r['diag']].astype(float)
        centered = (vals_r - vals_r.mean()) / vals_r.std(ddof=1)
        ax.hist(centered, bins='auto', density=True, alpha=0.4,
                label=f'n={r["n"]}')
    xr = np.linspace(-4, 4, 200)
    ax.plot(xr, stats.norm.pdf(xr), 'g--', lw=1.5, label='Gaussian')
    ax.set_xlabel('(h − E[h]) / SD')
    ax.set_ylabel('Density')
    ax.set_title('Scaled distributions (should collapse)')
    ax.legend(fontsize=8)
    ax.set_xlim(-4, 4)

    plt.tight_layout()
    if args.output:
        plt.savefig(args.output, dpi=150, bbox_inches='tight')
        print(f"\nSaved {args.output}")
    if not args.no_show:
        plt.show()

if __name__ == '__main__':
    main()
