/**
 * Summary slide - GMU letters display
 * Loads G, M, U OBJ files and displays them in GMU colors
 */

(function initSummarySim() {
    if (!window.slideEngine) {
        setTimeout(initSummarySim, 50);
        return;
    }

    const canvas = document.getElementById('summary-canvas');
    if (!canvas) {
        return;
    }

    // GMU Colors
    const GMU_GREEN = 0x005239;
    const GMU_GOLD = 0xFFC733;

    // ===== THREE.JS STATE =====
    let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
    let renderLoopId = null;

    async function loadOBJLoader() {
        if (typeof THREE.OBJLoader !== 'undefined') return true;

        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js';
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
        });

        return typeof THREE.OBJLoader !== 'undefined';
    }

    function initThreeJS() {
        if (renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = true;
        controls.enableZoom = true;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 7);
        scene.add(directional);
        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-5, -5, -5);
        scene.add(fill);

        meshGroup = new THREE.Group();
        scene.add(meshGroup);

        // Camera position - will adjust after loading
        camera.position.set(0, 0, 10);
        camera.up.set(0, 1, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    }

    function disposeThreeJS() {
        if (!renderer) return;
        if (renderLoopId) { cancelAnimationFrame(renderLoopId); renderLoopId = null; }
        if (meshGroup) {
            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                meshGroup.remove(child);
            }
        }
        renderer.dispose();
        renderer = null; scene = null; camera = null; controls = null; meshGroup = null;
    }

    function startRenderLoop() {
        if (renderLoopId) return;
        function loop() {
            if (!renderer || !camera || !controls) return;
            controls.update();
            renderer.render(scene, camera);
            renderLoopId = requestAnimationFrame(loop);
        }
        loop();
    }

    function stopRenderLoop() {
        if (renderLoopId) {
            cancelAnimationFrame(renderLoopId);
            renderLoopId = null;
        }
    }

    async function loadLetters() {
        const loaderReady = await loadOBJLoader();
        if (!loaderReady) {
            console.error('OBJLoader not available');
            return;
        }

        const loader = new THREE.OBJLoader();
        const basePath = '/talk/waterfall/';

        // Color faces by normal direction (like lozenge tilings)
        function colorByNormal(mesh) {
            const geometry = mesh.geometry;
            if (!geometry.isBufferGeometry) return;

            // Compute vertex normals if not present
            if (!geometry.attributes.normal) {
                geometry.computeVertexNormals();
            }

            const positions = geometry.attributes.position;
            const normals = geometry.attributes.normal;
            const colors = new Float32Array(positions.count * 3);

            const green = new THREE.Color(GMU_GREEN);
            const gold = new THREE.Color(GMU_GOLD);
            const white = new THREE.Color(0xFFFFFF);

            for (let i = 0; i < positions.count; i++) {
                const nx = normals.getX(i);
                const ny = normals.getY(i);
                const nz = normals.getZ(i);

                const absX = Math.abs(nx);
                const absY = Math.abs(ny);
                const absZ = Math.abs(nz);

                let color;
                if (absX >= absY && absX >= absZ) {
                    color = green;
                } else if (absY >= absX && absY >= absZ) {
                    color = gold;
                } else {
                    color = white;
                }

                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }

            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }

        const letters = ['u.obj', 'm.obj', 'g.obj'];
        const loadedObjects = [];

        for (const file of letters) {
            try {
                const obj = await new Promise((resolve, reject) => {
                    loader.load(basePath + file, resolve, undefined, reject);
                });

                // Apply vertex colors based on normals
                obj.traverse((child) => {
                    if (child.isMesh) {
                        colorByNormal(child);
                        child.material = new THREE.MeshStandardMaterial({
                            vertexColors: true,
                            roughness: 0.4,
                            metalness: 0.1,
                            side: THREE.DoubleSide
                        });
                    }
                });

                loadedObjects.push(obj);
            } catch (e) {
                console.error('Failed to load', file, e);
            }
        }

        if (loadedObjects.length === 0) return;

        // Calculate bounding boxes and position letters
        const boxes = loadedObjects.map(obj => new THREE.Box3().setFromObject(obj));
        const sizes = boxes.map(box => {
            const size = new THREE.Vector3();
            box.getSize(size);
            return size;
        });

        // Diagonal offsets: U, M, G (load order)
        // G-M spacing: 270, M-U spacing: 300
        const offsets = [
            { x: -300, y: -300 },  // U
            { x: 0, y: 0 },        // M (center)
            { x: 270, y: 270 }     // G
        ];

        // Position letters diagonally
        for (let i = 0; i < loadedObjects.length; i++) {
            const obj = loadedObjects[i];
            const box = boxes[i];

            // Center the object at origin first
            const center = new THREE.Vector3();
            box.getCenter(center);
            obj.position.sub(center);

            // Apply diagonal offset
            obj.position.x += offsets[i].x;
            obj.position.y += offsets[i].y;

            meshGroup.add(obj);
        }

        // Rotate to face camera (try -90 degrees on X axis)
        meshGroup.rotation.x = -Math.PI / 2;

        // Fixed camera position
        camera.position.set(-644.4, 1445.7, -1165.5);
        controls.target.set(-1.1, -3.4, -3.9);
        controls.update();

        if (renderer) renderer.render(scene, camera);
    }

    window.slideEngine.registerSimulation('summary', {
        start() {
            startRenderLoop();
        },
        pause() {
            stopRenderLoop();
        },
        onSlideEnter() {
            initThreeJS();
            startRenderLoop();
            setTimeout(() => loadLetters(), 100);
        },
        onSlideLeave() {
            disposeThreeJS();
        }
    }, 0);

})();
