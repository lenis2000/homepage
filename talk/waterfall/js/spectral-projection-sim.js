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
        hideElement('spectral-olshanski');
        hideElement('spectral-kernel');
        hideElement('spectral-convergence');
        hideElement('spectral-fixedq');
        hideElement('spectral-interslice');
        hideElement('spectral-interslice-formulas');
    }

    function onStep(step) {
        // Step 1: Show spectral projection explanation and kernel formula
        if (step >= 1) {
            showElement('spectral-kernel');
            showElement('spectral-olshanski');
        }
        // Step 2: Show convergence statement
        if (step >= 2) showElement('spectral-convergence');
        // Step 3: KEY INSIGHT - fixed q converges to 0 or identity
        if (step >= 3) showElement('spectral-fixedq');
        // Step 4: Transition to inter-slice operators
        if (step >= 4) showElement('spectral-interslice');
        // Step 5: Show inter-slice formulas
        if (step >= 5) showElement('spectral-interslice-formulas');
    }

    function onStepBack(step) {
        if (step < 5) hideElement('spectral-interslice-formulas');
        if (step < 4) hideElement('spectral-interslice');
        if (step < 3) hideElement('spectral-fixedq');
        if (step < 2) hideElement('spectral-convergence');
        if (step < 1) {
            hideElement('spectral-kernel');
            hideElement('spectral-olshanski');
        }
    }

    // Register with slide engine
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
    }
})();
