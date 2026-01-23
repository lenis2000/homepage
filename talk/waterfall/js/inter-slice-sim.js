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
        // Hide all step-dependent elements
        hideElement('is-diverge');
        hideElement('is-mild');
        hideElement('is-limits');
        hideElement('is-tables');
    }

    // Build order:
    // Step 0: All bullets through "How good is the guess?" + 2 formula panes (visible by default)
    // Step 1: "But... this series does not even converge"
    // Step 2: "Series diverges mildly, as +c-c+c-c+c-..."
    // Step 3: "two-periodic" + rho_0/rho_1 formulas (combined pane)
    // Step 4: Numerical tables

    function onStep(step) {
        if (step === 1) {
            showElement('is-diverge');
        }
        if (step === 2) {
            showElement('is-mild');
        }
        if (step === 3) {
            showElement('is-limits');
        }
        if (step === 4) {
            showElement('is-tables');
        }
    }

    function onStepBack(step) {
        if (step === 0) {
            hideElement('is-diverge');
        }
        if (step === 1) {
            hideElement('is-mild');
        }
        if (step === 2) {
            hideElement('is-limits');
        }
        if (step === 3) {
            hideElement('is-tables');
        }
    }

    // Register with slide engine
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 4,
                onStep: onStep,
                onStepBack: onStepBack,
                onSlideEnter() { reset(); },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
