document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('research-search-input');
    const searchClear = document.getElementById('research-search-clear');
    const categoryButtons = document.getElementById('research-cat-buttons');
    const extendedSearchToggle = document.getElementById('research-extended-search-toggle');
    const recentFilter = document.getElementById('research-recent-filter');
    const researchLists = document.querySelectorAll('.research-list');
    
    let activeCategory = 'all';
    let extendedSearch = false;
    let recentOnly = false;

    // Highlight matching text
    function highlightText(element, searchTerm) {
        if (!searchTerm) return;
        
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        textNodes.forEach(textNode => {
            const parent = textNode.parentNode;
            if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;
            
            const text = textNode.textContent;
            let regex;
            
            // Smart case matching for highlighting
            if (searchTerm !== searchTerm.toLowerCase()) {
                // Case sensitive
                regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
            } else {
                // Case insensitive
                regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            }
            
            if (regex.test(text)) {
                const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                const span = document.createElement('span');
                span.innerHTML = highlightedText;
                parent.replaceChild(span, textNode);
            }
        });
    }

    // Remove highlighting
    function removeHighlighting() {
        const highlights = document.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }

    // Filter function
    function filterResearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const originalSearchTerm = searchInput.value;
        let visibleCount = 0;

        // Remove previous highlighting
        removeHighlighting();

        // Track which sections have visible items
        const sectionVisibility = {};

        researchLists.forEach(list => {
            const items = list.querySelectorAll('li');
            let sectionHasVisibleItems = false;
            
            items.forEach(item => {
                const category = item.dataset.category || 'all';
                const year = parseInt(item.dataset.year) || 0;
                
                let matchesSearch = false;
                if (searchTerm === '') {
                    matchesSearch = true;
                } else {
                    if (extendedSearch) {
                        // Extended search: search all text content with smart case
                        const textContent = item.textContent;
                        
                        if (originalSearchTerm !== originalSearchTerm.toLowerCase()) {
                            // Contains uppercase letters - case sensitive search
                            matchesSearch = textContent.includes(originalSearchTerm);
                        } else {
                            // All lowercase - case insensitive search
                            matchesSearch = textContent.toLowerCase().includes(searchTerm);
                        }
                    } else {
                        // Basic search: search only basic fields (paper number, title, authors)
                        const basicFields = item.dataset.basicSearch || '';
                        
                        // Smart case matching
                        if (originalSearchTerm !== originalSearchTerm.toLowerCase()) {
                            // Contains uppercase letters - case sensitive search
                            matchesSearch = basicFields.includes(originalSearchTerm);
                        } else {
                            // All lowercase - case insensitive search
                            matchesSearch = basicFields.toLowerCase().includes(searchTerm);
                        }
                    }
                }
                
                const matchesCategory = activeCategory === 'all' || category === activeCategory;
                
                // Dynamic recent filter (current year + 3 years back)
                const currentYear = new Date().getFullYear();
                const matchesRecent = !recentOnly || (year >= currentYear - 3 && year <= currentYear);
                
                if (matchesSearch && matchesCategory && matchesRecent) {
                    item.style.display = '';
                    visibleCount++;
                    sectionHasVisibleItems = true;
                    
                    // Highlight matching text in visible items
                    if (searchTerm !== '') {
                        highlightText(item, originalSearchTerm);
                    }
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide/show section header based on visibility
            const sectionHeader = list.previousElementSibling;
            if (sectionHeader && sectionHeader.tagName === 'HR') {
                const titleHeader = sectionHeader.previousElementSibling;
                if (titleHeader && titleHeader.tagName === 'H1') {
                    if (sectionHasVisibleItems) {
                        sectionHeader.style.display = '';
                        titleHeader.style.display = '';
                    } else {
                        sectionHeader.style.display = 'none';
                        titleHeader.style.display = 'none';
                    }
                }
            }
        });

        // Update no results message if needed
        updateNoResultsMessage(visibleCount);
    }

    // Update no results message
    function updateNoResultsMessage(count) {
        let noResultsMsg = document.getElementById('no-results-message');
        
        if (count === 0) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.id = 'no-results-message';
                noResultsMsg.className = 'alert alert-info mt-4';
                noResultsMsg.textContent = 'No results found. Try adjusting your search or filters.';
                document.querySelector('.col-md-8').appendChild(noResultsMsg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    // Clear search
    function clearSearch() {
        searchInput.value = '';
        activeCategory = 'all';
        recentOnly = false;
        updateCategoryButtons();
        updateRecentFilter();
        removeHighlighting();
        filterResearch();
        searchInput.focus();
        
        // Remove hash from URL
        if (window.location.hash) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
        
        // Collapse all details tags
        const detailsElements = document.querySelectorAll('details');
        detailsElements.forEach(details => {
            details.open = false;
        });
    }

    // Update category button states
    function updateCategoryButtons() {
        const buttons = categoryButtons.querySelectorAll('.category-btn');
        buttons.forEach(btn => {
            if (btn.dataset.category === activeCategory) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Toggle extended search
    function toggleExtendedSearch() {
        extendedSearch = !extendedSearch;
        
        if (extendedSearch) {
            extendedSearchToggle.classList.remove('btn-outline-info');
            extendedSearchToggle.classList.add('btn-info');
            extendedSearchToggle.innerHTML = '<i class="bi bi-search-plus"></i> Extended Search (ON)';
        } else {
            extendedSearchToggle.classList.remove('btn-info');
            extendedSearchToggle.classList.add('btn-outline-info');
            extendedSearchToggle.innerHTML = '<i class="bi bi-search-plus"></i> Extended Search (includes abstracts)';
        }
        
        // Re-filter with new search mode
        filterResearch();
    }

    // Toggle recent filter
    function toggleRecentFilter() {
        recentOnly = !recentOnly;
        updateRecentFilter();
        filterResearch();
    }

    // Update recent filter button state
    function updateRecentFilter() {
        if (recentFilter) {
            if (recentOnly) {
                recentFilter.classList.remove('btn-outline-success');
                recentFilter.classList.add('btn-success');
                recentFilter.innerHTML = 'Recent (ON)';
            } else {
                recentFilter.classList.remove('btn-success');
                recentFilter.classList.add('btn-outline-success');
                recentFilter.innerHTML = 'Recent';
            }
        }
    }

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', filterResearch);
        searchInput.focus();
    }

    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }

    if (extendedSearchToggle) {
        extendedSearchToggle.addEventListener('click', toggleExtendedSearch);
    }

    if (recentFilter) {
        recentFilter.addEventListener('click', toggleRecentFilter);
    }

    // ESC key to clear
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchInput) {
            clearSearch();
        }
    });

    // Category button clicks
    if (categoryButtons) {
        categoryButtons.addEventListener('click', function(e) {
            if (e.target.classList.contains('category-btn')) {
                activeCategory = e.target.dataset.category;
                updateCategoryButtons();
                filterResearch();
            }
        });
    }

    // Initialize categories from data
    function initializeCategories() {
        if (!categoryButtons) return;
        
        const categories = new Set(['all']);
        
        researchLists.forEach(list => {
            const items = list.querySelectorAll('li');
            items.forEach(item => {
                const category = item.dataset.category;
                if (category) categories.add(category);
            });
        });

        // Clear existing buttons
        categoryButtons.innerHTML = '';
        
        // Create category buttons
        categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm category-btn' + (category === 'all' ? ' active' : '');
            btn.dataset.category = category;
            btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            
            categoryButtons.appendChild(btn);
        });
    }

    // Check for category in URL hash
    if (window.location.hash) {
        const hashCategory = window.location.hash.substring(1);
        const validCategories = Array.from(document.querySelectorAll('.category-btn')).map(btn => btn.dataset.category);
        
        if (validCategories.includes(hashCategory)) {
            activeCategory = hashCategory;
            updateCategoryButtons();
            filterResearch();
            
            // Scroll to search bar
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Initialize
    initializeCategories();
    filterResearch();
});