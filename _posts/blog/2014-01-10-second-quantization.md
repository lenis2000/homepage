---
layout: post
title: Second quantization
date: 2014-01-10 09:00:00
comments: false
categories: blog math
published: true
show-date: true
more-text: Continue reading
---


I "grew up" in mathematical sense learning about Fock spaces and
some nice things one can do with them.
There always was a mysterious physical term
"**second quantization**"
attached to the subject
([wikipedia][second]). Recently I was reading
[Felix Berezin's][berezin] lecture notes from 1966-67;
they are called "*Lectures on Statistical Physics*",
in English: translated from the Russian and edited by [Dimitry Leites][leites]),
in Russian: MCCME 2008.
The full English text can be readily found.

Chapter 25 of these lecture notes contains a clear and historic
description of second quantization,
in a unified way for Bosons and Fermions.
Let me briefly record how this is done.

<!--more-->


**Personal remark**.

Mainly I learned material about Fock spaces directly from [my advisor][olsh], together with reading [Okounkov][ok-wiki]'s papers ([1][ok-inf-wedge], [2][ok-sl2], [3][ok-symm-funct], [4][ok-resh]; the last one is together with [Reshetikhin][resh-wiki]), attending [Neretin][neretin]'s graduate-level lectures at MSU, and writing something on my own ([1][petrov-pfaff], [2][petrov-sl2]). With these modern references in mind, I was surprised to find that the understanding of the second quantization dates back (in almost the same words) to at least mid-1960s.


### First quantization

The first quantization refers to the usual quantization
of classical mechanics, and the result
of this process is the quantum mechanics.
This [wikipedia article][first-q]
contains lots of details on history and postulates of quantum mechanics.

I think of the first quantization as of a process of replacing a
classical
particle (having coordinate and momentum)
by an element $$f$$ in a complex Hilbert space $$\mathcal{L}$$.
Usually, as $$\mathcal{L}$$ one takes $$L^2(\mathbb{R}^{d})$$,
and then the function $$|f|^{2}$$ is the probability density of
the position/momentum of the particle.

The coordinate and momentum are replaced by
operators in this Hilbert space
$$\mathcal{L}$$ (these operators do not commute).

Thus, the quantization is the process of replacing
classical physical quantities by
noncommutative operators.


We will also need the following remark:

>**Remark**.
>
> Operators in $$\mathcal{L}=L^2(\mathbb{R}^{d})$$ can be written in an integral form with a kernel $$K(\xi\mid\eta)$$, $$\xi,\eta\in\mathbb{R}^{d}$$:
>
>$$\displaystyle
>(Kf)(\xi)=\int_{\mathbb{R}^{d}} K(\xi\mid\eta) f(\eta)d\eta.
>$$


### Second quantization

#### Fock space

The second quantization procedure takes the
single-particle space $$\mathcal{L}$$, and lifts it to
a [Fock space][fock], fermionic or bosonic.

The Fock space $$\mathcal{H}$$ is a Hilbert space
consisting of functions depending on zero-particle, single-particle,
two-particle, three-particle, etc., configurations.
That is, an element of $$\mathcal{H}=\overline{\bigoplus_{n=0}^{\infty}
S_n^{\pm} \mathcal{L}}$$ represents a
multi-particle configuration (state)
in the same sense as an element of
$$\mathcal{L}$$ represents a single-particle configuration.
Here $$S_n=S_n^+$$ is the symmetrization (for Bosons) and
$$S_n=S_n^-$$ is the anti-symmetrization
(for Fermions), and the bar in the definition of $$\mathcal{H}$$
means Hilbert completion.

#### Creation and annihilation operators

In the Fock
space there are creation and annihilation operators
$$a^{*}(f)$$ and $$a(f)$$, respectively,
which are defined for any $$f\in\mathcal{L}$$.
Up to functional-analytic technicalities,
these operators must satisfy the following two
conditions:

* The operator $$a^*(f^*)$$ is conjugate to $$a(f)$$ (here $$f^*$$ is the complex conjugate function).

