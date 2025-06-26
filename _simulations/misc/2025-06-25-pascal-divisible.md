---
title: Pascal's Triangle - Divisibility Patterns
model: misc
author: 'Leonid Petrov'
code:
  - link: 'https://github.com/yourusername/homepage/blob/master/_simulations/misc/2025-06-25-pascal-divisible.md'
    txt: 'This simulation is interactive, written in JavaScript with WebAssembly optimization, see the source code of this page at the link'
---
<script src="{{site.url}}/js/pascal-wasm.js"></script>

<style>
    #controls {
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        align-items: center;
    }
    .control-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    label {
        font-weight: bold;
        min-width: 60px;
    }
    input[type="number"] {
        width: 80px;
        padding: 5px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
    }
    button {
        padding: 8px 12px;
        background-color: #007cba;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }
    button:hover {
        background-color: #005a87;
    }
    #visualization {
        width: 100%;
        height: 70vh;
        min-height: 400px;
        border: 1px solid #ccc;
        overflow: hidden;
        background-color: white;
        cursor: grab;
        position: relative;
        touch-action: none;
    }
    #visualization:active {
        cursor: grabbing;
    }
    #zoomIndicator {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s;
    }
    #zoomIndicator.visible {
        opacity: 1;
    }
    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
    
    /* Mobile styles */
    @media (max-width: 768px) {
        #controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
        }
        .control-group {
            justify-content: space-between;
        }
        label {
            min-width: auto;
        }
        input[type="number"] {
            width: 100px;
        }
        #visualization {
            height: 60vh;
            min-height: 300px;
        }
        button {
            padding: 10px 15px;
            font-size: 16px;
        }
        #zoomIndicator {
            font-size: 14px;
        }
    }
    
    @media (max-width: 480px) {
        #visualization {
            height: 50vh;
            min-height: 250px;
        }
        input[type="number"] {
            width: 80px;
        }
    }
</style>

This simulation visualizes Pascal's triangle with dots colored based on whether their values are divisible by a given modulus. This creates interesting fractal-like patterns, especially for prime moduli.

<div id="controls">
    <div class="control-group">
        <label for="rowsInput">Rows:</label>
        <input type="number" id="rowsInput" min="10" max="2000" value="200">
    </div>
    <div class="control-group">
        <label for="modulusInput">Modulus:</label>
        <input type="number" id="modulusInput" min="2" max="2000" value="2">
    </div>
    <button id="regenerateBtn">Regenerate</button>
    <button id="resetZoomBtn">Reset View</button>
</div>

<div id="visualization">
    <div id="zoomIndicator"></div>
</div>

