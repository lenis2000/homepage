/**
 * GFF Fluctuations: 3D surface from two independent lozenge tiling CFTP samples
 * GFF ≈ (h₁ - h₂) / √2
 */
(function() {
    'use strict';

    function initGFFSim() {
        (async function() {
            const canvas = document.getElementById('gff-canvas');
            if (!canvas) return;

            if (typeof LozengeModule === 'undefined') {
                console.error('LozengeModule not loaded for GFF');
                return;
            }

            // Two independent WASM instances
            const [wasm1, wasm2] = await Promise.all([LozengeModule(), LozengeModule()]);
            if (!document.getElementById('gff-canvas')) return; // async guard

            function wrap(wasm) {
                return {
                    wasm,
                    initFromTriangles: wasm.cwrap('initFromTriangles', 'number', ['number', 'number']),
                    runCFTP: wasm.cwrap('runCFTP', 'number', []),
                    exportDimers: wasm.cwrap('exportDimers', 'number', []),
                    freeString: wasm.cwrap('freeString', null, ['number'])
                };
            }

            const inst1 = wrap(wasm1);
            const inst2 = wrap(wasm2);

            // ---- HEXAGON GEOMETRY ----
            const hexSize = 15;
            const slope = 1 / Math.sqrt(3);
            const deltaC = 2 / Math.sqrt(3);
            const Z_SCALE = 3.0;

            function getVertex(n, j) {
                return { x: n, y: slope * n + j * deltaC };
            }

            function getRightTriangleCentroid(n, j) {
                const v1 = getVertex(n, j), v2 = getVertex(n, j - 1), v3 = getVertex(n + 1, j - 1);
                return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
            }

            function getLeftTriangleCentroid(n, j) {
                const v1 = getVertex(n, j), v2 = getVertex(n + 1, j), v3 = getVertex(n + 1, j - 1);
                return { x: (v1.x + v2.x + v3.x) / 3, y: (v1.y + v2.y + v3.y) / 3 };
            }

            function pointInPolygon(x, y, polygon) {
                let inside = false;
                for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
                    const xi = polygon[i].x, yi = polygon[i].y;
                    const xj = polygon[pj].x, yj = polygon[pj].y;
                    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
                        inside = !inside;
                }
                return inside;
            }

            // Generate triangle array for a×a×a hexagon (cached)
            let hexTriangles = null;
            function getHexTriangles() {
                if (hexTriangles) return hexTriangles;
                const a = hexSize;
                const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
                const sideLengths = [a, a, a, a, a, a];
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

                const arr = [];
                for (let n = searchMinN; n <= searchMaxN; n++) {
                    for (let j = searchMinJ; j <= searchMaxJ; j++) {
                        const rc = getRightTriangleCentroid(n, j);
                        if (pointInPolygon(rc.x, rc.y, boundary)) arr.push(n, j, 1);
                        const lc = getLeftTriangleCentroid(n, j);
                        if (pointInPolygon(lc.x, lc.y, boundary)) arr.push(n, j, 2);
                    }
                }
                hexTriangles = arr;
                return arr;
            }

            // ---- CFTP SAMPLING ----
            function sampleDimers(inst) {
                const triangles = getHexTriangles();
                const dataPtr = inst.wasm._malloc(triangles.length * 4);
                for (let i = 0; i < triangles.length; i++) {
                    inst.wasm.setValue(dataPtr + i * 4, triangles[i], 'i32');
                }

                const initPtr = inst.initFromTriangles(dataPtr, triangles.length);
                inst.freeString(initPtr);
                inst.wasm._free(dataPtr);

                const cftpPtr = inst.runCFTP();
                inst.freeString(cftpPtr);

                const dimersPtr = inst.exportDimers();
                const json = inst.wasm.UTF8ToString(dimersPtr);
                inst.freeString(dimersPtr);

                return JSON.parse(json).dimers || [];
            }

            // ---- HEIGHT FUNCTION FROM DIMERS (BFS) ----
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

            function computeHeights(dimers) {
                if (dimers.length === 0) return new Map();

                const vertexToDimers = new Map();
                for (const dimer of dimers) {
                    for (const [n, j] of getVertexKeys(dimer)) {
                        const key = `${n},${j}`;
                        if (!vertexToDimers.has(key)) vertexToDimers.set(key, []);
                        vertexToDimers.get(key).push(dimer);
                    }
                }

                const heights = new Map();
                const firstVerts = getVertexKeys(dimers[0]);
                const startKey = `${firstVerts[0][0]},${firstVerts[0][1]}`;
                heights.set(startKey, 0);

                const queue = [startKey];
                let queueIdx = 0;
                const visited = new Set();

                while (queueIdx < queue.length) {
                    const currentKey = queue[queueIdx++];
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

                return heights;
            }

            // ---- GFF COMPUTATION ----
            function computeGFF() {
                const dimers1 = sampleDimers(inst1);
                const dimers2 = sampleDimers(inst2);

                if (!meshGroup) return null; // async guard

                const heights1 = computeHeights(dimers1);
                const heights2 = computeHeights(dimers2);

                // Normalize both to height 0 at vertex (0,0)
                const refKey = '0,0';
                const ref1 = heights1.get(refKey) || 0;
                const ref2 = heights2.get(refKey) || 0;

                const gff = new Map();
                let sum = 0, count = 0;
                for (const [key, h1] of heights1) {
                    if (heights2.has(key)) {
                        const g = ((h1 - ref1) - (heights2.get(key) - ref2)) / Math.sqrt(2);
                        gff.set(key, g);
                        sum += g;
                        count++;
                    }
                }

                // Center to mean zero
                if (count > 0) {
                    const mean = sum / count;
                    for (const [key, g] of gff) {
                        gff.set(key, g - mean);
                    }
                }

                return gff;
            }

            // ---- DIVERGING COLORMAP ----
            function gffColor(h) {
                const t = Math.tanh(h / 3);
                if (t < 0) {
                    const s = -t;
                    return [
                        0.85 + s * (0.2 - 0.85),
                        0.85 + s * (0.3 - 0.85),
                        0.85 + s * (0.8 - 0.85)
                    ];
                } else {
                    const s = t;
                    return [
                        0.85 + s * (0.8 - 0.85),
                        0.85 + s * (0.2 - 0.85),
                        0.85 + s * (0.2 - 0.85)
                    ];
                }
            }

            // ---- THREE.JS ----
            let scene = null, renderer = null, camera = null, controls = null, meshGroup = null;
            let animationId = null;
            let isRunning = false;
            const frustumSize = 100;

            function initThreeJS() {
                if (renderer) return;

                scene = new THREE.Scene();
                scene.background = new THREE.Color(0xffffff);

                renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

                const aspect = canvas.clientWidth / canvas.clientHeight || 1;
                camera = new THREE.OrthographicCamera(
                    -frustumSize * aspect / 2, frustumSize * aspect / 2,
                    frustumSize / 2, -frustumSize / 2,
                    -5000, 6000
                );
                camera.up.set(0, 0, 1);

                controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.1;
                controls.rotateSpeed = 0.8;
                controls.panSpeed = 0.8;
                controls.zoomSpeed = 1.2;

                // Standard lighting preset
                scene.add(new THREE.AmbientLight(0xffffff, 0.4));
                const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
                hemi.position.set(0, 20, 0);
                scene.add(hemi);
                const dir = new THREE.DirectionalLight(0xffffff, 0.6);
                dir.position.set(10, 10, 15);
                scene.add(dir);
                const fill = new THREE.DirectionalLight(0xffffff, 0.25);
                fill.position.set(-10, -5, -10);
                scene.add(fill);

                meshGroup = new THREE.Group();
                scene.add(meshGroup);

                controls.addEventListener('change', () => {
                    if (!isRunning && renderer) renderer.render(scene, camera);
                });

                resize();
            }

            function disposeThreeJS() {
                if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
                isRunning = false;

                if (!renderer) return;

                if (meshGroup) {
                    while (meshGroup.children.length > 0) {
                        const child = meshGroup.children[0];
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                        meshGroup.remove(child);
                    }
                }

                if (controls) controls.dispose();
                renderer.dispose();
                renderer = null; scene = null; camera = null; controls = null; meshGroup = null;
            }

            function resize() {
                if (!renderer || !camera) return;
                const w = canvas.clientWidth, h = canvas.clientHeight;
                if (w === 0 || h === 0) return;
                renderer.setSize(w, h, false);
                const aspect = w / h;
                camera.left = -frustumSize * aspect / 2;
                camera.right = frustumSize * aspect / 2;
                camera.top = frustumSize / 2;
                camera.bottom = -frustumSize / 2;
                camera.updateProjectionMatrix();
            }

            function onResize() { resize(); }
            window.addEventListener('resize', onResize);

            function animate() {
                if (!renderer || !camera || !controls) { animationId = null; return; }
                controls.update();
                renderer.render(scene, camera);
                animationId = requestAnimationFrame(animate);
            }

            function startAnimation() {
                if (animationId) return;
                animate();
            }

            function stopAnimation() {
                if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
            }

            // ---- CAMERA ----
            function centerCamera(gff) {
                if (!camera || !controls) return;
                let minX = Infinity, maxX = -Infinity;
                let minY = Infinity, maxY = -Infinity;
                let minZ = Infinity, maxZ = -Infinity;
                for (const [key, h] of gff) {
                    const [n, j] = key.split(',').map(Number);
                    const x = n, y = slope * n + j * deltaC, z = h * Z_SCALE;
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
                }
                const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
                const size = Math.max(maxX - minX, maxY - minY) || 10;

                controls.target.set(cx, cy, cz);
                camera.position.set(cx - size * 0.3, cy - size * 0.5, cz + size * 0.7);
                camera.zoom = frustumSize / (size * 1.1);
                camera.updateProjectionMatrix();
                controls.update();
            }

            // ---- SURFACE MESH ----
            function buildSurfaceMesh(gff) {
                if (!meshGroup) return;

                // Clear existing
                while (meshGroup.children.length > 0) {
                    const child = meshGroup.children[0];
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                    meshGroup.remove(child);
                }

                if (!gff || gff.size === 0) return;

                // Bounding box of vertices
                let minN = Infinity, maxN = -Infinity, minJ = Infinity, maxJ = -Infinity;
                for (const key of gff.keys()) {
                    const [n, j] = key.split(',').map(Number);
                    if (n < minN) minN = n; if (n > maxN) maxN = n;
                    if (j < minJ) minJ = j; if (j > maxJ) maxJ = j;
                }

                const positions = [];
                const colors = [];

                function addVertex(n, j) {
                    const h = gff.get(`${n},${j}`);
                    positions.push(n, slope * n + j * deltaC, h * Z_SCALE);
                    const [r, g, b] = gffColor(h);
                    colors.push(r, g, b);
                }

                // Triangulate: right and left triangles of the lattice
                for (let n = minN; n <= maxN; n++) {
                    for (let j = minJ; j <= maxJ; j++) {
                        // Right triangle: (n,j), (n,j-1), (n+1,j-1)
                        if (gff.has(`${n},${j}`) && gff.has(`${n},${j-1}`) && gff.has(`${n+1},${j-1}`)) {
                            addVertex(n, j);
                            addVertex(n, j - 1);
                            addVertex(n + 1, j - 1);
                        }
                        // Left triangle: (n,j), (n+1,j), (n+1,j-1)
                        if (gff.has(`${n},${j}`) && gff.has(`${n+1},${j}`) && gff.has(`${n+1},${j-1}`)) {
                            addVertex(n, j);
                            addVertex(n + 1, j);
                            addVertex(n + 1, j - 1);
                        }
                    }
                }

                if (positions.length === 0) return;

                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                geometry.computeVertexNormals();

                const material = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    side: THREE.DoubleSide,
                    flatShading: true,
                    roughness: 0.5,
                    metalness: 0.15
                });
                meshGroup.add(new THREE.Mesh(geometry, material));

                // Subtle dark edges
                const edgeGeo = new THREE.EdgesGeometry(geometry, 15);
                const edgeMat = new THREE.LineBasicMaterial({
                    color: 0x444466, opacity: 0.15, transparent: true
                });
                meshGroup.add(new THREE.LineSegments(edgeGeo, edgeMat));
            }

            // ---- MAIN SAMPLE ----
            let needsCenterCamera = true;

            function doSample() {
                const gff = computeGFF();
                if (!meshGroup) return; // async guard
                buildSurfaceMesh(gff);
                if (needsCenterCamera && gff) {
                    centerCamera(gff);
                    needsCenterCamera = false;
                }
                if (renderer && !isRunning) renderer.render(scene, camera);
            }

            // ---- SLIDE ENGINE ----
            function showElement(id) {
                const el = document.getElementById(id);
                if (el) el.style.opacity = '1';
            }
            function hideElement(id) {
                const el = document.getElementById(id);
                if (el) el.style.opacity = '0';
            }

            function waitForSlideEngine() {
                if (window.slideEngine) {
                    window.slideEngine.registerSimulation('gff-fluctuations', {
                        start() {
                            isRunning = true;
                            startAnimation();
                        },
                        pause() {
                            isRunning = false;
                            stopAnimation();
                        },
                        steps: 2,

                        onSlideEnter() {
                            initThreeJS();
                            needsCenterCamera = true;
                            setTimeout(() => {
                                resize();
                                doSample();
                            }, 50);
                        },

                        onSlideLeave() {
                            stopAnimation();
                            disposeThreeJS();
                        },

                        onStep(step) {
                            if (step === 1) showElement('gff-text-pane');
                            if (step === 2) doSample();
                        },

                        onStepBack(step) {
                            if (step === 0) hideElement('gff-text-pane');
                        },

                        reset() {
                            hideElement('gff-text-pane');
                        }
                    }, 0);
                } else {
                    setTimeout(waitForSlideEngine, 50);
                }
            }

            waitForSlideEngine();
        })();
    }

    // Initialize when WASM is ready
    if (typeof LozengeModule !== 'undefined') {
        initGFFSim();
    } else {
        window.addEventListener('wasm-loaded', initGFFSim, { once: true });
    }
})();
