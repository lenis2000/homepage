/**
 * Lozenges Intro: rotating unit cube (left) + static 9×12×9 hexagon (right)
 */

function initLozIntroSim() {
    (async function() {
        'use strict';

        const cubeCanvas = document.getElementById('li-cube-canvas');
        const hexCanvas = document.getElementById('li-hex-canvas');
        if (!cubeCanvas || !hexCanvas) return;

        // Wait for LozengeModule
        if (typeof LozengeModule === 'undefined') {
            console.error('[lozenges-intro] LozengeModule not loaded');
            return;
        }

        const wasm = await LozengeModule();
        const initFromTriangles = wasm.cwrap('initFromTriangles', 'number', ['number', 'number']);
        const runCFTP = wasm.cwrap('runCFTP', 'number', []);
        const exportDimersWasm = wasm.cwrap('exportDimers', 'number', []);
        const freeString = wasm.cwrap('freeString', null, ['number']);

        // UVA colors
        const UVA_COLORS = ['#E57200', '#232D4B', '#F9DCBF'];

        // ===== Shared geometry helpers (from 2to3d-sim) =====
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
            let inside = false;
            for (let i = 0, pj = polygon.length - 1; i < polygon.length; pj = i++) {
                const xi = polygon[i].x, yi = polygon[i].y;
                const xj = polygon[pj].x, yj = polygon[pj].y;
                if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi))
                    inside = !inside;
            }
            return inside;
        }

        function generateHexagonTriangles(a, b, c) {
            const dirs = [[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];
            const sides = [a, b, c, a, b, c];
            const boundary = [];
            let bn = 0, bj = 0;
            for (let d = 0; d < 6; d++) {
                for (let s = 0; s < sides[d]; s++) {
                    boundary.push(getVertex(bn, bj));
                    bn += dirs[d][0]; bj += dirs[d][1];
                }
            }
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const v of boundary) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); }
            const searchMinN = Math.floor(minX) - 2, searchMaxN = Math.ceil(maxX) + 2;
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
            return arr;
        }

        function sampleHexagon(a, b, c) {
            const triArr = generateHexagonTriangles(a, b, c);
            const dataPtr = wasm._malloc(triArr.length * 4);
            for (let i = 0; i < triArr.length; i++) wasm.setValue(dataPtr + i * 4, triArr[i], 'i32');
            const initPtr = initFromTriangles(dataPtr, triArr.length);
            freeString(initPtr);
            wasm._free(dataPtr);
            const cftpPtr = runCFTP();
            freeString(cftpPtr);
            const dimersPtr = exportDimersWasm();
            const json = wasm.UTF8ToString(dimersPtr);
            freeString(dimersPtr);
            return (JSON.parse(json).dimers || []);
        }

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

        // ===== Three.js setup for a canvas =====
        function createScene(canvas, frustumSize) {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xffffff);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            const aspect = canvas.clientWidth / canvas.clientHeight || 1;
            const camera = new THREE.OrthographicCamera(
                -frustumSize*aspect/2, frustumSize*aspect/2,
                frustumSize/2, -frustumSize/2, 0.1, 1000
            );
            camera.up.set(0, 0, 1);
            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.1;
            controls.rotateSpeed = 0.8;

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

            const meshGroup = new THREE.Group();
            scene.add(meshGroup);

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

            return { scene, renderer, camera, controls, meshGroup, resize };
        }

        function disposeScene(s) {
            if (!s || !s.renderer) return;
            if (s.meshGroup) {
                while (s.meshGroup.children.length > 0) {
                    const c = s.meshGroup.children[0];
                    if (c.geometry) c.geometry.dispose();
                    if (c.material) {
                        if (Array.isArray(c.material)) c.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                        else c.material.dispose();
                    }
                    s.meshGroup.remove(c);
                }
            }
            if (s.controls) s.controls.dispose();
            s.renderer.dispose();
            s.renderer = null; s.scene = null; s.camera = null; s.controls = null; s.meshGroup = null;
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
                const v3d = verts.map(([n,j]) => to3D(n, j, heights.get(`${n},${j}`) || 0));
                addQuad(v3d[0], v3d[1], v3d[2], v3d[3], UVA_COLORS[d.t]);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);
            const mat = flat
                ? new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
                : new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.5, metalness: 0.15 });
            meshGroup.add(new THREE.Mesh(geometry, mat));
            const edges = new THREE.EdgesGeometry(geometry, 10);
            meshGroup.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.5, transparent: true })));
        }

        // ===== State =====
        let cubeScene = null, hexScene = null;
        let cubeRotateId = null, cubeRenderId = null, hexRenderId = null;
        let sampled = false;

        function initCube() {
            if (cubeScene) return;
            cubeScene = createScene(cubeCanvas, 5);

            // 1×1×1 hexagon = 3 lozenges (one of each type)
            const cubeDimers = sampleHexagon(1, 1, 1);
            const cubeHeights = computeHeights(cubeDimers);
            buildMesh(cubeDimers, cubeHeights, cubeScene.meshGroup);

            // Camera: standard view looking down the (1,1,1) direction
            cubeScene.camera.position.set(-4.3, 1.7, 2.8);
            cubeScene.camera.zoom = 1.16;
            cubeScene.camera.updateProjectionMatrix();
            cubeScene.controls.target.set(0.2, -0.8, -0.2);
            cubeScene.controls.update();

            // Start render loop (needed for damping + auto-rotate)
            function renderLoop() {
                if (!cubeScene || !cubeScene.renderer) return;
                cubeScene.controls.update();
                cubeScene.renderer.render(cubeScene.scene, cubeScene.camera);
                cubeRenderId = requestAnimationFrame(renderLoop);
            }
            renderLoop();
        }

        function startCubeRotate() {
            if (cubeRotateId || !cubeScene) return;
            cubeScene.controls.autoRotate = true;
            cubeScene.controls.autoRotateSpeed = 4.0;
        }

        function stopCubeRotate() {
            if (!cubeScene) return;
            cubeScene.controls.autoRotate = false;
        }

        function initHex() {
            if (hexScene) return;
            hexScene = createScene(hexCanvas, 30);

            if (!sampled) {
                const hexDimers = sampleHexagon(9, 12, 9);
                const hexHeights = computeHeights(hexDimers);
                buildMesh(hexDimers, hexHeights, hexScene.meshGroup, true);
                sampled = true;
            }

            // Camera along (1,-1,-1) — the "height" direction in to3D coords
            hexScene.camera.position.set(25.8, -36.1, -27.3);
            hexScene.camera.zoom = 1.240;
            hexScene.camera.updateProjectionMatrix();
            hexScene.controls.target.set(-3.1, -7.3, 1.6);
            hexScene.controls.update();

            // Render loop for interactivity (damping)
            function renderLoop() {
                if (!hexScene || !hexScene.renderer) return;
                hexScene.controls.update();
                hexScene.renderer.render(hexScene.scene, hexScene.camera);
                hexRenderId = requestAnimationFrame(renderLoop);
            }
            renderLoop();
        }

        function dispose() {
            stopCubeRotate();
            if (cubeRenderId) { cancelAnimationFrame(cubeRenderId); cubeRenderId = null; }
            if (hexRenderId) { cancelAnimationFrame(hexRenderId); hexRenderId = null; }
            disposeScene(cubeScene); cubeScene = null;
            disposeScene(hexScene); hexScene = null;
            sampled = false;
        }

        // ===== Register with slide engine =====
        function waitForSlideEngine() {
            if (window.slideEngine) {
                window.slideEngine.registerSimulation('lozenges-intro', {
                    start() { startCubeRotate(); },
                    pause() { stopCubeRotate(); },
                    onSlideEnter() {
                        const tryInit = () => {
                            if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                                initCube();
                                initHex();
                                startCubeRotate();
                            } else {
                                setTimeout(tryInit, 50);
                            }
                        };
                        tryInit();
                    },
                    onSlideLeave() { dispose(); }
                }, 0);
            } else {
                setTimeout(waitForSlideEngine, 50);
            }
        }
        waitForSlideEngine();
    })();
}

// Initialize when WASM is loaded
if (typeof LozengeModule !== 'undefined') {
    initLozIntroSim();
} else {
    window.addEventListener('wasm-loaded', initLozIntroSim, { once: true });
}
