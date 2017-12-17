---
title: Inhomogeneous space PushTASEP and its new multilayer version
model: TASEPs
date: 2017-12-15 10:00:00
author: Leonid Petrov
code:
  - link: "https://github.com/lenis2000/simulations/blob/master/2017-12-15-PushTASEP-multilayer/2017-12-15-PushTASEP-multilayer.py"
    txt: "python2, both simulation and drawing"
#results:
#  - raw: __STORAGE_URL__/simulations/test_Hfout1.txt
#    raw-size: 720 KB
#    params: |
#      $\mathrm{size} = 200 \times 200$,
#      $q=\frac1{10}$ (fake number),
#      $\lambda = 0.542$ (fake number)
#    image: __STORAGE_URL__/simulations/test_Hfout1.png
#    image-tn: __STORAGE_URL__/simulations/test_Hfout1-tn.png
#    image-size: 2.3 MB
#    title: Test simulation result (picture is fake)
#  - raw: __STORAGE_URL__/simulations/test_Hfout2.txt
#    raw-size: 4.5 MB
#    params: |
#      $\mathrm{size} = 500 \times 500$
#    title: Test simulation result (no picture)
papers:
- title: 'A. Borodin, P. Ferrari, Large time asymptotics of growth models on space-like paths I: PushASEP, Electron. J. Probab. (2008), vol. 13, 1380-1418'
  arxiv-url: 'https://arxiv.org/abs/0707.2813'
  journal-url: 'http://emis.ams.org/journals/EJP-ECP/article/download/541/541-1801-1-PB.pdf'
- title: 'L. Petrov, In preparation (2018)'
---


### Definition of the model

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
If there is no empty spot, then we simply shift the right-infinite densely
packed cluster of particles to the right by one.
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
- perform the jumping/pushing at this site on a suitable layer,
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
