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
        hideElement('ope-askey');
        hideElement('ope-askey-caption');
        hideElement('ope-formula');
        hideElement('ope-weight');
        hideElement('ope-parameters');
        hideElement('ope-concentration');
        hideElement('ope-notation');
    }

    function onStep(step) {
        // Step 1: Show Askey scheme and joint density formula
        if (step >= 1) {
            showElement('ope-askey');
            showElement('ope-askey-caption');
            showElement('ope-formula');
        }
        // Step 2: Show weight function and notation
        if (step >= 2) {
            showElement('ope-weight');
            showElement('ope-notation');
        }
        // Step 3: Show parameters
        if (step >= 3) showElement('ope-parameters');
        // Step 4: Show concentration result
        if (step >= 4) showElement('ope-concentration');
    }

    function onStepBack(step) {
        if (step < 4) hideElement('ope-concentration');
        if (step < 3) hideElement('ope-parameters');
        if (step < 2) {
            hideElement('ope-weight');
            hideElement('ope-notation');
        }
        if (step < 1) {
            hideElement('ope-askey');
            hideElement('ope-askey-caption');
            hideElement('ope-formula');
        }
    }

    // Register with slide engine
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
    }
})();