<script>
let rows = 200;
let modulus = 2;
let dotSize = 1;
let spacing = 2;
let wasmModule = null;
let patternPtr = null;
let canvas = null;
let ctx = null;
let camera = { x: 0, y: 0, zoom: 1 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let cameraStart = { x: 0, y: 0 };
let imageData = null;
let pixelBuffer = null;
let triangleBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
let lastParams = { rows: 200, modulus: 2, dotSize: 1, spacing: 2 };
let keysPressed = new Set();
let touches = null;
let initialPinchDistance = 0;
let initialZoom = 1;
let zoomIndicatorTimer = null;

// Initialize WebAssembly module
async function initWasm() {
    try {
        wasmModule = {
            generatePascalPattern: Module.cwrap('generatePascalPattern', 'number', ['number', 'number']),
            isPositionDivisible: Module.cwrap('isPositionDivisible', 'number', ['number', 'number', 'number']),
            freePascalPattern: Module.cwrap('freePascalPattern', null, ['number'])
        };
    } catch (e) {
        console.error('Failed to initialize WebAssembly:', e);
        wasmModule = null;
    }
}

// Fallback JavaScript implementation
function generatePascalTriangleMod(n, mod) {
    const triangle = [];
    for (let i = 0; i < n; i++) {
        const row = new Array(i + 1);
        row[0] = 1 % mod;
        row[i] = 1 % mod;
        for (let j = 1; j < i; j++) {
            row[j] = (triangle[i-1][j-1] + triangle[i-1][j]) % mod;
        }
        triangle.push(row);
    }
    return triangle;
}

// Initialize canvas
function initCanvas() {
    const container = document.getElementById('visualization');
    canvas = document.createElement('canvas');
    
    // Make canvas responsive
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    ctx = canvas.getContext('2d');
    container.appendChild(canvas);
    
    // Setup interaction handlers
    setupInteraction();
}

// Resize canvas to fit container
function resizeCanvas() {
    if (!canvas) return;
    
    const container = document.getElementById('visualization');
    const rect = container.getBoundingClientRect();
    
    // Set canvas size to match container with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Scale context for high DPI displays
    if (ctx) {
        ctx.scale(dpr, dpr);
    }
    
    // Re-render if we have data
    if (pixelBuffer) {
        render();
    }
}

// Setup pan and zoom interaction
function setupInteraction() {
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
        cameraStart.x = camera.x;
        cameraStart.y = camera.y;
        canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            camera.x = cameraStart.x + (e.clientX - dragStart.x) / camera.zoom;
            camera.y = cameraStart.y + (e.clientY - dragStart.y) / camera.zoom;
            render();
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touches = e.touches;
        
        if (e.touches.length === 1) {
            // Single touch - pan
            isDragging = true;
            dragStart.x = e.touches[0].clientX;
            dragStart.y = e.touches[0].clientY;
            cameraStart.x = camera.x;
            cameraStart.y = camera.y;
        } else if (e.touches.length === 2) {
            // Two touches - pinch zoom
            isDragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialPinchDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            initialZoom = camera.zoom;
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        touches = e.touches;
        
        if (e.touches.length === 1 && isDragging) {
            // Single touch pan
            camera.x = cameraStart.x + (e.touches[0].clientX - dragStart.x) / camera.zoom;
            camera.y = cameraStart.y + (e.touches[0].clientY - dragStart.y) / camera.zoom;
            render();
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (initialPinchDistance > 0) {
                const scale = currentDistance / initialPinchDistance;
                const newZoom = initialZoom * scale;
                
                // Get pinch center in screen coordinates
                const centerX = (touch1.clientX + touch2.clientX) / 2;
                const centerY = (touch1.clientY + touch2.clientY) / 2;
                const rect = canvas.getBoundingClientRect();
                
                // Convert to world coordinates
                const worldX = (centerX - rect.left - rect.width/2) / camera.zoom - camera.x;
                const worldY = (centerY - rect.top - rect.height/2) / camera.zoom - camera.y;
                
                // Apply zoom
                camera.zoom = Math.max(0.1, Math.min(10, newZoom));
                
                // Adjust camera position to zoom towards pinch center
                const zoomChange = camera.zoom / initialZoom;
                camera.x = worldX - (worldX - camera.x) * zoomChange;
                camera.y = worldY - (worldY - camera.y) * zoomChange;
                
                // Show zoom indicator
                showZoomIndicator();
                
                render();
            }
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        touches = e.touches;
        
        if (e.touches.length === 0) {
            isDragging = false;
            initialPinchDistance = 0;
        } else if (e.touches.length === 1) {
            // Switching from pinch to pan
            isDragging = true;
            dragStart.x = e.touches[0].clientX;
            dragStart.y = e.touches[0].clientY;
            cameraStart.x = camera.x;
            cameraStart.y = camera.y;
            initialPinchDistance = 0;
        }
    });
    
    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        isDragging = false;
        initialPinchDistance = 0;
        touches = null;
    });

    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // World coordinates before zoom
        const worldX = (mouseX - rect.width/2) / camera.zoom - camera.x;
        const worldY = (mouseY - rect.height/2) / camera.zoom - camera.y;

        // Apply zoom
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomCamera(zoomFactor, worldX, worldY);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Prevent default behavior for navigation keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '=', '_', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)) {
            e.preventDefault();
        }
        keysPressed.add(e.key);
        handleKeyboard();
    });

    document.addEventListener('keyup', (e) => {
        keysPressed.delete(e.key);
    });

    // Focus canvas for keyboard events
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
}

