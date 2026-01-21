// Barcode Conjecture slide - step-based reveals
(function() {
    const slideId = 'barcode-conjecture';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('conjecture-statement');
        hideElement('conjecture-evidence');
        hideElement('conjecture-open');
    }

    function onStep(step) {
        if (step >= 1) showElement('conjecture-statement');
        if (step >= 2) showElement('conjecture-evidence');
        if (step >= 3) showElement('conjecture-open');
    }

    function onStepBack(step) {
        if (step < 3) hideElement('conjecture-open');
        if (step < 2) hideElement('conjecture-evidence');
        if (step < 1) hideElement('conjecture-statement');
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
