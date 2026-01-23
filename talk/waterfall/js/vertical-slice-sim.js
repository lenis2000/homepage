// Vertical Slice simulation - step-based reveals (no canvas)
(function() {
    const slideId = 'vertical-slice';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('vs-answer');
        hideElement('vs-operators');
        hideElement('vs-problem');
        hideElement('vs-conclusion');
    }

    function onStep(step) {
        if (step >= 1) showElement('vs-answer');
        if (step >= 2) showElement('vs-operators');
        if (step >= 3) showElement('vs-problem');
        if (step >= 4) showElement('vs-conclusion');
    }

    function onStepBack(step) {
        if (step < 4) hideElement('vs-conclusion');
        if (step < 3) hideElement('vs-problem');
        if (step < 2) hideElement('vs-operators');
        if (step < 1) hideElement('vs-answer');
    }

    // Register with slide engine (with retry for load timing)
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 4,
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
