/**
 * Three.js Setup for Lozenge Tiling slides
 * Provides standard scene setup and WebGL context management
 */

window.ThreeSetup = {
    /**
     * Create standard Three.js scene with metallic lighting
     * @param {HTMLCanvasElement} canvas - Target canvas
     * @param {Object} options - Configuration options
     * @returns {Object} Scene components { scene, renderer, camera, controls, meshGroup, dispose }
     */
    createScene(canvas, options = {}) {
        const {
            frustumSize = 30,
            darkBackground = true,
            orthographic = true,
            enableDamping = false,
            nearFar = [-5000, 6000]
        } = options;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(darkBackground ? 0x1a1a2e : 0xffffff);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const aspect = canvas.clientWidth / canvas.clientHeight || 1;
        let camera;

        if (orthographic) {
            camera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2, frustumSize * aspect / 2,
                frustumSize / 2, -frustumSize / 2,
                nearFar[0], nearFar[1]
            );
        } else {
            camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 5000);
        }

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = enableDamping;
        if (enableDamping) {
            controls.dampingFactor = 0.1;
            controls.rotateSpeed = 0.8;
            controls.panSpeed = 0.8;
            controls.zoomSpeed = 1.2;
        }
        controls.enablePan = true;
        controls.enableZoom = true;

        // Add metallic lighting
        if (darkBackground) {
            this.addMetallicLighting(scene);
        } else {
            this.addBasicLighting(scene);
        }

        const meshGroup = new THREE.Group();
        scene.add(meshGroup);

        let rotationLights = [];
        if (darkBackground) {
            rotationLights = this.addRotationLights(scene);
        }

        let renderLoopId = null;

        return {
            scene,
            renderer,
            camera,
            controls,
            meshGroup,
            rotationLights,
            aspect,

            resize() {
                const newAspect = canvas.clientWidth / canvas.clientHeight || 1;
                if (orthographic) {
                    camera.left = -frustumSize * newAspect / 2;
                    camera.right = frustumSize * newAspect / 2;
                    camera.top = frustumSize / 2;
                    camera.bottom = -frustumSize / 2;
                } else {
                    camera.aspect = newAspect;
                }
                camera.updateProjectionMatrix();
                renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            },

            startRenderLoop() {
                const render = () => {
                    if (!renderer) return;
                    controls.update();
                    renderer.render(scene, camera);
                    renderLoopId = requestAnimationFrame(render);
                };
                render();
            },

            stopRenderLoop() {
                if (renderLoopId) {
                    cancelAnimationFrame(renderLoopId);
                    renderLoopId = null;
                }
            },

            dispose() {
                this.stopRenderLoop();
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
                renderer.dispose();
            }
        };
    },

    /**
     * Add metallic lighting rig (for dark background)
     */
    addMetallicLighting(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));

        const hemi = new THREE.HemisphereLight(0x6666aa, 0x222244, 0.25);
        hemi.position.set(0, 20, 0);
        scene.add(hemi);

        const directional = new THREE.DirectionalLight(0xffffff, 1.2);
        directional.position.set(15, 20, 5);
        scene.add(directional);

        const fill = new THREE.DirectionalLight(0xffffff, 0.3);
        fill.position.set(-10, 5, -5);
        scene.add(fill);
    },

    /**
     * Add basic lighting (for white background)
     */
    addBasicLighting(scene) {
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(10, 20, 10);
        scene.add(directional);
    },

    /**
     * Add rotation lights (warm orange tints, initially hidden)
     */
    addRotationLights(scene) {
        const configs = [
            { pos: [-30, 10, 30], color: 0xffaa66, intensity: 0.7 },
            { pos: [-30, 10, -30], color: 0xffcc88, intensity: 0.6 }
        ];
        const lights = [];
        for (const cfg of configs) {
            const light = new THREE.DirectionalLight(cfg.color, cfg.intensity);
            light.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
            light.visible = false;
            scene.add(light);
            lights.push(light);
        }
        return lights;
    },

    /**
     * Create metallic material for lozenges
     */
    createMetallicMaterial(options = {}) {
        return new THREE.MeshStandardMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: options.roughness ?? 0.3,
            metalness: options.metalness ?? 0.35,
            color: options.color ?? 0xddeeff
        });
    },

    /**
     * Create edge material
     */
    createEdgeMaterial(options = {}) {
        return new THREE.LineBasicMaterial({
            color: options.color ?? 0x444466,
            linewidth: options.linewidth ?? 1,
            opacity: options.opacity ?? 0.6,
            transparent: true
        });
    }
};
