---
title: Simulations
layout: default
permalink: /simulations/
nav_id: Simulations
nav_weight: 19
---

<h1>Gallery / library of simulations</h1>

<h5 class="mb-3">Data, source code, visualizations</h5>

---

{%include dear_colleagues.md%}

---

<h2 class="mb-3">Recent</h2>

{% assign simss = site.simulations | sort: "date" %}

<ul>
{% assign counter = 0 %}
{% for item in simss reversed %}
  {% if item.head_page != true %}
  {% assign counter = counter | plus:1 %}
  {% if counter < 10 %}
    <li>[{{item.date | date: "%Y/%m/%d"}}] <a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
  {% endif %}
{% endfor %}
</ul>


---

<h2 class="mb-3">Categories</h2>

<!-- - ##### <a href="{{site.url}}/simulations/model/S6V/">Stochastic vertex models</a> -->
- ##### <a href="{{site.url}}/simulations/model/random-matrices/">Random matrices</a>
- ##### <a href="{{site.url}}/simulations/model/permutations/">Random permutations</a>
- ##### <a href="{{site.url}}/simulations/model/TASEPs/">TASEP-like systems</a>
- ##### <a href="{{site.url}}/simulations/model/domino-tilings/">Domino tilings</a>
- ##### <a href="{{site.url}}/simulations/model/lozenge-tilings/">Lozenge tilings</a>
- ##### <a href="{{site.url}}/simulations/model/misc/">Miscellaneous simulations</a>


---

<h5 class="mb-2">Other links</h5>

- <a href="{{site.url}}/research/gallery/">Older simulations</a>  (pictures of lozenge tilings and stochastic vertex models)
- GitHub repo with simulations code [`https://github.com/lenis2000/simulations/`](https://github.com/lenis2000/simulations/)