// Handle keyboard input
function handleKeyboard() {
    const panSpeed = 20 / camera.zoom; // Adjust pan speed based on zoom level
    const zoomSpeed = 1.1;

    let needsRender = false;

    // Pan with arrow keys
    if (keysPressed.has('ArrowLeft') || keysPressed.has('a') || keysPressed.has('A')) {
        camera.x += panSpeed;
        needsRender = true;
    }
    if (keysPressed.has('ArrowRight') || keysPressed.has('d') || keysPressed.has('D')) {
        camera.x -= panSpeed;
        needsRender = true;
    }
    if (keysPressed.has('ArrowUp') || keysPressed.has('w') || keysPressed.has('W')) {
        camera.y += panSpeed;
        needsRender = true;
    }
    if (keysPressed.has('ArrowDown') || keysPressed.has('s') || keysPressed.has('S')) {
        camera.y -= panSpeed;
        needsRender = true;
    }

    // Zoom with +/- keys
    if (keysPressed.has('+') || keysPressed.has('=')) {
        zoomCamera(zoomSpeed, 0, 0); // Zoom towards center
        needsRender = true;
        keysPressed.delete('+');
        keysPressed.delete('=');
    }
    if (keysPressed.has('-') || keysPressed.has('_')) {
        zoomCamera(1/zoomSpeed, 0, 0); // Zoom out from center
        needsRender = true;
        keysPressed.delete('-');
        keysPressed.delete('_');
    }

    if (needsRender) {
        render();
    }
}

// Show zoom indicator
function showZoomIndicator() {
    const indicator = document.getElementById('zoomIndicator');
    const zoomPercent = Math.round(camera.zoom * 100);
    indicator.textContent = `${zoomPercent}%`;
    indicator.classList.add('visible');
    
    // Clear existing timer
    if (zoomIndicatorTimer) {
        clearTimeout(zoomIndicatorTimer);
    }
    
    // Hide after 1.5 seconds
    zoomIndicatorTimer = setTimeout(() => {
        indicator.classList.remove('visible');
    }, 1500);
}

// Zoom camera with optional focal point
function zoomCamera(zoomFactor, worldX = 0, worldY = 0) {
    const oldZoom = camera.zoom;
    camera.zoom *= zoomFactor;
    camera.zoom = Math.max(0.2, Math.min(5, camera.zoom));

    // Adjust camera position to zoom towards focal point
    if (worldX !== 0 || worldY !== 0) {
        const zoomChange = camera.zoom / oldZoom;
        camera.x = worldX - (worldX - camera.x) * zoomChange;
        camera.y = worldY - (worldY - camera.y) * zoomChange;
    }
    
    // Show zoom indicator
    showZoomIndicator();
}

