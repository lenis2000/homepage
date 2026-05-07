// Bridge slide - step-based reveals for "Strategy" bullets and right column panes
(function() {
    const slideId = 'bridge-owps';

    function show(id) { const el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hide(id) { const el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    // Build order:
    // Step 0: Left "Just covered" pane + strategy header (visible by default)
    // Step 1: Strategy bullet 1 - Kasteleyn determinantal formula
    // Step 2: Strategy bullet 2 - Orthogonal polynomial ensemble
    // Step 3: Strategy bullet 3 - Inverse Kasteleyn
    // Step 4: Strategy bullet 4 - Take the limit
    // Step 5: Right pane (A) - Inside the conjecture
    // Step 6: Right pane (B) - Second half of this hour
    // Step 7: Right pane - Common theme

    function reset() {
        hide('bo-strat-1');
        hide('bo-strat-2');
        hide('bo-strat-3');
        hide('bo-strat-4');
        hide('bo-right-A');
        hide('bo-right-B');
        hide('bo-right-C');
    }

    function onStep(step) {
        if (step === 1) show('bo-strat-1');
        if (step === 2) show('bo-strat-2');
        if (step === 3) show('bo-strat-3');
        if (step === 4) show('bo-strat-4');
        if (step === 5) show('bo-right-A');
        if (step === 6) show('bo-right-B');
        if (step === 7) show('bo-right-C');
    }

    function onStepBack(step) {
        if (step === 0) hide('bo-strat-1');
        if (step === 1) hide('bo-strat-2');
        if (step === 2) hide('bo-strat-3');
        if (step === 3) hide('bo-strat-4');
        if (step === 4) hide('bo-right-A');
        if (step === 5) hide('bo-right-B');
        if (step === 6) hide('bo-right-C');
    }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 7,
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
