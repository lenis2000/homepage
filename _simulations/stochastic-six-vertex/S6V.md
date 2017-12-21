---
title: Stochastic vertex models simulations
layout: default
permalink: /simulations/model/S6V/
nav_parent: Simulations
head_page: true
---

<h1>Stochastic vertex models simulations</h1>

---

{%include dear_colleagues.md%}

---

<ul>
{% for item in site.simulations %}
  {% if item.model == "S6V" %}
  <li>[{{item.date | date: "%Y/%m/%d"}}] <a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
{% endfor %}
</ul>