* The creation and annihilation operators satisfy

	* in the fermionic case:

		- $$
		a(f)a(g)+a(g)a(f)=a^*(f)a^*(g)+a^*(g)a^*(f)=0
		$$,

		- $$
		a(f)a^*(g)+a^*(g)a(f)=(f,g^*),
		$$
		where $$(f,g^*)$$ is the inner product in $$\mathcal{L}$$.


	* in the bosonic case:

		- $$
		a(f)a(g)-a(g)a(f)=a^*(f)a^*(g)-a^*(g)a^*(f)=0
		$$,

		- $$
		a(f)a^*(g)-a^*(g)a(f)=(f,g^*),
		$$
		where $$(f,g^*)$$ is the inner product in $$\mathcal{L}$$.



#### Integral forms



When $$\mathcal{L}=L^2(\mathbb{R}^{d})$$, it is natural to write the creation and annihilation operators
as integral operators

$$
a(f)=\int_{\mathbb{R}^{d}} f(\xi)a(\xi)d\xi,\qquad
a^*(f)=\int_{\mathbb{R}^{d}} f(\xi)a^*(\xi)d\xi.
$$

Here $$a(\xi)$$, $$a^*(\xi)$$ are the "delta-versions" (i.e., generalized
function versions)
of the creation and annihilation operators. They satisfy
(e.g., for the fermionic case):

$$
	a(\xi)a(\eta)+a(\eta)a(\xi)
	=a^*(\xi)a^*(\eta)+a^*(\eta)a^*(\xi)=0,
	\qquad
	a(\xi)a^*(\eta)+a^*(\eta)a(\xi)=\delta(\xi-\eta).
$$


#### Operators in the Fock space



Having an integral operator $$K$$
with kernel $$K(\xi\mid \eta)$$ in the single-particle space
$$\mathcal{L}=L^2(\mathbb{R}^{d})$$ (see Remark above), one can define
the corresponding operator $$\tilde K$$ in the
Fock space $$\mathcal{H}$$ as follows:

$$\displaystyle
	\tilde K:=\int_{\mathbb{R}^{d}}
	\int_{\mathbb{R}^{d}}
	K(\xi\mid \eta)a^*(\xi)a(\eta)d\xi d\eta.
$$

Since this formula resembles the following formula in $$\mathcal{L}=L^2(\mathbb{R}^{d})$$

$$\displaystyle
	(K f,f)=\int_{\mathbb{R}^{d}}
	\int_{\mathbb{R}^{d}}
	f(\xi)f^*(\eta)d\xi d\eta,
$$

the term **second quantization** was invented to call the operator
$$\tilde K$$ in the Fock space. This quantization is "second",
because an operator $$K$$ in $$\mathcal{L}=L^2(\mathbb{R}^{d})$$
itself can come from
a "first" quantization of a classical physical quantity.

 **Example**.

 If the operator $$K$$ in $$\mathcal{L}=L^2(\mathbb{R}^{d})$$ is the identity operator, that is, its kernel is $$K(\xi\mid\eta)=\delta(\xi-\eta)$$, then its second quantization $$\tilde K$$ is the [particle number operator][particle-number]

$$\displaystyle
	N=\int_{\mathbb{R}^{d}}a^*(\xi)a(\xi)d\xi
$$

Informally: for each point $$\xi$$ in the space $$\mathbb{R}^{d}$$, annihilate a particle at this point (if there is no particle, this gives zero). Then create a particle at the same point. After that, sum over all $$\xi\in\mathbb{R}^{d}$$.






[ok-inf-wedge]: http://arxiv.org/abs/math/9907127
[ok-sl2]: http://arxiv.org/abs/math/0002135
[ok-resh]:  http://arxiv.org/abs/math/0107056
[ok-symm-funct]: http://arxiv.org/abs/math/0309074

[petrov-pfaff]: http://arxiv.org/abs/1011.3329
[petrov-sl2]:  http://arxiv.org/abs/1111.3399

[neretin]: http://www.mat.univie.ac.at/~neretin/
[olsh]: http://www.iitp.ru/en/userpages/88/
[berezin]: http://en.wikipedia.org/wiki/Felix_Berezin
[leites]: http://www2.math.su.se/~mleites/
[ok-wiki]: http://en.wikipedia.org/wiki/Andrei_Okounkov
[resh-wiki]: http://en.wikipedia.org/wiki/Nicolai_Reshetikhin

[second]: http://en.wikipedia.org/wiki/Second_quantization

[first-q]: http://en.wikipedia.org/wiki/Mathematical_formulations_of_quantum_mechanics
[fock]: http://en.wikipedia.org/wiki/Fock_space
[particle-number]: http://en.wikipedia.org/wiki/Particle_number_operator
