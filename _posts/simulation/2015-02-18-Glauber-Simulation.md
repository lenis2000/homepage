---
layout: post
title:  "Implementation of Glauber dynamics simulation of random lozenge tilings"
date:   2015-02-18 10:00:00
comments: false
categories: blog math simulation
published: true
show-date: true
image: __STORAGE_URL__/img/blog/card120nonsymm_uniform_tn.png
image-alt: Uniformly random tiling of a 9-gon
more-text: Implementation
---

I've implemented the Glauber dynamics to (approximately) sample uniformly random lozenge tilings
of polygons of Gelfand-Tsetlin type. These polygons are called sawtooth domains by [J. Novak](http://arxiv.org/abs/1407.7578). [This paper](http://arxiv.org/abs/1310.5844) by **B. Laslier** and **F.L. Toninelli** establishes rate of convergence of the Glauber dynamics to the uniformly random lozenge tiling.

Classical references on uniformly random lozenge tilings include (the list below is by no means exhaustive)

* **Cohn, H., Larsen, M. and Propp, J.** (1998). The shape of a typical boxed plane partition.
New York J. Math. 4 137–165

* **Cohn, H., Kenyon, R. and Propp, J.** (2001). A variational principle for domino tilings.
J. Amer. Math. Soc. 14 297–346, [link](http://www.ams.org/journals/jams/2001-14-02/S0894-0347-00-00355-6/)

* **Kenyon, R. and Okounkov, A.** (2007). Limit shapes and the complex Burgers equation.
Acta Math. 199 263–302, [arXiv:math-ph/0507007](http://arxiv.org/abs/math-ph/0507007)

I've also done some work on local and global asymptotics of uniformly random lozenge tilings [[9]][ref9], [[10]][ref10], [[22]][ref22].

<!--more-->

### Implementation

The simulation is performed in Python and is _surprisingly simple_ because of the nice encoding of lozenge tilings of Gelfand-Tsetlin type polygons by interlacing integer arrays (the latter objects are also sometimes called Gelfand-Tsetlin schemes). This allows to sample interlacing arrays of depth up to 200-300 on my laptop in a reasonable time.

The drawing of tilings is performed in Mathematica, and it can be done in a static or a dynamic way. Here's a relevant Mathematica code for static drawing (please remove backslashes in front of curly brackets before pasting):

{% highlight matlab linenos %}
\[Lambda] = ReadList[fileName]

n := Length[\[Lambda][[1]]]

LozV[x_, y_, eps_] := \{EdgeForm[Thickness[eps]], Blue,
  Polygon[\{\{x - 1/2, y \}, \{x - 1/2, y + 1\}, \{x + 1/2, y \}, \{x + 1/2,
     y - 1\}, \{x - 1/2, y \}\}]\}

LozL[x_, y_, eps_] := \{EdgeForm[Thickness[eps]], Lighter[Yellow],
  Polygon[\{\{x - 1/2, y\}, \{x - 3/2, y + 1 \}, \{x - 1/2,
     y + 1\}, \{x + 1/2, y \}, \{x - 1/2, y \}\}]\}

LozS[x_, y_, eps_] := \{EdgeForm[Thickness[eps]], Lighter[Red],
  Polygon[\{\{x - 1/2, y\}, \{x - 1/2, y + 1\}, \{x + 1/2, y + 1\}, \{x + 1/2,
      y \}, \{x - 1/2, y \}\}]\}

FF[x_, k_] :=
 Sum[If[x >= \[Lambda][[1]][[k]][[i]] - i, 1, 0], \{i, 1, k\}] -
  If[k > 1,
   Sum[If[x >= \[Lambda][[1]][[k - 1]][[i]] - i, 1, 0], \{i, 1,
     k - 1\}], 0]

eps := 0.0004

t := \{\{1, 1/2\}, \{0, 1\}\}

Graphics[GeometricTransformation[\{Table[
    If[FF[x, k] == 1, LozS[x + 1, k - 1, eps],
     If[x + k > 0, LozL[x + 1, k - 1, eps]]], \{k, 1, n\}, \{x, -n + 1,
     n - 1\}],
   Table[LozV[\[Lambda][[1]][[i]][[j]] - j, i, eps], \{i, 1, n\}, \{j, 1,
      i\}]\}, t]]
{% endhighlight %}


The Python source code, as well as Mathematica files, are available at [GitHub](https://github.com/lenis2000/Glauber_Simulation).

### Remarks on sampling

* [Coupling from the past](http://en.wikipedia.org/wiki/Coupling_from_the_past) could speed up the simulation, and produce an exact sampling

* For the hexagon, there are special _shuffling algorithms_ to sample uniformly random (and even more generally distributed) lozenge tilings, see papers by Borodin, Gorin, and Rains ([1](http://arxiv.org/abs/0804.3071), [2](http://arxiv.org/abs/0905.0679)). See also a gallery [here](http://www.mccme.ru/~vadicgor/research.html).


{%include references.md %}
