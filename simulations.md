---
title: Simulations
layout: default
permalink: /simulations/
nav_id: Simulations
nav_weight: 19
---

<script defer src="{{ '/assets/js/simulations-search.js' | relative_url }}"></script>

<!-- Container for the entire page content -->
<div class="container mb-5">

<h1 class="my-4">Simulations and other computational tools</h1>
<h5 class="mb-3">Data, source code, visualizations</h5>

<hr>

{% include dear_colleagues.md %}

{%include sims.html%}



<hr>


<!-- Search bar -->
<div id="sim-search-group" class="input-group mb-4">
  <span class="input-group-text" id="sim-search-label">
    <i class="bi bi-search"></i>
  </span>
  <input type="text"
         id="sim-search-input"
         class="form-control"
         placeholder="Type to search simulations…"
         aria-label="Search simulations"
         aria-describedby="sim-search-label">
  <button class="btn btn-outline-secondary" id="sim-search-clear" type="button">Clear</button>
</div>

<!-- Category buttons -->
<div id="sim-cat-buttons" class="d-flex flex-wrap gap-2 mb-4">
  <button type="button"
          class="btn btn-outline-primary category-btn active"
          data-category="all">
    All
  </button>
  {% assign categories = "
        domino-tilings:Domino Tilings,
        random-matrices:Random Matrices,
        permutations:Random Permutations,
        lozenge-tilings:Lozenge Tilings,
        TASEPs:TASEP-like Systems,
        misc:Miscellaneous Tools" | split: "," %}
  {% for cat in categories %}
    {% assign p = cat | split: ":" %}
    {% assign slug = p[0] | strip %}
    {% assign name = p[1] | strip %}
    <button type="button"
            class="btn btn-outline-primary category-btn"
            data-category="{{ slug }}">
      {{ name }}
    </button>
  {% endfor %}
</div>

<!-- Complete simulations list -->
<ul id="simulations-list" class="list-group list-group-flush">
  {% assign all_sims = site.simulations | sort: "date" | reverse %}
  {% for sim in all_sims %}
    {% unless sim.head_page %}
    <li class="list-group-item d-flex justify-content-between align-items-center"
        data-title="{{ sim.title | downcase | escape }}"
        data-category="{{ sim.model | default: 'uncategorised' }}">
      <div>
        <a href="{{ sim.url }}" class="fw-bold">{{ sim.title }}</a>
        <span class="text-muted ms-2">{{ sim.date | date: "%Y-%m-%d" }}</span>
      </div>
      {% if sim.model %}
        <span class="badge bg-light text-dark text-capitalize">{{ sim.model }}</span>
      {% endif %}
    </li>
    {% endunless %}
  {% endfor %}
</ul>
<!-- =========================================================== -->



</div><!-- /.container -->
