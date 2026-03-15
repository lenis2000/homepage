// q-Racah OPE slide - 2 build steps
(function() {
    const slideId = 'qracah-ope';

    function show(id) { const el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hide(id) { const el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: 2,
                onStep(step) {
                    if (step === 1) show('ope-kernel');
                    if (step === 2) show('ope-spectral');
                },
                onStepBack(step) {
                    if (step === 0) hide('ope-kernel');
                    if (step === 1) hide('ope-spectral');
                },
                reset() {
                    hide('ope-kernel');
                    hide('ope-spectral');
                },
                onSlideEnter() { },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
