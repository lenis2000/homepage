(function initComputationalSim() {
    if (!window.slideEngine) {
        setTimeout(initComputationalSim, 50);
        return;
    }

    function showElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '1'; }
    function hideElement(id) { var el = document.getElementById(id); if (el) el.style.opacity = '0'; }

    window.slideEngine.registerSimulation('computational', {
        steps: 4,
        onSlideEnter: function() {},
        onSlideLeave: function() {},
        onStep: function(step) {
            if (step === 2) showElement('comp-cftp');
            if (step === 3) showElement('comp-why-works');
            if (step === 4) showElement('comp-why-fails');
        },
        onStepBack: function(step) {
            if (step === 2) hideElement('comp-cftp');
            if (step === 3) hideElement('comp-why-works');
            if (step === 4) hideElement('comp-why-fails');
        },
        reset: function() {
            hideElement('comp-cftp');
            hideElement('comp-why-works');
            hideElement('comp-why-fails');
        }
    }, 0);
})();
