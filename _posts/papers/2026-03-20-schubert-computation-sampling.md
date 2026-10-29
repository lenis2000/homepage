---
layout: post
title: "Computation and sampling for Schubert specializations"
arXiv: 2603.20104 [math.CO]
coauthors:
  - name: David Anderson
    web: https://people.math.osu.edu/anderson.2804/
  - name: Greta Panova
    web: https://sites.google.com/usc.edu/gpanova/home?authuser=0
  - name: Leonid Petrov
comments: false
selected: true
categories: blog math paper
journal-ref: Proc. Natl. Acad. Sci. USA 123 (2026), no. 44, e2615757123
journal-web: https://doi.org/10.1073/pnas.2615757123
journal-year: 2026
image: __STORAGE_URL__/img/papers/bpd_sample_n100.png
image-alt: "A uniformly random reduced bumpless pipe dream of size 100, sampled via MCMC"
show-date: true
pdf: 51-schubert-computation-sampling.pdf
post-pdf: true
pages: 33
cv-number: 51
published: true
---

We study a problem at the interface of enumerative algebraic geometry, algebraic combinatorics, and the statistical mechanics of vertex models with long-range interactions. We develop methods to explore the values $\mathfrak{S}_w(1^n)$ of Schubert polynomials (called principal specializations), which count reduced bumpless pipe dreams (RBPDs) with boundary permutation $w$. We exhibit counterexamples to the conjecture of Merzon and Smirnov that $\mathfrak{S}_w(1^n)$ is maximized on layered permutations; the smallest such example we find is at $n=17$. Despite the counterexamples, we present bounds that support a refined conjecture that the maximum of $\mathfrak{S}_w(1^n)$ over all $w\in S_n$ grows at the same asymptotic rate as the maximum over layered permutations (found by Morales, Pak, and Panova).

We implement and benchmark four recurrences for Schubert specializations: the descent formula of Macdonald, the transition formula of Lascoux-Sch&uuml;tzenberger, the cotransition formula of Knutson, and the formula of Billey, Jockusch, and Stanley. We also explore typical random permutations drawn with probability proportional to $\mathfrak{S}_w(1^n)$, equivalently from uniformly random RBPDs. Our simulations reveal a permuton-like limit analogous to the Grothendieck setting studied by Morales, Panova, Petrov, and Yeliussizov. For sampling, we show that the standard monotone Coupling From The Past framework does not apply to RBPDs, leaving exact uniform sampling open. To bypass this, we develop an efficient Markov chain Monte Carlo sampler augmented with macroscopic "droop" updates that preserve connectivity and accelerate mixing. Our publicly available fast implementations reach $n=20$ for exact computation of $\mathfrak{S}_w(1^n)$ and $n=100$ for Markov chain Monte Carlo sampling using a chain whose stationary distribution is uniform on RBPDs (run on a cluster).
