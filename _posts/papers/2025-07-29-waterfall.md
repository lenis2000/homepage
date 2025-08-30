---
layout: post
title: "Random Lozenge Waterfall: Dimensional Collapse of Gibbs Measures"
arXiv: 2507.22011 [math.PR]
coauthors:
  - name: Alisa Knizel
    web: https://sites.google.com/view/alisaknizel/home
  - name: Leonid Petrov
comments: false
categories: blog math preprint
# journal-ref:  PMP around 2025-08-31
# journal-web:
image: __STORAGE_URL__/img/papers/waterfall_paper.png
image-alt: "Left: the three types of lozenges. Center: an example of a lozenge tiling of a hexagon whose side lengths are all equal to 3. Right: a perfect sample of the q-Racah random tiling with N=50, T=100, S=30, q=0.7, and κ=3i. The cross-section of the 3D surface across the middle represents the barcode process."
show-date: true
pdf: 49-random-lozenge-waterfall.pdf
post-pdf: true
pages: 65
cv-number: 49
simulations: lozenge/
published: true
---

We investigate the asymptotic behavior of the $q$-Racah
probability measure on lozenge tilings of a hexagon whose
side lengths scale linearly with a parameter $L\to\infty$,
while the parameters $q\in(0,1)$ and $\kappa\in
\mathbf{i}\mathbb{R}$ remain fixed.
This regime differs fundamentally
from the traditional case $q\sim e^{-c/L}\to1$, in which
random tilings are locally governed by two-dimensional
translation-invariant ergodic Gibbs measures.
In
the fixed-$q$ regime we uncover a new macroscopic phase, the
*waterfall* (previously only observed experimentally),
where the two-dimensional Gibbs structure collapses into a
one-dimensional random stepped interface that we call a
*barcode*.

We prove a law of large numbers and
exponential concentration, showing that the random tilings
converge to a deterministic waterfall profile.
We further conjecture an explicit
correlation kernel of the one-dimensional barcode process
arising in the limit.
Remarkably, the limit is invariant under shifts by
$2\mathbb{Z}$ but not by $\mathbb{Z}$, exhibiting an
emergent period-two structure absent from the original
weights.
Our conjectures are supported by extensive numerical
evidence and perfect sampling simulations.
The kernel is built from a family of
functions orthogonal in both spaces
$\ell^{2}(\mathbb{Z})$
and $\ell^{2}(\mathbb{Z}+\frac12)$,
that may be of independent interest.

Our proofs adapt the spectral projection method of
[Borodin--Gorin--Rains (2009)](https://arxiv.org/abs/0905.0679) to the regime with fixed $q$.
The resulting asymptotic analysis is substantially more
involved, and leads to non-self-adjoint operators. We
overcome these challenges in the exponential concentration
result by a separate argument based on sharp bounds for the
ratios of probabilities under the $q$-Racah orthogonal polynomial ensemble.
