document.addEventListener('DOMContentLoaded', function() {
    var searchInput = document.getElementById('arxiv-search-input');
    var searchClear = document.getElementById('arxiv-search-clear');
    var catButtons = document.getElementById('arxiv-cat-buttons');
    var yearButtons = document.getElementById('arxiv-year-buttons');
    var statusRegion = document.getElementById('arxiv-status');
    var noResults = document.getElementById('arxiv-no-results');
    var listEl = document.querySelector('.arxiv-list');
    var template = document.getElementById('arxiv-data');

    var activeCategory = 'all';
    var activeYear = 'all';
    var statusTimeout;
    var searchIndex = null;
    var pendingHash = null;

    var BATCH_SIZE = 30;
    var INITIAL_BATCH = 100;

    // --- Parse items from <template> (not in main DOM) ---
    var paperMap = {};      // arxiv-id -> <li> element
    var monthMap = {};      // "YYYY-MM" -> <li> header element
    var orderedPapers = []; // [{id, month, year, categories, search}]
    var idToIndex = {};     // arxiv-id -> index in orderedPapers

    var tplPapers = template.content.querySelectorAll('li[data-id]');
    var tplMonths = template.content.querySelectorAll('li.arxiv-month-header');

    for (var i = 0; i < tplPapers.length; i++) {
        var el = tplPapers[i];
        var id = el.dataset.id;
        paperMap[id] = el;
        idToIndex[id] = i;
        orderedPapers.push({
            id: id,
            month: el.dataset.month,
            year: el.dataset.year,
            categories: el.dataset.categories || '',
            search: el.dataset.search || ''
        });
    }
    for (var j = 0; j < tplMonths.length; j++) {
        var hdr = tplMonths[j];
        monthMap[hdr.dataset.month] = hdr;
    }

    // Display state
    var displayList = [];   // indices into orderedPapers for current filter
    var renderedCount = 0;
    var totalMatches = 0;

    // Show all papers initially
    resetDisplayList();
    renderBatch(INITIAL_BATCH);

    // Load prebuilt search index in background
    fetch('/assets/data/arxiv-index.json')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            searchIndex = data;
            initButtons();
        })
        .catch(function() {
            initButtons();
        });

    // --- Display list helpers ---

    function resetDisplayList() {
        displayList = [];
        for (var k = 0; k < orderedPapers.length; k++) displayList.push(k);
        totalMatches = displayList.length;
    }

    function initButtons() {
        var cats = new Set();
        var years = new Set();
        var source = searchIndex || orderedPapers;
        source.forEach(function(entry) {
            var catStr = searchIndex ? entry.c : entry.categories;
            var year = searchIndex ? entry.y : entry.year;
            catStr.split(' ').forEach(function(c) { if (c) cats.add(c); });
            if (year) years.add(year);
        });
        buildCatButtons(cats);
        buildYearButtons(years);
        applyPendingHash();
        if (activeCategory !== 'all' || activeYear !== 'all' || searchInput.value) {
            applyFilter();
        }
    }

    function applyPendingHash() {
        if (!pendingHash) return;
        var catBtn = catButtons.querySelector('[data-category="' + pendingHash + '"]');
        if (catBtn) {
            activeCategory = pendingHash;
        } else {
            var yearBtn = yearButtons.querySelector('[data-year="' + pendingHash + '"]');
            if (yearBtn) activeYear = pendingHash;
        }
        pendingHash = null;
        updateButtons();
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

    // --- Rendering ---

    function clearRendered() {
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        renderedCount = 0;
    }

    function renderBatch(count) {
        count = count || BATCH_SIZE;
        var target = Math.min(renderedCount + count, displayList.length);
        if (target <= renderedCount) return;

        var fragment = document.createDocumentFragment();
        var prevMonth = renderedCount > 0
            ? orderedPapers[displayList[renderedCount - 1]].month
            : null;

        for (var i = renderedCount; i < target; i++) {
            var entry = orderedPapers[displayList[i]];
            if (entry.month !== prevMonth) {
                var monthEl = monthMap[entry.month];
                if (monthEl) fragment.appendChild(monthEl);
                prevMonth = entry.month;
            }
            var paperEl = paperMap[entry.id];
            if (paperEl) fragment.appendChild(paperEl);
        }

        listEl.appendChild(fragment);
        renderedCount = target;
    }

    // --- Filtering ---

    function applyFilter() {
        var term = searchInput.value;
        var termLower = term.toLowerCase();
        var isCase = term !== termLower;

        // Fast path: no filters active
        if (!term && activeCategory === 'all' && activeYear === 'all') {
            resetDisplayList();
        } else if (searchIndex) {
            displayList = [];
            searchIndex.forEach(function(entry) {
                var matchesCat = activeCategory === 'all' || entry.c.indexOf(activeCategory) !== -1;
                var matchesYear = activeYear === 'all' || entry.y === activeYear;
                if (!matchesCat || !matchesYear) return;

                if (term) {
                    var haystack = entry.id + ' ' + entry.t + ' ' + entry.a;
                    var matched = isCase ? haystack.indexOf(term) !== -1 : haystack.toLowerCase().indexOf(termLower) !== -1;
                    if (!matched) return;
                }

                var idx = idToIndex[entry.id];
                if (idx !== undefined) displayList.push(idx);
            });
            totalMatches = displayList.length;
        } else {
            displayList = [];
            orderedPapers.forEach(function(p, idx) {
                var matchesCat = activeCategory === 'all' || p.categories.indexOf(activeCategory) !== -1;
                var matchesYear = activeYear === 'all' || p.year === activeYear;
                if (!matchesCat || !matchesYear) return;

                if (term) {
                    var haystack = p.search;
                    var matched = isCase ? haystack.indexOf(term) !== -1 : haystack.toLowerCase().indexOf(termLower) !== -1;
                    if (!matched) return;
                }
                displayList.push(idx);
            });
            totalMatches = displayList.length;
        }

        clearRendered();
        renderBatch(INITIAL_BATCH);

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

    // --- Infinite scroll ---

    var sentinel = document.createElement('div');
    sentinel.id = 'arxiv-scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    listEl.parentNode.insertBefore(sentinel, listEl.nextSibling);

    var observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting && renderedCount < displayList.length) {
            renderBatch();
        }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);

    // --- Event listeners ---

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
        // Close open abstracts on all items (including detached)
        Object.keys(paperMap).forEach(function(id) {
            var details = paperMap[id].querySelector('details[open]');
            if (details) details.open = false;
        });
        applyFilter();
        searchInput.focus();
        if (window.location.hash) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
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

    // Mobile filters toggle
    var filtersToggle = document.getElementById('arxiv-filters-toggle');
    var filtersPanel = document.getElementById('arxiv-filters-panel');
    if (filtersToggle && filtersPanel) {
        filtersToggle.addEventListener('click', function() {
            var open = filtersPanel.classList.toggle('open');
            filtersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    if (searchInput) searchInput.addEventListener('input', onSearchInput);
    if (searchClear) searchClear.addEventListener('click', clearSearch);

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

    // Mobile tags toggle
    listEl.addEventListener('click', function(e) {
        if (e.target.classList.contains('arxiv-tags-toggle')) {
            var tags = e.target.closest('.arxiv-tags');
            if (tags) {
                var expanded = tags.classList.toggle('arxiv-tags-expanded');
                e.target.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                e.target.setAttribute('aria-label', expanded ? 'Hide tags' : 'Show tags');
            }
        }
    });

    // Click paper title to toggle abstract
    listEl.addEventListener('click', function(e) {
        if (e.target.tagName === 'EM' && e.target.closest('.arxiv-body')) {
            var details = e.target.closest('.arxiv-body').querySelector('details');
            if (details) details.open = !details.open;
        }
    });

    // URL hash deep-linking
    if (window.location.hash) {
        pendingHash = window.location.hash.substring(1);
    }
});
