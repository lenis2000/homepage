// q-Racah OPE slide - no steps, all visible at once
(function() {
    const slideId = 'qracah-ope';

    // Register with slide engine (with retry for load timing)
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 0,
                onStep() { },
                onStepBack() { },
                onSlideEnter() { },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
