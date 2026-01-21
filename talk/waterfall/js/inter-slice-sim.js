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
        hideElement('interslice-ops');
        hideElement('interslice-limit');
        hideElement('interslice-guess');
    }

    function onStep(step) {
        if (step >= 1) showElement('interslice-ops');
        if (step >= 2) showElement('interslice-limit');
        if (step >= 3) showElement('interslice-guess');
    }

    function onStepBack(step) {
        if (step < 3) hideElement('interslice-guess');
        if (step < 2) hideElement('interslice-limit');
        if (step < 1) hideElement('interslice-ops');
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
