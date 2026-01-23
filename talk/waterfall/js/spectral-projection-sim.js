// Spectral Projection slide - step-based reveals
(function() {
    const slideId = 'spectral-projection';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('sp-limit');
        hideElement('sp-sine');
        hideElement('sp-refs');
    }

    function onStep(step) {
        // Step 1: Show limit and sine kernel
        if (step >= 1) {
            showElement('sp-limit');
            showElement('sp-sine');
        }
        // Step 2: Show references
        if (step >= 2) showElement('sp-refs');
    }

    function onStepBack(step) {
        if (step < 2) hideElement('sp-refs');
        if (step < 1) {
            hideElement('sp-limit');
            hideElement('sp-sine');
        }
    }

    // Register with slide engine (with retry for load timing)
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 2,
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
