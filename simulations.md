---
title: Simulations
layout: default
permalink: /simulations/
nav_id: Simulations
nav_weight: 19
---

<h1>Gallery of simulations</h1>

<h5 class="mb-3">Data, source code, visualizations</h5>

(For now this page is under construction with only one simulation added. You can <a href="{{site.url}}/research/gallery/">enjoy the older simulations</a>)

---

##### Dear colleagues:

Feel free to use code (unless otherwise specified), data, and visualizations to illustrate your research in talks and papers,
with attribution (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank">CC BY-SA 4.0</a>).
Some of the images are available in very high resolution upon request.

I can also produce other simulations upon request - email me at <a href="mailto:lenia.petrov@gmail.com">lenia.petrov@gmail.com</a>

---

### Stochastic six vertex model and its variants

<ul>
{% for item in site.simulations %}
  {% if item.model == "S6V" %}
  <li><a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
{% endfor %}
</ul>

---

### Lozenge tilings

<ul>
{% for item in site.simulations %}
  {% if item.model == "tilings" %}
  <li><a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
{% endfor %}
</ul>
