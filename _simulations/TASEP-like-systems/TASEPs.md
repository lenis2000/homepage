---
title: Simulations of TASEP-like systems
layout: default
permalink: /simulations/model/TASEPs/
nav_parent: Simulations
---

<h1>{{page.title}}</h1>

---

{%include dear_colleagues.md%}

---

<ul>
{% for item in site.simulations %}
  {% if item.model == "TASEPs" %}
  <li>[{{item.date | date: "%Y/%m/%d"}}] <a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
{% endfor %}
</ul>
