/**
 * Hard to Sample Slide — Minimal Stub
 * Placeholder simulation that draws a message on the canvas.
 *
 * Slide ID: 'hard-to-sample'
 * Canvas ID: hard-to-sample-canvas
 * Status: hard-to-sample-status
 */

(function initHardToSampleSim() {
    if (!window.slideEngine) {
        setTimeout(initHardToSampleSim, 50);
        return;
    }

    const canvas = document.getElementById('hard-to-sample-canvas');
    const statusEl = document.getElementById('hard-to-sample-status');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    function drawPlaceholder() {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#999';
        ctx.font = Math.round(h * 0.04) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Hard to sample — simulation placeholder', w / 2, h / 2);
    }

    window.slideEngine.registerSimulation('hard-to-sample', {
        steps: 0,

        onSlideEnter: function() {
            console.log('[hard-to-sample] onSlideEnter');
            drawPlaceholder();
        },

        onSlideLeave: function() {
            console.log('[hard-to-sample] onSlideLeave');
        },

        onStep: function(step) {
            console.log('[hard-to-sample] onStep(' + step + ')');
        },

        onStepBack: function(step) {
            console.log('[hard-to-sample] onStepBack(' + step + ')');
        },

        reset: function() {
            console.log('[hard-to-sample] reset');
            drawPlaceholder();
            if (statusEl) statusEl.textContent = '';
        }
    }, 0);
})();
