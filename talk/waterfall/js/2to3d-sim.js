/**
 * From Paths to 3D: Asymmetric hexagon a×12×9 with WASM CFTP sampling
 * Two simulations: 3D hexagon (Three.js) + Snowflake (2D Canvas)
 */

// ===== Hexagon 3D Simulation =====
function init2to3dHexagonSim() {
    (async function() {
        'use strict';

        const canvas = document.getElementById('bridge-3d-canvas');
        const descEl = document.getElementById('bridge-description');
        if (!canvas) return;

        // Wait for LozengeModule to be available
        if (typeof LozengeModule === 'undefined') {
            console.error('LozengeModule not loaded');
            return;
        }

        // Create our own WASM instance (isolated from other slides)
        const wasm = await LozengeModule();

        // WASM interface
        const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const runCFTP = wasm.cwrap('runCFTP', 'number', []);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeString = wasm.cwrap('freeString', null, ['number']);

        // Parameters: a x B x C hexagon (a varies 1-9)
        const B = 12, C = 9;
        let currentA = 1;
        let currentDimers = [];

        // Colors (UVA scheme)
        const colors = ['#E57200', '#232D4B', '#F9DCBF'];

        // Triangle geometry helpers
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

        function getRightTriangleCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }
        function getLeftTriangleCentroid(n, j) {
            const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
            return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
        }

        function pointInPolygon(x, y, polygon) {
            if (polygon.length < 3) return false;
            let inside = false;
            for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[pj].x, yj = polygon[pj].y;
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            return inside;
        }

        // Generate triangles for a×b×c hexagon and pass to WASM
        function generateHexagonTriangles(a, b, c) {
            const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
            const sideLengths = [a, b, c, a, b, c];
            const boundary = [];
            let bn = 0, bj = 0;
            for (let dir = 0; dir < 6; dir++) {
                for (let step = 0; step < sideLengths[dir]; step++) {
                    boundary.push(getVertex(bn, bj));
                    bn += directions[dir][0];
                    bj += directions[dir][1];
                }
            }

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const v of boundary) {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
            const searchMinN = Math.floor(minX) - 2;
            const searchMaxN = Math.ceil(maxX) + 2;
            const nRange = searchMaxN - searchMinN;
            const searchMinJ = Math.floor(minY / deltaC) - nRange - 5;
            const searchMaxJ = Math.ceil(maxY / deltaC) + nRange + 5;

            const triangleArr = [];
            for (let n = searchMinN; n <= searchMaxN; n++) {
                for (let j = searchMinJ; j <= searchMaxJ; j++) {
                    const rc = getRightTriangleCentroid(n, j);
                    if (pointInPolygon(rc.x, rc.y, boundary)) {
                        triangleArr.push(n, j, 1);
                    }
                    const lc = getLeftTriangleCentroid(n, j);
                    if (pointInPolygon(lc.x, lc.y, boundary)) {
                        triangleArr.push(n, j, 2);
                    }
                }
            }
            return triangleArr;
        }

        // Initialize WASM with hexagon and run CFTP
        function sampleHexagon(a, b, c) {
            const triangleArr = generateHexagonTriangles(a, b, c);

            const dataPtr = wasm._malloc(triangleArr.length * 4);
            for (let i = 0; i < triangleArr.length; i++) {
                wasm.setValue(dataPtr + i * 4, triangleArr[i], 'i32');
            }

            const initPtr = initFromTriangles(dataPtr, triangleArr.length);
            freeString(initPtr);
            wasm._free(dataPtr);

            const cftpPtr = runCFTP();
            freeString(cftpPtr);

            const dimersPtr = exportDimersWasm();
            const dimersJson = wasm.UTF8ToString(dimersPtr);
            freeString(dimersPtr);

            const parsed = JSON.parse(dimersJson);
            currentDimers = parsed.dimers || [];
        }

        // ===== THREE.JS RENDERING (LAZY LOADED) =====
        let scene = null;
        let renderer = null;
        let camera = null;
        let controls = null;
        let meshGroup = null;
        let rotationLights = [];
        const frustumSize = 30;
        let aspect = 1;

        function initThreeJS() {
            if (renderer) return;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xffffff);

            renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            aspect = canvas.clientWidth / canvas.clientHeight || 1;
            camera = new THREE.OrthographicCamera(
                -frustumSize * aspect / 2, frustumSize * aspect / 2,
                frustumSize / 2, -frustumSize / 2,
                0.1, 1000
            );

            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = false;
            controls.enablePan = true;
            controls.enableZoom = true;

            // Lighting
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

            // Extra lights for rotation mode
            rotationLights = [];
            const rotationLightConfigs = [
                { pos: [-20, 10, 20], color: 0xffaa66, intensity: 0.7 },
                { pos: [-20, 10, -20], color: 0xffcc88, intensity: 0.6 }
            ];
            for (const cfg of rotationLightConfigs) {
                const light = new THREE.DirectionalLight(cfg.color, cfg.intensity);
                light.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
                light.visible = false;
                scene.add(light);
                rotationLights.push(light);
            }

            meshGroup = new THREE.Group();
            scene.add(meshGroup);

            camera.position.set(40.2, -28.6, -17.5);
            camera.zoom = 1.432;
            camera.updateProjectionMatrix();
            controls.target.set(2.3, -7.8, 0.8);
            controls.update();

            controls.addEventListener('change', () => {
                if (!isRunning && renderer) renderer.render(scene, camera);
            });

            resize();
        }

        function disposeThreeJS() {
            if (!renderer) return;

            stopAutoRotate();
            if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
            isRunning = false;

            if (meshGroup) {
                while (meshGroup.children.length > 0) {
                    const child = meshGroup.children[0];
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                    meshGroup.remove(child);
                }
            }

            renderer.dispose();
            renderer = null;
            scene = null;
            camera = null;
            controls = null;
            meshGroup = null;
            rotationLights = [];
        }

        function resize() {
            if (!renderer || !camera) return;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            renderer.setSize(w, h, false);
            aspect = w / h;
            camera.left = -frustumSize * aspect / 2;
            camera.right = frustumSize * aspect / 2;
            camera.top = frustumSize / 2;
            camera.bottom = -frustumSize / 2;
            camera.updateProjectionMatrix();
        }
        window.addEventListener('resize', resize);

        function getVertexKeys(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) return [[bn, bj], [bn+1, bj], [bn+1, bj-1], [bn, bj-1]];
            if (t === 1) return [[bn, bj], [bn+1, bj-1], [bn+1, bj-2], [bn, bj-1]];
            return [[bn-1, bj], [bn, bj], [bn+1, bj-1], [bn, bj-1]];
        }

        function getHeightPattern(t) {
            if (t === 0) return [0, 0, 0, 0];
            if (t === 1) return [1, 0, 0, 1];
            return [1, 1, 0, 0];
        }

        function to3D(n, j, h) {
            return { x: h, y: -n - h, z: j - h };
        }

        function buildGeometry() {
            if (!meshGroup) return;

            while (meshGroup.children.length > 0) {
                const child = meshGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                meshGroup.remove(child);
            }

            if (currentDimers.length === 0) return;

            const vertexToDimers = new Map();
            for (const dimer of currentDimers) {
                for (const [n, j] of getVertexKeys(dimer)) {
                    const key = `${n},${j}`;
                    if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                    vertexToDimers.get(key).push(dimer);
                }
            }

            const heights = new Map();
            const firstVerts = getVertexKeys(currentDimers[0]);
            const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
            heights.set(startKey, 0);

            const queue = [startKey];
            const visited = new Set();

            while (queue.length > 0) {
                const currentKey = queue.shift();
                if (visited.has(currentKey)) continue;
                visited.add(currentKey);

                const currentH = heights.get(currentKey);
                const [cn, cj] = currentKey.split(',').map(Number);

                for (const dimer of vertexToDimers.get(currentKey) || []) {
                    const verts = getVertexKeys(dimer);
                    const pattern = getHeightPattern(dimer.t);
                    const myIdx = verts.findIndex(([vn, vj]) => vn === cn && vj === cj);
                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const vkey = `${verts[i][0]},${verts[i][1]}`;
                            if (!heights.has(vkey)) {
                                heights.set(vkey, currentH + (pattern[i] - pattern[myIdx]));
                                queue.push(vkey);
                            }
                        }
                    }
                }
            }

            const geometry = new THREE.BufferGeometry();
            const vertices = [], normals = [], vertexColors = [], indices = [];

            function addQuad(v1, v2, v3, v4, color) {
                const baseIndex = vertices.length / 3;
                vertices.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z, v4.x, v4.y, v4.z);
                const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
                const edge2 = { x: v4.x - v1.x, y: v4.y - v1.y, z: v4.z - v1.z };
                const nx = edge1.y * edge2.z - edge1.z * edge2.y;
                const ny = edge1.z * edge2.x - edge1.x * edge2.z;
                const nz = edge1.x * edge2.y - edge1.y * edge2.x;
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
                for (let i = 0; i < 4; i++) normals.push(nx/len, ny/len, nz/len);
                const clr = new THREE.Color(color);
                for (let i = 0; i < 4; i++) vertexColors.push(clr.r, clr.g, clr.b);
                indices.push(baseIndex, baseIndex+1, baseIndex+2, baseIndex, baseIndex+2, baseIndex+3);
            }

            for (const dimer of currentDimers) {
                const verts = getVertexKeys(dimer);
                const v3d = verts.map(([n, j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
                addQuad(v3d[0], v3d[1], v3d[2], v3d[3], colors[dimer.t]);
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);

            currentMaterial = new THREE.MeshStandardMaterial({
                vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.3, metalness: autoRotate ? 0.35 : 0.5,
                color: 0xddeeff
            });
            meshGroup.add(new THREE.Mesh(geometry, currentMaterial));

            const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
            meshGroup.add(new THREE.LineSegments(edgesGeometry, new THREE.LineBasicMaterial({ color: 0x222222, opacity: 0.6, transparent: true })));
        }

        let isRunning = false;
        let animationId = null;
        let autoRotate = false;
        const rotateSpeed = 0.012;
        let currentMaterial = null;

        function regenerate() {
            sampleHexagon(currentA, B, C);
            buildGeometry();
            if (currentA === 1) {
                descEl.innerHTML = `surface in <span id="bridge-box-size">1 × 12 × 9</span> box = 2D path in 12 × 9 rectangle`;
            } else {
                descEl.innerHTML = `uniformly random surface in <span id="bridge-box-size">${currentA} × 12 × 9</span> box`;
            }
            if (renderer) renderer.render(scene, camera);
        }

        function animate() {
            if (!isRunning || !renderer || !camera || !controls) return;

            if (autoRotate) {
                const axis = camera.up.clone().normalize();
                const offset = camera.position.clone().sub(controls.target);
                offset.applyAxisAngle(axis, rotateSpeed);
                camera.position.copy(controls.target).add(offset);
                camera.lookAt(controls.target);
            }

            controls.update();
            renderer.render(scene, camera);
            animationId = requestAnimationFrame(animate);
        }

        function start() {
            if (isRunning) return;
            isRunning = true;
            animate();
        }

        function pause() {
            isRunning = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        }

        function startAutoRotate() {
            autoRotate = true;
            for (const light of rotationLights) if (light) light.visible = true;
            if (currentMaterial) currentMaterial.metalness = 0.35;
            if (!isRunning) start();
        }

        function stopAutoRotate() {
            autoRotate = false;
            for (const light of rotationLights) if (light) light.visible = false;
            if (currentMaterial) currentMaterial.metalness = 0.5;
        }

        function setLayerCount(a) {
            currentA = Math.max(1, Math.min(9, a));
            regenerate();
        }

        // Register with slide engine
        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('2to3d', {
                    start,
                    pause,
                    steps: 12,
                    onSlideEnter() {
                        initThreeJS();

                        if (camera && controls) {
                            camera.position.set(40.2, -28.6, -17.5);
                            camera.zoom = 1.432;
                            camera.updateProjectionMatrix();
                            controls.target.set(2.3, -7.8, 0.8);
                            controls.update();
                        }
                        stopAutoRotate();

                        setTimeout(() => {
                            resize();
                            regenerate();
                            if (renderer) renderer.render(scene, camera);
                            if (window.bridgeSnowflake) {
                                window.bridgeSnowflake.resize();
                                window.bridgeSnowflake.render();
                            }
                        }, 50);
                        start();
                    },
                    onSlideLeave() {
                        stopAutoRotate();
                        pause();
                        disposeThreeJS();
                    },
                    onStep(step) {
                        const macmahonEl = document.getElementById('macmahon-text');
                        const macmahonExEl = document.getElementById('macmahon-example');
                        if (step <= 8) {
                            stopAutoRotate();
                            setLayerCount(step + 1);
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                        } else if (step === 9) {
                            startAutoRotate();
                        } else if (step === 10) {
                            if (macmahonEl) macmahonEl.style.opacity = '1';
                            if (macmahonExEl) macmahonExEl.style.opacity = '1';
                            if (window.MathJax) MathJax.typeset();
                        } else if (step === 11 && window.bridgeSnowflake) {
                            stopAutoRotate();
                            document.getElementById('snowflake-title').style.opacity = '1';
                            window.bridgeSnowflake.showRegion();
                        } else if (step === 12 && window.bridgeSnowflake) {
                            const descEl = document.getElementById('snowflake-description');
                            if (descEl) descEl.textContent = 'picking one uniformly at random...';
                            setTimeout(() => {
                                window.bridgeSnowflake.regenerate();
                                if (descEl) descEl.textContent = 'picking one uniformly at random... done';
                            }, 50);
                        }
                    },
                    onStepBack(step) {
                        const macmahonEl = document.getElementById('macmahon-text');
                        const macmahonExEl = document.getElementById('macmahon-example');
                        const snowflakeTitleEl = document.getElementById('snowflake-title');
                        const snowflakeDescEl = document.getElementById('snowflake-description');
                        if (step <= 8) {
                            stopAutoRotate();
                            setLayerCount(step + 1);
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 9) {
                            startAutoRotate();
                            if (macmahonEl) macmahonEl.style.opacity = '0';
                            if (macmahonExEl) macmahonExEl.style.opacity = '0';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 10) {
                            if (macmahonEl) macmahonEl.style.opacity = '1';
                            if (macmahonExEl) macmahonExEl.style.opacity = '1';
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '0';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            if (window.bridgeSnowflake) window.bridgeSnowflake.clear();
                        } else if (step === 11 && window.bridgeSnowflake) {
                            if (snowflakeTitleEl) snowflakeTitleEl.style.opacity = '1';
                            if (snowflakeDescEl) snowflakeDescEl.textContent = '';
                            window.bridgeSnowflake.showRegion();
                        }
                    }
                }, 0);
            } else {
                setTimeout(waitForSlideEngine, 50);
            }
        }
        waitForSlideEngine();
    })();
}

