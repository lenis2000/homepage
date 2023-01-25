---
layout: post
title: Rewriting History in Integrable Stochastic Particle Systems
comments: false
categories: blog math talk
talk-url: __STORAGE_URL__/research_files/talks/TASEP_rewriting_2023.pdf
published: true
more-text: Download pdf
image: __STORAGE_URL__/img/papers/rewriting-2-cars.png
image-alt: Trajectories of two cars with different speeds and initial positions
pdf-size: 5.9 MB
---

Imagine two cars, slow (S) and fast (F), driving to the right on a discrete 1-dimensional lattice according to some random walk mechanism, and such that the cars cannot pass each other. We consider two systems, SF and FS, depending on which car is ahead. It is known for some time (through connections to symmetric functions and the RSK correspondence) that if at time 0 the cars are immediate neighbors, the trajectory of the car that is behind is the same (in distribution) in both systems. However, this fact fails when the initial locations of the cars are not immediate neighbors. I will explain how to recover the identity in distribution by suitably randomizing the initial condition in one of the systems.

This result arises in our recent work on multiparameter stochastic systems (where the parameters are speeds attached to each car) in which the presence of parameters preserves the quantum integrability. This includes TASEP (totally asymmetric simple exclusion process), its deformations, and stochastic vertex models, which are all integrable through the Yang-Baxter equation (YBE). In the context of car dynamics, we interpret YBEs as Markov operators intertwining the transition semigroups of the dynamics of the processes differing by a parameter swap. We also construct Markov processes on trajectories which "rewrite the history" of the car dynamics, that is, produce an explicit monotone coupling between the trajectories of the systems differing by a parameter swap.

Based on the [joint work with Axel Saenz][ref40].

{% include references.md %}

<!--more-->

<a href="{{ page.talk-url | replace: '__STORAGE_URL__', site.storage_url}}" target="_blank">PDF ({{page.pdf-size}})</a>
