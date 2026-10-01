// q-Racah OPE slide - 3 build steps
(function() {
    const slideId = 'qracah-ope';
    const stages = [
        ['ope-formula'],
        ['ope-weight', 'ope-parameters'],
        ['ope-corr', 'ope-kernel']
    ];

    function show(id) { const el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hide(id) { const el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    function setStep(step) {
        stages.forEach((ids, i) => ids.forEach(i < step ? show : hide));
    }

    function registerWithEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation(slideId, {
                start() { },
                pause() { },
                steps: stages.length,
                onStep(step) { setStep(step); },
                onStepBack(step) { setStep(step); },
                onSlideEnter() { setStep(0); },
                onSlideLeave() { }
            }, 0);
        } else {
            setTimeout(registerWithEngine, 50);
        }
    }
    registerWithEngine();
})();
