---
title: Branching of Fibonacci Words
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/yourusername/homepage/blob/master/_simulations/misc/2025-03-12-YF-branching.md'
    txt: 'This simulation is interactive, written in JavaScript, see the source code of this page at the link'
---
<script src="{{site.url}}/js/d3.v7.min.js"></script>

<style>
  .chart-container {
    height: 500px;
    width: 100%;
    border: 1px solid #ccc;
    margin-top: 20px;
    position: relative;
  }
  .word-info {
    margin-top: 20px;
    font-family: monospace;
  }
  .word-list {
    max-height: 200px;
    overflow-y: auto;
    margin-top: 10px;
    font-family: monospace;
  }
  .word-item {
    padding: 5px;
    cursor: pointer;
    margin: 2px 0;
    background-color: #f8f9fa;
    border-radius: 3px;
  }
  .word-item:hover {
    background-color: #e9ecef;
  }
  .current-word {
    font-size: 24px;
    font-weight: bold;
  }
  .dimension-factors {
    margin-top: 10px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    font-size: 14px;
  }
  .zoom-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 100;
    background-color: rgba(255, 255, 255, 0.7);
    padding: 5px;
    border-radius: 5px;
    border: 1px solid #ddd;
  }
  .zoom-btn {
    width: 30px;
    height: 30px;
    margin: 2px;
    font-size: 16px;
    line-height: 1;
    border-radius: 3px;
    border: 1px solid #ccc;
    background-color: white;
    cursor: pointer;
  }
  .zoom-btn:hover {
    background-color: #f0f0f0;
  }
  .zoom-reset {
    width: 62px;
    height: 30px;
    margin: 2px;
    font-size: 12px;
    border-radius: 3px;
    border: 1px solid #ccc;
    background-color: white;
    cursor: pointer;
  }
  .node rect {
    stroke: #fff;
    stroke-width: 1.5px;
  }
  .node text {
    pointer-events: none;
  }
</style>

