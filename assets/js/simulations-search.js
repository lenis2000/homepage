/* /assets/js/simulations-search.js  ─── v2 ─── */
(() => {
  /** Initialise the filter once the DOM is ready */
  function init() {
    console.log('Simulations search init called');
    
    /* Guard: bail out if key elements aren't on this page */
    const q   = document.getElementById('sim-search-input');
    const clr = document.getElementById('sim-search-clear');
    
    console.log('Search input:', q);
    console.log('Clear button:', clr);
    
    if (!q || !clr) {
      console.log('Required elements not found, bailing out');
      return;
    }

    const cats  = document.querySelectorAll('.category-btn');
    const items = document.querySelectorAll('#simulations-list > li');
    let   catState = 'all';
    
    console.log('Found category buttons:', cats.length);
    console.log('Found list items:', items.length);

    /** Core filter function */
    function applyFilter() {
      console.log('applyFilter called');
      const text = q.value.trim().toLowerCase();
      console.log('Search text:', text);
      
      let visibleCount = 0;
      items.forEach(li => {
        /* Text match searches the *visible label* for robustness */
        const matchText = li.textContent.toLowerCase().includes(text);
        const matchCat  = (catState === 'all') ||
                          (li.dataset.category === catState);
        const shouldShow = matchText && matchCat;
        
        if (shouldShow) {
          li.style.setProperty('display', 'flex', 'important');
          li.classList.remove('d-none', 'hidden');
          li.removeAttribute('hidden');
          visibleCount++;
        } else {
          li.style.setProperty('display', 'none', 'important');
          li.classList.add('d-none');
          li.setAttribute('hidden', '');
        }
      });
      console.log('Visible items after filter:', visibleCount);
    }

    /* ==========  EVENT LISTENERS  ========== */

    /* Live typing */
    q.addEventListener('input', applyFilter);

    /* Clear button */
    clr.addEventListener('click', () => {
      q.value = '';
      q.focus();
      applyFilter();
    });

    /* ESC key clears */
    q.addEventListener('keyup', e => {
      if (e.key === 'Escape') {
        clr.click();
        // Remove hash from URL and reload
        if (window.location.hash) {
          window.location.href = window.location.pathname + window.location.search;
        }
      }
    });

    /* Category buttons */
    cats.forEach(btn =>
      btn.addEventListener('click', () => {
        cats.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        catState = btn.dataset.category;
        applyFilter();
      })
    );
    
    /* Clickable tags in list items */
    const tags = document.querySelectorAll('.clickable-tag');
    tags.forEach(tag =>
      tag.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Update category buttons to match clicked tag
        cats.forEach(b => b.classList.remove('active'));
        const matchingBtn = Array.from(cats).find(btn => btn.dataset.category === tag.dataset.category);
        if (matchingBtn) {
          matchingBtn.classList.add('active');
          catState = tag.dataset.category;
        } else {
          // If no matching button (shouldn't happen), set to all
          const allBtn = Array.from(cats).find(btn => btn.dataset.category === 'all');
          if (allBtn) allBtn.classList.add('active');
          catState = 'all';
        }
        
        // Clear search and apply filter
        q.value = '';
        applyFilter();
        
        // Scroll to top of list
        document.getElementById('sim-search-group').scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
    );

    /* Auto-focus search input on page load */
    q.focus();
    
    /* Check URL hash for category filter */
    function checkHashFilter() {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash && hash !== 'all') {
        // Find matching category button
        const matchingBtn = Array.from(cats).find(btn => btn.dataset.category === hash);
        if (matchingBtn) {
          cats.forEach(b => b.classList.remove('active'));
          matchingBtn.classList.add('active');
          catState = hash;
          applyFilter();
          
          // Scroll to search after a short delay
          setTimeout(() => {
            document.getElementById('sim-search-group').scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    }
    
    // Check on load
    checkHashFilter();
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkHashFilter);
    
    /* Global ESC handler to focus search from anywhere */
    document.addEventListener('keyup', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // Remove hash from URL and reload
        if (window.location.hash) {
          window.location.href = window.location.pathname + window.location.search;
        } else {
          // If not already focused on search input, focus it
          if (document.activeElement !== q) {
            q.focus();
            q.select(); // Select all text for easy replacement
            
            // Also reset category filter to "All"
            if (catState !== 'all') {
              cats.forEach(b => b.classList.remove('active'));
              const allBtn = Array.from(cats).find(btn => btn.dataset.category === 'all');
              if (allBtn) {
                allBtn.classList.add('active');
                catState = 'all';
                applyFilter();
              }
            }
          }
        }
      }
    });
  }

  /* Run immediately if DOM is already parsed, else wait */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();