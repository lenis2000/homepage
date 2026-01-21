// Dimensional Collapse slide - step-based reveals (static image version)
(function() {
    const slideId = 'dimensional-collapse';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('collapse-why');
        hideElement('collapse-consequence');
    }

    function onStep(step) {
        if (step >= 1) showElement('collapse-why');
        if (step >= 2) showElement('collapse-consequence');
    }

    function onStepBack(step) {
        if (step < 2) hideElement('collapse-consequence');
        if (step < 1) hideElement('collapse-why');
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
