---
layout: post
title:  "Simulations of stochastic higher spin vertex model"
date:   2015-03-12 10:00:00
comments: false
categories: blog math simulation
published: true
show-date: true
image: __STORAGE_URL__/img/blog/100_fluc.png
image-alt: Fluctuations of the stochastic six vertex model
---

The stochastic higher spin vertex model
introduced in my paper with Ivan Corwin ([arXiv:1502.07374 [math.PR]][ivan6v])
generalizes the stochastic six vertex model considered
by Borodin, Corwin, and Gorin, [arXiv:1407.6729 [math.PR]](http://arxiv.org/abs/1407.6729).
Here are some simulations related to this model.

##### Dear colleagues:

Feel free to use these pictures to illustrate your research in talks and papers, with attribution (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank">CC BY-SA 4.0</a>). Some of the images are available in very high resolution upon request.


<!--more-->


The stochastic higher spin vertex model generalizes a number of
integrable stochastic particle systems on the line in the KPZ universality class:

<table class="image" align="center">
<caption align="bottom"></caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 800px;" src="{{site.storage_url}}/img/blog/Diagramofproc.png" /></td></tr>
</table>
<br>


The stochastic higher spin vertex model is probabilistic, which puts probability weights on configurations of arrows in some region.
In our interpretation, the arrows will always point up and to the right.
We will take this region to be
the integer quadrant
$$\mathbb{Z}_{\ge0}^2$$.

The model has 4 parameters: $$q$$, $$\nu$$, $$\alpha$$, and $$J$$. The simplest case of the model arises when $$J=1$$. If $$J$$ is a positive integer, then there are at most $$J$$ horizontal arrows allowed.

### Model in $$J=1$$ case

Let us first explain how $$J=1$$ probability weights are assigned at a single vertex. The numbers of incoming arrows at a vertex (bottom and left)
$$i_1$$ and $$j_1$$ are interpreted as an input which is fixed, and then the probability weight is put on numbers of outgoing arrows
$$i_2$$ and $$j_2$$, such that $$i_1+j_1=i_2+j_2$$:

<table class="image" align="center">
<caption align="bottom"></caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 600px;" src="{{site.storage_url}}/img/blog/Crossing.png" /></td></tr>
</table>
<br>

For $$J=1$$, the probability weights have the following form
(where $$g=0,1,2,\ldots$$):

<table class="image" align="center">
<caption align="bottom"></caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 600px;" src="{{site.storage_url}}/img/blog/J1_vertex.png" /></td></tr>
</table>
<br>

If $$\nu=q^{-I}$$ for $$I=1,2,\ldots$$, then an additional restriction arises: there are at most $$I$$ vertical arrows allowed.

Starting from any boundary conditions on $$\mathbb{Z}_{\ge0}^2$$, we can recursively sample the configuration of arrows.

### Simulations in $$J=1$$ case

We choose the boundary conditions to consist of all incoming arrows from the left, and no incoming arrows from the bottom. In simulations below, the arrows are drawn without arrowheads, and thickness of an edge represents the number of arrows at that edge.

#### Stochastic six vertex model $(I=J=1)$

The limit shape and KPZ fluctuations theorems for the six vertex model were proven in [arXiv:1407.6729 [math.PR]](http://arxiv.org/abs/1407.6729).

<table class="image" align="center">
<caption align="top">Size $50$, $\alpha = -4$,
$q = 1/3$,
$\nu = 1/q$. Probability of an arrow to go straight up is $1/3$,
and to go straight over is $2/3$.</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 600px;" src="{{site.storage_url}}/img/blog/sim1.png" /></td></tr>
</table>

<table class="image" align="center">
<caption align="top">Size $150$, other parameters same as above.</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 600px;" src="{{site.storage_url}}/img/blog/sim2.png" /></td></tr>
</table>

<table class="image" align="center">
<caption align="top">Size $500$, other parameters same as above.</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 600px;" src="{{site.storage_url}}/img/blog/sim3.png" /></td></tr>
</table>

<table class="image" align="center">
<caption align="top">Fluctuations of the height function of the above model (size $100$).</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 600px;" src="{{site.storage_url}}/img/blog/100_fluc.png" /></td></tr>
</table>


#### $I=4$, $J=1$

<table class="image" align="center">
<caption align="top">Size $350$, $\alpha = -18$,
$q = 0.5$, $\nu = 1/q^4$.</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 600px;" src="{{site.storage_url}}/img/blog/sim4.png" /></td></tr>
</table>

<table class="image" align="center">
<caption align="top">A zoom into the above picture.</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 900px;" src="{{site.storage_url}}/img/blog/sim5.png" /></td></tr>
</table>

#### General $$\nu$$ and $$J=1$$

<table class="image" align="center">
<caption align="top">Size $50$,
$\alpha = 0.8$,
$q = 0.5$,
$\nu = 0.4$. If there are more than 10 vertical arrows at an edge,
the boldness is still like that for 10 arrows.
</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 700px;" src="{{site.storage_url}}/img/blog/sim6.png" /></td></tr>
</table>

<table class="image" align="center">
<caption align="top">Size $400$, other parameters same as above.
</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 700px;" src="{{site.storage_url}}/img/blog/sim7.png" /></td></tr>
</table>

<table class="image" align="center">
<caption align="top">A zoom into the above picture.
</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 900px;" src="{{site.storage_url}}/img/blog/sim8.png" /></td></tr>
</table>

### Model in general $$J$$ case

For an integer $$J$$, the vertex weights may be obtained by a fusion procedure (first performed by Kirillov and Reshetikhin; J. Phys. A, 1987), by putting $$J=1$$ layers with changing parameters:
$$\alpha, q\alpha, q^2\alpha, \ldots, q^{J-1}\alpha$$. For example, for $$J=2$$ we obtain the following vertex weights:

<table class="image" align="center">
<caption align="bottom"></caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 900px;" src="{{site.storage_url}}/img/blog/J2_vertex.png" /></td></tr>
</table>
<br>

In general, the vertex weights can be expressed through the basic hypergeometric functions, and, moreover, are always polynomials in $$q^J$$. Therefore, one can perform an analytic continuation in $$q^J$$, and regard $$J$$ (or rather $$q^J$$) as a complex parameter. However, for
$$J$$ not integer, resulting systems in general fail to become stochastic. There is at least one stochastic system which can be obtained via this analytic continuation, it arises at $$\alpha=-\nu$$, $$q^J\alpha=-\mu$$, and it is the $$q$$-Hahn system introduced by Povolotsky in [arXiv:1308.3250 [math-ph]](http://arxiv.org/abs/1308.3250).

### Simulations in general $$J$$ case

We choose the boundary conditions to consist of $$J$$ incoming arrows from the left, and no incoming arrows from the bottom. In simulations below, the arrows are drawn without arrowheads, and thickness of an edge represents the number of arrows at that edge.

<table class="image" align="center">
<caption align="top">Size around $270$,
$\alpha = -18$,
$q = .5$,
$\nu = 1/q^4$,
$J=3$. At most 4 vertical arrows and at most 3 horizontal arrows are allowed, therefore there is a packed region on the left.
</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 1000px;" src="{{site.storage_url}}/img/blog/sim9.png" /></td></tr>
</table>

<table class="image" align="center">
<caption align="top">A zoom into the above picture.
</caption>
<tr><td><img alt="Simulations of stochastic higher spin vertex model" style="width: 900px;" src="{{site.storage_url}}/img/blog/sim10.png" /></td></tr>
</table>






{% include references.md %}
