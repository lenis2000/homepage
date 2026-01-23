// Spectral Transversal simulation - no steps, all content visible at once
(function() {
    const slideId = 'spectral-transversal';

    // Register with slide engine (with retry for load timing)
    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 0,
                onSlideEnter() { },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
