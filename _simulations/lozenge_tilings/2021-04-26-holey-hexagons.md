---
title: Holey hexagons with holes at different heights 
model: lozenge_tilings
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/lenis2000/Glauber_Simulation/tree/holey-hexagons'
    txt: 'python code for simulations, simple Mathematica code for drawing'
results:
  - title: Tiling with a symmetric hole
    params: |
      Hexagon of size 100, hole size 15, shift 0.
    image: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/regular.png
    image-tn: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/regular-tn.png
    image-size: 8.1 MB
    raw: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/output40.txt
    raw-size: 57 KB
  - title: Tiling with a skewed hole
    params: |
      Hexagon of size 100, hole size 15, shift 4.
    image: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/skewed.png
    image-tn: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/skewed-tn.png
    image-size: 8.1 MB
    raw: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/outputX40.txt
    raw-size: 57 KB
  - title: Tiling with an even more skewed hole
    params: |
      Hexagon of size 100, hole size 15, shift 8.
    image: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/skewed-more.png
    image-tn: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/skewed-more-tn.png
    image-size: 8.1 MB
    raw: __STORAGE_URL__/simulations/2021-04-27-holey-hexagon/outputXX40.txt
    raw-size: 57 KB
---

What happens if we sample a uniformly random tiling of a hexagon with a hole, but place the hole at different heights? (Thanks to MR for the request to sample these examples.)

### Data file format

The data file is a list of lists of lists in Mathematica-readable format, of the form
$$\{ \lambda(1),\lambda(2),\ldots,\lambda(T) \},$$
where each $\lambda(t)$ is a list of weakly interlacing 
integer coordinates of the form
$$\{ \{ 47,0,0,0,\ldots \},\{ 50,47,0,0,\ldots \} , \{ 50,49,47,0,\ldots \} ,\ldots, \} .$$
This list is a square array, and each $\lambda(i)$ is appended by zeroes.