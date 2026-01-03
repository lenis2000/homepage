/**
 * Slide Engine for Interactive Presentations
 *
 * Features:
 * - Arrow key navigation
 * - Hash-based routing (#slide-N)
 * - Jump menu (press G)
 * - Fullscreen toggle (press F)
 * - Build order overlay (press P) - shows all slides with fragments/simulations
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
        this.currentSimStep = 0;      // Current simulation step within slide
        this.simulations = new Map(); // slideId -> array of {sim, step}
        this.jumpMenuOpen = false;
        this.buildOverlayOpen = false;
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

        // Add accessibility attributes to slides
        this.slides.forEach((slide, index) => {
            slide.setAttribute('role', 'region');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', slide.dataset.title || `Slide ${index + 1}`);
            slide.setAttribute('aria-hidden', 'true');
        });

        // Create live region for announcements
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('role', 'status');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only';
        document.body.appendChild(this.liveRegion);

        // Build UI components
        this.buildProgressBar();
        this.buildNavigation();
        this.buildJumpMenu();
        this.buildBuildOverlay();

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
            nav.setAttribute('aria-label', 'Slide navigation');
            document.body.appendChild(nav);
        }

        // Create dots container
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'slide-dots';

        // Create a dot for each slide
        this.slides.forEach((slide, index) => {
            const dot = document.createElement('div');
            dot.className = 'slide-dot';
            dot.setAttribute('role', 'button');
            dot.setAttribute('aria-label', `Go to slide ${index + 1}: ${slide.dataset.title || ''}`);
            dot.addEventListener('click', () => this.goTo(index));
            dotsContainer.appendChild(dot);
        });

        nav.appendChild(dotsContainer);

        // Add prev button (direct slide skip)
        const prevBtn = document.createElement('button');
        prevBtn.className = 'slide-prev-direct';
        prevBtn.setAttribute('aria-label', 'Previous slide');
        prevBtn.innerHTML = '&#9664;';
        prevBtn.addEventListener('click', () => this.goTo(this.current - 1));
        nav.appendChild(prevBtn);

        // Add counter
        const counter = document.createElement('span');
        counter.className = 'slide-counter';
        counter.textContent = `1/${this.slides.length}`;
        nav.appendChild(counter);

        // Add next button (direct slide skip)
        const nextBtn = document.createElement('button');
        nextBtn.className = 'slide-next-direct';
        nextBtn.setAttribute('aria-label', 'Next slide');
        nextBtn.innerHTML = '&#9654;';
        nextBtn.addEventListener('click', () => this.goTo(this.current + 1));
        nav.appendChild(nextBtn);

        // Add menu button
        const menuBtn = document.createElement('button');
        menuBtn.className = 'slide-menu';
        menuBtn.setAttribute('aria-label', 'Jump to slide');
        menuBtn.innerHTML = '&#9776;';
        menuBtn.addEventListener('click', () => this.toggleJumpMenu());
        nav.appendChild(menuBtn);

        this.dotsContainer = dotsContainer;
        this.counter = counter;
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
            item.setAttribute('tabindex', '0');
            item.setAttribute('role', 'button');
            item.setAttribute('aria-label', `Go to slide ${index + 1}: ${title}`);
            item.innerHTML = `
                <div class="slide-jump-number">${index + 1}</div>
                <div class="slide-jump-title">${title}</div>
            `;
            item.addEventListener('click', () => {
                this.goTo(index);
                this.toggleJumpMenu(false);
            });
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.goTo(index);
                    this.toggleJumpMenu(false);
                }
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

    buildBuildOverlay() {
        let overlay = document.querySelector('.slide-build-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'slide-build-overlay';
            overlay.hidden = true;
            document.body.appendChild(overlay);
        }
        this.buildOverlay = overlay;

        // Close on background click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.toggleBuildOverlay(false);
            }
        });
    }

    updateBuildOverlay() {
        if (!this.buildOverlay) return;

        let html = '<div class="slide-build-content">';
        html += '<h2>Build Order Overview <span style="font-weight:normal;font-size:0.7em">(press P to close)</span></h2>';

        this.slides.forEach((slide, index) => {
            const slideId = slide.id || `slide-${index + 1}`;
            const title = slide.dataset.title || `Slide ${index + 1}`;
            const fragments = this.getFragments(slide);
            const sims = this.getSimsForSlide(slideId);

            // Collect all build steps for this slide
            const buildSteps = [];

            // Fragments (each is a step)
            fragments.forEach((frag, i) => {
                const text = frag.textContent.substring(0, 50).trim() || '(fragment)';
                const classes = Array.from(frag.classList).filter(c => c !== 'fragment' && c !== 'visible').join(' ');
                buildSteps.push({
                    type: 'fragment',
                    order: i + 1,
                    label: `Fragment ${i + 1}${classes ? ` [${classes}]` : ''}: "${text}${frag.textContent.length > 50 ? '...' : ''}"`
                });
            });

            // Simulations
            sims.forEach(({ sim, step }) => {
                const stepLabel = step === 0 ? 'auto' : step;
                const stepsCount = sim.steps ? ` (${sim.steps} phases)` : '';
                buildSteps.push({
                    type: 'simulation',
                    order: step,
                    label: `Sim step=${stepLabel}${stepsCount}`
                });
            });

            // Sort by order
            buildSteps.sort((a, b) => a.order - b.order);

            const isCurrent = index === this.current;
            html += `<div class="slide-build-item${isCurrent ? ' current' : ''}">`;
            html += `<div class="slide-build-header" onclick="window.slideEngine.goTo(${index}); window.slideEngine.toggleBuildOverlay(false);">`;
            html += `<span class="slide-build-num">${index + 1}</span>`;
            html += `<span class="slide-build-title">${title}</span>`;
            html += `<span class="slide-build-id">#${slideId}</span>`;
            html += '</div>';

            if (buildSteps.length > 0) {
                html += '<ul class="slide-build-steps">';
                buildSteps.forEach(step => {
                    const icon = step.type === 'fragment' ? '&#9654;' : '&#9881;';
                    const typeClass = step.type === 'fragment' ? 'fragment-step' : 'sim-step';
                    html += `<li class="${typeClass}"><span class="step-icon">${icon}</span> ${step.label}</li>`;
                });
                html += '</ul>';
            } else {
                html += '<div class="slide-build-empty">No fragments or simulations</div>';
            }

            html += '</div>';
        });

        html += '</div>';
        this.buildOverlay.innerHTML = html;
    }

    toggleBuildOverlay(forceState) {
        const shouldOpen = forceState !== undefined ? forceState : !this.buildOverlayOpen;
        this.buildOverlayOpen = shouldOpen;

        if (shouldOpen) {
            this.updateBuildOverlay();
        }
        this.buildOverlay.hidden = !shouldOpen;
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
        // Then try to advance simulation step
        if (this.nextSimStep()) {
            return;
        }
        // No more fragments or sim steps, go to next slide
        if (this.current < this.slides.length - 1) {
            this.goTo(this.current + 1);
        }
    }

    prev() {
        // First try to go back simulation step
        if (this.prevSimStep()) {
            return;
        }
        // Then try to hide current fragment
        if (this.prevFragment()) {
            return;
        }
        // No sim steps or fragments to hide, go to previous slide
        if (this.current > 0) {
            this.goTo(this.current - 1, { showAllFragments: true, showAllSims: true });
        }
    }

    goTo(index, options = {}) {
        const opts = { updateHash: true, showAllFragments: false, showAllSims: false, ...options };
        if (index < 0 || index >= this.slides.length) return;
        if (index === this.current && this.slides[this.current].classList.contains('active')) return;

        const prevSlide = this.slides[this.current];
        const nextSlide = this.slides[index];

        // Pause simulation on previous slide
        this.pauseAllSimulations(prevSlide.id);

        // Reset fragments on previous slide (hide all)
        this.showFragmentsUpTo(prevSlide, 0);

        // Update visibility and accessibility
        prevSlide.classList.remove('active');
        prevSlide.setAttribute('aria-hidden', 'true');
        nextSlide.classList.add('active');
        nextSlide.setAttribute('aria-hidden', 'false');
        nextSlide.scrollTop = 0; // Start from top

        this.current = index;

        // Announce slide change to screen readers
        this.announce(`Slide ${index + 1} of ${this.slides.length}: ${nextSlide.dataset.title || ''}`);

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

        // Handle simulations on new slide
        const maxSimStep = this.getMaxSimStep(nextSlide.id);
        if (opts.showAllSims) {
            // Coming from next slide - start all sims
            this.currentSimStep = maxSimStep;
            this.startSimulationsUpToStep(nextSlide.id, maxSimStep);
        } else {
            // Coming from previous slide - all sims paused, step 0
            this.currentSimStep = 0;
            this.pauseAllSimulations(nextSlide.id);
            // Start step-0 sims (auto-start)
            this.startSimulationsUpToStep(nextSlide.id, 0);
        }

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

    // ==================== Accessibility ====================

    announce(message) {
        if (this.liveRegion) {
            this.liveRegion.textContent = message;
        }
    }

    // ==================== UI Updates ====================

    updateProgress() {
        if (!this.progressBar) return;
        const progress = ((this.current + 1) / this.slides.length) * 100;
        this.progressBar.style.width = `${progress}%`;
    }

    updateCounter() {
        // Update dots - highlight current
        if (this.dotsContainer) {
            const dots = this.dotsContainer.querySelectorAll('.slide-dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === this.current);
            });
        }
        // Update counter text
        if (this.counter) {
            this.counter.textContent = `${this.current + 1}/${this.slides.length}`;
        }
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

    // Register simulation with optional step (1-based, 0 means start immediately)
    registerSimulation(slideId, simulation, step = 0) {
        if (!this.simulations.has(slideId)) {
            this.simulations.set(slideId, []);
        }
        this.simulations.get(slideId).push({ sim: simulation, step: step });
        // Sort by step
        this.simulations.get(slideId).sort((a, b) => a.step - b.step);
    }

    getSimsForSlide(slideId) {
        return this.simulations.get(slideId) || [];
    }

    getMaxSimStep(slideId) {
        const sims = this.getSimsForSlide(slideId);
        if (sims.length === 0) return 0;
        // Consider both legacy 'step' (single step number) and new 'steps' (total step count)
        return Math.max(...sims.map(s => s.sim.steps || s.step || 0));
    }

    pauseAllSimulations(slideId) {
        const sims = this.getSimsForSlide(slideId);
        sims.forEach(({ sim }) => {
            if (typeof sim.pause === 'function') {
                sim.pause();
            }
        });
    }

    startSimulationsUpToStep(slideId, step) {
        const sims = this.getSimsForSlide(slideId);
        sims.forEach(({ sim, step: simStep }) => {
            if (simStep <= step && simStep > 0) {
                if (typeof sim.start === 'function') sim.start();
            } else if (simStep === 0) {
                // Step 0 means auto-start on slide enter
                if (typeof sim.start === 'function') sim.start();
            } else {
                if (typeof sim.pause === 'function') sim.pause();
            }
        });
    }

    // Returns true if there was a simulation step to advance
    nextSimStep() {
        const slideId = this.slides[this.current].id;
        const maxStep = this.getMaxSimStep(slideId);

        if (this.currentSimStep < maxStep) {
            this.currentSimStep++;
            const sims = this.getSimsForSlide(slideId);

            sims.forEach(({ sim, step: registeredStep }) => {
                if (typeof sim.onStep === 'function') {
                    // New API: call onStep with current step number
                    sim.onStep(this.currentSimStep);
                } else {
                    // Legacy API: start sim when current step reaches its registered step
                    if (this.currentSimStep === registeredStep && typeof sim.start === 'function') {
                        sim.start();
                    }
                }
            });
            return true;
        }
        return false;
    }

    // Returns true if there was a simulation step to go back
    prevSimStep() {
        const slideId = this.slides[this.current].id;

        if (this.currentSimStep > 0) {
            const prevStep = this.currentSimStep;
            this.currentSimStep--;
            const sims = this.getSimsForSlide(slideId);

            sims.forEach(({ sim, step: registeredStep }) => {
                if (typeof sim.onStepBack === 'function') {
                    // New API: call onStepBack with current step number
                    sim.onStepBack(this.currentSimStep);
                } else {
                    // Legacy API: pause sim when going below its registered step
                    if (prevStep === registeredStep && typeof sim.pause === 'function') {
                        sim.pause();
                    }
                }
            });
            return true;
        }
        return false;
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

            // Close overlays on Escape
            if (e.key === 'Escape') {
                if (this.buildOverlayOpen) {
                    e.preventDefault();
                    this.toggleBuildOverlay(false);
                    return;
                }
                if (this.jumpMenuOpen) {
                    e.preventDefault();
                    this.toggleJumpMenu(false);
                    return;
                }
            }

            // Don't navigate when overlays are open (except Escape)
            if (this.jumpMenuOpen || this.buildOverlayOpen) return;

            switch (e.key) {
                case 'ArrowRight':
                    // Cmd+Right on Mac = End (go to last slide)
                    if (e.metaKey) {
                        e.preventDefault();
                        this.goTo(this.slides.length - 1);
                        return;
                    }
                    e.preventDefault();
                    this.next();
                    break;
                case 'ArrowDown':
                case ' ':
                case 'PageDown':
                    e.preventDefault();
                    this.next();
                    break;
                case 'ArrowLeft':
                    // Cmd+Left on Mac = Home (go to first slide)
                    if (e.metaKey) {
                        e.preventDefault();
                        this.goTo(0);
                        return;
                    }
                    e.preventDefault();
                    this.prev();
                    break;
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
                case 'p':
                case 'P':
                    e.preventDefault();
                    this.toggleBuildOverlay();
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

/**
 * Helper to create and register a canvas simulation with minimal boilerplate.
 *
 * Usage:
 *   SlideSimulation.create({
 *       canvasId: 'my-canvas',
 *       slideId: 'my-slide',
 *       step: 1,  // 0 = auto-start, 1+ = starts on Nth arrow
 *       init(ctx, canvas) { ... },      // Called once on setup
 *       draw(ctx, canvas) { ... },      // Called every frame
 *       update(dt) { ... },             // Called every frame before draw
 *       reset() { ... }                 // Optional: called on reset
 *   });
 */