// Generate pixel-based image data
function generatePixelData() {
    // Free previous pattern if exists
    if (patternPtr && wasmModule) {
        wasmModule.freePascalPattern(patternPtr);
        patternPtr = null;
    }

    let triangle = null;
    let useWasm = false;

    // Try to use WebAssembly if available
    if (wasmModule) {
        try {
            patternPtr = wasmModule.generatePascalPattern(rows, modulus);
            useWasm = true;
        } catch (e) {
            console.error('WebAssembly execution failed:', e);
            triangle = generatePascalTriangleMod(rows, modulus);
        }
    } else {
        triangle = generatePascalTriangleMod(rows, modulus);
    }

    // Calculate triangle bounds
    const effectiveWidth = rows * spacing * 2;
    const effectiveHeight = rows * spacing;

    triangleBounds.minX = 0;
    triangleBounds.maxX = effectiveWidth;
    triangleBounds.minY = 0;
    triangleBounds.maxY = effectiveHeight;
    triangleBounds.width = effectiveWidth;
    triangleBounds.height = effectiveHeight;

    // Create pixel buffer
    const bufferWidth = Math.ceil(triangleBounds.width);
    const bufferHeight = Math.ceil(triangleBounds.height);
    pixelBuffer = new Uint8ClampedArray(bufferWidth * bufferHeight * 4);

    // Fill with white background
    for (let i = 0; i < pixelBuffer.length; i += 4) {
        pixelBuffer[i] = 255;     // R
        pixelBuffer[i + 1] = 255; // G
        pixelBuffer[i + 2] = 255; // B
        pixelBuffer[i + 3] = 255; // A
    }

    // Draw pattern as pixels
    if (useWasm) {
        // Use WebAssembly pattern
        for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
            const yPos = Math.floor(rowIndex * spacing);
            const rowWidth = (rowIndex + 1) * spacing;
            const xOffset = (effectiveWidth - rowWidth) / 2;

            for (let colIndex = 0; colIndex <= rowIndex; colIndex++) {
                if (wasmModule.isPositionDivisible(patternPtr, rowIndex, colIndex)) {
                    const xPos = Math.floor(xOffset + colIndex * spacing);
                    drawPixelDot(xPos, yPos, dotSize, bufferWidth, bufferHeight);
                }
            }
        }
    } else {
        // Use JavaScript fallback
        triangle.forEach((row, rowIndex) => {
            const yPos = Math.floor(rowIndex * spacing);
            const rowWidth = row.length * spacing;
            const xOffset = (effectiveWidth - rowWidth) / 2;

            row.forEach((value, colIndex) => {
                if (value === 0) {
                    const xPos = Math.floor(xOffset + colIndex * spacing);
                    drawPixelDot(xPos, yPos, dotSize, bufferWidth, bufferHeight);
                }
            });
        });
    }
}

// Draw a dot as pixels
function drawPixelDot(centerX, centerY, radius, bufferWidth, bufferHeight) {
    const radiusSquared = radius * radius;
    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(bufferWidth - 1, Math.floor(centerX + radius));
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(bufferHeight - 1, Math.floor(centerY + radius));

    for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared <= radiusSquared) {
                const index = (y * bufferWidth + x) * 4;
                if (index >= 0 && index < pixelBuffer.length - 3) {
                    pixelBuffer[index] = 0;     // R
                    pixelBuffer[index + 1] = 0; // G
                    pixelBuffer[index + 2] = 0; // B
                    pixelBuffer[index + 3] = 255; // A
                }
            }
        }
    }
}

