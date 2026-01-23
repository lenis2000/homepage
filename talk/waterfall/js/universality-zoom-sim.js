/**
 * Universality Zoom Slide
 * Three.js OBJ loading visualization
 */

(function() {
    'use strict';

    const canvas = document.getElementById('zoom-full-canvas');
    if (!canvas) return;

    let scene, camera, renderer, controls, meshGroup;
    let objLoaded = false;
    let renderLoopId = null;
    let currentStep = 0;
    let isAnimating = false;

    // Zoom buttons
    const zoomBtn1 = document.getElementById('zoom-btn-1');
    const zoomBtn2 = document.getElementById('zoom-btn-2');
    const zoomBtn3 = document.getElementById('zoom-btn-3');
    const zoomButtons = [zoomBtn1, zoomBtn2, zoomBtn3];

    function updateZoomButtons(step) {
        // step 1 → button 1, step 2 → button 2, step 3 → button 3
        // step 0 or 4 → no button highlighted
        zoomButtons.forEach((btn, idx) => {
            const btnNum = idx + 1; // buttons are 1, 2, 3
            if (step === btnNum) {
                btn.style.background = '#E57200';
                btn.style.color = '#fff';
                btn.style.borderColor = '#E57200';
            } else {
                btn.style.background = '#fff';
                btn.style.color = '#232D4B';
                btn.style.borderColor = '#232D4B';
            }
        });
    }

    let buttonsInitialized = false;
    function setupZoomButtonHandlers() {
        if (buttonsInitialized) return;
        buttonsInitialized = true;
        zoomButtons.forEach((btn, idx) => {
            const btnNum = idx + 1;
            btn.addEventListener('click', () => {
                if (isAnimating) return;
                currentStep = btnNum;
                setZoomPosition(btnNum, true);
                updateZoomButtons(btnNum);
            });
        });
    }

    // UVA colors for lozenge types
    const UVA_ORANGE = new THREE.Color('#E57200');
    const UVA_BLUE = new THREE.Color('#232D4B');
    const UVA_CREAM = new THREE.Color('#F9DCBF');

    const zoomPositions = [
        // Position 0: Full display (original view)
        { pos: { x: -1478.7, y: -703.5, z: 2172.5 }, target: { x: 84.1, y: -310.6, z: 235.1 }, zoom: 0.5 },
        // Position 1: First zoom
        { pos: { x: -2168.4, y: 418.0, z: 1098.7 }, target: { x: 84.1, y: -310.6, z: 235.1 }, zoom: 14.76 },
        // Position 2: Second zoom
        { pos: { x: -1403.9, y: 2704.2, z: 492.0 }, target: { x: 220.6, y: 1259.5, z: -782.4 }, zoom: 16.36 },
        // Position 3: Third zoom
        { pos: { x: -761.5, y: 2023.9, z: 2083.6 }, target: { x: 862.0, y: 577.3, z: 810.1 }, zoom: 56.03 },
        // Position 4: Back to full display
        { pos: { x: -1478.7, y: -703.5, z: 2172.5 }, target: { x: 84.1, y: -310.6, z: 235.1 }, zoom: 0.5 },
    ];

    function initThreeJS() {
        if (renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const aspect = canvas.width / canvas.height;
        camera = new THREE.OrthographicCamera(-1000 * aspect, 1000 * aspect, 1000, -1000, 0.1, 10000);
        // Start at position 1
        const startPos = zoomPositions[0];
        camera.position.set(startPos.pos.x, startPos.pos.y, startPos.pos.z);
        camera.zoom = startPos.zoom;
        camera.updateProjectionMatrix();

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(canvas.width, canvas.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(startPos.target.x, startPos.target.y, startPos.target.z);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.update();

        // Lighting - Default preset from lpetrov.cc/lozenge
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 10, 15);
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
        fillLight.position.set(-10, -5, -10);
        scene.add(fillLight);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);
    }

    async function loadOBJ() {
        if (objLoaded || !meshGroup) return;

        if (typeof THREE.OBJLoader === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js';
                script.onload = resolve;
                script.onerror = resolve;
                document.head.appendChild(script);
            });
        }

        if (typeof THREE.OBJLoader === 'undefined') {
            console.error('OBJLoader not available');
            return;
        }

        const loader = new THREE.OBJLoader();
        try {
            const obj = await new Promise((resolve, reject) => {
                loader.load('images/big_shape.obj', resolve, undefined, reject);
            });

            const material = new THREE.MeshStandardMaterial({
                side: THREE.DoubleSide,
                flatShading: true,
                roughness: 0.5,
                metalness: 0.15,
                vertexColors: true
            });

            obj.traverse((child) => {
                if (child.isMesh) {
                    const geom = child.geometry.clone();
                    // Compute face normals and assign vertex colors based on lozenge type
                    geom.computeVertexNormals();
                    const positions = geom.attributes.position;
                    const normals = geom.attributes.normal;
                    const colors = new Float32Array(positions.count * 3);

                    for (let i = 0; i < positions.count; i += 3) {
                        // Get average normal for this face (3 vertices per triangle)
                        const nx = (normals.getX(i) + normals.getX(i+1) + normals.getX(i+2)) / 3;
                        const ny = (normals.getY(i) + normals.getY(i+1) + normals.getY(i+2)) / 3;
                        const nz = (normals.getZ(i) + normals.getZ(i+1) + normals.getZ(i+2)) / 3;

                        // Determine lozenge type by dominant normal component
                        const absX = Math.abs(nx), absY = Math.abs(ny), absZ = Math.abs(nz);
                        let color;
                        if (absX >= absY && absX >= absZ) {
                            color = UVA_ORANGE;  // Type 1: normal mainly in X
                        } else if (absY >= absX && absY >= absZ) {
                            color = UVA_BLUE;    // Type 2: normal mainly in Y
                        } else {
                            color = UVA_CREAM;   // Type 3: normal mainly in Z
                        }

                        // Set color for all 3 vertices of this face
                        for (let j = 0; j < 3; j++) {
                            colors[(i + j) * 3] = color.r;
                            colors[(i + j) * 3 + 1] = color.g;
                            colors[(i + j) * 3 + 2] = color.b;
                        }
                    }

                    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                    const mesh = new THREE.Mesh(geom, material);
                    meshGroup.add(mesh);
                }
            });

            objLoaded = true;
            render();
        } catch (e) {
            console.error('Failed to load OBJ:', e);
        }
    }

    function setZoomPosition(idx, animate = false) {
        if (!camera || !controls) return;
        const zp = zoomPositions[idx % zoomPositions.length];

        if (!animate) {
            camera.position.set(zp.pos.x, zp.pos.y, zp.pos.z);
            controls.target.set(zp.target.x, zp.target.y, zp.target.z);
            camera.zoom = zp.zoom;
            camera.updateProjectionMatrix();
            controls.update();
            return;
        }

        const startTime = performance.now();
        const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
        const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
        const startZoom = camera.zoom;

        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        // Only zoom out/in for transitions 2→3 and 3→4 (idx 2 and 3)
        const useZoomOutIn = idx >= 2;

        if (useZoomOutIn) {
            // Smooth animation: zoom out, move, then zoom in
            isAnimating = true;
            const zoomOutDuration = 1200; // ms
            const moveDuration = 1500; // ms
            const zoomInDuration = 1200; // ms
            const totalDuration = zoomOutDuration + moveDuration + zoomInDuration;
            const minZoom = 0.5; // Absolute zoom level (full view)

            function animateWithZoom() {
                // Guard: stop if camera was disposed
                if (!camera || !controls) {
                    isAnimating = false;
                    return;
                }

                const elapsed = performance.now() - startTime;

                if (elapsed < zoomOutDuration) {
                    // Phase 1: Zoom out
                    const t = easeInOutCubic(elapsed / zoomOutDuration);
                    camera.zoom = startZoom + (minZoom - startZoom) * t;
                } else if (elapsed < zoomOutDuration + moveDuration) {
                    // Phase 2: Move position and target
                    const t = easeInOutCubic((elapsed - zoomOutDuration) / moveDuration);
                    camera.position.x = startPos.x + (zp.pos.x - startPos.x) * t;
                    camera.position.y = startPos.y + (zp.pos.y - startPos.y) * t;
                    camera.position.z = startPos.z + (zp.pos.z - startPos.z) * t;
                    controls.target.x = startTarget.x + (zp.target.x - startTarget.x) * t;
                    controls.target.y = startTarget.y + (zp.target.y - startTarget.y) * t;
                    controls.target.z = startTarget.z + (zp.target.z - startTarget.z) * t;
                    camera.zoom = minZoom;
                } else if (elapsed < totalDuration) {
                    // Phase 3: Zoom in
                    const t = easeInOutCubic((elapsed - zoomOutDuration - moveDuration) / zoomInDuration);
                    camera.zoom = minZoom + (zp.zoom - minZoom) * t;
                } else {
                    camera.position.set(zp.pos.x, zp.pos.y, zp.pos.z);
                    controls.target.set(zp.target.x, zp.target.y, zp.target.z);
                    camera.zoom = zp.zoom;
                    isAnimating = false;
                }

                camera.updateProjectionMatrix();
                controls.update();

                if (isAnimating) {
                    requestAnimationFrame(animateWithZoom);
                }
            }
            animateWithZoom();
        } else {
            // Simple transition for 0→1: just animate all properties together
            isAnimating = true;
            const duration = 2000; // ms

            function animateSimple() {
                const elapsed = performance.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                const ease = easeInOutCubic(t);

                camera.position.x = startPos.x + (zp.pos.x - startPos.x) * ease;
                camera.position.y = startPos.y + (zp.pos.y - startPos.y) * ease;
                camera.position.z = startPos.z + (zp.pos.z - startPos.z) * ease;
                controls.target.x = startTarget.x + (zp.target.x - startTarget.x) * ease;
                controls.target.y = startTarget.y + (zp.target.y - startTarget.y) * ease;
                controls.target.z = startTarget.z + (zp.target.z - startTarget.z) * ease;
                camera.zoom = startZoom + (zp.zoom - startZoom) * ease;

                camera.updateProjectionMatrix();
                controls.update();

                if (t < 1) {
                    requestAnimationFrame(animateSimple);
                } else {
                    isAnimating = false;
                }
            }
            animateSimple();
        }
    }

    function render() {
        if (renderer && scene && camera && controls) {
            controls.update();
            renderer.render(scene, camera);
        }
    }

    function animate() {
        renderLoopId = requestAnimationFrame(animate);
        render();
    }

    function start() {
        if (renderLoopId) return;
        animate();
    }

    function pause() {
        if (renderLoopId) {
            cancelAnimationFrame(renderLoopId);
            renderLoopId = null;
        }
    }

    function disposeThreeJS() {
        pause();
        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }
        }
        if (renderer) { renderer.dispose(); renderer = null; }
        scene = null; camera = null; controls = null; meshGroup = null;
        objLoaded = false;
    }

    function waitForSlideEngine() {
        if (window.slideEngine) {
            window.slideEngine.registerSimulation('universality-zoom', {
                start,
                pause,
                steps: 4,
                onStep(step) {
                    // step 1 → position 1, step 2 → position 2, step 3 → position 3, step 4 → position 4
                    currentStep = step;
                    setZoomPosition(step, true); // animate
                    updateZoomButtons(step);
                },
                onStepBack(step) {
                    // step 0 → position 0, step 1 → position 1, etc.
                    currentStep = step;
                    setZoomPosition(step, true); // animate back
                    updateZoomButtons(step);
                },
                onSlideEnter() {
                    initThreeJS();
                    currentStep = 0;
                    setZoomPosition(0, false); // start at position 0, no animation
                    updateZoomButtons(0);
                    setupZoomButtonHandlers();
                    loadOBJ();
                    start();
                },
                onSlideLeave() {
                    disposeThreeJS();
                }
            }, 0);
        } else {
            setTimeout(waitForSlideEngine, 50);
        }
    }
    waitForSlideEngine();
})();
