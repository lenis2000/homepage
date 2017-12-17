---
title: Simulations of TASEP-like systems
layout: default
permalink: /simulations/model/TASEPs/
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
  {% if item.model == "TASEPs" %}
    <li>[{{item.date | date: "%Y/%m/%d"}}] <a href="{{ item.url }}">{{ item.title }}</a></li >
  {% endif %}
{% endfor %}
</ul>
