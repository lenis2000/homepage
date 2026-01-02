/**
 * Slide Engine for Interactive Presentations
 *
 * Features:
 * - Arrow key navigation
 * - Hash-based routing (#slide-N)
 * - Jump menu (press G)
 * - Fullscreen toggle (press F)
 * - Simulation pause/resume on slide transitions
 * - Touch swipe support
 *
 * Usage:
 *   const engine = new SlideEngine();
 *   engine.init();
 */

class SlideEngine {
    constructor(options = {}) {
        this.options = {
            hashPrefix: '',           // e.g., 'slide-' for #slide-1
            showProgress: true,
            showNav: true,
            swipeThreshold: 50,
            ...options
        };

        this.slides = [];
        this.current = 0;
        this.currentFragment = 0;     // Current fragment index within slide
        this.simulations = new Map();
        this.jumpMenuOpen = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    init() {
        // Gather all slides
        this.slides = Array.from(document.querySelectorAll('.slide'));
        if (this.slides.length === 0) {
            console.warn('SlideEngine: No slides found');
            return;
        }

        // Build UI components
        this.buildProgressBar();
        this.buildNavigation();
        this.buildJumpMenu();

        // Bind events
        this.bindKeyboard();
        this.bindTouch();
        this.bindHashChange();
        this.bindClick();

        // Handle initial hash or show first slide
        if (window.location.hash) {
            this.handleHashChange();
        } else {
            this.goTo(0, { updateHash: true });
        }

        // Update UI
        this.updateProgress();
        this.updateCounter();
    }

    // ==================== UI Building ====================

    buildProgressBar() {
        if (!this.options.showProgress) return;

        let progress = document.querySelector('.slide-progress');
        if (!progress) {
            progress = document.createElement('div');
            progress.className = 'slide-progress';
            progress.innerHTML = '<div class="slide-progress-bar"></div>';
            document.body.appendChild(progress);
        }
        this.progressBar = progress.querySelector('.slide-progress-bar');
    }

    buildNavigation() {
        if (!this.options.showNav) return;

        let nav = document.querySelector('.slide-nav');
        if (!nav) {
            nav = document.createElement('nav');
            nav.className = 'slide-nav';
            nav.innerHTML = `
                <button class="slide-prev" aria-label="Previous slide">&#9664;</button>
                <span class="slide-counter">1 / ${this.slides.length}</span>
                <button class="slide-next" aria-label="Next slide">&#9654;</button>
                <button class="slide-menu" aria-label="Jump to slide">&#9776;</button>
            `;
            document.body.appendChild(nav);
        }

        this.counter = nav.querySelector('.slide-counter');

        nav.querySelector('.slide-prev').addEventListener('click', () => this.prev());
        nav.querySelector('.slide-next').addEventListener('click', () => this.next());
        nav.querySelector('.slide-menu').addEventListener('click', () => this.toggleJumpMenu());
    }

    buildJumpMenu() {
        let menu = document.querySelector('.slide-jump-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.className = 'slide-jump-menu';
            menu.hidden = true;
            document.body.appendChild(menu);
        }
        this.jumpMenu = menu;

        // Add number input at top
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'slide-jump-input-wrapper';
        inputWrapper.innerHTML = `
            <label>Go to slide:</label>
            <input type="number" class="slide-jump-input" min="1" max="${this.slides.length}" placeholder="1-${this.slides.length}">
        `;
        menu.appendChild(inputWrapper);

        this.jumpInput = inputWrapper.querySelector('input');
        this.jumpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const num = parseInt(this.jumpInput.value);
                if (num >= 1 && num <= this.slides.length) {
                    this.goTo(num - 1);
                    this.toggleJumpMenu(false);
                }
            }
            e.stopPropagation(); // Don't trigger slide navigation
        });

        // Grid container for slide items
        const grid = document.createElement('div');
        grid.className = 'slide-jump-grid';
        menu.appendChild(grid);

        // Populate with slide items
        this.slides.forEach((slide, index) => {
            const title = slide.dataset.title || `Slide ${index + 1}`;
            const item = document.createElement('div');
            item.className = 'slide-jump-item';
            item.innerHTML = `
                <div class="slide-jump-number">${index + 1}</div>
                <div class="slide-jump-title">${title}</div>
            `;
            item.addEventListener('click', () => {
                this.goTo(index);
                this.toggleJumpMenu(false);
            });
            grid.appendChild(item);
        });

        // Close on background click
        menu.addEventListener('click', (e) => {
            if (e.target === menu) {
                this.toggleJumpMenu(false);
            }
        });
    }

    // ==================== Fragment Management ====================

    getFragments(slide) {
        return Array.from(slide.querySelectorAll('.fragment'));
    }

    getVisibleFragmentCount(slide) {
        return slide.querySelectorAll('.fragment.visible').length;
    }

    showFragmentsUpTo(slide, count) {
        const fragments = this.getFragments(slide);
        fragments.forEach((frag, i) => {
            frag.classList.toggle('visible', i < count);
        });
    }

    // Returns true if there was a fragment to show
    nextFragment() {
        const slide = this.slides[this.current];
        const fragments = this.getFragments(slide);
        const visible = this.getVisibleFragmentCount(slide);

        if (visible < fragments.length) {
            this.showFragmentsUpTo(slide, visible + 1);
            this.currentFragment = visible + 1;
            return true;
        }
        return false;
    }

    // Returns true if there was a fragment to hide
    prevFragment() {
        const slide = this.slides[this.current];
        const visible = this.getVisibleFragmentCount(slide);

        if (visible > 0) {
            this.showFragmentsUpTo(slide, visible - 1);
            this.currentFragment = visible - 1;
            return true;
        }
        return false;
    }

    // ==================== Navigation ====================

    next() {
        // First try to show next fragment
        if (this.nextFragment()) {
            return;
        }
        // No more fragments, go to next slide
        if (this.current < this.slides.length - 1) {
            this.goTo(this.current + 1);
        }
    }

    prev() {
        // First try to hide current fragment
        if (this.prevFragment()) {
            return;
        }
        // No fragments to hide, go to previous slide
        if (this.current > 0) {
            this.goTo(this.current - 1, { showAllFragments: true });
        }
    }

    goTo(index, options = {}) {
        const opts = { updateHash: true, showAllFragments: false, ...options };
        if (index < 0 || index >= this.slides.length) return;
        if (index === this.current && this.slides[this.current].classList.contains('active')) return;

        const prevSlide = this.slides[this.current];
        const nextSlide = this.slides[index];

        // Pause simulation on previous slide
        this.pauseSimulation(prevSlide.id);

        // Reset fragments on previous slide (hide all)
        this.showFragmentsUpTo(prevSlide, 0);

        // Update visibility
        prevSlide.classList.remove('active');
        nextSlide.classList.add('active');

        this.current = index;

        // Handle fragments on new slide
        const fragments = this.getFragments(nextSlide);
        if (opts.showAllFragments) {
            // Coming from next slide (going back) - show all fragments
            this.showFragmentsUpTo(nextSlide, fragments.length);
            this.currentFragment = fragments.length;
        } else {
            // Coming from previous slide - hide all fragments
            this.showFragmentsUpTo(nextSlide, 0);
            this.currentFragment = 0;
        }

        // Resume simulation on new slide
        this.resumeSimulation(nextSlide.id);

        // Update UI
        this.updateProgress();
        this.updateCounter();
        this.updateJumpMenuHighlight();

        // Update URL hash
        if (opts.updateHash) {
            const slideId = nextSlide.id || `${this.options.hashPrefix}${index + 1}`;
            history.pushState(null, '', `#${slideId}`);
        }
    }

    // ==================== UI Updates ====================

    updateProgress() {
        if (!this.progressBar) return;
        const progress = ((this.current + 1) / this.slides.length) * 100;
        this.progressBar.style.width = `${progress}%`;
    }

    updateCounter() {
        if (!this.counter) return;
        this.counter.textContent = `${this.current + 1} / ${this.slides.length}`;
    }

    updateJumpMenuHighlight() {
        if (!this.jumpMenu) return;
        const grid = this.jumpMenu.querySelector('.slide-jump-grid');
        if (!grid) return;
        const items = grid.querySelectorAll('.slide-jump-item');
        items.forEach((item, index) => {
            item.classList.toggle('current', index === this.current);
        });
    }

    // ==================== Jump Menu ====================

    toggleJumpMenu(forceState) {
        const shouldOpen = forceState !== undefined ? forceState : !this.jumpMenuOpen;
        this.jumpMenuOpen = shouldOpen;
        this.jumpMenu.hidden = !shouldOpen;

        if (shouldOpen) {
            this.updateJumpMenuHighlight();
            // Focus the input and clear it
            if (this.jumpInput) {
                this.jumpInput.value = '';
                setTimeout(() => this.jumpInput.focus(), 50);
            }
            // Scroll to current slide in menu
            const currentItem = this.jumpMenu.querySelector('.slide-jump-item.current');
            if (currentItem) {
                currentItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }
    }

    // ==================== Fullscreen ====================

    toggleFullscreen() {
        const doc = document.documentElement;

        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            if (doc.requestFullscreen) {
                doc.requestFullscreen();
            } else if (doc.webkitRequestFullscreen) {
                doc.webkitRequestFullscreen();
            } else if (doc.msRequestFullscreen) {
                doc.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    // ==================== Simulation Management ====================

    registerSimulation(slideId, simulation) {
        this.simulations.set(slideId, simulation);
    }

    pauseSimulation(slideId) {
        const sim = this.simulations.get(slideId);
        if (sim && typeof sim.pause === 'function') {
            sim._wasRunning = sim.isRunning;
            sim.pause();
        }
    }

    resumeSimulation(slideId) {
        const sim = this.simulations.get(slideId);
        if (sim && typeof sim.resume === 'function' && sim._wasRunning) {
            sim.resume();
        }
    }

    // ==================== Event Bindings ====================

    isInputFocused() {
        const active = document.activeElement;
        if (!active) return false;
        const tag = active.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || active.isContentEditable;
    }

    bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Don't capture when typing in inputs
            if (this.isInputFocused()) return;

            // Close jump menu on Escape
            if (e.key === 'Escape' && this.jumpMenuOpen) {
                e.preventDefault();
                this.toggleJumpMenu(false);
                return;
            }

            // Don't navigate when jump menu is open (except Escape)
            if (this.jumpMenuOpen) return;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case ' ':
                case 'PageDown':
                    e.preventDefault();
                    this.next();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    this.prev();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goTo(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goTo(this.slides.length - 1);
                    break;
                case 'g':
                case 'G':
                    e.preventDefault();
                    this.toggleJumpMenu();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
            }

        });
    }

    bindTouch() {
        const container = document.querySelector('.slides-container') || document.body;

        container.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - this.touchStartX;
            const dy = e.changedTouches[0].clientY - this.touchStartY;

            // Only trigger on primarily horizontal swipes
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > this.options.swipeThreshold) {
                if (dx > 0) {
                    this.prev();
                } else {
                    this.next();
                }
            }
        }, { passive: true });
    }

    bindClick() {
        // Click navigation disabled - use keyboard or nav buttons instead
    }

    bindHashChange() {
        window.addEventListener('hashchange', () => this.handleHashChange());
    }

    handleHashChange() {
        const hash = window.location.hash.substring(1);
        if (!hash) return;

        // Try to find slide by ID
        const index = this.slides.findIndex(slide => slide.id === hash);
        if (index >= 0) {
            this.goTo(index, { updateHash: false });
            return;
        }

        // Try to parse as slide number (e.g., #3 or #slide-3)
        const numMatch = hash.match(/(\d+)$/);
        if (numMatch) {
            const num = parseInt(numMatch[1]) - 1;
            if (num >= 0 && num < this.slides.length) {
                this.goTo(num, { updateHash: false });
            }
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = SlideEngine;
}

// Make available globally
window.SlideEngine = SlideEngine;
