---
title: PushTASEP in inhomogeneous space and its limit shape
model: TASEPs
date: 2018-02-11 10:00:00
author: Leonid Petrov
code:
  - link: "https://github.com/lenis2000/simulations/blob/master/2018-02-10-PushTASEP-single/2018-02-10-PushTASEP-single.py"
    txt: "python2 for simulations, simple Mathematica for drawing. Mathematica source not present"
results:
  - title: Homogeneous case
    raw: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-100.txt
    raw-size: 4.7 KB
    params: |
      $n=2400$, $t=400$, $\xi(x)\equiv 1$
    image: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-100.pdf
    image-tn: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-100.png
    image-size: 20 KB
  - title: Slowdown
    raw: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-200.txt
    raw-size: 4.7 KB
    params: |
      $n=2400$, $t=400$, $\xi(x)=\mathbf{1}_{x<800}+\frac12\cdot\mathbf{1}_{x\ge 800}$
    image: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-200.pdf
    image-tn: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-200.png
    image-size: 21 KB
  - title: Slowdown, height function adjusted by a linear shift to better see fluctuations
    raw: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-200.txt
    raw-size: 4.7 KB
    params: |
      $n=2400$, $t=400$, $\xi(x)=\mathbf{1}_{x<800}+\frac12\cdot\mathbf{1}_{x\ge 800}$
    image: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-200a.pdf
    image-tn: __STORAGE_URL__/simulations/2018-02-pushTASEP/single-pushtasep-200a.png
    image-size: 99 KB
  - title: Speedup
    raw: __STORAGE_URL__/simulations/simulations/2018-02-pushTASEP/single-pushtasep-300.txt
    raw-size: 4.7 KB
    params: |
      $n=2400$, $t=400$, $\xi(x)\mathbf{1}_{x<800}+2\cdot\mathbf{1}_{x\ge 800}$
    image: __STORAGE_URL__/simulations/simulations/2018-02-pushTASEP/single-pushtasep-300.pdf
    image-tn: __STORAGE_URL__/simulations/simulations/2018-02-pushTASEP/single-pushtasep-300.png
    image-size: 21 KB
  - title: Speedup, height function adjusted by a linear shift to better see fluctuations
    raw: __STORAGE_URL__/simulations/simulations/2018-02-pushTASEP/single-pushtasep-300.txt
    raw-size: 4.7 KB
    params: |
      $n=2400$, $t=400$, $\xi(x)\mathbf{1}_{x<800}+2\cdot\mathbf{1}_{x\ge 800}$
    image: __STORAGE_URL__/simulations/simulations/2018-02-pushTASEP/single-pushtasep-300a.pdf
    image-tn: __STORAGE_URL__/simulations/simulations/2018-02-pushTASEP/single-pushtasep-300a.png
    image-size: 99 KB

papers:
- title: 'L. Petrov, In preparation (2018)'
---

### Introduction

Checking that the pushTASEP's height function in inhomogeneous space
is described via the predicted theoretical limit shape from [1].

### The model

Fix a positive function $\xi(x)$, $x\in\mathbb{Z}_{\ge0}$, separated from $0$ and $\infty$.
We consider the pushTASEP in inhomogeneous space with $\xi(x)$ playing the role of speed.
Namely, starting from the step initial configuration $\{1,2,\ldots\}$,
each particle at every location $x$ has independent exponential clock with rate $\xi(x)$
and mean waiting time $1/\xi(x)$. If the clock rings, the
particle jumps to the right by one, also pushing to the right by one the whole
packed cluster of particles immediately to the right of it.


### Sampling algorithm

The simulation is straightforward. In fact, I reused the
multilayer simulation from a [previous post]({{site.url}}/simulations/2017-12-15-pushtasep-multilayer/)
and simply put the number of layers to be one.

### Data file format

The data files are integer arrays of the form

{% raw %}
```
{{a,b,c,d}}
```
{% endraw %}

of length $n$.
Each number of the array is an
integer <script type="math/tex">\in \{0,1 \}</script>, where $1$ means that there is a particle at the corresponding
site, and $0$ means the absence of such particle.

The plots display the rescaled height function

$$
h(t,x)=\#\{\text{number of particles which are $\le x$ at time $t$}\}
$$

with $h$ and $x$ rescaled by $t$, and the corresponding limit shape from [1].
