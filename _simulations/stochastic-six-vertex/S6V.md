---
title: Stochastic vertex models simulations
layout: default
permalink: /simulations/model/S6V
nav_parent: Simulations
---

<h1>Stochastic vertex models simulations</h1>

---

##### Dear colleagues:

Feel free to use code (unless otherwise specified next to the corresponding link),
data, and visualizations to illustrate your research in talks and papers,
with attribution (<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank">CC BY-SA 4.0</a>).
Some images are available in very high resolution upon request.

I can also produce other simulations upon request - email me at <a href="mailto:lenia.petrov@gmail.com">lenia.petrov@gmail.com</a>

---

<ul>
{% for item in site.simulations %}
  {% if item.model == "S6V" %}
  <li>[{{item.date | date: "%Y/%m/%d"}}] <a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
{% endfor %}
</ul>
