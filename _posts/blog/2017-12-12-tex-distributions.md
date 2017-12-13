---
layout: post
title: Switching TeXLive distributions for arXiv
date: 2017-12-12 12:00:00
comments: true
categories: blog math tech latex
published: true
show-date: true
more-text: How to switch TeXLive versions
image: https://upload.wikimedia.org/wikipedia/commons/archive/a/a8/20171115134807%21ArXiv_web.svg
image-alt: arXiv logo
image-address: https://www.arxiv.org
---

Doing bibliography with [BiBLaTeX](https://ctan.org/pkg/biblatex) (and having one huge `.bib` file - mine is [public](https://github.com/lenis2000/BiBTeX), by the way)
works great for me.

One downside is that [arXiv](https://www.arxiv.org) uses a [specific TeXLive
distribution](https://arxiv.org/help/faq/texlive) (2016 as of today), and the distribution on my machine is more up to date.
Also, arXiv wants `.bbl` files uploaded instead of huge `.bib` files
(`.bbl` contains only the references actually included in a given paper, and not all over 900 references which are in my `.bib` file).
The problem is that `.bbl` files produced by different versions of BiBLaTeX are incompatible (!).
So, to upload a paper to arXiv, I need to install a version of TeXLive identical to the arXiv's one.

<!--more-->

I have a Mac.
To install an older TeXLive version, I use [MacTeX](http://www.tug.org/mactex/).
To find an appropriate version, one needs to go to the TUG's ftp at
[`ftp://tug.org/historic/systems/mactex/`](ftp://tug.org/historic/systems/mactex/)
where they keep all the historic versions.
The download speed from this ftp might be quite slow.
When installed, the older version will coexist with the current one,
and one can switch between the versions.

[MacTeX's page](http://www.tug.org/mactex/multipletexdistributions.html) has some things to
say about switching, but neither of these ways worked for me.
Another (manual) solution I found over the internet is the following:

{%highlight bash linenos%}
cd /Library/TeX/Distributions/.DefaultTeX
sudo rm Contents
sudo ln -s ../TeXLive-2016.texdist/Contents Contents
{%endhighlight%}

Namely, `/Library/TeX/Distributions/.DefaultTeX/Contents`
is a symlink to the TeXLive distribution used throughout the system,
and redirecting this link will switch the version.

Bingo, a new paper is submitted to the arXiv!
