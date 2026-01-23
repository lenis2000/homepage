// Barcode Process slide - step-based reveals (no canvas)
(function() {
    const slideId = 'barcode-process';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('barcode-interslice');
        hideElement('barcode-open');
    }

    function onStep(step) {
        if (step >= 1) showElement('barcode-interslice');
        if (step >= 2) showElement('barcode-open');
    }

    function onStepBack(step) {
        if (step < 2) hideElement('barcode-open');
        if (step < 1) hideElement('barcode-interslice');
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
