// Inter-slice simulation - step-based reveals
(function() {
    const slideId = 'inter-slice';

    function show(id) { const el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hide(id) { const el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    // Build order:
    // Step 0: Physics hat + rho formula (visible by default)
    // Step 1: Right column formulas (F_n, a(x), theta)
    // Step 2: "How good is the guess?"
    // Step 3: "But... this series does not even converge"
    // Step 4: "Series diverges mildly, as +c-c+c-c+c-..."
    // Step 5: "two-periodic" + rho_0/rho_1 formulas
    // Step 6: Numerical tables

    function reset() {
        hide('is-formulas');
        hide('is-defs');
        hide('is-howgood');
        hide('is-diverge');
        hide('is-mild');
        hide('is-limits');
        hide('is-tables');
    }

    function onStep(step) {
        if (step === 1) { show('is-formulas'); show('is-defs'); }
        if (step === 2) show('is-howgood');
        if (step === 3) show('is-diverge');
        if (step === 4) show('is-mild');
        if (step === 5) show('is-limits');
        if (step === 6) show('is-tables');
    }

    function onStepBack(step) {
        if (step === 0) { hide('is-formulas'); hide('is-defs'); }
        if (step === 1) hide('is-howgood');
        if (step === 2) hide('is-diverge');
        if (step === 3) hide('is-mild');
        if (step === 4) hide('is-limits');
        if (step === 5) hide('is-tables');
    }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 6,
                onStep,
                onStepBack,
                reset,
                onSlideEnter() { },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
