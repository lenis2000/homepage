---
layout: post
title: Homepage udpate
date: 2017-05-20 03:00:00
comments: false
categories: blog math tech
published: true
show-date: true
image: https://raw.githubusercontent.com/jekyll/brand/master/jekyll-logo-dark-solid.png
image-alt: Jekyll logo
more-text: More technical details
---

I've updated and streamlined the internal structure of my homepage 
which will make it much easier to manage. 
This is yet another attempt to better understand [Jekyll](http://jekyllrb.com/)
and come up with a website which is easy to manage and update regularly. 

In the process of the update I've moved over almost all content 
from the previous version (also build with [Jekyll](http://jekyllrb.com/), 
but back in January 2014), and in particular created 
a special [gallery of simulations]({{site.url}}/research/gallery/)
instead of a series of posts like in the previous version.

The design of the homepage closely follows 
the style of University of Virginia, 
and is in line with the
[new Math Department website](https://uva-math.github.io)
which I am also building.

<!--more-->

### Technical structure

The source code is hosted on [GitHub](https://github.com/lenis2000/homepage), 
the website is built by [Travis CI](https://travis-ci.org/lenis2000/homepage),
and the resulting website is hosted on Amazon S3. 
The resources pertaining to the website 
(images, graphs, etc.) are stored in a separate S3 bucket
and are linked from it. In this way the source code repository 
on GitHub can be kept small, which also frees some of my own
precious Dropbox space.

The best part is that I can update the homepage by simply committing to GitHub. 
Another good thing is that I switched to a faster 
<script type="math/tex">\mathrm{\TeX}</script> rendering engine, 
[KaTeX](https://github.com/Khan/KaTeX) (instead of [MathJax](https://www.mathjax.org/)),
which will allow to post longer math texts. Well, this 
<script type="math/tex">\mathrm{\TeX}</script>
logo still uses MathJax - both engines have their own merits 
(and KaTeX simply cannot render 
<script type="math/tex">\mathrm{\TeX}</script>
logos for some reason).

### Other websites I built using Jekyll

- My old homepage in January 2014 (now completely gone from the internet)
- The [Seminar on Stochastic Processes 2017](http://faculty.virginia.edu/ssp17/) page around November 2016
- The [Integrable Probability FRG website](https://int-prob.github.io) in April 2017
- Helped with my [wife's website](https://albinash-art.github.io) in April 2017
- The [new Math Department website](https://uva-math.github.io) in April-May 2017, this project is still ongoing but mostly finished

Overall, this was a veyr interesting technical experience, but
now I have to get back to doing math. 
First step is to review all those papers sitting there 
waiting...

<br><br>
