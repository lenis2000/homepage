/**
 * Beyond GFF slide: Escher-style 3D tiling of the Shape of the Month
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

        // Escher grayscale colors
        const ESCHER_COLORS = ['#F5F5F5', '#D0D0D0', '#A8A8A8'];

        // Geometry helpers
        const slope = 1 / Math.sqrt(3);
        const deltaC = 2 / Math.sqrt(3);
        function getVertex(n, j) { return { x: n, y: slope * n + j * deltaC }; }

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

        // Three.js scene
        let scene = null;
        let renderId = null;
        let sampled = false;
        let cachedDimers = null;
        let cachedHeights = null;

        function createScene() {
            const s = new THREE.Scene();
            s.background = new THREE.Color(0xffffff);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            const aspect = canvas.clientWidth / canvas.clientHeight || 1;
            const frustumSize = 40;
            const camera = new THREE.OrthographicCamera(
                -frustumSize*aspect/2, frustumSize*aspect/2,
                frustumSize/2, -frustumSize/2, 0.1, 1000
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

        function buildMesh(dimers, heights, meshGroup) {
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
                addQuad(v3d[0], v3d[1], v3d[2], v3d[3], ESCHER_COLORS[d.t]);
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
            geometry.setIndex(indices);
            const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, flatShading: true, roughness: 0.5, metalness: 0.15 });
            meshGroup.add(new THREE.Mesh(geometry, mat));
            const edges = new THREE.EdgesGeometry(geometry, 10);
            meshGroup.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x888888, opacity: 0.4, transparent: true })));
        }

        function centerCamera(sc, heights) {
            let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity, minZ=Infinity, maxZ=-Infinity;
            for (const [key, h] of heights) {
                const [n, j] = key.split(',').map(Number);
                const p = to3D(n, j, h);
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
            }
            const cx = (minX+maxX)/2, cy = (minY+maxY)/2, cz = (minZ+maxZ)/2;
            const size = Math.max(maxX-minX, maxY-minY, maxZ-minZ);
            sc.controls.target.set(cx, cy, cz);
            sc.camera.position.set(cx - size*1.5, cy + size*1.0, cz + size*1.0);
            sc.camera.zoom = 1.0;
            sc.camera.updateProjectionMatrix();
            sc.controls.update();
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

        function sampleShape() {
            if (!shapeTriangles) return;
            const triArr = [];
            for (const tri of shapeTriangles) {
                triArr.push(tri.n, tri.j, tri.type);
            }
            const ptr = wasm._malloc(triArr.length * 4);
            for (let i = 0; i < triArr.length; i++) wasm.setValue(ptr + i * 4, triArr[i], 'i32');
            const initPtr = initFromTriangles(ptr, triArr.length);
            freeString(initPtr);
            wasm._free(ptr);
            const cftpPtr = runCFTP();
            freeString(cftpPtr);
            const dimersPtr = exportDimersWasm();
            const json = wasm.UTF8ToString(dimersPtr);
            freeString(dimersPtr);
            cachedDimers = JSON.parse(json).dimers || [];
            cachedHeights = computeHeights(cachedDimers);
            sampled = true;
        }

        function disposeScene() {
            if (renderId) { cancelAnimationFrame(renderId); renderId = null; }
            if (!scene) return;
            if (scene.meshGroup) {
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
            if (scene.controls) scene.controls.dispose();
            scene.renderer.dispose();
            scene = null;
        }

        function init() {
            if (scene) return;
            scene = createScene();

            if (!sampled) sampleShape();
            if (cachedDimers && cachedDimers.length > 0) {
                buildMesh(cachedDimers, cachedHeights, scene.meshGroup);
                centerCamera(scene, cachedHeights);
            }

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
                window.slideEngine.registerSimulation('beyond-gff', {
                    start() {},
                    pause() {},
                    onSlideEnter() {
                        const tryInit = () => {
                            if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
                                init();
                            } else {
                                setTimeout(tryInit, 50);
                            }
                        };
                        tryInit();
                    },
                    onSlideLeave() { disposeScene(); }
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
