---
title: Backwards evolution of TASEP
model: TASEPs
author: 'Hao Yu Li and Leonid Petrov'
code:
  - txt: "Code is available upon request"
results:
  - title: Movie
    params: |
      Movie. TASEP goes forward up to time $t=350$. Then the configuration evolves according to the backwards dynamics, all the way down to (almost) time zero.
      The timestamps are shown on top.
      At each time during the backwards dynamics, the distribution of the random height function coincides with the one of the TASEP at the specified time moment.
    image: __STORAGE_URL__/simulations/2019-06-backTASEP/TASEP_fwd_bwd_350.m4v
    image-tn: __STORAGE_URL__/simulations/2019-06-backTASEP/TASEP_fwd_bwd_350_2.png
    image-size: 1.8 MB
    raw: __STORAGE_URL__/simulations/2019-06-backTASEP/TASEP_fwd_bwd_350.txt
    raw-size: 125 MB

papers:
- title: 'L. Petrov, A. Saenz. Mapping TASEP back in time (2019) • Probability Theory and Related Fields, 182, pages 481-530 (2022) • arXiv:1907.09155 [math.PR]'
---

This is a simulation illustrating the main result from the paper in preparation [1].

### Multitime distributions

In addition to the dynamical simulation (the movie below), we can generate joint pictures of the height 
function at different times. Here are the ones for TASEP:

<img src="{{site.storage_url}}/simulations/2019-06-backTASEP/multi_TASEP.png" style="max-width:100%;max-height:800px;height:auto;width:auto;" alt="TASEP multitime">

And for the backwards dynamics:

<img src="{{site.storage_url}}/simulations/2019-06-backTASEP/multi_BHP.png" style="max-width:100%;max-height:800px;height:auto;width:auto;" alt="Backwards dynamics multitime">

### Data file format for the movie

The file contains Mathematica-readable array of the form
$\{t_i,H(t_i)\}$, where $t_i$ are the timestamps, and 
$H(t_i)$ is the array of the values of the TASEP height function.
