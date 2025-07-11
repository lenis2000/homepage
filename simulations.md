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
<h5 class="mb-3">Visualizations, data, source code</h5>

{%include sims.html%}


<!-- Search bar -->
<div id="sim-search-group" class="input-group mb-4">
  <span class="input-group-text" id="sim-search-label">
  </span>
  <input type="text"
         id="sim-search-input"
         class="form-control"
         placeholder="Type to search simulations…"
         aria-label="Search simulations"
         aria-describedby="sim-search-label">
  <button class="btn btn-outline-secondary" id="sim-search-clear" type="button">Clear</button>
</div>
<small class="text-muted d-none d-md-block mb-3" style="margin-top: -1.5rem;">Tip: Press ESC to clear search and reset filters</small>

<!-- Category buttons -->
<div id="sim-cat-buttons" class="row g-2 mb-4">
  <div class="col-auto">
    <button type="button"
            class="btn btn-sm category-btn active text-nowrap"
            data-category="all">
      All
    </button>
  </div>
  {% assign categories = "
        domino-tilings:Dominos,
        random-matrices:Random Matrices,
        permutations:Permutations,
        lozenge-tilings:Lozenges,
        TASEPs:TASEPs,
        misc:Misc" | split: "," %}
  {% for cat in categories %}
    {% assign p = cat | split: ":" %}
    {% assign slug = p[0] | strip %}
    {% assign name = p[1] | strip %}
    <div class="col-auto">
      <button type="button"
              class="btn btn-sm category-btn text-nowrap"
              data-category="{{ slug }}">
        {{ name }}
      </button>
    </div>
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
        {% if sim.model %}
          {% assign cat_found = false %}
          {% assign cat_display_name = sim.model %}
          {% for cat in categories %}
            {% assign p = cat | split: ":" %}
            {% assign slug = p[0] | strip %}
            {% assign name = p[1] | strip %}
            {% if slug == sim.model %}
              {% assign cat_display_name = name %}
              {% assign cat_found = true %}
            {% endif %}
          {% endfor %}
          <button type="button"
                  class="badge badge-outline-uva ms-2 clickable-tag"
                  data-category="{{ sim.model }}"
                  style="border: 1px solid #232D4B; cursor: pointer;">
            {{ cat_display_name }}
          </button>
        {% endif %}
      </div>
    </li>
    {% endunless %}
  {% endfor %}
</ul>
<!-- =========================================================== -->

<br>
{% include dear_colleagues.md %}

<style>
/* Category filter buttons */
.category-btn {
  color: #232D4B; /* UVA Blue */
  background-color: transparent;
  border: 1px solid #232D4B;
  padding: 0.375rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 2rem;
  transition: all 0.2s ease;
}

.category-btn:hover {
  color: #fff;
  background-color: #232D4B;
  border-color: #232D4B;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(35, 45, 75, 0.15);
}

.category-btn.active {
  color: #fff;
  background-color: #232D4B; /* UVA Blue */
  border-color: #232D4B;
  box-shadow: 0 2px 4px rgba(35, 45, 75, 0.15);
}

/* Model type badges */
.badge-outline-uva {
  color: #232D4B; /* UVA Blue */
  background-color: transparent;
  border: 1px solid #232D4B;
  font-weight: normal;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.badge-outline-uva:hover {
  color: #fff;
  background-color: #232D4B;
  transform: translateY(-1px);
}

/* Responsive spacing for small screens */
@media (max-width: 576px) {
  #sim-cat-buttons {
    gap: 0.5rem !important;
  }
  .category-btn {
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
  }
}

/* Dark mode styles for category buttons and tags */
[data-theme="dark"] .category-btn {
  color: var(--text-primary);
  background-color: transparent;
  border-color: var(--border-color);
}

[data-theme="dark"] .category-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  border-color: var(--accent-color);
}

[data-theme="dark"] .category-btn.active {
  color: var(--text-primary);
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}

[data-theme="dark"] .badge-outline-uva {
  color: var(--text-primary);
  background-color: transparent;
  border-color: var(--border-color);
}

[data-theme="dark"] .badge-outline-uva:hover {
  color: var(--text-primary);
  background-color: var(--accent-color);
  border-color: var(--accent-color);
}
</style>

</div><!-- /.container -->
