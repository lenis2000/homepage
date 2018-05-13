---
title: Continuous space TASEP
model: TASEPs
date: 2018-05-13 10:00:00
author: Leonid Petrov
code:
  - link: "https://github.com/lenis2000/simulations/blob/master/2018-05-13-cont-space-TASEP/cont-space-TASEP.py"
    txt: "python2 for simulations, simple Mathematica for drawing. Mathematica source not present"
results:
  - title: title
    raw: __STORAGE_URL__/simulations/2018-02-PushTASEP/single-pushtasep-100.txt
    raw-size: ?? KB
    params: |
      ??
    image: __STORAGE_URL__/simulations/2018-02-PushTASEP/single-pushtasep-100.pdf
    image-tn: __STORAGE_URL__/simulations/2018-02-PushTASEP/single-pushtasep-100.png
    image-size: ?? KB

papers:
- title: 'A. Knizel, L. Petrov, A. Saenz. In preparation (2018)'
- title: 'A. Borodin, L. Petrov, Inhomogeneous exponential jump model (2017), Probability Theory and Related Fields, to appear'
  arxiv-url: 'https://arxiv.org/abs/1703.03857'
# journal-url: 
---

### The model

The continuous space TASEP is a continuous time
Markov process <script type="math/tex">\{X(t)\}_{t\ge 0}</script> on the space

$$
	\mathcal{X}:=\{(x_1\geq x_2\ge\dots \geq x_k>0)
  \colon x_i\in \mathbb R \text{
		and } k\in
	\mathbb Z_{\geq 0} \text{ is arbitrary}\}
$$

of finite particle configurations on $\mathbb R_{>0}.$ 
The particles are ordered, and the process preserves this ordering.
However, more than one particle per site it allowed.

The Markov process $X(t)$ on $\mathcal{X}$ depends on the following
data:

- Distance parameter $L>0$ (in asymptotic regimes we consider this parameter will grow to infinity);
- Speed function $\xi(y),$ $y\in \mathbb R_{\geq 0},$ which is assumed to be positive, piecewise continuous,
have left and right limits, and uniformly bounded away from $0$ and $+\infty;$
- Discrete set $\mathbf{B}\subset \mathbb R_{>0}$
	without
	accumulation points 
	and such that there are only finitely many points of $\mathbf{B}$
	in a right neighborhood of $0$.
	Fix a function $p: \mathbf B\rightarrow (0,1)$.


The process $X(t)$ evolves as follows: 


- New particles
	enter $\mathbb R_{>0}$ (leaving $0$) at 
	rate
	$\xi(0)$ 
  (we say
	that a certain event has rate $\mu>0$ if it repeats after independent random
	time intervals
	which have exponential distribution with rate $\mu$ (and mean
	$\mu^{-1}$));
- If at some time $t>0$ there are particles at a location $x \in R_{>0}$,
	then one particle decides to leave this location at rate $\xi(x)$
	(these events occur independently for each occupied location). Almost surely at each
	moment in time only one particle can start moving;
- The moving particle (say, $x_j$) instantaneously jumps to the right by some random
  distance $x_j(t)-x_j(t-)=\min(Y, x_{j-1}(t-)-x_j(t-))$ (by agreement, $x_0\equiv+\infty$).
	The distribution of $Y$ is as follows:
  $
    Prob
    (Y \geq y )
    =
    e^{-L y}\prod\limits_{b \in \mathcal{\mathbf B},
    \text{ }x_j(t-)<b<x_j(t-)+y} p(b).
  $

This model is a $q=0$ degeneration of the one studied in [2].

### Sampling algorithm

The simulation is straightforward.
In continuous time, we choose which particle jumps, then 
increase the continuous time count by the corresponding
exponential random variable, and perform the necessary comparisons.
The roadblocks (if present) are such that the probability 
of catching a flying particle is exactly 1, that is, $p(b)=0$. 
This does not affect the limit shape because in the limit the roadblocks
contain particles with very high probability.

### Data file format

The data files are integer arrays like

{% raw %}
```
{0.0286274477178, 0.0286274477178, 0.210833155189, 
0.210833155189, 0.210833155189, 0.210833155189, 
0.38234067478, 0.802020663021, 0.802020663021, 
.53111271382, 1.53111271382, 3.98713308074, 
3.98713308074, 8.07247019166, 9.9997745176, }
```
{% endraw %}

of particle locations. The plots display the height function
(rescaled) which counts the number of particles to the right of a given location.
In some plots the theoretical limit shape is also given.