(function() {
    'use strict';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }
    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('summary-colloquium', {
                steps: 1,
                onStep(step) {
                    if (step === 1) showElement('summary-colloquium-question');
                },
                onStepBack(step) {
                    if (step === 0) hideElement('summary-colloquium-question');
                },
                reset() {
                    hideElement('summary-colloquium-question');
                }
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
})();
