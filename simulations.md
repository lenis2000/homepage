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
<h3 class="mb-3">Visualizations, data, source code</h3>

<figure class="handdrawn-hex-mobile d-md-none">
  <img src="{{site.storage_url}}/img/lozenge-tiling-handdrawn.jpg"
       alt="Hand-colored double dimer configuration on a hexagonal region"
       class="handdrawn-hex-img">
  <figcaption>A hand-colored double dimer configuration</figcaption>
</figure>

<div class="sim-cards-row d-none d-md-flex">
  <div class="sim-cards-left">
    {%include sims.html%}
  </div>
  <figure class="handdrawn-hex-desktop">
    <img src="{{site.storage_url}}/img/lozenge-tiling-handdrawn.jpg"
         alt="Hand-colored double dimer configuration on a hexagonal region"
         class="handdrawn-hex-img">
    <figcaption>A hand-colored double dimer configuration</figcaption>
  </figure>
</div>
<div class="d-md-none">
  {%include sims.html%}
</div>


<!-- Search bar + category buttons -->
<div class="sim-filter-bar">
<div id="sim-search-group" class="input-group mb-2">
  <input type="text"
         id="sim-search-input"
         class="form-control"
         placeholder="Type to search simulations…"
         aria-label="Search simulations">
  <button class="btn btn-outline-secondary" id="sim-search-clear" type="button">Clear</button>
</div>
<div id="sim-status" class="sr-only" role="status" aria-live="polite"></div>

<!-- Category buttons -->
<div id="sim-cat-buttons" class="d-flex flex-wrap gap-2 mb-3">
  <button type="button"
          class="btn btn-sm category-btn active text-nowrap"
          data-category="all">
    All
  </button>
  {% assign categories = "
        domino-tilings:Dominos,
        random-matrices:Random Matrices,
        permutations:Permutations,
        lozenge-tilings:Lozenges,
        vertex-models:Vertex Models,
        TASEPs:TASEPs,
        misc:Misc" | split: "," %}
  {% for cat in categories %}
    {% assign p = cat | split: ":" %}
    {% assign slug = p[0] | strip %}
    {% assign name = p[1] | strip %}
    <button type="button"
            class="btn btn-sm category-btn text-nowrap"
            data-category="{{ slug }}">
      {{ name }}
    </button>
  {% endfor %}
</div>
</div><!-- /.sim-filter-bar -->

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

/* Cards + image row */
.sim-cards-row {
  align-items: stretch;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.sim-cards-left {
  flex: 3 1 0;
}
.sim-cards-left .featured-simulations {
  display: block !important;
  margin: 0 !important;
}

/* Shared image styles */
.handdrawn-hex-img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 4px solid #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.13);
}

[data-theme="dark"] .handdrawn-hex-img {
  border-color: transparent;
  box-shadow: none;
}

/* Desktop version: sits beside cards */
.handdrawn-hex-desktop {
  flex: 1 1 0;
  text-align: center;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.handdrawn-hex-desktop .handdrawn-hex-img {
  width: 100%;
}

.handdrawn-hex-desktop figcaption,
.handdrawn-hex-mobile figcaption {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: #666;
  font-style: italic;
}

[data-theme="dark"] .handdrawn-hex-desktop figcaption,
[data-theme="dark"] .handdrawn-hex-mobile figcaption {
  color: #999;
}

/* Mobile version: full width, centered */
.handdrawn-hex-mobile {
  text-align: center;
  margin: 0.5rem auto 1rem;
}

@media (max-width: 991px) {
  /* Show featured cards on simulations page */
  .container > .featured-simulations {
    display: block !important;
  }
}
</style>

</div><!-- /.container -->