// ===== Snowflake Visualization (2D Canvas) =====
function init2to3dSnowflakeSim() {
    (async function() {
        'use strict';

        const canvas = document.getElementById('bridge-snowflake-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Wait for LozengeModule
        if (typeof LozengeModule === 'undefined') {
            console.error('LozengeModule not loaded');
            return;
        }

        // Create separate WASM instance for snowflake
        const wasm = await LozengeModule();
        const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const runCFTP = wasm.cwrap('runCFTP', 'number', []);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeString = wasm.cwrap('freeString', null, ['number']);

        // Load snowflake triangles
        let snowflakeTriangles = null;
        try {
            const resp = await fetch('/letters/big_snoflake.json');
            const data = await resp.json();
            snowflakeTriangles = data.triangles;
        } catch (e) {
            return;
        }

        let currentDimers = [];
        const colors = ['#E57200', '#232D4B', '#F9DCBF'];

        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);
        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

        function getLozengeVerts(dimer) {
            const { bn, bj, t } = dimer;
            if (t === 0) {
                return [getVertex(bn, bj), getVertex(bn+1, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
            } else if (t === 1) {
                return [getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn+1, bj-2), getVertex(bn, bj-1)];
            } else {
                return [getVertex(bn-1, bj), getVertex(bn, bj), getVertex(bn+1, bj-1), getVertex(bn, bj-1)];
            }
        }

        function toCanvas(x, y, centerX, centerY, scale) {
            return [centerX + x * scale, centerY - y * scale];
        }

        function computeBounds() {
            if (currentDimers.length === 0) return { minX: -50, maxX: 50, minY: -50, maxY: 50 };
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const d of currentDimers) {
                const verts = getLozengeVerts(d);
                for (const v of verts) {
                    if (v.x < minX) minX = v.x;
                    if (v.x > maxX) maxX = v.x;
                    if (v.y < minY) minY = v.y;
                    if (v.y > maxY) maxY = v.y;
                }
            }
            return { minX, maxX, minY, maxY };
        }

        function resize() {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', () => { resize(); draw(); });

        function draw() {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);

            if (currentDimers.length === 0) return;

            const bounds = computeBounds();
            const worldW = bounds.maxX - bounds.minX;
            const worldH = bounds.maxY - bounds.minY;
            const padding = 0.1;
            const scale = Math.min(w / (worldW * (1 + padding)), h / (worldH * (1 + padding)));
            const centerX = w / 2 - (bounds.minX + bounds.maxX) / 2 * scale;
            const centerY = h / 2 + (bounds.minY + bounds.maxY) / 2 * scale;

            for (const d of currentDimers) {
                const verts = getLozengeVerts(d);
                const canvasVerts = verts.map(v => toCanvas(v.x, v.y, centerX, centerY, scale));

                ctx.fillStyle = colors[d.t];
                ctx.beginPath();
                ctx.moveTo(canvasVerts[0][0], canvasVerts[0][1]);
                for (let i = 1; i < canvasVerts.length; i++) {
                    ctx.lineTo(canvasVerts[i][0], canvasVerts[i][1]);
                }
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#222222';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        function getMinimalTiling() {
            if (!snowflakeTriangles) {
                currentDimers = [];
                return;
            }

            const triArr = [];
            for (const tri of snowflakeTriangles) {
                triArr.push(tri.n, tri.j, tri.type);
            }

            const ptr = wasm._malloc(triArr.length * 4);
            for (let i = 0; i < triArr.length; i++) {
                wasm.setValue(ptr + i * 4, triArr[i], 'i32');
            }

            initFromTriangles(ptr, triArr.length);
            wasm._free(ptr);

            const strPtr = exportDimersWasm();
            const jsonStr = wasm.UTF8ToString(strPtr);
            freeString(strPtr);

            try {
                const parsed = JSON.parse(jsonStr);
                currentDimers = Array.isArray(parsed.dimers) ? parsed.dimers : [];
            } catch (e) {
                currentDimers = [];
            }
        }

        function sampleSnowflake() {
            if (!snowflakeTriangles) {
                currentDimers = [];
                return;
            }

            runCFTP();

            const strPtr = exportDimersWasm();
            const jsonStr = wasm.UTF8ToString(strPtr);
            freeString(strPtr);

            try {
                const parsed = JSON.parse(jsonStr);
                currentDimers = Array.isArray(parsed.dimers) ? parsed.dimers : [];
            } catch (e) {
                currentDimers = [];
            }
        }

        let hasSampled = false;

        function showRegion() {
            getMinimalTiling();
            draw();
        }

        function regenerate() {
            sampleSnowflake();
            draw();
            hasSampled = true;
        }

        function clear() {
            currentDimers = [];
            hasSampled = false;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
        }

        // Expose for step control
        window.bridgeSnowflake = {
            showRegion,
            regenerate,
            resize,
            clear,
            render: draw,
            hasSampled: () => hasSampled
        };
    })();
}

// Initialize when WASM is loaded
if (typeof LozengeModule !== 'undefined') {
    init2to3dHexagonSim();
    init2to3dSnowflakeSim();
} else {
    window.addEventListener('wasm-loaded', () => {
        init2to3dHexagonSim();
        init2to3dSnowflakeSim();
    }, { once: true });
}
