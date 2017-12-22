---
layout: post
title: On witching TeXLive distributions again
date: 2017-12-21 12:00:00
comments: true
categories: blog math tech latex
published: true
show-date: true
more-text: My solution
image: https://upload.wikimedia.org/wikipedia/commons/archive/a/a8/20171115134807%21ArXiv_web.svg
image-alt: arXiv logo
image-address: https://www.arxiv.org
---

### (An update on the [previous post]({{site.url}}/2017/12/tex-distributions/))

So, I had a problem - my TeX distribution is new and updated, but I need to submit a paper
to the arXiv, and arXiv has a different version of TeX distribution (currently 2016).
The main problem is `biblatex`, which creates an incompatible version of the bibliography `.bbl` file.
For this, I need an appropriate version of the biblatex package.

<!--more-->

My solution which gives the needed version `2.8` of the `.bbl` file:
- Download the TeXLive basic 2016 distribution, install it (I'm using MacTeX), from [`ftp://tug.org/historic/systems/mactex/`](ftp://tug.org/historic/systems/mactex/)
- update the `tlmgr` utility by `sudo tlmgr update --self`
- Install the needed packages including `biblatex` using `sudo tlmgr install <package>`
- Then remove `biblatex` with `sudo tlmgr remove biblatex`
- Use local texmf tree, and install to it the appropriate version of `biblatex` (currently arXiv needs `3.5`), by
downloading the corresponding release of `biblatex` from [the biblatex github repo](https://github.com/plk/biblatex), and installing it.

Note that
cloning the full biblatex github repo and running their install script (turns out I needed version `3.5` of biblatex)
for some reason does not give the needed version `2.8` of the `.bbl` file.
