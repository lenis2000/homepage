// Inter-slice simulation - step-based reveals
(function() {
    const slideId = 'inter-slice';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('interslice-bounded');
        hideElement('interslice-physics');
        hideElement('interslice-recurrence');
        hideElement('interslice-eigenfunction');
        hideElement('interslice-density');
    }

    function onStep(step) {
        // Step 1: Show "very bounded" / "very unbounded" insight
        if (step >= 1) showElement('interslice-bounded');
        // Step 2: Physics approach
        if (step >= 2) showElement('interslice-physics');
        // Step 3: Three-term recurrence
        if (step >= 3) showElement('interslice-recurrence');
        // Step 4: Eigenfunction formula
        if (step >= 4) showElement('interslice-eigenfunction');
        // Step 5: Barcode density formula
        if (step >= 5) showElement('interslice-density');
    }

    function onStepBack(step) {
        if (step < 5) hideElement('interslice-density');
        if (step < 4) hideElement('interslice-eigenfunction');
        if (step < 3) hideElement('interslice-recurrence');
        if (step < 2) hideElement('interslice-physics');
        if (step < 1) hideElement('interslice-bounded');
    }

    // Register with slide engine (with retry for load timing)
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 5,
                onStep,
                onStepBack,
                onSlideEnter() { reset(); },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
