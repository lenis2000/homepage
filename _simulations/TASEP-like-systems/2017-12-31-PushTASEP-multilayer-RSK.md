---
title: Inhomogeneous space PushTASEP and its multilayer extension via column RSK
model: TASEPs
date: 2017-12-31 10:00:00
author: Leonid Petrov
code:
  - link: "https://github.com/lenis2000/simulations/blob/master/2017-12-30-PushTASEP-colRSK/2017-12-30-PushTASEP-colRSK.py"
    txt: "python2, both for simulation and drawing"
results:
  - title: Homogeneous case
    raw: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-8628336.txt
    raw-size: 20 KB
    params: |
      $n=100$, $k=100$, $t=100$, $\xi(y)\equiv 1$
    image: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-8628336.png
    image-tn: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-8628336.png
    image-size: 11 KB
  - title: Homogeneous case, larger picture
    raw: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-2650273.txt
    raw-size: 1.1 MB
    params: |
      $n=500$, $k=1200$, $t=500$, $\xi(y)\equiv 1$
    image: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-2650273.png
    image-tn: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-2650273-tn.png
    image-size: 499 KB
  - title: Homogeneous case, another picture
    raw: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-9786413.txt
    raw-size: 704 KB
    params: |
      $n=600$, $k=600$, $t=100$, $\xi(y)\equiv 1$
    image: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-9786413.png
    image-tn: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-9786413-tn.png
    image-size: 255 KB
  - title: Slow bond at 100
    raw: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-6418566.txt
    raw-size: 313 KB
    params: |
      $n=400$, $k=400$, $t=100$, $\xi(y)= \mathbf{1}_{y\ne 100}+\frac15\cdot\mathbf{1}_{y=100}$
    image: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-6418566.png
    image-tn: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-6418566-tn.png
    image-size: 140 KB
  - title: Cluster of 10 slow bonds around 100
    raw: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-1743650.txt
    raw-size: 313 KB
    params: |
      $n=400$, $k=400$, $t=100$, $\xi(y)= \mathbf{1}_{y\le 90}+\frac15\cdot\mathbf{1}_{90<y\le 100}+\mathbf{1}_{y>100}$
    image: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-1743650.png
    image-tn: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-1743650-tn.png
    image-size: 139 KB
  - title: Slow zone from 100 to 300
    raw: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-4838539.txt
    raw-size: 489 KB
    params: |
      $n=500$, $k=500$, $t=150$, $\xi(y)= \mathbf{1}_{y\le 100}+\frac15\cdot\mathbf{1}_{100<y\le 300}+\mathbf{1}_{y>300}$
    image: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-4838539.png
    image-tn: __STORAGE_URL__/simulations/2017-12-pushTASEP/multilayer-pushtasep-RSK-graph-4838539-tn.png
    image-size: 190 KB

papers:
- title: 'A. Borodin, P. Ferrari, Large time asymptotics of growth models on space-like paths I: PushASEP, Electron. J. Probab. (2008), vol. 13, 1380-1418'
  arxiv-url: 'https://arxiv.org/abs/0707.2813'
  journal-url: 'http://emis.ams.org/journals/EJP-ECP/article/download/541/541-1801-1-PB.pdf'
- title: 'L. Petrov, In preparation (2018)'
---


### Introduction

This model is a version of the one considered in the [previous simulation]({{site.url}}/simulations/2017-12-15-pushtasep-multilayer/).
However, the asymptotic behavior is quite different.
The model in this post is related to the column RSK and Schur measures and 
is amenable to asymptotic analysis via exact formulas.

### The model

Fix a positive function $\xi(x)$, $x\in\mathbb{Z}_{\ge0}$, separated from $0$ and $\infty$.
Fix a number of layers $k$, and consider the following $k$-layer particle configuration
$x^{(j)}_1<x^{(j)}_2<x^{(j)}_3<\ldots$, $j=1,\ldots,k$.
This particle configuration evolves in continuous time.
The initial condition is the densely packed (step) one,

$$
x_i^{(j)}=i,\qquad i=1,2,\ldots,\qquad j=1,\ldots,k.
$$

The evolution is as follows. At each site $y\in\mathbb{Z}_{\ge0}$
there is an independent exponential clock with rate $\xi(y)$
(so, mean waiting time $1/\xi(y)$). This rate does not depend on the layer's number.
When the clock at site $y$ rings:

- if there is a particle at site $y$ at layer $j=1,\ldots,k$, choose the minimal such $j$.
The particle
$x_i^{(j)}=y$ (with suitable $i$) jumps to the right by one.
If the destination is occupied, the immediate right neighbor $x_{i+1}^{(j)}$ also
jumps to the right by one, and so on, until an empty spot.
	- If there is no empty spot, then we simply shift the right-infinite densely
packed cluster of particles to the right by one, and the update stops.
	- If there is an empty spot, then the pushed finite cluster of particles
moves to the right by one, and this generates another jumping impulse 
at the new empty spot. This jumping impulse propagates to lower layers, and so on, 
unltil an infinite cluster of particles is pushed.
- if there is no particle at site $y$ at layer $j=1,\ldots,k$, then nothing happens
(though by increasing $k$, we can always find the layer at which the dynamics occurs).

The dynamics on the first layer <script type="math/tex">\{x_i^{(1)}\}</script> is
simply the PushTASEP (= long-range TASEP) studied, e.g., in [1].
The space-inhomogeneous version described above is studied in [2].

### Sampling algorithm

To sample the system, we choose a fixed size $n$ (so we consider the behavior
on <script type="math/tex">\{1,2,\ldots,n \}\subset\mathbb{Z}_{\ge0}</script>),
the number of layers $k$, and the inhomogeneity function $\xi(\cdot)$.

Since the dynamics is a continuous time Markov process, we sample it
directly,
using exponential clocks.
In more detail, we sample an independent exponential random variable
with mean $1/\xi(y)$ for each $y=1,\ldots,n$.
Then we choose the minimal of these waiting times, and
- decrease all other waiting times by this minimal amount,
- perform the jumping/pushing at this site on suitable layers,
- increment the global time,
- resample the waiting time that was used.

### Data file format

The data files are Mathematica readable 2d integer arrays of the form

{% raw %}
```
{{a,b,c,d},{e,f,g,h},{x,y,z,t}}
```
{% endraw %}

where $k$ is the number of blocks ($3$ in the above example), and $n$ is the
length of a block ($4$ in the above example). Each element of the array is an
integer <script type="math/tex">\in \{0,1 \}</script>, where $1$ means that there is a particle at the corresponding
site and the corresponding layer, and $0$ means the absence of such particle. In other words, the data
reads the configuration layer by layer, starting from the first layer,
and shows occupation variables.

There are no spaces or line breaks in the file.

The plots show the first layer on top, layers correspond to horizontals.
Black squares mean particles, and white squares mean empty space.
