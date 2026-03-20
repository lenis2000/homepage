---
layout: post
title: "Computation and sampling for Schubert specializations"
coauthors:
  - name: David Anderson
    web: https://people.math.osu.edu/anderson.2804/
  - name: Greta Panova
    web: https://sites.google.com/usc.edu/gpanova/home?authuser=0
  - name: Leonid Petrov
comments: false
categories: blog math preprint
# journal-ref:
# journal-web:
# journal-year:
image: __STORAGE_URL__/img/papers/bpd_sample_n100.png
image-alt: "A uniformly random reduced bumpless pipe dream of size 100, sampled via MCMC"
show-date: true
pdf: 51-schubert-computation-sampling.pdf
post-pdf: true
pages: 33
cv-number: 51
published: true
---

We present computational results related to principal specializations of the Schubert polynomials $\mathfrak{S}_w(1^n)$ for permutations $w\in S_n$. Equivalently, these specializations count reduced pipe dreams (and reduced bumpless pipe dreams - RBPD) with boundary conditions determined by $w$. We find the first counterexample, at $n=17$, to the conjecture of Merzon-Smirnov that the maximal value of $\mathfrak{S}_w(1^n)$ is obtained at a layered permutation. We explore the typical permutation obtained from uniformly random RBPDs, revealing a permuton-like asymptotic behavior similar to the one derived for Grothendieck polynomials.

We implement and compare three recurrence relations for computing $\mathfrak{S}_w(1^n)$: the descent formula of Macdonald, the transition formula of Lascoux-Sch&uuml;tzenberger, and the cotransition formula of Knutson. We prove that the global constraint of reducedness breaks the sublattice property of the underlying alternating sign matrix (ASM) lattice, preventing standard monotone Coupling From The Past (CFTP). To bypass this, we develop a highly efficient MCMC sampler augmented with macroscopic "droop" updates to guarantee state space connectivity and accelerate mixing. Our implementations enable computation of $\mathfrak{S}_w(1^n)$ up to $n\sim 20$ on a personal computer, and uniform sampling of reduced bumpless pipe dreams up to $n\sim 100$ on a cluster.