<div class="container mt-5">
  <div class="row">
    <div class="col-md-12">
        <h2>Young-Fibonacci Lattice Explorer</h2>
        <p>
          The Young-Fibonacci lattice $\text{YF}$ is the union of all sets $\text{YF}_n$, $n \geq 0$, where $\text{YF}_n$ is the set of all Fibonacci words (binary words whose digits lie in $\{1,2\}$) of weight $n$.
        </p>
        <p>
          In this lattice, a Fibonacci word $w$ in $\text{YF}_n$ is connected to $w'$ in $\text{YF}_{n+1}$ if $w'$ can be obtained from $w$ by one of the following operations:
          <ul>
            <li><b>F1:</b> $w' = 1w$ (prepend 1 to $w$)</li>
            <li><b>F2:</b> $w' = 2^{k+1}v$ if $w = 2^k1v$ for some $k \geq 0$ and an arbitrary Fibonacci word $v$</li>
            <li><b>F3:</b> $w' = 2^{\ell}12^{k-\ell}v$ if $w = 2^kv$ for some $k \geq 1$ and an arbitrary Fibonacci word $v$, where $\ell = 1,...,k$</li>
          </ul>
        </p>
        <p>
          <b>Dimension formula:</b> For $w \in \text{YF}$, the dimension $\dim(w)$ counts the number of saturated chains from $\emptyset$ to $w$ and obeys the recursion:
          <ul>
            <li>$\dim(\emptyset) = 1$</li>
            <li>$\dim(1v) = \dim(v)$ for a Fibonacci word $v$</li>
            <li>$\dim(2v) = (\text{weight}(v) + 1) \times \dim(v)$ for a Fibonacci word $v$</li>
          </ul>
          where $\text{weight}(v)$ is the sum of digits in $v$.
        </p>
        <p>
          For example, $\dim(22121) = 70$ calculated as: $7 \times 5 \times 2 = 70$, where:
          <ul>
            <li>First 2: tail is "$2121$" with weight 6, so factor is $6+1 = 7$</li>
            <li>Second 2: tail is "$121$" with weight 4, so factor is $4+1 = 5$</li>
            <li>Third 2: tail is "$1$" with weight 1, so factor is $1+1 = 2$</li>
          </ul>
        </p>
      </div>
    </div>

  <div class="row mt-4">
    <div class="col-md-4">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="card-title mb-0">Input</h5>
        </div>
        <div class="card-body">
          <form id="fibonacci-form">
            <div class="mb-3">
              <label for="fibonacci-word" class="form-label">Fibonacci Word:</label>
              <input type="text" class="form-control" id="fibonacci-word" pattern="[12]*" value="121" required>
              <div class="form-text">Enter a word consisting only of 1's and 2's</div>
            </div>
            <button type="submit" class="btn btn-primary w-100">Explore</button>
          </form>

          <div class="mt-3">
            <label for="weight-select" class="form-label">Or select by weight:</label>
            <select class="form-select" id="weight-select">
              <option value="">Select a weight...</option>
              <option value="0">Weight 0 (Empty Word)</option>
              <option value="1">Weight 1</option>
              <option value="2">Weight 2</option>
              <option value="3">Weight 3</option>
              <option value="4">Weight 4</option>
              <option value="5">Weight 5</option>
              <option value="6">Weight 6</option>
              <option value="7">Weight 7</option>
              <option value="8">Weight 8</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header bg-info text-white">
          <h5 class="card-title mb-0">Current Word</h5>
        </div>
        <div class="card-body">
          <div class="word-info">
            <p><strong>Word:</strong> <span id="current-word" class="current-word">121</span></p>
            <p><strong>Weight:</strong> <span id="current-weight">4</span></p>
            <p><strong>Dimension:</strong> <span id="word-dimension">-</span></p>
            <div id="dimension-factors" class="dimension-factors" style="display: none;"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-md-8">
      <div class="card">
        <div class="card-header bg-success text-white">
          <h5 class="card-title mb-0">Young-Fibonacci Lattice</h5>
        </div>
        <div class="card-body">
          <div class="chart-container" id="chart-container">
            <div class="zoom-controls">
              <button class="zoom-btn" id="zoom-in">+</button>
              <button class="zoom-btn" id="zoom-out">-</button>
              <button class="zoom-reset" id="zoom-reset">Reset</button>
            </div>
          </div>
        </div>
      </div>

      <div class="row mt-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="card-title mb-0">Words in Level n+1 (Above)</h5>
            </div>
            <div class="card-body">
              <div class="word-list" id="words-above"></div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="card-title mb-0">Words in Level n-1 (Below)</h5>
            </div>
            <div class="card-body">
              <div class="word-list" id="words-below"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
  // Function to generate all Fibonacci words of weight n
  function generateFibonacciWords(n) {
    if (n === 0) return [''];  // Empty word for weight 0
    if (n === 1) return ['1'];
    if (n === 2) return ['2', '11'];

    let words = [];

    // Add words starting with 1
    generateFibonacciWords(n - 1).forEach(word => {
      words.push('1' + word);
    });

    // Add words starting with 2
    generateFibonacciWords(n - 2).forEach(word => {
      words.push('2' + word);
    });

    return words;
  }

  // Calculate the weight of a Fibonacci word
  function calculateWeight(word) {
    return word.split('').reduce((sum, digit) => sum + parseInt(digit || 0), 0);
  }

  // Function to calculate the dimension of a Fibonacci word
  function calculateDimension(word) {
    // Recursive implementation using weight-based formula
    if (word === '') {
      return 1; // dim(∅) = 1
    }

    // If word starts with 1: dim(1v) = dim(v)
    if (word.startsWith('1')) {
      return calculateDimension(word.substring(1));
    }

    // If word starts with 2: dim(2v) = (weight(v) + 1) * dim(v)
    if (word.startsWith('2')) {
      const v = word.substring(1);
      const vWeight = calculateWeight(v);
      return (vWeight + 1) * calculateDimension(v);
    }

    // Should not reach here for valid Fibonacci words
    return 0;
  }

  // Get dimension calculation factors for display
  function getDimensionFactors(word) {
    if (word === '' || !word.includes('2')) {
      return null; // No factors to display for empty word or words without 2
    }

    const factors = [];

    let currentWord = word;
    let position = 1;

    while (currentWord.startsWith('2')) {
      const v = currentWord.substring(1);
      const vWeight = calculateWeight(v);
      const factor = vWeight + 1;

      factors.push({
        position: position,
        tail: v || 'Ø',
        weight: vWeight,
        factor: factor
      });

      currentWord = v;
      position++;
    }

    return factors;
  }

  // Alternative implementation using the product formula from equation (2.1)
  function calculateDimensionProduct(word) {
    if (word === '') {
      return 1; // Empty word has dimension 1
    }

    // Find all positions of '2' in the word (0-indexed)
    const positions = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] === '2') {
        positions.push(i);
      }
    }

    // If no 2's, dimension is 1
    if (positions.length === 0) {
      return 1;
    }

    // Calculate product of d_i values
    let product = 1;
    for (const i of positions) {
      // For position i, split word as w = u2v
      const v = word.substring(i + 1);
      const di = calculateWeight(v) + 1;
      product *= di;
    }

    return product;
  }

  // Find all Fibonacci words that are above a given word (words in YF_{n+1} connected to w in YF_n)
  function findWordsAbove(word) {
    const above = [];

    // Rule F1: w' = 1w - prepend 1 to the word
    above.push('1' + word);

    // Rule F2: w' = 2^(k+1)v if w = 2^k1v
    // Find the pattern of leading 2's followed by a 1
    let k = 0;
    while (k < word.length && word[k] === '2') {
      k++;
    }

    // If we found a pattern 2^k1v
    if (k < word.length && word[k] === '1') {
      const v = word.substring(k + 1);
      // Create w' = 2^(k+1)v
      above.push('2'.repeat(k + 1) + v);
    }

    // Rule F3: w' = 2^ℓ12^(k-ℓ)v if w = 2^kv for k ≥ 1
    // Count leading 2's
    k = 0;
    while (k < word.length && word[k] === '2') {
      k++;
    }

    // If we have at least one leading 2
    if (k >= 1) {
      const v = word.substring(k);
      // Generate k different words by inserting 1 after ℓ 2's
      for (let l = 1; l <= k; l++) {
        above.push('2'.repeat(l) + '1' + '2'.repeat(k - l) + v);
      }
    }

    return above;
  }

  // Find all Fibonacci words that are below a given word (words in YF_n connected to w' in YF_{n+1})
  function findWordsBelow(word) {
    const below = [];

    // Reverse of Rule F1: If w' starts with 1, remove it
    if (word.startsWith('1')) {
      below.push(word.substring(1));
    }

    // Reverse of Rule F2:
    // Special case for words like "2212" connecting to "1212"
    // If the word starts with a '2', try replacing it with '1'
    if (word.startsWith('2')) {
      below.push('1' + word.substring(1));

      // Also handle the general case
      let k = 0;
      while (k < word.length && word[k] === '2') {
        k++;
      }

      const v = word.substring(k);

      // If k>1, we also add 2^(k-1)1v
      if (k > 1) {
        below.push('2'.repeat(k-1) + '1' + v);
      }
    }

    // Reverse of Rule F3: Search for pattern 2^ℓ12^(k-ℓ)v
    for (let i = 0; i < word.length; i++) {
      if (word[i] === '1') {
        // Count 2's before the 1
        let l = 0;
        for (let j = 0; j < i; j++) {
          if (word[j] === '2') l++;
        }

        // Count 2's after the 1 before any non-2
        let m = 0;
        for (let j = i + 1; j < word.length && word[j] === '2'; j++) {
          m++;
        }

        // If we found a pattern 2^ℓ12^m v with at least one 2
        if (l + m > 0) {
          const v = word.substring(i + 1 + m);
          // Create w = 2^(ℓ+m)v
          below.push('2'.repeat(l + m) + v);
        }
      }
    }

    return [...new Set(below)]; // Remove duplicates
  }

  // Function to display the Fibonacci words in the given container
  function displayWords(words, containerId, currentWord) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (words.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No words found</div>';
      return;
    }

    words.forEach(word => {
      const wordItem = document.createElement('div');
      wordItem.className = 'word-item';
      wordItem.textContent = word === '' ? 'Ø (Empty Word)' : word;
      wordItem.addEventListener('click', () => {
        document.getElementById('fibonacci-word').value = word;
        document.getElementById('fibonacci-form').dispatchEvent(new Event('submit'));
      });
      container.appendChild(wordItem);
    });
  }

  // Function to display dimension calculation details
  function displayDimensionFactors(word) {
    const factorsContainer = document.getElementById('dimension-factors');
    const factors = getDimensionFactors(word);

    if (!factors || factors.length === 0) {
      factorsContainer.style.display = 'none';
      return;
    }

    let html = '<p><strong>Dimension calculation:</strong></p>';

    if (factors.length === 1) {
      html += `<p>dim(${word}) = (weight("${factors[0].tail}") + 1) = ${factors[0].factor}</p>`;
    } else {
      let formula = `dim(${word}) = `;
      let calculation = '';

      factors.forEach((factor, index) => {
        if (index > 0) {
          formula += ' × ';
          calculation += ' × ';
        }
        formula += `(weight("${factor.tail}") + 1)`;
        calculation += `(${factor.weight} + 1)`;
      });

      formula += ` = ${calculation} = ${calculateDimension(word)}`;
      html += `<p>${formula}</p>`;
    }

    factorsContainer.innerHTML = html;
    factorsContainer.style.display = 'block';
  }

  // Function to create the visualization
  function createVisualization(currentWord, wordsAbove, wordsBelow) {
    const container = document.getElementById('chart-container');
    container.querySelector('svg')?.remove(); // Remove existing SVG if any

    // Set up dimensions
    const margin = {top: 20, right: 30, bottom: 20, left: 30};
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select('#chart-container')
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .call(d3.zoom().on("zoom", function(event) {
        g.attr("transform", event.transform);
      }))
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add a background rect for zoom panning area
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent');

    // Create a group for all the elements to be zoomed together
    const g = svg.append('g');

    // Create data structure for visualization
    const nodes = [];
    const links = [];

    // Add the current word
    nodes.push({
      id: currentWord,
      label: currentWord === '' ? 'Ø' : currentWord,
      level: 1,  // Middle level
      type: 'current'
    });

    // Add words above
    wordsAbove.forEach((word, index) => {
      nodes.push({
        id: word,
        label: word,
        level: 0,  // Top level
        type: 'above'
      });

      links.push({
        source: word,
        target: currentWord,
        type: 'above'
      });
    });

    // Add words below
    wordsBelow.forEach((word, index) => {
      nodes.push({
        id: word,
        label: word === '' ? 'Ø' : word,
        level: 2,  // Bottom level
        type: 'below'
      });

      links.push({
        source: currentWord,
        target: word,
        type: 'below'
      });
    });

    // Calculate dimensions for the rectangles
    function calculateRectDimensions(label) {
      const baseWidth = 20 + label.length * 10; // Width based on text length
      const baseHeight = 40; // Fixed height
      return { width: baseWidth, height: baseHeight };
    }

    // Set up force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150)) // Increased distance
      .force('charge', d3.forceManyBody().strength(-500)) // Stronger repulsion
      .force('y', d3.forceY(d => {
        if (d.level === 0) return height * 0.25;
        if (d.level === 1) return height * 0.5;
        return height * 0.75;
      }).strength(1))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('collision', d3.forceCollide().radius(d => {
        const dims = calculateRectDimensions(d.label);
        return Math.sqrt(dims.width * dims.width + dims.height * dims.height) / 2 + 5;
      }));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('click', (event, d) => {
        document.getElementById('fibonacci-word').value = d.id;
        document.getElementById('fibonacci-form').dispatchEvent(new Event('submit'));
      });

    // Add rectangles to nodes instead of circles
    node.append('rect')
      .attr('width', d => calculateRectDimensions(d.label).width)
      .attr('height', d => calculateRectDimensions(d.label).height)
      .attr('x', d => -calculateRectDimensions(d.label).width / 2)
      .attr('y', d => -calculateRectDimensions(d.label).height / 2)
      .attr('rx', 5) // rounded corners
      .attr('ry', 5)
      .attr('fill', d => {
        if (d.type === 'current') return '#fd7e14';
        if (d.type === 'above') return '#20c997';
        return '#6f42c1';
      });

    // Add labels to nodes
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'white')
      .attr('font-size', d => Math.min(16, 22 - Math.min(8, d.label.length))) // Adjust font size for longer words
      .text(d => d.label);

    // Add arrowhead marker
    g.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 35) // Increased to account for larger rectangles
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999');

    // Update simulation on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Set up zoom controls
    const zoom = d3.zoom()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    d3.select('#chart-container svg').call(zoom);

    // Add zoom control event handlers
    document.getElementById('zoom-in').addEventListener('click', () => {
      d3.select('#chart-container svg').transition().call(zoom.scaleBy, 1.5);
    });

    document.getElementById('zoom-out').addEventListener('click', () => {
      d3.select('#chart-container svg').transition().call(zoom.scaleBy, 0.75);
    });

    document.getElementById('zoom-reset').addEventListener('click', () => {
      d3.select('#chart-container svg').transition().call(zoom.transform, d3.zoomIdentity);
    });
  }

  // Function to update the display based on the current word
  function updateDisplay(word) {
    // Display the current word and its weight
    document.getElementById('current-word').textContent = word === '' ? 'Ø (Empty Word)' : word;
    document.getElementById('current-weight').textContent = calculateWeight(word);

    // Calculate and display the dimension
    const dim = calculateDimension(word);
    document.getElementById('word-dimension').textContent = dim;

    // Show dimension calculation factors
    displayDimensionFactors(word);

    // Find words above and below
    const wordsAbove = findWordsAbove(word);
    const wordsBelow = findWordsBelow(word);

    // Display the words
    displayWords(wordsAbove, 'words-above', word);
    displayWords(wordsBelow, 'words-below', word);

    // Create visualization
    createVisualization(word, wordsAbove, wordsBelow);
  }

  // Form submission handler
  document.getElementById('fibonacci-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const fibonacciWord = document.getElementById('fibonacci-word').value;

    // Validate input
    if (!/^[12]*$/.test(fibonacciWord) && fibonacciWord !== '') {
      alert('Please enter a valid Fibonacci word consisting only of 1\'s and 2\'s, or leave empty for the empty word.');
      return;
    }

    updateDisplay(fibonacciWord);
  });

  // Weight select handler
  document.getElementById('weight-select').addEventListener('change', function() {
    const weight = parseInt(this.value);

    if (isNaN(weight)) {
      return;
    }

    // Generate words of the selected weight
    const words = generateFibonacciWords(weight);

    // If there's only one word of this weight, select it
    if (words.length === 1) {
      document.getElementById('fibonacci-word').value = words[0];
      document.getElementById('fibonacci-form').dispatchEvent(new Event('submit'));
      return;
    }

    // Otherwise, show words in a dropdown
    let wordsList = document.createElement('div');
    wordsList.className = 'list-group mt-3';
    const containerId = 'weight-words-list';
    wordsList.id = containerId;

    words.forEach(word => {
      const wordItem = document.createElement('button');
      wordItem.className = 'list-group-item list-group-item-action';
      wordItem.textContent = word === '' ? 'Ø (Empty Word)' : word;
      wordItem.addEventListener('click', () => {
        document.getElementById('fibonacci-word').value = word;
        document.getElementById('fibonacci-form').dispatchEvent(new Event('submit'));
        document.getElementById(containerId).remove();
      });
      wordsList.appendChild(wordItem);
    });

    // Remove existing list if any
    const existingList = document.getElementById(containerId);
    if (existingList) {
      existingList.remove();
    }

    // Add the new list
    this.parentNode.appendChild(wordsList);
  });

  // Initialize with default value
  window.onload = function() {
    document.getElementById('fibonacci-form').dispatchEvent(new Event('submit'));
  };

  // Handle window resize
  window.addEventListener('resize', function() {
    const form = document.getElementById('fibonacci-form');
    if (form) {
      form.dispatchEvent(new Event('submit'));
    }
  });
</script>
