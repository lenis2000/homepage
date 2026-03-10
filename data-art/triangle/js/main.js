// Triangle data-art main — state machine, render loop, initialization
(function() {
    'use strict';

    var TC = window.TriangleConfig;
    var STATES = TC.STATES;

    // ========================================================================
    // STATE
    // ========================================================================
    var currentState = STATES.HOOK;
    var sim = null;
    var activeTriangles = new Map();
    var animationId = null;
    var sonifier = null;
    var cubes = null;
    var surfaceBuilder = null;

    var animPhase = {
        chaosEnergy: 0,
        annealProgress: 0,
        time: 0
    };

    // Three.js state
    var scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    var surfaceMaterial = null, edgeMaterial = null;

    // Render loop state
    var lastTimestamp = 0;
    var stateStartTime = 0;
    var transformBlendComplete = false;
    var dumpedPreGlauber = false;
    var dumpedPostGlauber = false;

    // Timers
    var hookTimerId = null;
    var frozenTimers = [];

    var canvas = document.getElementById('canvas');

    // ========================================================================
    // THREE.JS SCENE SETUP
    // ========================================================================
    function initThreeScene() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

        var aspect = canvas.clientWidth / canvas.clientHeight || 1;
        camera = new THREE.OrthographicCamera(
            -TC.frustumSize * aspect / 2, TC.frustumSize * aspect / 2,
            TC.frustumSize / 2, -TC.frustumSize / 2,
            -5000, 6000
        );
        camera.up.set(0, 0, 1);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.rotateSpeed = 0.8;
        controls.panSpeed = 0.8;
        controls.zoomSpeed = 1.2;
        controls.enableRotate = false;
        controls.enablePan = false;
        controls.enableZoom = false;

        // Metallic lighting for dark background
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        var hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        var dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(15, 20, 5);
        scene.add(dir);
        var fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-10, 5, -5);
        scene.add(fill);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        surfaceMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: 0.3,
            metalness: 0.35,
            color: 0xddeeff
        });

        edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x000000, linewidth: 1, opacity: 0.8, transparent: true
        });
    }

    function disposeThreeScene() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        if (cubes) {
            cubes.dispose(meshGroup);
            cubes = null;
        }
        if (surfaceBuilder) {
            surfaceBuilder.dispose(meshGroup);
            surfaceBuilder = null;
        }
        if (surfaceMaterial) { surfaceMaterial.dispose(); surfaceMaterial = null; }
        if (edgeMaterial) { edgeMaterial.dispose(); edgeMaterial = null; }
        if (controls) { controls.dispose(); controls = null; }
        if (renderer) { renderer.dispose(); renderer = null; }
        scene = null; camera = null; meshGroup = null;
    }

    function resizeThreeScene() {
        if (!renderer || !camera) return;
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        var aspect = w / h;
        camera.left = -TC.frustumSize * aspect / 2;
        camera.right = TC.frustumSize * aspect / 2;
        camera.top = TC.frustumSize / 2;
        camera.bottom = -TC.frustumSize / 2;
        camera.updateProjectionMatrix();
    }

    // ========================================================================
    // STATE MACHINE
    // ========================================================================
    function onHookClick() {
        if (currentState === STATES.HOOK) enterLoading();
    }

    function enterHook() {
        console.log('[STATE] → HOOK');
        currentState = STATES.HOOK;
        var hookEl = document.getElementById('hook-screen');
        hookEl.style.display = 'flex';
        canvas.style.display = 'none';
        document.getElementById('vignette').style.display = 'none';

        // Reset hook text animations for re-entry
        var question = hookEl.querySelector('.question');
        var hint = hookEl.querySelector('.hint');
        question.style.animation = 'none';
        hint.style.animation = 'none';
        void question.offsetWidth;
        question.style.animation = '';
        hint.style.animation = '';

        window.HookBackground.start();

        if (hookTimerId) clearTimeout(hookTimerId);
        hookTimerId = setTimeout(function() {
            hookTimerId = null;
            if (currentState === STATES.HOOK) enterLoading();
        }, TC.HOOK_DURATION);

        hookEl.removeEventListener('click', onHookClick);
        hookEl.addEventListener('click', onHookClick);
    }

    function runCFTPAsync() {
        return new Promise(function(resolve) {
            sim.initCFTP();
            function step() {
                var result = sim.stepCFTP();
                console.log('CFTP:', result.status, 'T=' + result.T);
                if (result.status === 'coalesced') {
                    sim.finalizeCFTP();
                    resolve(true);
                } else if (result.status === 'in_progress' || result.status === 'not_coalesced') {
                    setTimeout(step, 0);
                } else {
                    console.warn('CFTP failed:', result);
                    sim.setQBias(TC.Q_CHAOS);
                    sim.step(50000);
                    sim.refreshDimers();
                    resolve(false);
                }
            }
            step();
        });
    }

    async function enterLoading() {
        console.log('[STATE] → LOADING');
        currentState = STATES.LOADING;
        if (hookTimerId) { clearTimeout(hookTimerId); hookTimerId = null; }
        window.HookBackground.stop();
        document.getElementById('hook-screen').style.display = 'none';
        document.getElementById('loading').textContent = 'Loading\u2026';
        document.getElementById('loading').style.display = 'block';

        // Initialize audio (requires user gesture)
        try {
            sonifier = new window.Sonifier();
            sonifier.init();
        } catch (e) {
            console.warn('Audio unavailable:', e);
            try { sonifier.destroy(); } catch(ignored) {}
            sonifier = null;
        }

        // Create WASM-backed simulator (async — loads modularized WASM)
        sim = await window.SimulatorInterface.create();

        setTimeout(async function() {
            try {
                // Generate scaled shape
                console.time('generateScaledShape');
                activeTriangles = await window.TriangleGeometry.generateScaledShape(sim);
                console.timeEnd('generateScaledShape');
                console.log('Triangle count:', activeTriangles.size);

                // Final init with scaled shape
                console.time('finalInit');
                sim.initFromTriangles(activeTriangles);
                console.timeEnd('finalInit');

                // Adjust hole height for impossible illusion
                console.time('holeSetup');
                var holeCount = sim.getHoleCount();
                if (holeCount > 0) {
                    var HOLE_HEIGHT_INCREASE = 8;
                    var initialInfo = sim.getAllHolesInfo();
                    for (var i = 0; i < holeCount; i++) {
                        var baseWinding = initialInfo.holes[i].currentWinding;
                        for (var s = 0; s < HOLE_HEIGHT_INCREASE; s++) {
                            var result = sim.adjustHoleWinding(i, +1);
                            if (!result.success) break;
                        }
                        sim.setHoleBaseHeight(i, baseWinding);
                    }
                }
                console.timeEnd('holeSetup');

                if (sim.isValid) {
                    // Run CFTP for exact uniform sample
                    console.time('CFTP');
                    await runCFTPAsync();
                    console.timeEnd('CFTP');
                    console.log('Dimer count:', sim.dimers.length);

                    // Init Three.js
                    canvas.style.display = 'block';
                    canvas.style.opacity = '1';
                    document.getElementById('vignette').style.display = 'block';
                    initThreeScene();

                    // Surface builder and camera positioning
                    surfaceBuilder = new window.SurfaceBuilder();
                    surfaceBuilder.positionCamera(sim.dimers, camera, controls, canvas);

                    // Setup flying cubes
                    cubes = new window.TrianglePhases.FlyingCubesManager();
                    cubes.setTargets(surfaceBuilder.computeTargets(sim.dimers));
                    cubes.init(sim.dimers, camera, controls, canvas, meshGroup);

                    // Hide loading, start
                    document.getElementById('loading').style.display = 'none';
                    enterFlyingCubes();
                } else {
                    document.getElementById('loading').textContent = 'Error: Invalid shape';
                    setTimeout(function() {
                        document.getElementById('loading').style.display = 'none';
                        if (sonifier) { sonifier.destroy(); sonifier = null; }
                        sim = null;
                        enterHook();
                    }, 3000);
                }
            } catch (err) {
                console.error('Error:', err);
                document.getElementById('loading').textContent = 'Error: ' + err.message;
                setTimeout(function() {
                    document.getElementById('loading').style.display = 'none';
                    if (sonifier) { sonifier.destroy(); sonifier = null; }
                    sim = null;
                    enterHook();
                }, 3000);
            }
        }, 50);
    }

    function enterFlyingCubes() {
        console.log('[STATE] → FLYING_CUBES');
        currentState = STATES.FLYING_CUBES;
        stateStartTime = performance.now();
        lastTimestamp = performance.now();

        if (sonifier) sonifier.setEntropy(1.0);
        animationId = requestAnimationFrame(renderFrame);
    }

    function enterAssembly() {
        console.log('[STATE] → ASSEMBLY');
        currentState = STATES.ASSEMBLY;
        stateStartTime = performance.now();
    }

    function enterTransforming() {
        console.log('[STATE] → TRANSFORMING');
        currentState = STATES.TRANSFORMING;
        stateStartTime = performance.now();
        transformBlendComplete = !cubes || !cubes.cubesMesh;
        dumpedPreGlauber = false;
        dumpedPostGlauber = false;

        // Build surface from current CFTP state; fade it in over cubes
        surfaceBuilder.buildSurfaceMesh(sim.dimers, false, meshGroup, surfaceMaterial, edgeMaterial);
        if (surfaceMaterial) {
            surfaceMaterial.transparent = true;
            surfaceMaterial.opacity = transformBlendComplete ? 1 : 0;
        }
        if (cubes && cubes.cubesMesh && cubes.cubesMesh.material) {
            cubes.cubesMesh.material.transparent = true;
            cubes.cubesMesh.material.opacity = 1;
            cubes.cubesMesh.material.depthWrite = false;
        }

        if (!dumpedPreGlauber) {
            surfaceBuilder.dumpSurfaceSnapshot('pre_glauber', sim, currentState);
            dumpedPreGlauber = true;
        }
        sim.setQBias(TC.Q_CHAOS);
    }

    function updateTransforming(elapsed) {
        animPhase.time = elapsed;
        var dynamicElapsed = Math.max(0, elapsed - TC.CUBE_SURFACE_BLEND_DURATION);

        if (!transformBlendComplete) {
            var blend = Math.min(1, elapsed / TC.CUBE_SURFACE_BLEND_DURATION);
            if (surfaceMaterial) surfaceMaterial.opacity = blend;
            if (cubes && cubes.cubesMesh && cubes.cubesMesh.material) cubes.cubesMesh.material.opacity = 1 - blend;
            if (blend >= 1) {
                if (cubes) {
                    cubes.dispose(meshGroup);
                    cubes = null;
                }
                if (surfaceMaterial) {
                    surfaceMaterial.opacity = 1;
                    surfaceMaterial.transparent = false;
                }
                transformBlendComplete = true;
            }
        }

        var currentQ;
        if (dynamicElapsed < TC.CHAOS_DURATION) {
            currentQ = TC.Q_CHAOS;
            animPhase.chaosEnergy = 1.0;
            animPhase.annealProgress = 0;
        } else if (dynamicElapsed < TC.CHAOS_DURATION + TC.ANNEAL_DURATION) {
            var progress = (dynamicElapsed - TC.CHAOS_DURATION) / TC.ANNEAL_DURATION;
            currentQ = TC.Q_CHAOS + (TC.Q_ORDER - TC.Q_CHAOS) * progress * progress;
            animPhase.chaosEnergy = Math.max(0, 1.0 - progress);
            animPhase.annealProgress = progress;
        } else {
            animPhase.chaosEnergy = 0;
            animPhase.annealProgress = 1;
            enterFrozen();
            return;
        }

        if (transformBlendComplete) {
            sim.setQBias(currentQ);
            var stepsThisFrame = Math.max(100, Math.round(TC.STEPS_PER_FRAME / Math.pow(currentQ, 1.5)));
            sim.step(stepsThisFrame);
            console.log('[ANNEAL] t=' + (dynamicElapsed/1000).toFixed(1) + 's q=' + currentQ.toFixed(3) + ' steps=' + stepsThisFrame + ' progress=' + animPhase.annealProgress.toFixed(3));
            if (!dumpedPostGlauber) {
                surfaceBuilder.dumpSurfaceSnapshot('post_glauber', sim, currentState);
                dumpedPostGlauber = true;
            }
        }

        if (sonifier) sonifier.setEntropy(animPhase.chaosEnergy);

        surfaceBuilder.updateSurfaceInPlace(sim.dimers);
    }

    function enterFrozen() {
        console.log('[STATE] → FROZEN');
        currentState = STATES.FROZEN;
        stateStartTime = performance.now();

        // Ensure cubes gone, surface fully opaque
        if (cubes) {
            cubes.dispose(meshGroup);
            cubes = null;
        }
        if (surfaceMaterial) {
            surfaceMaterial.opacity = 1;
            surfaceMaterial.transparent = false;
        }

        animPhase.chaosEnergy = 0;
        animPhase.annealProgress = 1;

        // Final polish
        sim.setQBias(TC.Q_ORDER);
        sim.step(10000);
        sim.refreshDimers();

        // Rebuild surface with edge lines
        surfaceBuilder.buildSurfaceMesh(sim.dimers, true, meshGroup, surfaceMaterial, edgeMaterial);

        if (sonifier) sonifier.fadeOut(4000);

        controls.autoRotate = false;

        frozenTimers = [];
        frozenTimers.push(setTimeout(function() {
            document.getElementById('caption').classList.add('visible');
            document.getElementById('attribution').classList.add('visible');
        }, 500));
    }

    function updateFrozen(elapsed) {
        var result = window.TrianglePhases.getFrozenAction(elapsed);
        if (result.action === 'done') {
            window.TrianglePhases.setFrozenRotation(0, camera, controls);
            enterTextScreen();
        } else {
            window.TrianglePhases.setFrozenRotation(result.angle, camera, controls);
        }
    }

    function enterTextScreen() {
        console.log('[STATE] → TEXT_SCREEN');
        currentState = STATES.TEXT_SCREEN;
        stateStartTime = performance.now();

        // Fade out 3D canvas
        canvas.style.transition = 'opacity 1.5s ease-out';
        canvas.style.opacity = '0';
        document.getElementById('vignette').style.display = 'none';
        document.getElementById('caption').classList.remove('visible');
        document.getElementById('attribution').classList.remove('visible');

        // Build code block
        var codeBlock = document.querySelector('#text-screen .code-block');
        window.TrianglePhases.populateTextScreen(codeBlock);

        var textScreen = document.getElementById('text-screen');
        textScreen.style.display = 'flex';

        // Trigger fade-in after layout
        requestAnimationFrame(function() {
            textScreen.classList.add('visible');
            codeBlock.querySelectorAll('.line').forEach(function(el) {
                el.style.opacity = '1';
            });
        });

        // After TEXT_SCREEN_DURATION, fade out then return to hook
        frozenTimers.push(setTimeout(function() {
            textScreen.classList.remove('visible');
            codeBlock.querySelectorAll('.line').forEach(function(el) {
                el.style.opacity = '0';
            });
            frozenTimers.push(setTimeout(function() {
                textScreen.style.display = 'none';
                returnToHook();
            }, 2000));
        }, TC.TEXT_SCREEN_DURATION));
    }

    // ========================================================================
    // RENDER LOOP
    // ========================================================================
    function renderFrame(timestamp) {
        if (!renderer) return;
        if (currentState === STATES.HOOK || currentState === STATES.LOADING || currentState === STATES.TEXT_SCREEN) return;

        var dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
        lastTimestamp = timestamp;
        var elapsed = timestamp - stateStartTime;

        switch (currentState) {
            case STATES.FLYING_CUBES:
                if (cubes) cubes.updateFlyingPhysics(dt, controls);
                if (elapsed >= TC.FLYING_DURATION) enterAssembly();
                break;

            case STATES.ASSEMBLY:
                if (cubes) cubes.updateAssemblyPhysics(dt, Math.min(1, elapsed / TC.ASSEMBLY_DURATION), controls);
                if (elapsed >= TC.ASSEMBLY_DURATION) {
                    enterTransforming();
                }
                break;

            case STATES.TRANSFORMING:
                updateTransforming(elapsed);
                break;

            case STATES.FROZEN:
                updateFrozen(elapsed);
                break;
        }

        // Background color: black in chaos → subtle warm dark in order
        var bgR = 8 * animPhase.annealProgress / 255;
        var bgG = 6 * animPhase.annealProgress / 255;
        var bgB = 4 * animPhase.annealProgress / 255;
        scene.background.setRGB(bgR, bgG, bgB);

        controls.update();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(renderFrame);
    }

    // ========================================================================
    // LOOP RESTART — return to hook screen
    // ========================================================================
    function returnToHook() {
        console.log('[STATE] → RETURN_TO_HOOK');
        currentState = STATES.HOOK;

        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        for (var i = 0; i < frozenTimers.length; i++) clearTimeout(frozenTimers[i]);
        frozenTimers = [];

        if (sonifier) {
            sonifier.destroy();
            sonifier = null;
        }

        // Hide UI
        document.getElementById('caption').classList.remove('visible');
        document.getElementById('attribution').classList.remove('visible');

        animPhase.chaosEnergy = 0;
        animPhase.annealProgress = 0;
        animPhase.time = 0;

        // Dispose Three.js
        disposeThreeScene();
        sim = null;

        canvas.style.transition = '';
        canvas.style.display = 'none';
        document.getElementById('vignette').style.display = 'none';
        enterHook();
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================
    window.addEventListener('resize', function() {
        if (renderer) {
            resizeThreeScene();
        }
        window.HookBackground.resizeIfRunning();
    });

    // Click to advance to next stage
    canvas.addEventListener('click', function() {
        switch (currentState) {
            case STATES.FLYING_CUBES: enterAssembly(); break;
            case STATES.ASSEMBLY: enterTransforming(); break;
            case STATES.TRANSFORMING: enterFrozen(); break;
            case STATES.FROZEN: enterTextScreen(); break;
        }
    });

    document.getElementById('text-screen').addEventListener('click', function() {
        if (currentState === STATES.TEXT_SCREEN) {
            for (var i = 0; i < frozenTimers.length; i++) clearTimeout(frozenTimers[i]);
            frozenTimers = [];
            document.getElementById('text-screen').style.display = 'none';
            document.getElementById('text-screen').classList.remove('visible');
            returnToHook();
        }
    });

    // Pause render loop when tab is hidden
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && renderer && currentState !== STATES.HOOK && currentState !== STATES.LOADING && currentState !== STATES.TEXT_SCREEN) {
            lastTimestamp = performance.now();
        }
    });

    // ========================================================================
    // INITIALIZATION — start once WASM factory is available
    // ========================================================================
    if (typeof TriangleLozenge === 'function') {
        enterHook();
    } else {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loading').textContent = 'Error: Failed to load simulation engine';
    }

})();
