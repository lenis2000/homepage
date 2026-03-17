// q-Racah OPE slide - 1 build step
(function() {
    const slideId = 'qracah-ope';

    function show(id) { const el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hide(id) { const el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 0,
                reset() {},
                onSlideEnter() { },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
