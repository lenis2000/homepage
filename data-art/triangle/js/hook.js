// Triangle data-art hook background — drifting lozenge particle animation
(function() {
    'use strict';

    let hookBg = null;
    let hookCtx = null;
    let hookAnimId = null;

    function initHookBg() {
        if (!hookBg) return;
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        hookBg.width = w * dpr;
        hookBg.height = h * dpr;
        hookCtx.scale(dpr, dpr);
    }

    const NUM_PARTICLES = 60;
    const particles = [];

    function seedParticles() {
        particles.length = 0;
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < NUM_PARTICLES; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: 8 + Math.random() * 25,
                rotation: Math.random() * Math.PI * 2,
                drift: 0.06 + Math.random() * 0.14,
                rotSpeed: (Math.random() - 0.5) * 0.003,
                alpha: 0.04 + Math.random() * 0.08
            });
        }
    }

    function drawLozenge(cx, cy, size, rotation, alpha) {
        const aspect = 0.58;
        hookCtx.save();
        hookCtx.translate(cx, cy);
        hookCtx.rotate(rotation);
        hookCtx.beginPath();
        hookCtx.moveTo(0, -size);
        hookCtx.lineTo(size * aspect, 0);
        hookCtx.lineTo(0, size);
        hookCtx.lineTo(-size * aspect, 0);
        hookCtx.closePath();
        hookCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        hookCtx.fill();
        hookCtx.restore();
    }

    function animateHookBg() {
        if (!hookCtx) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        hookCtx.clearRect(0, 0, w, h);

        for (const p of particles) {
            p.y -= p.drift;
            p.rotation += p.rotSpeed;
            if (p.y < -p.size * 2) {
                p.y = h + p.size * 2;
                p.x = Math.random() * w;
            }
            drawLozenge(p.x, p.y, p.size, p.rotation, p.alpha);
        }
        hookAnimId = requestAnimationFrame(animateHookBg);
    }

    function startHookBg(canvasEl) {
        if (hookAnimId) {
            cancelAnimationFrame(hookAnimId);
            hookAnimId = null;
        }
        hookBg = canvasEl || document.getElementById('hook-bg');
        hookCtx = hookBg.getContext('2d');
        initHookBg();
        seedParticles();
        animateHookBg();
    }

    function stopHookBg() {
        if (hookAnimId) {
            cancelAnimationFrame(hookAnimId);
            hookAnimId = null;
        }
        hookBg = null;
        hookCtx = null;
    }

    window.HookBackground = {
        start: startHookBg,
        stop: stopHookBg,
        resizeIfRunning: function() {
            if (hookAnimId) {
                initHookBg();
                seedParticles();
            }
        }
    };
})();
