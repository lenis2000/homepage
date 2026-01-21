// q-Racah OPE slide - step-based reveals
(function() {
    const slideId = 'qracah-ope';

    function showElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '1';
    }

    function hideElement(id) {
        const el = document.getElementById(id);
        if (el) el.style.opacity = '0';
    }

    function reset() {
        hideElement('ope-formula');
        hideElement('ope-parameters');
        hideElement('ope-concentration');
    }

    function onStep(step) {
        if (step >= 1) showElement('ope-formula');
        if (step >= 2) showElement('ope-parameters');
        if (step >= 3) showElement('ope-concentration');
    }

    function onStepBack(step) {
        if (step < 3) hideElement('ope-concentration');
        if (step < 2) hideElement('ope-parameters');
        if (step < 1) hideElement('ope-formula');
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
