---
title: Mirroring deterministic cynamics on q-vol lozenge tilings inverting the parameter q
model: lozenge_tilings
date: 2019-05-02 10:00:00
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/simulations/tree/master/2019-05-01-qvol-sampler'
    txt: 'python code for simulations, simple Mathematica code for drawing'
results:
  - title: Movie, size 10
    params: |
      Hexagon $10\times 10\times 10$, $q=0.85$. 
    image: __STORAGE_URL__/simulations/2019-05-qvol/q_vol_085_10_mirroring.m4v
    image-tn: __STORAGE_URL__/simulations/2019-05-qvol/q_vol_085_10_mirroring_middle.png
    image-size: 500 KB
    raw: __STORAGE_URL__/simulations/2019-05-qvol/q_vol_085_10_mirroring.txt
    raw-size: 100 KB

papers:
- title: 'L. Petrov, A. Saenz. In preparation (2019)'
- title: 'A.Borodin, V. Gorin. Shuffling algorithm for boxed plane partitions. Advances in Mathematics, <b>220</b> (6) (2009). 1739-1770,'
  arxiv-url: 'https://arxiv.org/abs/0804.3071'
  journal-url: 'https://www.sciencedirect.com/science/article/pii/S0001870808003253'
- title: 'A. Bufetov, L. Petrov. Yang-Baxter field for spin Hall-Littlewood symmetric functions (2017)'
  arxiv-url: 'https://arxiv.org/abs/1712.04584'
---

Continuing with the setup of 
the previous simulation (see [here]({{site.url}}/simulations/2019-04-30-qvol/)),
we consider a simple, deterministic transformation of the 
tiling, when at each step on one of the levels the vertical lozenges are 
mirrored with respect to the middle of the segment [min,max] to which each of them belong.
The dynamics starts from an exact sample of the measure $q^{-volume}$
(which is produced by <a href="https://www.mccme.ru/~vadicgor/research.html">Vadim Gorin's program</a> [2]).
Then, by mirroring vetical lozenges to the left, the measure $q^{-volume}$ becomes the 
measure $q^{volume}$. 
At each step, the distribution of the tiling is the same 
as in the previous simulation with random moves. 
However, under the mirroring dynamics the vertical tiles can move both 
left and right, and the Markovian nature of the behavior on the left edge is lost.

Here are three states of the tiling in the beginning, the middle of the simulation, and the end.
We see that the beginning and the ending configuration are exactly the same, up to reflection about the center of the hexagon.

<img src="{{site.storage_url}}/simulations/2019-05-qvol/q_vol_085_10_mirroring_begin.png" alt="Configuration in the beginning" style="width:50%;min-width:500px">

<img src="{{site.storage_url}}/simulations/2019-05-qvol/q_vol_085_10_mirroring_middle.png" alt="Configuration in the middle" style="width:50%;min-width:500px">

<img src="{{site.storage_url}}/simulations/2019-05-qvol/q_vol_085_10_mirroring_end.png" alt="Configuration in the end" style="width:50%;min-width:500px">

### Data file format

The data file is a list of lists of lists in Mathematica-readable format, of the form
$$\{ \lambda(1),\lambda(2),\ldots,\lambda(T) \},$$
where each $\lambda(t)$ is a list of weakly interlacing 
integer coordinates of the form
$$\{ \{ 47 \},\{ 50,47 \} , \{ 50,49,47 \} ,\ldots, \} .$$
Here $t$ is the time variable.
The simulation data can be "coarse" in larger tilings, or 
finer with every step of the Markov chain recorded.