class SlideSimulation {
    static create(config) {
        const canvas = document.getElementById(config.canvasId);
        if (!canvas) {
            console.warn(`SlideSimulation: Canvas #${config.canvasId} not found`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        const sim = {
            canvas,
            ctx,
            isRunning: false,
            animationId: null,
            lastTime: 0,
            // Merge any custom properties from config
            ...Object.fromEntries(
                Object.entries(config).filter(([k]) =>
                    !['canvasId', 'slideId', 'step', 'steps', 'init', 'draw', 'update', 'reset', 'onStart', 'onPause', 'onStep', 'onStepBack'].includes(k)
                )
            ),

            // Expose lifecycle methods so they can be called via this.draw(), this.init(), etc.
            init() {
                if (config.init) config.init.call(sim, ctx, canvas);
            },

            draw() {
                if (config.draw) config.draw.call(sim, ctx, canvas);
            },

            update(dt) {
                if (config.update) config.update.call(sim, dt);
            },

            start() {
                if (sim.isRunning) return;
                sim.isRunning = true;
                sim.lastTime = performance.now();
                sim.animate();
                if (config.onStart) config.onStart();
            },

            pause() {
                sim.isRunning = false;
                if (sim.animationId) {
                    cancelAnimationFrame(sim.animationId);
                    sim.animationId = null;
                }
                if (config.onPause) config.onPause();
            },

            toggle() {
                sim.isRunning ? sim.pause() : sim.start();
            },

            reset() {
                sim.pause();
                if (config.reset) config.reset.call(sim);
                sim.init();
                sim.draw();
            },

            animate() {
                if (!sim.isRunning) return;
                const now = performance.now();
                const dt = (now - sim.lastTime) / 1000;
                sim.lastTime = now;

                sim.update(dt);
                sim.draw();

                sim.animationId = requestAnimationFrame(() => sim.animate());
            }
        };

        // Initialize
        sim.init();
        sim.draw();

        // Click to toggle
        canvas.style.cursor = 'pointer';
        canvas.addEventListener('click', () => sim.toggle());

        // Auto-register with slide engine
        function register() {
            if (window.slideEngine && config.slideId !== undefined) {
                // Build simulation interface
                const simInterface = {
                    get isRunning() { return sim.isRunning; },
                    start: () => sim.start(),
                    pause: () => sim.pause()
                };

                // Add multi-step support if configured
                if (config.steps) {
                    simInterface.steps = config.steps;
                }
                if (config.onStep) {
                    simInterface.onStep = (step) => config.onStep.call(sim, step);
                }
                if (config.onStepBack) {
                    simInterface.onStepBack = (step) => config.onStepBack.call(sim, step);
                }

                window.slideEngine.registerSimulation(config.slideId, simInterface, config.step || 0);
            } else {
                // Retry shortly - slideEngine might not be initialized yet
                setTimeout(register, 50);
            }
        }

        // Try to register immediately or after a short delay
        setTimeout(register, 10);

        return sim;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { SlideEngine, SlideSimulation };
}

// Make available globally
window.SlideEngine = SlideEngine;
window.SlideSimulation = SlideSimulation;
