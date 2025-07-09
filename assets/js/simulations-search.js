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
      if (e.key === 'Escape') clr.click();
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

    /* Auto-focus search input on page load */
    q.focus();
  }

  /* Run immediately if DOM is already parsed, else wait */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();