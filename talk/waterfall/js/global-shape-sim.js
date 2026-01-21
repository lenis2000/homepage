// Global Shape slide - step-based reveals (static image version)
(function() {
    const slideId = 'global-shape';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('global-shape-mechanism');
        hideElement('global-shape-regions');
    }

    function onStep(step) {
        if (step >= 1) showElement('global-shape-mechanism');
        if (step >= 2) showElement('global-shape-regions');
    }

    function onStepBack(step) {
        if (step < 2) hideElement('global-shape-regions');
        if (step < 1) hideElement('global-shape-mechanism');
    }

    // Wait for slide engine
    function init() {
        if (!window.slideEngine) {
            setTimeout(init, 50);
            return;
        }

        window.slideEngine.registerSimulation(slideId, {
            start() { },
            pause() { },
            steps: 2,
            onStep,
            onStepBack,
            onSlideEnter() { reset(); },
            onSlideLeave() { }
        }, 0);
    }
    init();
})();
