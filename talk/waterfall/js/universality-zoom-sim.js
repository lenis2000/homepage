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
    let currentZoomIdx = 0;

    const zoomPositions = [
        { pos: { x: -1478.7, y: -703.5, z: 2172.5 }, target: { x: 84.1, y: -310.6, z: 235.1 }, zoom: 0.5 },
    ];

    function initThreeJS() {
        if (renderer) return;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        const aspect = canvas.width / canvas.height;
        camera = new THREE.OrthographicCamera(-1000 * aspect, 1000 * aspect, 1000, -1000, 0.1, 10000);
        camera.position.set(-1478.7, -703.5, 2172.5);
        camera.zoom = 0.5;
        camera.updateProjectionMatrix();

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(canvas.width, canvas.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.set(84.1, -310.6, 235.1);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.update();

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(15, 20, 5);
        scene.add(dirLight);

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
                roughness: 0.3,
                metalness: 0.35,
                color: 0xddeeff
            });

            obj.traverse((child) => {
                if (child.isMesh) {
                    child.material = material;
                    meshGroup.add(child.clone());
                }
            });

            objLoaded = true;
            render();
        } catch (e) {
            console.error('Failed to load OBJ:', e);
        }
    }

    function setZoomPosition(idx) {
        if (!camera || !controls) return;
        const zp = zoomPositions[idx % zoomPositions.length];
        camera.position.set(zp.pos.x, zp.pos.y, zp.pos.z);
        controls.target.set(zp.target.x, zp.target.y, zp.target.z);
        camera.zoom = zp.zoom;
        camera.updateProjectionMatrix();
        controls.update();
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
                onSlideEnter() {
                    initThreeJS();
                    if (objLoaded) {
                        currentZoomIdx = (currentZoomIdx + 1) % zoomPositions.length;
                        setZoomPosition(currentZoomIdx);
                    } else {
                        loadOBJ();
                    }
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
