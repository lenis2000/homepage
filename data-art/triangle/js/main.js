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

    // Timers
    var hookTimerId = null;
    var frozenTimers = [];
    var cftpDone = false;
    var chaosFrameCounter = 0;
    var monotoneFrameCounter = 0;

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
            metalness: 0.35
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
        // Recalculate zoom to fit shape in new aspect ratio
        if (surfaceBuilder && sim && sim.dimers) {
            surfaceBuilder.positionCamera(sim.dimers, camera, controls, canvas);
        }
        camera.updateProjectionMatrix();
    }

    // ========================================================================
    // STATE MACHINE
    // ========================================================================
    function enterHook() {
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

    }

    function runCFTPAsync() {
        return new Promise(function(resolve) {
            sim.initCFTP();
            function step() {
                var result = sim.stepCFTP();
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
        try {
            sim = await window.SimulatorInterface.create();
        } catch (wasmErr) {
            console.error('WASM load failed:', wasmErr);
            document.getElementById('loading').textContent = 'Error: Failed to load simulation engine';
            setTimeout(function() {
                document.getElementById('loading').style.display = 'none';
                if (sonifier) { sonifier.destroy(); sonifier = null; }
                enterHook();
            }, 3000);
            return;
        }

        setTimeout(async function() {
            try {
                // Generate scaled shape
                activeTriangles = await window.TriangleGeometry.generateScaledShape(sim);

                // Final init with scaled shape
                sim.initFromTriangles(activeTriangles);

                // Adjust hole height for impossible illusion
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

                if (sim.isValid) {
                    // Init Three.js
                    canvas.style.display = 'block';
                    canvas.style.opacity = '1';
                    document.getElementById('vignette').style.display = 'block';
                    initThreeScene();

                    // Surface builder and camera positioning
                    surfaceBuilder = new window.SurfaceBuilder();
                    surfaceBuilder.positionCamera(sim.dimers, camera, controls, canvas);

                    // Setup flying cubes with initial (pre-CFTP) tiling
                    cubes = new window.TrianglePhases.FlyingCubesManager();
                    cubes.setTargets(surfaceBuilder.computeTargets(sim.dimers));
                    cubes.init(sim.dimers, camera, controls, canvas, meshGroup);

                    // Hide loading, start flying immediately
                    document.getElementById('loading').style.display = 'none';
                    cftpDone = false;
                    enterFlyingCubes();

                    // CFTP runs in background while cubes fly; refresh targets when done
                    runCFTPAsync().then(function() {
                        cftpDone = true;
                        if (cubes && surfaceBuilder && controls) {
                            cubes.refreshTargets(sim.dimers, surfaceBuilder.computeTargets(sim.dimers), controls);
                        }
                    });
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
        currentState = STATES.FLYING_CUBES;

        stateStartTime = performance.now();
        lastTimestamp = performance.now();

        if (cubes && sonifier) cubes.collisionCallback = function(intensity) { sonifier.cubeClick(intensity); };
        animationId = requestAnimationFrame(renderFrame);
    }

    function enterAssembly(frameTimestamp) {
        currentState = STATES.ASSEMBLY;
        if (cubes) cubes.activateAll();
        stateStartTime = frameTimestamp || performance.now();
        if (sonifier) sonifier.startAssembly();
    }

    function enterAssemblyHold(frameTimestamp) {
        currentState = STATES.ASSEMBLY_HOLD;
        stateStartTime = frameTimestamp || performance.now();
        if (cubes) cubes.snapToTargets(controls);
    }

    function enterTransforming(frameTimestamp) {
        currentState = STATES.TRANSFORMING;

        stateStartTime = frameTimestamp || performance.now();

        // Snap cubes, then immediately replace with surface
        if (cubes) {
            cubes.snapToTargets(controls);
            cubes.dispose(meshGroup);
            cubes = null;
        }

        surfaceBuilder.buildSurfaceMesh(sim.dimers, false, meshGroup, surfaceMaterial, edgeMaterial);
        transformBlendComplete = true;

        if (sonifier) sonifier.stopAssembly();
        sim.setQBias(TC.Q_CHAOS);
    }

    function updateTransforming(elapsed) {
        animPhase.time = elapsed;

        if (elapsed < TC.SURFACE_HOLD_DURATION) {
            // Surface visible but no Glauber yet — pause for inspection
            animPhase.chaosEnergy = 0;
            animPhase.annealProgress = 0;
            if (sonifier) sonifier.setEntropy(0);
            surfaceBuilder.updateSurfaceInPlace(sim.dimers);
            return;
        }

        var t = elapsed - TC.SURFACE_HOLD_DURATION;

        if (t < TC.CHAOS_DURATION) {
            // Phase 1: pure chaos at q=1 for 12s
            animPhase.chaosEnergy = 1.0;
            animPhase.annealProgress = 0;
            sim.setQBias(TC.Q_CHAOS);
            chaosFrameCounter++;
            if (chaosFrameCounter % TC.CHAOS_FRAMES_PER_STEP === 0) {
                sim.randomStep(TC.CHAOS_STEPS_PER_FRAME);
            }
            if (sonifier) { sonifier.startDrone(); sonifier.setEntropy(1.0); }
        } else if (t < TC.CHAOS_DURATION + TC.MONOTONE_DURATION) {
            // Phase 2: monotone convergence (only deletions) for 10s
            var progress = (t - TC.CHAOS_DURATION) / TC.MONOTONE_DURATION;
            animPhase.chaosEnergy = Math.max(0, 1.0 - progress);
            animPhase.annealProgress = progress;
            monotoneFrameCounter++;
            if (monotoneFrameCounter % TC.MONOTONE_FRAMES_PER_STEP === 0) {
                sim.randomMonotoneStep(TC.MONOTONE_STEPS_PER_FRAME, -1);
            }
            if (sonifier) sonifier.setEntropy(animPhase.chaosEnergy);
        } else {
            animPhase.chaosEnergy = 0;
            animPhase.annealProgress = 1;
            enterFrozen();
            return;
        }

        surfaceBuilder.updateSurfaceInPlace(sim.dimers);
    }

    function enterFrozen() {
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

        if (sonifier) sonifier.startRotation();

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
        currentState = STATES.TEXT_SCREEN;

        stateStartTime = performance.now();

        if (sonifier) sonifier.fadeOut(4000);

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

        window.HookBackground.start(document.getElementById('text-bg'));

        // Trigger fade-in after layout
        requestAnimationFrame(function() {
            textScreen.classList.add('visible');
            codeBlock.querySelectorAll('.line').forEach(function(el) {
                el.style.opacity = '1';
            });
            var qr = textScreen.querySelector('.qr-code');
            if (qr) qr.style.opacity = '1';
        });

        // After TEXT_SCREEN_DURATION, fade out then return to hook
        frozenTimers.push(setTimeout(function() {
            window.HookBackground.stop();
            textScreen.classList.remove('visible');
            codeBlock.querySelectorAll('.line').forEach(function(el) {
                el.style.opacity = '0';
            });
            var qr = textScreen.querySelector('.qr-code');
            if (qr) qr.style.opacity = '0';
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
                if (cubes) cubes.updateFlyingPhysics(dt, controls, elapsed);
                if (cftpDone && cubes && cubes.hasCubeAtCenter()) enterAssembly(timestamp);
                break;

            case STATES.ASSEMBLY:
                var assemblyProgress = Math.min(1, elapsed / TC.ASSEMBLY_DURATION);
                if (cubes) cubes.updateAssemblyPhysics(dt, assemblyProgress, controls);
                if (sonifier) sonifier.updateAssembly(assemblyProgress);
                if (elapsed >= TC.ASSEMBLY_DURATION) {
                    enterAssemblyHold(timestamp);
                }
                break;

            case STATES.ASSEMBLY_HOLD:
                // Cubes frozen in place — just render
                if (elapsed >= TC.ASSEMBLY_HOLD_DURATION) {
                    enterTransforming(timestamp);
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
        cftpDone = false;

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

    // Resume AudioContext on any user interaction — needed for autoplay policy.
    // Also prime the subsystem before sonifier exists by creating a temp context.
    var _audioUnlockCtx = null;
    function tryUnlockAudio() {
        if (sonifier && sonifier.audioCtx && sonifier.audioCtx.state === 'suspended') {
            sonifier.audioCtx.resume();
        }
        if (!_audioUnlockCtx) {
            try {
                _audioUnlockCtx = new (window.AudioContext || window.webkitAudioContext)();
                _audioUnlockCtx.resume();
            } catch(e) {}
        }
    }
    ['pointerdown', 'touchstart', 'keydown'].forEach(function(evt) {
        document.addEventListener(evt, tryUnlockAudio, { passive: true });
    });

    window.addEventListener('resize', function() {
        if (renderer) {
            resizeThreeScene();
        }
        window.HookBackground.resizeIfRunning();
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
