document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('research-search-input');
    const searchClear = document.getElementById('research-search-clear');
    const categoryButtons = document.getElementById('research-cat-buttons');
    const extendedSearchToggle = document.getElementById('research-extended-search-toggle');
    const researchLists = document.querySelectorAll('.research-list');
    
    let activeCategory = 'all';
    let extendedSearch = false;

    // Filter function
    function filterResearch() {
        const searchTerm = searchInput.value.toLowerCase();
        let visibleCount = 0;

        // Track which sections have visible items
        const sectionVisibility = {};

        researchLists.forEach(list => {
            const items = list.querySelectorAll('li');
            let sectionHasVisibleItems = false;
            
            items.forEach(item => {
                const category = item.dataset.category || 'all';
                
                let matchesSearch = false;
                if (searchTerm === '') {
                    matchesSearch = true;
                } else {
                    if (extendedSearch) {
                        // Extended search: search all text content
                        const textContent = item.textContent.toLowerCase();
                        matchesSearch = textContent.includes(searchTerm);
                    } else {
                        // Basic search: search only basic fields (paper number, title, authors)
                        const basicFields = item.dataset.basicSearch || '';
                        matchesSearch = basicFields.toLowerCase().includes(searchTerm);
                    }
                }
                
                const matchesCategory = activeCategory === 'all' || category === activeCategory;
                
                if (matchesSearch && matchesCategory) {
                    item.style.display = '';
                    visibleCount++;
                    sectionHasVisibleItems = true;
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
        updateCategoryButtons();
        filterResearch();
        searchInput.focus();
        
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
            const col = document.createElement('div');
            col.className = 'col-auto';
            
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm category-btn' + (category === 'all' ? ' active' : '');
            btn.dataset.category = category;
            btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            
            col.appendChild(btn);
            categoryButtons.appendChild(col);
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