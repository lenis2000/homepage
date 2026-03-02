document.addEventListener('DOMContentLoaded', function() {
    var searchInput = document.getElementById('arxiv-search-input');
    var searchClear = document.getElementById('arxiv-search-clear');
    var catButtons = document.getElementById('arxiv-cat-buttons');
    var yearButtons = document.getElementById('arxiv-year-buttons');
    var statusRegion = document.getElementById('arxiv-status');
    var noResults = document.getElementById('arxiv-no-results');
    var listEl = document.querySelector('.arxiv-list');
    var paperItems = document.querySelectorAll('.arxiv-list li[data-id]');
    var monthHeaders = document.querySelectorAll('.arxiv-list li.arxiv-month-header');

    var activeCategory = 'all';
    var activeYear = 'all';
    var statusTimeout;

    // Search index
    var searchIndex = null;
    var filteredIds = null; // null = show all, Set = show only these IDs
    var BATCH_SIZE = 30;
    var visibleCount = 0;
    var totalMatches = 0;

    // Load prebuilt search index
    fetch('/assets/data/arxiv-index.json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            searchIndex = data;
            // Build category and year buttons from index
            initFromIndex();
        })
        .catch(function() {
            // Fallback: build from DOM
            initFromDOM();
        });

    function initFromIndex() {
        var cats = new Set();
        var years = new Set();
        searchIndex.forEach(function(entry) {
            entry.c.split(' ').forEach(function(c) { if (c) cats.add(c); });
            if (entry.y) years.add(entry.y);
        });
        buildCatButtons(cats);
        buildYearButtons(years);
        applyFilter();
    }

    function initFromDOM() {
        var cats = new Set();
        var years = new Set();
        paperItems.forEach(function(item) {
            (item.dataset.categories || '').split(' ').forEach(function(c) { if (c) cats.add(c); });
            if (item.dataset.year) years.add(item.dataset.year);
        });
        buildCatButtons(cats);
        buildYearButtons(years);
        applyFilter();
    }

    function buildCatButtons(cats) {
        var html = '<button class="btn btn-sm category-btn active" data-category="all" aria-pressed="true">All</button>';
        Array.from(cats).sort().forEach(function(cat) {
            html += '<button class="btn btn-sm category-btn" data-category="' + cat + '" aria-pressed="false">' + cat + '</button>';
        });
        catButtons.innerHTML = html;
    }

    function buildYearButtons(years) {
        var html = '<button class="btn btn-sm year-btn active" data-year="all" aria-pressed="true">All years</button>';
        Array.from(years).sort().reverse().forEach(function(yr) {
            html += '<button class="btn btn-sm year-btn" data-year="' + yr + '" aria-pressed="false">' + yr + '</button>';
        });
        yearButtons.innerHTML = html;
    }

    // Filter using the prebuilt index (fast)
    function applyFilter() {
        var term = searchInput.value;
        var termLower = term.toLowerCase();
        var isCase = term !== termLower;

        if (searchIndex) {
            // Index-based filtering
            var matchIds = [];
            searchIndex.forEach(function(entry) {
                var matchesCat = activeCategory === 'all' || entry.c.indexOf(activeCategory) !== -1;
                var matchesYear = activeYear === 'all' || entry.y === activeYear;
                if (!matchesCat || !matchesYear) return;

                if (term) {
                    var haystack = entry.id + ' ' + entry.t + ' ' + entry.a;
                    var matched = isCase ? haystack.indexOf(term) !== -1 : haystack.toLowerCase().indexOf(termLower) !== -1;
                    if (!matched) return;
                }

                matchIds.push(entry.id);
            });

            filteredIds = new Set(matchIds);
            totalMatches = matchIds.length;
        } else {
            // DOM fallback
            filteredIds = null;
            totalMatches = 0;
            paperItems.forEach(function(item) {
                var cats = item.dataset.categories || '';
                var year = item.dataset.year || '';
                var search = item.dataset.search || '';

                var matchesCat = activeCategory === 'all' || cats.indexOf(activeCategory) !== -1;
                var matchesYear = activeYear === 'all' || year === activeYear;
                var matchesSearch = !term || (isCase ? search.indexOf(term) !== -1 : search.toLowerCase().indexOf(termLower) !== -1);

                if (matchesCat && matchesYear && matchesSearch) {
                    totalMatches++;
                }
            });
        }

        // Reset visible count and render first batch
        visibleCount = 0;
        renderBatch();

        // No results
        if (totalMatches === 0) {
            noResults.removeAttribute('hidden');
        } else {
            noResults.setAttribute('hidden', '');
        }

        // Screen reader announcement
        if (statusRegion) {
            clearTimeout(statusTimeout);
            statusTimeout = setTimeout(function() {
                if (totalMatches === 0) {
                    statusRegion.textContent = 'No results found.';
                } else if (term || activeCategory !== 'all' || activeYear !== 'all') {
                    statusRegion.textContent = totalMatches + ' result' + (totalMatches !== 1 ? 's' : '') + ' found.';
                } else {
                    statusRegion.textContent = '';
                }
            }, 400);
        }
    }

    // Render next batch of items (infinite scroll)
    function renderBatch() {
        var batchTarget = visibleCount + BATCH_SIZE;
        var visibleMonths = new Set();

        var matchIndex = 0;
        for (var i = 0; i < paperItems.length; i++) {
            var item = paperItems[i];
            var isMatch;

            if (filteredIds !== null) {
                isMatch = filteredIds.has(item.dataset.id);
            } else {
                var cats = item.dataset.categories || '';
                var year = item.dataset.year || '';
                var search = item.dataset.search || '';
                var term = searchInput.value;
                var termLower = term.toLowerCase();
                var isCase = term !== termLower;

                var matchesCat = activeCategory === 'all' || cats.indexOf(activeCategory) !== -1;
                var matchesYear = activeYear === 'all' || year === activeYear;
                var matchesSearch = !term || (isCase ? search.indexOf(term) !== -1 : search.toLowerCase().indexOf(termLower) !== -1);
                isMatch = matchesCat && matchesYear && matchesSearch;
            }

            if (isMatch) {
                matchIndex++;
                if (matchIndex <= batchTarget) {
                    item.removeAttribute('hidden');
                    visibleMonths.add(item.dataset.month);
                } else {
                    item.setAttribute('hidden', '');
                }
            } else {
                item.setAttribute('hidden', '');
            }
        }

        // Show/hide month headers based on visible papers
        for (var j = 0; j < monthHeaders.length; j++) {
            if (visibleMonths.has(monthHeaders[j].dataset.month)) {
                monthHeaders[j].removeAttribute('hidden');
            } else {
                monthHeaders[j].setAttribute('hidden', '');
            }
        }

        visibleCount = Math.min(batchTarget, totalMatches);
    }

    // Infinite scroll observer
    var sentinel = document.createElement('div');
    sentinel.id = 'arxiv-scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    listEl.parentNode.insertBefore(sentinel, listEl.nextSibling);

    var observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && visibleCount < totalMatches) {
            renderBatch();
        }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);

    // Debounced search input
    var searchDebounce;
    function onSearchInput() {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(applyFilter, 150);
    }

    function clearSearch() {
        searchInput.value = '';
        activeCategory = 'all';
        activeYear = 'all';
        updateButtons();
        applyFilter();
        searchInput.focus();
        if (window.location.hash) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
        document.querySelectorAll('.arxiv-list details[open]').forEach(function(d) {
            d.open = false;
        });
    }

    function updateButtons() {
        catButtons.querySelectorAll('.category-btn').forEach(function(btn) {
            var isActive = btn.dataset.category === activeCategory;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        yearButtons.querySelectorAll('.year-btn').forEach(function(btn) {
            var isActive = btn.dataset.year === activeYear;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', onSearchInput);
    }
    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchInput) {
            if (searchInput.value || activeCategory !== 'all' || activeYear !== 'all') {
                clearSearch();
            } else {
                searchInput.focus();
            }
        }
    });

    catButtons.addEventListener('click', function(e) {
        if (e.target.classList.contains('category-btn')) {
            activeCategory = e.target.dataset.category;
            updateButtons();
            applyFilter();
        }
    });

    yearButtons.addEventListener('click', function(e) {
        if (e.target.classList.contains('year-btn')) {
            activeYear = e.target.dataset.year;
            updateButtons();
            applyFilter();
        }
    });

    // URL hash deep-linking
    if (window.location.hash) {
        var hash = window.location.hash.substring(1);
        var catBtn = catButtons.querySelector('[data-category="' + hash + '"]');
        if (catBtn) {
            activeCategory = hash;
        } else {
            var yearBtn = yearButtons.querySelector('[data-year="' + hash + '"]');
            if (yearBtn) {
                activeYear = hash;
            }
        }
        updateButtons();
    }
});
