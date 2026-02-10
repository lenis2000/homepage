/**
 * Beyond GFF slide: 3D tiling of non-simply-connected shape
 * Step 0: small CFTP sample (live)
 * Step 1: load pre-sampled large OBJ, zoom in → slow zoom out
 */

function initBeyondGffSim() {
    (async function() {
        'use strict';

        const canvas = document.getElementById('beyond-escher-canvas');
        if (!canvas) return;

        if (typeof LozengeModule === 'undefined') {
            console.error('[beyond-gff] LozengeModule not loaded');
            return;
        }

        const wasm = await LozengeModule();
        const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const runCFTP = wasm.cwrap('runCFTP', 'number', []);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeString = wasm.cwrap('freeString', null, ['number']);
        const getHoleCount = wasm.cwrap('getHoleCount', 'number', []);
        const adjustHoleWinding = wasm.cwrap('adjustHoleWindingExport', 'number', ['number', 'number']);
        const initCFTPWasm = wasm.cwrap('initCFTP', 'number', []);
        const getGridBoundsWasm = wasm.cwrap('getGridBounds', 'number', []);
        const getCFTPMinGridDataWasm = wasm.cwrap('getCFTPMinGridData', 'number', []);
        const getCFTPMaxGridDataWasm = wasm.cwrap('getCFTPMaxGridData', 'number', []);

        let gpuEngine = null;
        let gpuAvailable = false;

        async function initGPU() {
            if (gpuEngine) return gpuAvailable;
            if (typeof WebGPULozengeEngine === 'undefined') return false;
            try {
                gpuEngine = new WebGPULozengeEngine();
                await gpuEngine.init();
                gpuAvailable = true;
                return true;
            } catch (e) {
                gpuAvailable = false;
                return false;
            }
        }

        function getGridBounds() {
            const ptr = getGridBoundsWasm();
            const s = wasm.UTF8ToString(ptr);
            freeString(ptr);
            return JSON.parse(s);
        }

        function getCFTPMinRawGridData(bounds) {
            const p = getCFTPMinGridDataWasm();
            if (!p) return null;
            const d = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) d[i] = wasm.getValue(p + i * 4, 'i32');
            wasm._free(p);
            return d;
        }

        function getCFTPMaxRawGridData(bounds) {
            const p = getCFTPMaxGridDataWasm();
            if (!p) return null;
            const d = new Int32Array(bounds.size);
            for (let i = 0; i < bounds.size; i++) d[i] = wasm.getValue(p + i * 4, 'i32');
            wasm._free(p);
            return d;
        }

        function getBlackTriangles() {
            if (!shapeTriangles) return [];
            return shapeTriangles.filter(t => t.type === 1).map(t => ({ n: t.n, j: t.j }));
        }

        // UVA colors
        const UVA_ORANGE = new THREE.Color('#E57200');
        const UVA_BLUE = new THREE.Color('#232D4B');
        const UVA_CREAM = new THREE.Color('#F9DCBF');
        const UVA_COLORS_ARR = ['#E57200', '#232D4B', '#F9DCBF'];

        // Geometry helpers
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);

        function getVertexKeys(d) {
            const { bn, bj, t } = d;
            if (t === 0) return [[bn,bj],[bn+1,bj],[bn+1,bj-1],[bn,bj-1]];
            if (t === 1) return [[bn,bj],[bn+1,bj-1],[bn+1,bj-2],[bn,bj-1]];
            return [[bn-1,bj],[bn,bj],[bn+1,bj-1],[bn,bj-1]];
        }
        function getHeightPattern(t) {
            if (t === 0) return [0,0,0,0];
            if (t === 1) return [1,0,0,1];
            return [1,1,0,0];
        }
        function to3D(n, j, h) { return { x: h, y: -n - h, z: j - h }; }
        // Project onto x+y+z=0 plane along (1,-1,-1): eliminates height, keeps screen position
        function to2DFlat(n, j) { return { x: j - n, y: -j, z: n }; }

        function computeHeights(dimers) {
            const vtod = new Map();
            for (const d of dimers) {
                for (const [n,j] of getVertexKeys(d)) {
                    const k = `${n},${j}`;
                    if (!vtod.has(k)) vtod.set(k, []);
                    vtod.get(k).push(d);
                }
            }
            const heights = new Map();
            const fv = getVertexKeys(dimers[0]);
            heights.set(`${fv[0][0]},${fv[0][1]}`, 0);
            const queue = [`${fv[0][0]},${fv[0][1]}`];
            const visited = new Set();
            while (queue.length > 0) {
                const ck = queue.shift();
                if (visited.has(ck)) continue;
                visited.add(ck);
                const ch = heights.get(ck);
                const [cn, cj] = ck.split(',').map(Number);
                for (const d of (vtod.get(ck) || [])) {
                    const verts = getVertexKeys(d);
                    const pat = getHeightPattern(d.t);
                    const myIdx = verts.findIndex(([vn,vj]) => vn===cn && vj===cj);
                    if (myIdx >= 0) {
                        for (let i = 0; i < 4; i++) {
                            const vk = `${verts[i][0]},${verts[i][1]}`;
                            if (!heights.has(vk)) {
                                heights.set(vk, ch + (pat[i] - pat[myIdx]));
                                queue.push(vk);
                            }
                        }
                    }
                }
            }
            return heights;
        }

        // Three.js scene
        let scene = null;
        let renderId = null;
        let sampled = false;
        let cachedDimers = null;
        let cachedHeights = null;
        let cameraAnimId = null;
        let currentStep = 0;

        const frustumSize = 40;

        function createScene() {
            const s = new THREE.Scene();
            s.background = new THREE.Color(0xffffff);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            renderer.setPixelRatio(1);
            const aspect = canvas.clientWidth / canvas.clientHeight || 1;
            const camera = new THREE.OrthographicCamera(
                -frustumSize*aspect/2, frustumSize*aspect/2,
                frustumSize/2, -frustumSize/2, -5000, 6000
            );
            camera.up.set(0, 0, 1);
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.rotateSpeed = 0.8;

            s.add(new THREE.AmbientLight(0xffffff, 0.4));
            const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
            hemi.position.set(0, 20, 0); s.add(hemi);
            const dir = new THREE.DirectionalLight(0xffffff, 0.6);
            dir.position.set(10, 10, 15); s.add(dir);
            const fill = new THREE.DirectionalLight(0xffffff, 0.25);
            fill.position.set(-10, -5, -10); s.add(fill);

            const meshGroup = new THREE.Group();
            s.add(meshGroup);

function resize() {
                const w = canvas.clientWidth, h = canvas.clientHeight;
                if (w === 0 || h === 0) return;
                renderer.setSize(w, h, false);
                const a = w / h;
                camera.left = -frustumSize*a/2; camera.right = frustumSize*a/2;
                camera.top = frustumSize/2; camera.bottom = -frustumSize/2;
                camera.updateProjectionMatrix();
            }
            resize();

            return { scene: s, renderer, camera, controls, meshGroup, resize };
        }

        function clearMeshGroup() {
            if (!scene || !scene.meshGroup) return;
            while (scene.meshGroup.children.length > 0) {
                const c = scene.meshGroup.children[0];
                if (c.geometry) c.geometry.dispose();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                    else c.material.dispose();
                }
                scene.meshGroup.remove(c);
            }
        }

        function buildMesh(dimers, heights, meshGroup, flat) {
            const geometry = new THREE.BufferGeometry();
            const vertices = [], normals = [], vertexColors = [], indices = [];
            function addQuad(v1, v2, v3, v4, color) {
                const bi = vertices.length / 3;
                vertices.push(v1.x,v1.y,v1.z, v2.x,v2.y,v2.z, v3.x,v3.y,v3.z, v4.x,v4.y,v4.z);
                const e1 = {x:v2.x-v1.x, y:v2.y-v1.y, z:v2.z-v1.z};
                const e2 = {x:v4.x-v1.x, y:v4.y-v1.y, z:v4.z-v1.z};
                const nx = e1.y*e2.z - e1.z*e2.y, ny = e1.z*e2.x - e1.x*e2.z, nz = e1.x*e2.y - e1.y*e2.x;
                const len = Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
                for (let i=0;i<4;i++) normals.push(nx/len,ny/len,nz/len);
                const clr = new THREE.Color(color);
                for (let i=0;i<4;i++) vertexColors.push(clr.r,clr.g,clr.b);
                indices.push(bi,bi+1,bi+2, bi,bi+2,bi+3);
            }
            for (const d of dimers) {
                const verts = getVertexKeys(d);
                const v3d = flat
                    ? verts.map(([n,j]) => to2DFlat(n, j))
                    : verts.map(([n,j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
                addQuad(v3d[0], v3d[1], v3d[2], v3d[3], UVA_COLORS_ARR[d.t]);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);
            if (flat) {
                const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
                meshGroup.add(new THREE.Mesh(geometry, mat));
                const edges = new THREE.EdgesGeometry(geometry, 1);
                meshGroup.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 })));
            } else {
                const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.5, metalness: 0.15 });
                meshGroup.add(new THREE.Mesh(geometry, mat));
            }
        }

        // Color OBJ faces by normal direction (UVA colors)
        function colorOBJByNormal(mesh) {
            const geometry = mesh.geometry;
            if (!geometry) return;

            geometry.computeVertexNormals();
            const posAttr = geometry.getAttribute('position');
            const normalAttr = geometry.getAttribute('normal');
            const count = posAttr.count;
            const colors = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                const nx = Math.abs(normalAttr.getX(i));
                const ny = Math.abs(normalAttr.getY(i));
                const nz = Math.abs(normalAttr.getZ(i));
                let color;
                if (nx >= ny && nx >= nz) color = UVA_ORANGE;
                else if (ny >= nx && ny >= nz) color = UVA_BLUE;
                else color = UVA_CREAM;
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }

            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            mesh.material = new THREE.MeshStandardMaterial({
                vertexColors: true, side: THREE.DoubleSide, flatShading: true,
                roughness: 0.5, metalness: 0.15
            });
        }

        function centerCamera(sc, heights, flat) {
            if (flat) {
                // Compute center of flat projection
                let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity, minZ=Infinity, maxZ=-Infinity;
                for (const [key] of heights) {
                    const [n, j] = key.split(',').map(Number);
                    const p = to2DFlat(n, j);
                    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
                }
                const cx = (minX+maxX)/2, cy = (minY+maxY)/2, cz = (minZ+maxZ)/2;
                const dist = 200;
                sc.controls.target.set(cx, cy, cz);
                sc.camera.position.set(cx - dist, cy + dist, cz + dist);
                sc.camera.zoom = 0.397;
            } else {
                sc.controls.target.set(-24.5, 15.0, 27.0);
                sc.camera.position.set(-105.4, 99.2, 111.4);
                sc.camera.zoom = 0.397;
            }
            sc.camera.updateProjectionMatrix();
            sc.controls.update();
        }

        // Camera animation
        function easeInOutCubic(t) {
            return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
        }

        function animateCamera(targetPos, targetLookAt, targetZoom, duration) {
            if (cameraAnimId) cancelAnimationFrame(cameraAnimId);
            if (!scene || !scene.camera || !scene.controls) return;

            const startPos = scene.camera.position.clone();
            const startTarget = scene.controls.target.clone();
            const startZoom = scene.camera.zoom;
            const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
            const endTarget = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);
            const t0 = performance.now();

            function step() {
                if (!scene || !scene.camera || !scene.controls) { cameraAnimId = null; return; }
                const elapsed = performance.now() - t0;
                const progress = Math.min(elapsed / duration, 1);
                const t = easeInOutCubic(progress);

                scene.camera.position.lerpVectors(startPos, endPos, t);
                scene.controls.target.lerpVectors(startTarget, endTarget, t);
                scene.camera.zoom = startZoom + (targetZoom - startZoom) * t;
                scene.camera.updateProjectionMatrix();
                scene.controls.update();

                if (progress < 1) {
                    cameraAnimId = requestAnimationFrame(step);
                } else {
                    cameraAnimId = null;
                }
            }
            step();
        }

        // Load shape + sample
        let shapeTriangles = null;
        try {
            const resp = await fetch('/letters/SHAPE.json');
            const data = await resp.json();
            shapeTriangles = data.triangles;
        } catch (e) {
            console.error('[beyond-gff] Failed to load SHAPE.json', e);
            return;
        }

        let regionInited = false;

        // Init region + set hole winding, export extremal state (no CFTP)
        function initRegion() {
            if (!shapeTriangles || regionInited) return;
            const triArr = [];
            for (const tri of shapeTriangles) {
                triArr.push(tri.n, tri.j, tri.type);
            }
            const ptr = wasm._malloc(triArr.length * 4);
            for (let i = 0; i < triArr.length; i++) wasm.setValue(ptr + i * 4, triArr[i], 'i32');
            const initPtr = initFromTriangles(ptr, triArr.length);
            freeString(initPtr);
            wasm._free(ptr);
            // Set hole winding to 16 (mandatory for non-simply-connected)
            const holeCount = getHoleCount();
            for (let h = 0; h < holeCount; h++) {
                const adjPtr = adjustHoleWinding(h, 16);
                freeString(adjPtr);
            }
            // Export extremal (non-sampled) state
            const dimersPtr = exportDimersWasm();
            const json = wasm.UTF8ToString(dimersPtr);
            freeString(dimersPtr);
            cachedDimers = JSON.parse(json).dimers || [];
            cachedHeights = computeHeights(cachedDimers);
            regionInited = true;
        }

        // Run CFTP on already-initialized region (async GPU-first, WASM fallback)
        async function runSampling() {
            if (!regionInited) initRegion();

            let dimers = [];
            const useGPU = await initGPU();

            if (useGPU && gpuEngine) {
                try {
                    initCFTPWasm();
                    const bounds = getGridBounds();
                    const minGridData = getCFTPMinRawGridData(bounds);
                    const maxGridData = getCFTPMaxRawGridData(bounds);

                    if (minGridData && maxGridData) {
                        gpuEngine.initFromWasmData(minGridData, bounds.minN, bounds.maxN, bounds.minJ, bounds.maxJ);
                        const gpuCftpOk = await gpuEngine.initCFTP(minGridData, maxGridData);

                        if (gpuCftpOk) {
                            let T = 1;
                            const maxT = 134217728;
                            let coalesced = false;

                            while (!coalesced && T <= maxT) {
                                gpuEngine.resetCFTPChains(minGridData, maxGridData);
                                const result = await gpuEngine.stepCFTP(T, Math.min(T, 10000));
                                coalesced = result.coalesced;
                                if (!coalesced) coalesced = await gpuEngine.checkCoalescence();
                                if (!coalesced) T *= 2;
                            }

                            if (coalesced) {
                                const resultGrid = await gpuEngine.getCFTPResult();
                                const blackTriangles = getBlackTriangles();
                                dimers = gpuEngine.gridToDimers(resultGrid, blackTriangles);
                                gpuEngine.destroyCFTP();
                            } else {
                                gpuEngine.destroyCFTP();
                                throw new Error('GPU CFTP did not coalesce');
                            }
                        } else {
                            throw new Error('GPU CFTP init failed');
                        }
                    } else {
                        throw new Error('Could not get grid data');
                    }
                } catch (e) {
                    console.log('[beyond-gff] GPU CFTP failed, falling back to WASM:', e.message);
                    dimers = [];
                }
            }

            // WASM fallback (blocking but necessary if GPU unavailable)
            if (dimers.length === 0) {
                const cftpPtr = runCFTP();
                freeString(cftpPtr);
                const dimersPtr = exportDimersWasm();
                const json = wasm.UTF8ToString(dimersPtr);
                freeString(dimersPtr);
                dimers = JSON.parse(json).dimers || [];
            }

            cachedDimers = dimers;
            cachedHeights = computeHeights(cachedDimers);
            sampled = true;
        }

        // OBJ loader
        let objMeshCached = null;

        function loadOBJ(url) {
            return new Promise((resolve, reject) => {
                const loader = new THREE.OBJLoader();
                loader.load(url, resolve, undefined, reject);
            });
        }

        async function showLargeOBJ() {
            if (!scene || !scene.meshGroup) return;
            clearMeshGroup();

            try {
                if (!objMeshCached) {
                    const obj = await loadOBJ('images/big_shape.obj');
                    if (!scene || !scene.meshGroup) return;
                    objMeshCached = obj;
                }

                const clone = objMeshCached.clone();
                clone.traverse(child => {
                    if (child.isMesh) {
                        colorOBJByNormal(child);
                        // Add edges
                        const edgeGeo = new THREE.EdgesGeometry(child.geometry, 10);
                        const edgeMat = new THREE.LineBasicMaterial({ color: 0x444466, opacity: 0.3, transparent: true });
                        child.parent.add(new THREE.LineSegments(edgeGeo, edgeMat));
                    }
                });
                scene.meshGroup.add(clone);

                // Compute bounding box for camera
                const box = new THREE.Box3().setFromObject(clone);
                const center = new THREE.Vector3();
                box.getCenter(center);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);

                // TODO: Replace these with user-provided values after camera logging
                // Start zoomed in
                const startPos = { x: center.x - maxDim*0.5, y: center.y + maxDim*0.3, z: center.z + maxDim*0.3 };
                const startTarget = { x: center.x, y: center.y, z: center.z };
                const startZoom = 3.0;

                scene.controls.target.set(startTarget.x, startTarget.y, startTarget.z);
                scene.camera.position.set(startPos.x, startPos.y, startPos.z);
                scene.camera.zoom = startZoom;
                scene.camera.updateProjectionMatrix();
                scene.controls.update();

                // Animate zoom out over 3 seconds
                const endPos = { x: center.x - maxDim*1.5, y: center.y + maxDim*1.0, z: center.z + maxDim*1.0 };
                const endTarget = { x: center.x, y: center.y, z: center.z };
                const endZoom = 1.0;

                setTimeout(() => {
                    animateCamera(endPos, endTarget, endZoom, 3000);
                }, 200);

            } catch (e) {
                console.error('[beyond-gff] Failed to load OBJ:', e);
            }
        }

        function showCurrentState(flat) {
            if (!scene || !scene.meshGroup) return;
            clearMeshGroup();
            if (cachedDimers && cachedDimers.length > 0) {
                buildMesh(cachedDimers, cachedHeights, scene.meshGroup, flat);
                centerCamera(scene, cachedHeights, flat);
            }
        }

        function disposeScene() {
            if (cameraAnimId) { cancelAnimationFrame(cameraAnimId); cameraAnimId = null; }
            if (renderId) { cancelAnimationFrame(renderId); renderId = null; }
            if (!scene) return;
            clearMeshGroup();
            if (scene.controls) scene.controls.dispose();
            scene.renderer.dispose();
            scene = null;
        }

        let samplingPromise = null;
        let samplingDone = false;
        let pendingReveal = false;

        function startBackgroundSampling() {
            samplingDone = false;
            samplingPromise = (async () => {
                await new Promise(r => setTimeout(r, 0)); // yield to event loop
                if (!regionInited) initRegion();
                await runSampling();
                samplingDone = true;
                if (pendingReveal && scene && scene.meshGroup) {
                    showCurrentState(false);
                    pendingReveal = false;
                }
            })();
        }

        function init() {
            if (scene) return;
            scene = createScene();
            // Show flat extremal state, then start CFTP in background
            setTimeout(() => {
                if (!scene || !scene.meshGroup) return;
                initRegion();
                showCurrentState(true);
                startBackgroundSampling();
            }, 0);

            function renderLoop() {
                if (!scene || !scene.renderer) return;
                scene.controls.update();
                scene.renderer.render(scene.scene, scene.camera);
                renderId = requestAnimationFrame(renderLoop);
            }
            renderLoop();
        }

        function waitForSlideEngine() {
            if (window.slideEngine) {
                const gffImgEl = document.getElementById('beyond-gff-img');

                window.slideEngine.registerSimulation('beyond-gff', {
                    steps: 3,
                    start() {},
                    pause() {},
                    onStep(step) {
                        currentStep = step;
                        if (step === 1) {
                            if (samplingDone) {
                                showCurrentState(false);
                            } else {
                                pendingReveal = true;
                            }
                        }
                        if (step === 2 && scene && scene.controls) {
                            scene.controls.autoRotate = true;
                            scene.controls.autoRotateSpeed = 4.0;
                        }
                        if (step === 3 && gffImgEl) {
                            gffImgEl.style.opacity = '1';
                        }
                    },
                    onStepBack(step) {
                        currentStep = step;
                        if (step === 2) {
                            if (gffImgEl) gffImgEl.style.opacity = '0';
                        }
                        if (step === 1 && scene && scene.controls) {
                            scene.controls.autoRotate = false;
                            if (gffImgEl) gffImgEl.style.opacity = '0';
                            if (samplingDone) showCurrentState(false);
                        }
                        if (step === 0) {
                            if (scene && scene.controls) scene.controls.autoRotate = false;
                            if (gffImgEl) gffImgEl.style.opacity = '0';
                            pendingReveal = false;
                            regionInited = false;
                            sampled = false;
                            setTimeout(() => {
                                if (!scene || !scene.meshGroup) return;
                                initRegion();
                                showCurrentState(true);
                                startBackgroundSampling();
                            }, 0);
                        }
                    },
                    onSlideEnter() {
                        currentStep = 0;
                        const tryInit = () => {
                            if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                                init();
                            } else {
                                setTimeout(tryInit, 50);
                            }
                        };
                        tryInit();
                    },
                    onSlideLeave() {
                        currentStep = 0;
                        disposeScene();
                    }
                }, 0);
            } else {
                setTimeout(waitForSlideEngine, 50);
            }
        }
        waitForSlideEngine();
    })();
}

if (typeof LozengeModule !== 'undefined') {
    initBeyondGffSim();
} else {
    window.addEventListener('wasm-loaded', initBeyondGffSim, { once: true });
}
