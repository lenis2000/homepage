---
layout: post
title: External Tikz pictures
date: 2017-12-12 08:00:00
comments: true
categories: blog math tech latex
published: true
show-date: true
more-text: 
---

I produce almost all pictures in my math <script type="math/tex">\mathrm{\LaTeX}</script> writing in [TikZ](http://www.texample.net/tikz/).
This is a nice library (and I've learned it over the years), which allows for-loops, effects, etc.
The downside for me always was that compiling inline TikZ pictures takes a lot of time.
For some months now, while writing a particularly figure-heavy paper,
I wondered how I can optimize this.

Following [this stackoverflow discussion](https://stackoverflow.com/questions/2701902/standalone-diagrams-with-tikz), I have now adopted
a great way of optimizing TikZ pictures by placing them into separate standalone tex files.

<!--more-->

For example, this file
{%highlight tex linenos%}
\documentclass{standalone}
\usepackage{tikz}
\begin{document}
\begin{tikzpicture}
	%tikz code
\end{tikzpicture}
\end{document}
{%endhighlight%}
can be fed into my usual `latexmk`
{%highlight bash%}
latexmk -pdf -pvc -f -silent -synctex=1 FILENAME
{%endhighlight%}
for automatic constant compilation, and the pdf result can be included into the main <script type="math/tex">\mathrm{\TeX}</script> file
using another thread of automatic
`latexmk` compilation.

**Note**.
For further possible optimization, <script type="math/tex">\mathrm{\TeX}</script>
class `standalone` can already produce `png` output, which (I think) cost less compile time
to be included into the main <script type="math/tex">\mathrm{\TeX}</script> file.

**PS.** I enjoy turning on `latexmk` to constantly recompile the <script type="math/tex">\mathrm{\LaTeX}</script> sources for me.
I think this might be the reason why my laptop battery just died...
