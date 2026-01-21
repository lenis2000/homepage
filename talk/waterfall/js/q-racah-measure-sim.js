/**
 * q-Racah Measure Slide - No transitions, all content visible at once
 */

(function initQRacahMeasureSim() {
    if (!window.slideEngine) {
        setTimeout(initQRacahMeasureSim, 50);
        return;
    }

    window.slideEngine.registerSimulation('q-racah-measure', {
        start() {},
        pause() {}
    }, 0);
})();
