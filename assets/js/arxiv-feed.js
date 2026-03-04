document.addEventListener('DOMContentLoaded', function() {
    var searchInput = document.getElementById('arxiv-search-input');
    var searchClear = document.getElementById('arxiv-search-clear');
    var catButtons = document.getElementById('arxiv-cat-buttons');
    var statusRegion = document.getElementById('arxiv-status');
    var noResults = document.getElementById('arxiv-no-results');
    var listEl = document.querySelector('.arxiv-list');
    var template = document.getElementById('arxiv-data');

    // Date dropdown elements
    var dateBtn = document.getElementById('arxiv-date-btn');
    var dateMenu = document.getElementById('arxiv-date-menu');
    var dateLabel = document.getElementById('arxiv-date-label');
    var yearFrom = document.getElementById('arxiv-year-from');
    var yearTo = document.getElementById('arxiv-year-to');
    var yearRangeApply = document.getElementById('arxiv-year-range-apply');

    // Category toggle elements
    var catToggle = document.getElementById('arxiv-cat-toggle');
    var catPanel = document.getElementById('arxiv-cat-panel');
    var catToggleLabel = document.getElementById('arxiv-cat-toggle-label');

    var activeCategory = 'all';
    var activeDateFilter = 'all'; // 'all', 'this-week', 'last-week', etc. or 'custom'
    var customYearFrom = null;
    var customYearTo = null;
    var statusTimeout;
    var searchIndex = null;
    var searchMap = {};  // arxiv-id -> search index entry (for Related dropdown)
    var pendingHash = null;

    var BATCH_SIZE = 30;
    var INITIAL_BATCH = 100;

    // --- Parse items from <template> (not in main DOM) ---
    var paperMap = {};      // arxiv-id -> <li> element
    var monthMap = {};      // "YYYY-MM" -> <li> header element
    var orderedPapers = []; // [{id, month, year, date, categories, search}]
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
            date: el.dataset.date || '',
            categories: el.dataset.categories || '',
            search: el.dataset.search || ''
        });
    }
    for (var j = 0; j < tplMonths.length; j++) {
        var hdr = tplMonths[j];
        monthMap[hdr.dataset.month] = hdr;
    }

    // --- LaTeX in titles ---

    var LATEX_CMD_SET = {};
    ('alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi ' +
     'pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega ' +
     'Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega ' +
     'mathbb mathcal mathfrak mathrm mathsf mathbf mathit mathtt ' +
     'hat bar tilde widehat widetilde overline underline dot ddot vec ' +
     'operatorname rm bf it sf tt text textbf textit textrm textsf ' +
     'infty partial nabla ell aleph wp Re Im forall exists ' +
     'times cdot circ oplus otimes leq geq neq sim simeq approx equiv ' +
     'to rightarrow leftarrow leftrightarrow Rightarrow Leftarrow ' +
     'hspace quad qquad left right frac tfrac binom sqrt over ' +
     'det dim ker Hom log exp sin cos').split(/\s+/).forEach(function(c) {
        LATEX_CMD_SET[c] = true;
    });

    var TAKES_ARG = {};
    ('mathbb mathcal mathfrak mathrm mathsf mathbf mathit mathtt ' +
     'hat bar tilde widehat widetilde overline underline dot ddot vec ' +
     'operatorname text textbf textit textrm textsf rm bf it sf tt').split(/\s+/).forEach(function(c) {
        TAKES_ARG[c] = true;
    });

    function extractCmd(text, pos) {
        var start = pos;
        while (pos < text.length && /[a-zA-Z]/.test(text[pos])) pos++;
        return pos > start ? text.slice(start, pos) : null;
    }

    function scanMathEnd(text, pos) {
        var i = pos, len = text.length, depth = 0;
        while (i < len) {
            if (text[i] === '\\' && i + 1 < len && /[a-zA-Z]/.test(text[i + 1])) {
                var cmdStart = i + 1;
                i++;
                while (i < len && /[a-zA-Z]/.test(text[i])) i++;
                var cmdName = text.slice(cmdStart, i);
                if (TAKES_ARG[cmdName] && i < len && text[i] === ' ' &&
                    i + 1 < len && /[A-Za-z0-9]/.test(text[i + 1])) {
                    i += 2;
                }
                continue;
            }
            if (text[i] === '\\' && i + 1 < len) { i += 2; continue; }
            if (text[i] === '{') { depth++; i++; continue; }
            if (text[i] === '}') {
                if (depth > 0) { depth--; i++; continue; }
                break;
            }
            if (depth > 0) { i++; continue; }
            if (text[i] === '_' || text[i] === '^') {
                i++;
                if (i < len && text[i] === '{') { depth++; i++; }
                else if (i < len && /[a-zA-Z0-9\\]/.test(text[i])) {
                    if (text[i] !== '\\') i++;
                }
                continue;
            }
            if (text[i] === '(') {
                var pd = 1;
                for (var j = i + 1; j < len && pd > 0; j++) {
                    if (text[j] === '(') pd++;
                    else if (text[j] === ')') pd--;
                }
                if (pd === 0 && /\\[a-zA-Z]/.test(text.slice(i + 1, j))) {
                    i = j;
                    continue;
                }
                break;
            }
            break;
        }
        return i;
    }

    function texifyTitle(text) {
        if (!text || text.indexOf('$') >= 0) return text;
        text = text.replace(/\\{2,}/g, '\\');
        if (text.indexOf('\\') < 0) return text;
        var regions = [], i = 0, len = text.length;
        while (i < len) {
            var mathPos = -1;
            if (text[i] === '\\') {
                var cmd = extractCmd(text, i + 1);
                if (cmd && LATEX_CMD_SET[cmd]) mathPos = i;
            } else if (text[i] === '{') {
                for (var j = i + 1; j < len && text[j] !== '}'; j++) {
                    if (text[j] === '\\') {
                        var cmd2 = extractCmd(text, j + 1);
                        if (cmd2 && LATEX_CMD_SET[cmd2]) { mathPos = i; break; }
                    }
                }
            }
            if (mathPos >= 0) {
                var end = scanMathEnd(text, mathPos);
                var start = mathPos;
                if (start > 0 && (text[start - 1] === '_' || text[start - 1] === '^')) start--;
                if (regions.length && start <= regions[regions.length - 1].end) {
                    regions[regions.length - 1].end = Math.max(regions[regions.length - 1].end, end);
                } else {
                    regions.push({start: start, end: end});
                }
                i = end;
            } else {
                i++;
            }
        }
        if (!regions.length) return text;
        var result = '', pos = 0;
        for (var r = 0; r < regions.length; r++) {
            result += text.slice(pos, regions[r].start);
            result += '$' + text.slice(regions[r].start, regions[r].end) + '$';
            pos = regions[r].end;
        }
        return result + text.slice(pos);
    }

    function texifyBatch(from, to) {
        if (!window.renderMathInElement) return;
        for (var k = from; k < to; k++) {
            var pid = orderedPapers[displayList[k]].id;
            var el = paperMap[pid];
            if (!el) continue;
            var em = el.querySelector('.arxiv-body em');
            if (!em || em.dataset.texified) continue;
            var raw = em.textContent;
            var processed = texifyTitle(raw);
            if (processed !== raw) {
                em.textContent = processed;
                renderMathInElement(em, {
                    delimiters: [{left: '$', right: '$', display: false}],
                    throwOnError: false,
                });
            }
            em.dataset.texified = '1';
        }
    }

    // Display state
    var displayList = [];
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
            searchMap = {};
            data.forEach(function(e) { searchMap[e.id] = e; });
            initButtons();
        })
        .catch(function() {
            initButtons();
        });

    // Load overflow papers (full prebuilt HTML for papers beyond the template)
    fetch('/arxiv/papers-overflow.html')
        .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function(html) {
            parseOverflow(html);
        })
        .catch(function() { /* page works with template papers only */ });

    // --- Date range helpers ---

    function getDateRange(filterKey) {
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var dayOfWeek = today.getDay(); // 0=Sun
        var mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        switch (filterKey) {
            case 'this-week': {
                var start = new Date(today);
                start.setDate(today.getDate() - mondayOffset);
                return { from: fmtDate(start), to: fmtDate(today) };
            }
            case 'last-week': {
                var thisMonday = new Date(today);
                thisMonday.setDate(today.getDate() - mondayOffset);
                var lastMonStart = new Date(thisMonday);
                lastMonStart.setDate(thisMonday.getDate() - 7);
                var lastSun = new Date(thisMonday);
                lastSun.setDate(thisMonday.getDate() - 1);
                return { from: fmtDate(lastMonStart), to: fmtDate(lastSun) };
            }
            case 'this-month': {
                var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return { from: fmtDate(monthStart), to: fmtDate(today) };
            }
            case 'last-month': {
                var lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                var lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                return { from: fmtDate(lmStart), to: fmtDate(lmEnd) };
            }
            case 'this-year': {
                var yrStart = new Date(now.getFullYear(), 0, 1);
                return { from: fmtDate(yrStart), to: fmtDate(today) };
            }
            case 'last-year': {
                var lyStart = new Date(now.getFullYear() - 1, 0, 1);
                var lyEnd = new Date(now.getFullYear() - 1, 11, 31);
                return { from: fmtDate(lyStart), to: fmtDate(lyEnd) };
            }
            case 'custom': {
                var f = customYearFrom ? customYearFrom + '-01-01' : '0000-01-01';
                var t = customYearTo ? customYearTo + '-12-31' : '9999-12-31';
                return { from: f, to: t };
            }
            default:
                return null; // 'all'
        }
    }

    function fmtDate(d) {
        var m = d.getMonth() + 1;
        var day = d.getDate();
        return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }

    function matchesDateFilter(dateStr) {
        if (activeDateFilter === 'all') return true;
        var range = getDateRange(activeDateFilter);
        if (!range) return true;
        return dateStr >= range.from && dateStr <= range.to;
    }

    // --- Display list helpers ---

    function resetDisplayList() {
        displayList = [];
        for (var k = 0; k < orderedPapers.length; k++) displayList.push(k);
        totalMatches = displayList.length;
    }

    // Stable category sort order (by total count, set once on init)
    var catSortOrder = [];

    function initButtons() {
        var catCounts = {};
        var source = searchIndex || orderedPapers;
        source.forEach(function(entry) {
            var catStr = searchIndex ? entry.c : entry.categories;
            catStr.split(' ').forEach(function(c) {
                if (c) catCounts[c] = (catCounts[c] || 0) + 1;
            });
        });
        // Stable sort order: by total count desc, then alpha
        catSortOrder = Object.keys(catCounts).sort(function(a, b) {
            var diff = catCounts[b] - catCounts[a];
            return diff !== 0 ? diff : a.localeCompare(b);
        });
        buildCatButtons(catCounts);
        applyPendingHash();
        if (activeCategory !== 'all' || activeDateFilter !== 'all' || searchInput.value) {
            applyFilter();
        }
    }

    // Recount categories for papers matching current search + date (ignoring category filter)
    function recomputeCatCounts() {
        var term = searchInput.value;
        var termLower = term.toLowerCase();
        var isCase = term !== termLower;
        var counts = {};
        var totalAll = 0;

        var source = searchIndex || orderedPapers;
        source.forEach(function(entry) {
            var dateStr = searchIndex ? entry.d : entry.date;
            if (!matchesDateFilter(dateStr)) return;

            if (term) {
                var haystack = searchIndex
                    ? (entry.id + ' ' + entry.t + ' ' + entry.a + ' ' + (entry.s || ''))
                    : entry.search;
                var matched = isCase ? haystack.indexOf(term) !== -1 : haystack.toLowerCase().indexOf(termLower) !== -1;
                if (!matched) return;
            }

            totalAll++;
            var catStr = searchIndex ? entry.c : entry.categories;
            catStr.split(' ').forEach(function(c) {
                if (c) counts[c] = (counts[c] || 0) + 1;
            });
        });

        updateCatCounts(counts, totalAll);
    }

    function updateCatCounts(counts, totalAll) {
        catButtons.querySelectorAll('.category-btn').forEach(function(btn) {
            var cat = btn.dataset.category;
            var countSpan = btn.querySelector('.arxiv-cat-count');
            if (cat === 'all') return;
            if (countSpan) {
                var n = counts[cat] || 0;
                countSpan.textContent = n;
                btn.style.display = n === 0 ? 'none' : '';
            }
        });
    }

    function applyPendingHash() {
        if (!pendingHash) return;
        var catBtn = catButtons.querySelector('[data-category="' + pendingHash + '"]');
        if (catBtn) {
            activeCategory = pendingHash;
            // Open category panel and update toggle
            catPanel.removeAttribute('hidden');
            catToggle.setAttribute('aria-expanded', 'true');
        }
        pendingHash = null;
        updateCatButtons();
        updateCatToggle();
    }

    function buildCatButtons(catCounts) {
        // Use stable sort order from initButtons
        var sorted = catSortOrder.length > 0 ? catSortOrder : Object.keys(catCounts);
        var html = '<button class="btn btn-sm category-btn active" data-category="all" aria-pressed="true">All</button>';
        sorted.forEach(function(cat) {
            if (!catCounts[cat]) return;
            html += '<button class="btn btn-sm category-btn" data-category="' + cat + '" aria-pressed="false">' + cat + ' <span class="arxiv-cat-count">' + catCounts[cat] + '</span></button>';
        });
        catButtons.innerHTML = html;
    }

    // --- Parse overflow papers (prebuilt HTML loaded async) ---

    function parseOverflow(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;

        var papers = tmp.querySelectorAll('li[data-id]');
        var months = tmp.querySelectorAll('li.arxiv-month-header');

        for (var j = 0; j < months.length; j++) {
            var hdr = months[j];
            var mk = hdr.dataset.month;
            if (!monthMap[mk]) monthMap[mk] = hdr;
        }

        for (var i = 0; i < papers.length; i++) {
            var el = papers[i];
            var id = el.dataset.id;
            if (paperMap[id]) continue;
            paperMap[id] = el;
            idToIndex[id] = orderedPapers.length;
            orderedPapers.push({
                id: id,
                month: el.dataset.month,
                year: el.dataset.year,
                date: el.dataset.date || '',
                categories: el.dataset.categories || '',
                search: el.dataset.search || ''
            });
        }

        // Update display to include overflow papers
        var hadFilter = activeCategory !== 'all' || activeDateFilter !== 'all' || searchInput.value;
        resetDisplayList();
        if (hadFilter) {
            applyFilter();
        } else if (renderedCount < displayList.length) {
            renderBatch();
        }
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
        var batchStart = renderedCount;
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
        texifyBatch(batchStart, target);
    }

    // --- Filtering ---

    function applyFilter() {
        var term = searchInput.value;
        var termLower = term.toLowerCase();
        var isCase = term !== termLower;

        // Fast path: no filters active
        if (!term && activeCategory === 'all' && activeDateFilter === 'all') {
            resetDisplayList();
        } else if (searchIndex) {
            displayList = [];
            searchIndex.forEach(function(entry) {
                var matchesCat = activeCategory === 'all' || entry.c.indexOf(activeCategory) !== -1;
                if (!matchesCat) return;

                if (!matchesDateFilter(entry.d)) return;

                if (term) {
                    var haystack = entry.id + ' ' + entry.t + ' ' + entry.a + ' ' + (entry.s || '');
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
                if (!matchesCat) return;

                if (!matchesDateFilter(p.date)) return;

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

        // Update category counts based on search + date (ignoring category)
        recomputeCatCounts();

        // Screen reader announcement
        if (statusRegion) {
            clearTimeout(statusTimeout);
            statusTimeout = setTimeout(function() {
                if (totalMatches === 0) {
                    statusRegion.textContent = 'No results found.';
                } else if (term || activeCategory !== 'all' || activeDateFilter !== 'all') {
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

    // --- UI update helpers ---

    function updateCatButtons() {
        catButtons.querySelectorAll('.category-btn').forEach(function(btn) {
            var isActive = btn.dataset.category === activeCategory;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function updateCatToggle() {
        var hasFilter = activeCategory !== 'all';
        catToggle.classList.toggle('has-filter', hasFilter);
        if (hasFilter) {
            catToggleLabel.textContent = 'Category: ' + activeCategory;
        } else {
            catToggleLabel.textContent = 'Filter by category';
        }
    }

    function updateDateMenu() {
        dateMenu.querySelectorAll('.arxiv-dropdown-item').forEach(function(item) {
            item.classList.toggle('active', item.dataset.date === activeDateFilter);
        });
        // Update label
        var labels = {
            'all': 'All time',
            'this-week': 'This week',
            'last-week': 'Last week',
            'this-month': 'This month',
            'last-month': 'Last month',
            'this-year': 'This year',
            'last-year': 'Last year',
            'custom': customYearFrom + '\u2013' + customYearTo
        };
        dateLabel.textContent = labels[activeDateFilter] || 'All time';
        dateBtn.classList.toggle('has-filter', activeDateFilter !== 'all');
    }

    function closeDateMenu() {
        dateMenu.classList.remove('open');
        dateBtn.setAttribute('aria-expanded', 'false');
    }

    // --- Event listeners ---

    var searchDebounce;
    function onSearchInput() {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(applyFilter, 150);
    }

    function clearSearch() {
        searchInput.value = '';
        activeCategory = 'all';
        activeDateFilter = 'all';
        customYearFrom = null;
        customYearTo = null;
        yearFrom.value = '';
        yearTo.value = '';
        updateCatButtons();
        updateCatToggle();
        updateDateMenu();
        // Close category panel
        catPanel.setAttribute('hidden', '');
        catToggle.setAttribute('aria-expanded', 'false');
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

    // Date dropdown toggle
    dateBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = dateMenu.classList.toggle('open');
        dateBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Date dropdown item selection
    dateMenu.addEventListener('click', function(e) {
        var item = e.target.closest('.arxiv-dropdown-item');
        if (!item) return;
        activeDateFilter = item.dataset.date;
        updateDateMenu();
        closeDateMenu();
        applyFilter();
    });

    // Custom year range apply
    yearRangeApply.addEventListener('click', function() {
        var from = yearFrom.value.trim();
        var to = yearTo.value.trim();
        if (!from && !to) return;
        customYearFrom = from || '1900';
        customYearTo = to || '2099';
        activeDateFilter = 'custom';
        updateDateMenu();
        closeDateMenu();
        applyFilter();
    });

    // Enter key in year inputs
    yearFrom.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); yearRangeApply.click(); }
    });
    yearTo.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); yearRangeApply.click(); }
    });

    // Prevent dropdown close when clicking inside custom inputs
    yearFrom.addEventListener('click', function(e) { e.stopPropagation(); });
    yearTo.addEventListener('click', function(e) { e.stopPropagation(); });
    yearRangeApply.addEventListener('click', function(e) { e.stopPropagation(); });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dateBtn.contains(e.target) && !dateMenu.contains(e.target)) {
            closeDateMenu();
        }
    });

    // Category toggle
    catToggle.addEventListener('click', function() {
        var isHidden = catPanel.hasAttribute('hidden');
        if (isHidden) {
            catPanel.removeAttribute('hidden');
            catToggle.setAttribute('aria-expanded', 'true');
        } else {
            catPanel.setAttribute('hidden', '');
            catToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Category button clicks — clicking the active category deselects it
    catButtons.addEventListener('click', function(e) {
        var btn = e.target.closest('.category-btn');
        if (!btn) return;
        var cat = btn.dataset.category;
        activeCategory = (cat === activeCategory && cat !== 'all') ? 'all' : cat;
        updateCatButtons();
        updateCatToggle();
        applyFilter();
    });

    if (searchInput) searchInput.addEventListener('input', onSearchInput);
    if (searchClear) searchClear.addEventListener('click', clearSearch);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchInput) {
            // Close dropdown if open
            if (dateMenu.classList.contains('open')) {
                closeDateMenu();
                return;
            }
            // Close category panel if open
            if (!catPanel.hasAttribute('hidden')) {
                catPanel.setAttribute('hidden', '');
                catToggle.setAttribute('aria-expanded', 'false');
                return;
            }
            // Collapse open abstracts, clear search, focus bar
            Object.keys(paperMap).forEach(function(id) {
                var details = paperMap[id].querySelector('details[open]');
                if (details) details.open = false;
            });
            if (searchInput.value || activeCategory !== 'all' || activeDateFilter !== 'all') {
                clearSearch();
            } else {
                searchInput.focus();
            }
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

    // Related papers button
    listEl.addEventListener('click', function(e) {
        if (!e.target.classList.contains('arxiv-related-btn')) return;
        var btn = e.target;
        var li = btn.closest('li[data-id]');
        if (!li) return;
        var dropdown = li.querySelector('.arxiv-related-dropdown');
        if (!dropdown) return;
        var isOpen = !dropdown.hidden;
        if (isOpen) {
            dropdown.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
            return;
        }

        // Build dropdown content from searchMap
        var relatedIds = (li.dataset.related || '').split(' ').filter(Boolean);
        if (!relatedIds.length) return;

        var html = relatedIds.map(function(rid) {
            var entry = searchMap[rid];
            if (!entry) return '';
            var abstract = entry.s || '';
            if (abstract.length > 250) abstract = abstract.substring(0, 250) + '...';
            var cats = (entry.c || '').split(' ').filter(Boolean);
            var catBadges = cats.map(function(c) {
                return '<span class="badge arxiv-cat-badge">' + c + '</span>';
            }).join(' ');
            // Check if paper is on the page (rendered)
            var onPage = !!paperMap[rid] && listEl.contains(paperMap[rid]);
            var titleText = texifyTitle(entry.t);
            var titleLink = onPage
                ? '<a href="#" class="arxiv-related-title" data-scroll-to="' + rid + '">' + titleText + '</a>'
                : '<a href="https://arxiv.org/abs/' + rid + '" target="_blank" rel="noopener" class="arxiv-related-title">' + titleText + '</a>';
            return '<div class="arxiv-related-item">' +
                '<div class="arxiv-related-item-header">' +
                    '<span class="arxiv-related-date">' + entry.d + '</span> ' +
                    '<a href="https://arxiv.org/abs/' + rid + '" target="_blank" rel="noopener" class="arxiv-id-label">' + rid + '</a> ' +
                    catBadges +
                '</div>' +
                '<div>' + titleLink + '</div>' +
                '<div class="arxiv-related-authors">' + entry.a + '</div>' +
                (abstract ? '<div class="arxiv-related-abstract">' + abstract + '</div>' : '') +
                '<div class="arxiv-related-links">' +
                    '<a href="https://arxiv.org/abs/' + rid + '" target="_blank" rel="noopener" class="badge arxiv-link-badge arxiv-link-abs">arXiv</a>' +
                    '<a href="https://arxiv.org/pdf/' + rid + '" target="_blank" rel="noopener" class="badge arxiv-link-badge arxiv-link-pdf">pdf</a>' +
                    '<a href="https://arxiv.org/html/' + rid + '" target="_blank" rel="noopener" class="badge arxiv-link-badge arxiv-link-html">html</a>' +
                '</div>' +
            '</div>';
        }).join('');

        dropdown.innerHTML = html;
        dropdown.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        if (window.renderMathInElement) {
            renderMathInElement(dropdown, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                ],
                throwOnError: false,
            });
        }
    });

    // Scroll-to related paper on page
    listEl.addEventListener('click', function(e) {
        var scrollLink = e.target.closest('[data-scroll-to]');
        if (!scrollLink) return;
        e.preventDefault();
        var targetId = scrollLink.dataset.scrollTo;
        var targetEl = paperMap[targetId];
        if (targetEl && listEl.contains(targetEl)) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.style.outline = '2px solid #6c5ce7';
            setTimeout(function() { targetEl.style.outline = ''; }, 2000);
        }
    });

    // URL hash deep-linking
    if (window.location.hash) {
        pendingHash = window.location.hash.substring(1);
    }
});
