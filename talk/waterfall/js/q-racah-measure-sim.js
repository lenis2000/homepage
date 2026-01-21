/**
 * q-Racah Measure Slide - Step handlers for reveals
 */

(function initQRacahMeasureSim() {
    if (!window.slideEngine) {
        setTimeout(initQRacahMeasureSim, 50);
        return;
    }

    const interpolationEl = document.getElementById('qracah-interpolation');
    const refsEl = document.getElementById('qracah-refs');
    const questionEl = document.getElementById('qracah-question');

    function reset() {
        if (interpolationEl) interpolationEl.style.opacity = '0';
        if (refsEl) refsEl.style.opacity = '0';
        if (questionEl) questionEl.style.opacity = '0';
    }

    window.slideEngine.registerSimulation('q-racah-measure', {
        start() {},
        pause() {},
        steps: 3,
        onStep(step) {
            if (step === 1 && interpolationEl) {
                interpolationEl.style.opacity = '1';
            } else if (step === 2 && refsEl) {
                refsEl.style.opacity = '1';
            } else if (step === 3 && questionEl) {
                questionEl.style.opacity = '1';
            }
        },
        onStepBack(step) {
            if (step === 0) {
                reset();
            } else if (step === 1) {
                if (refsEl) refsEl.style.opacity = '0';
                if (questionEl) questionEl.style.opacity = '0';
            } else if (step === 2) {
                if (questionEl) questionEl.style.opacity = '0';
            }
        },
        onSlideEnter() {
            reset();
        },
        onSlideLeave() {
            reset();
        }
    }, 0);
})();
