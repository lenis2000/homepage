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
        hideElement('spectral-proj-def');
        hideElement('spectral-interval');
        hideElement('discrete-sine');
    }

    function onStep(step) {
        if (step >= 1) showElement('spectral-proj-def');
        if (step >= 2) showElement('spectral-interval');
        if (step >= 3) showElement('discrete-sine');
    }

    function onStepBack(step) {
        if (step < 3) hideElement('discrete-sine');
        if (step < 2) hideElement('spectral-interval');
        if (step < 1) hideElement('spectral-proj-def');
    }

    // Register with slide engine
    if (window.slideEngine) {
        window.slideEngine.registerSimulation(slideId, {
            start() { },
            pause() { },
            steps: 3,
            onStep,
            onStepBack,
            onSlideEnter() { reset(); },
            onSlideLeave() { }
        }, 0);
    }
})();
