---
title: Domino tilings and dynamics on them
layout: default
permalink: /simulations/model/domino_tilings/
nav_parent: Simulations
head_page: true
---

<h1>{{page.title}}</h1>

---

{%include dear_colleagues.md%}

---

{% assign simss = site.simulations | sort: "date" %}

<ul>
{% for item in simss reversed %}
  {% if item.model == "domino_tilings" %}
    <li>[{{item.date | date: "%Y/%m/%d"}}] <a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
{% endfor %}
</ul>