// Render function
function render() {
    if (!pixelBuffer || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Save context state
    ctx.save();

    // Apply camera transform
    ctx.translate(rect.width/2, rect.height/2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(camera.x, camera.y);

    // Create ImageData from pixel buffer
    const bufferWidth = triangleBounds.width;
    const bufferHeight = triangleBounds.height;
    const imgData = new ImageData(pixelBuffer, bufferWidth, bufferHeight);

    // Create temporary canvas for the image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bufferWidth;
    tempCanvas.height = bufferHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imgData, 0, 0);

    // Draw the image centered
    ctx.drawImage(tempCanvas, -bufferWidth/2, -bufferHeight/2);

    // Restore context state
    ctx.restore();
}

// Check what parameters changed
function getChangedParams() {
    const currentParams = { rows, modulus, dotSize, spacing };
    const changed = {
        rows: currentParams.rows !== lastParams.rows,
        modulus: currentParams.modulus !== lastParams.modulus,
        dotSize: currentParams.dotSize !== lastParams.dotSize,
        spacing: currentParams.spacing !== lastParams.spacing
    };

    // Update last params
    lastParams = { ...currentParams };

    return changed;
}

// Draw visualization
function drawVisualization() {
    // Initialize canvas if not already done
    if (!canvas) {
        initCanvas();
    }

    // Check what changed
    const changed = getChangedParams();
    const shouldResetView = changed.rows || changed.spacing; // Only reset view if triangle size changed

    // Generate pixel data
    generatePixelData();

    // Reset camera and render, or just render if preserving view
    if (shouldResetView) {
        resetView();
    } else {
        render();
    }
}

// Reset view to center
function resetView() {
    if (!canvas || !pixelBuffer) return;
    
    const rect = canvas.getBoundingClientRect();
    const width = triangleBounds.width;
    const height = triangleBounds.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate zoom to fit with mobile-friendly limits
    const zoomX = (rect.width * 0.8) / width;
    const zoomY = (rect.height * 0.8) / height;
    const isMobile = window.innerWidth <= 768;
    const maxInitialZoom = isMobile ? 0.8 : 1;
    
    camera.zoom = Math.min(zoomX, zoomY, maxInitialZoom);
    camera.zoom = Math.max(0.2, Math.min(5, camera.zoom));

    // Center the view
    camera.x = -centerX;
    camera.y = -centerY;

    // Show zoom indicator
    showZoomIndicator();
    
    render();
}

// Update functions
function updateRows(value) {
    const newValue = Math.max(10, Math.min(2000, parseInt(value) || 200));
    rows = newValue;
    document.getElementById('rowsInput').value = newValue;
    if (canvas) canvas.focus();
}

function updateModulus(value) {
    const newValue = Math.max(2, Math.min(2000, parseInt(value) || 2));
    modulus = newValue;
    document.getElementById('modulusInput').value = newValue;
    if (canvas) canvas.focus();
}

// Event listeners
document.getElementById('rowsInput').addEventListener('input', function(e) {
    updateRows(e.target.value);
    drawVisualization();
});

document.getElementById('modulusInput').addEventListener('input', function(e) {
    updateModulus(e.target.value);
});

// Also handle Enter key and blur events for immediate updates
document.getElementById('rowsInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        updateRows(e.target.value);
        drawVisualization();
    }
});

document.getElementById('modulusInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        updateModulus(e.target.value);
    }
});

document.getElementById('regenerateBtn').addEventListener('click', function() {
    drawVisualization();
    if (canvas) canvas.focus();
});

document.getElementById('resetZoomBtn').addEventListener('click', function() {
    resetView();
    if (canvas) canvas.focus();
});

// Initialize WebAssembly and draw initial visualization
if (typeof Module !== 'undefined') {
    Module.onRuntimeInitialized = function() {
        initWasm().then(() => {
            drawVisualization();
        });
    };
} else {
    // Fallback if WebAssembly fails to load
    drawVisualization();
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (patternPtr && wasmModule) {
        wasmModule.freePascalPattern(patternPtr);
    }
});
</script>

## About This Simulation

Pascal's triangle is a triangular array of numbers where each number is the sum of the two numbers directly above it. This simulation visualizes divisibility patterns by showing dots only where the Pascal's triangle values are divisible by the chosen modulus.

### Controls:
- **Mouse**: Drag to pan, scroll wheel to zoom
- **Keyboard**: Arrow keys (or WASD) to pan, +/- to zoom
- **Input Fields**: Enter values directly (up to 2000 rows and modulus!)
- **Smart View**: Changing modulus preserves your current zoom and position

### Features:
- **Pixel-Perfect Rendering**: Uses ImageData for ultra-fast pixel manipulation - no individual dot rendering!
- **WebAssembly Optimization**: Uses WebAssembly for fast computation of large Pascal triangles (2000+ rows!)
- **Mobile-Optimized**: Touch controls and responsive design for all devices
- **Modular Arithmetic**: Uses modular computation from the start to handle large triangles efficiently
- **Interactive Controls**: Adjust the number of rows and modulus in real-time with instant feedback

### Interesting Patterns to Try:
- **Modulus 2**: Creates the famous Sierpinski triangle fractal
- **Modulus 3**: Shows a different fractal pattern with three-fold symmetry
- **Prime moduli**: Generally create self-similar fractal patterns
- **Composite moduli**: Create more complex, often less regular patterns

The patterns emerge from the properties of binomial coefficients and modular arithmetic, revealing deep mathematical structures within Pascal's triangle.
