---
title: Simulations
layout: default
permalink: /simulations/
nav_id: Simulations
nav_weight: 19
---

<!-- Container for the entire page content -->
<div class="container mb-5">

<h1 class="my-4">Simulations and other computational tools</h1>
<h5 class="mb-3">Data, source code, visualizations</h5>

<hr>

{% include dear_colleagues.md %}

<hr/>

{%include sims.html%}



<hr>
  <!-- Show the 10 most recent simulations as a plain list with category tags -->
  <h2 class="mb-3">Recent Simulations</h2>
  <ul class="list-group list-group-flush">
    {% assign all_sims = site.simulations | sort: "date" | reverse %}
    {% for sim in all_sims limit: 12 %}
      <!-- Skip if this is a "category index" post (like the .md for the category) -->
      {% if sim.head_page != true %}
      <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <a href="{{ sim.url }}" class="fw-bold">{{ sim.title }}</a>
          <span class="text-muted ms-2">{{ sim.date | date: "%Y-%m-%d" }}</span>
        </div>
        {% if sim.model %}
          <a href="{{ site.url }}/simulations/model/{{ sim.model }}/" class="btn btn-sm btn-outline-primary">
            {% assign cat_found = false %}
            {% for cat in categories %}
              {% assign parts = cat | split: ":" %}
              {% assign cat_slug = parts[0] | strip %}
              {% assign cat_name = parts[1] | strip %}
              {% if cat_slug == sim.model %}
                {{ cat_name }}
                {% assign cat_found = true %}
              {% endif %}
            {% endfor %}
            {% if cat_found == false %}{{ sim.model }}{% endif %}
          </a>
        {% endif %}
      </li>
      {% endif %}
    {% endfor %}
  </ul>

  <hr class="my-5"/>

  <!-- Categories section -->
  <h2 class="mb-4">Categories</h2>

  <!--
    Define an array of (slug, display name) for each category you want.
    The 'model' in each simulation’s front matter must match these slugs.
  -->
  {% assign categories =
    "
      domino-tilings:Domino Tilings,
      random-matrices:Random Matrices,
      permutations:Random Permutations,
      lozenge-tilings:Lozenge Tilings,
      TASEPs:TASEP-like Systems,
      misc:Miscellaneous Tools,
    " | split: "," %}
    <!-- Loop over each category -->
    {% for cat in categories %}
      {% assign parts = cat | split: ":" %}
      {% assign cat_slug = parts[0] | strip %}
      {% assign cat_name = parts[1] | strip %}

      <h3 id="{{ cat_slug }}" class="mt-4">{{ cat_name }}</h3>

      <!-- Filter site.simulations by this 'model' -->
      {% assign cat_sims = site.simulations | where: "model", cat_slug | sort: "date" | reverse %}
      {% assign cat_size = cat_sims | size %}

      <!-- Show up to 6 most recent in this category. -->
      {% if cat_size == 0 %}

      {% else %}
        <div class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4">
        {% for sim in cat_sims limit:6 %}
          <div class="col">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
              <h5 class="card-title mb-2 fw-bold" style="text-transform: none;">
                <a href="{{ sim.url }}">{{ sim.title | truncate: 50 }}</a>
              </h5>
                <p class="card-text text-muted">
                  {{ sim.date | date: "%Y-%m-%d" }}
                </p>
              </div>
            </div>
          </div>
        {% endfor %}
        </div>
        <!-- If there are more than 6, add a "See more…" button linking to the category page -->
        {% if cat_size > 6 %}
          <div class="mt-3">
            <a class="btn btn-outline-primary" href="{{ site.url }}/simulations/model/{{ cat_slug }}/">
              See more {{ cat_name }}
            </a>
          </div>
        {% endif %}
      {% endif %}

      <hr class="my-4"/>
    {% endfor %}

  <!-- Additional helpful links at the bottom -->
  <h5 class="mt-5 mb-3">Other links</h5>
  <ul>
    <li><a href="{{site.url}}/research/gallery/">Older simulations</a> (pictures of lozenge tilings and stochastic vertex models)</li>
    <li>GitHub repo with simulation code:
      <a href="https://github.com/lenis2000/simulations/">
        https://github.com/lenis2000/simulations/
      </a>
    </li>
  </ul>

</div><!-- /.container -->
