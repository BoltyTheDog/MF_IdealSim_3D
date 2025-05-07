/**
 * Complete Field Visualization Solution
 * - Fixes all DOM insertion issues
 * - Optimizes layout to fit in viewport
 * - Adds resolution control
 * - Completely bypasses problematic code
 */

// Global variables for visualization
let currentFieldMode = 'none'; // 'none', 'velocity', or 'pressure'
let activeSlice = 'none';      // 'none', 'x', 'y', or 'z'
let slicePosition = 0;
let sliceResolution = 20;      // Default resolution (points per dimension)
let fieldVisualization = null;

// Wait for everything to be fully initialized
function waitForInitialization() {
    // Check if scene and simulationObject exist
    if (typeof scene === 'undefined' || typeof simulationObject === 'undefined') {
        console.log("Waiting for simulation initialization...");
        setTimeout(waitForInitialization, 500);
        return;
    }
    
    // Start initialization
    initializeEverything();
}

// Initialize everything
function initializeEverything() {
    console.log("Starting comprehensive initialization...");
    
    // Fix existing issues
    fixLayoutIssues();
    
    // Create completely new UI elements
    createNewControls();
    
    // Setup field visualization
    setupFieldVisualization();
    
    console.log("Comprehensive initialization complete");
}

// Fix layout issues
function fixLayoutIssues() {
    console.log("Fixing layout issues...");
    
    // Optimize layout for viewport
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';
    
    // Make app container fill viewport
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.height = '100vh';
        appContainer.style.display = 'flex';
        appContainer.style.flexDirection = 'column';
    }
    
    // Make content area fill available space
    const content = document.querySelector('.content');
    if (content) {
        content.style.flex = '1';
        content.style.overflow = 'hidden';
        content.style.display = 'flex';
    }
    
    // Optimize control panel
    const controlPanel = document.querySelector('.control-panel');
    if (controlPanel) {
        controlPanel.style.maxHeight = '100%';
        controlPanel.style.overflowY = 'auto';
        controlPanel.style.padding = '10px';
        controlPanel.style.width = '250px';
    }
    
    // Optimize simulation container
    const simulationContainer = document.getElementById('simulation-container');
    if (simulationContainer) {
        simulationContainer.style.flex = '1';
    }
    
    // Make header more compact
    const header = document.querySelector('header');
    if (header) {
        header.style.padding = '5px 15px';
        const h1 = header.querySelector('h1');
        if (h1) h1.style.margin = '5px 0';
        const p = header.querySelector('p');
        if (p) p.style.margin = '5px 0';
    }
    
    // Make footer more compact
    const footer = document.querySelector('footer');
    if (footer) {
        footer.style.padding = '5px 15px';
        const p = footer.querySelector('p');
        if (p) p.style.margin = '5px 0';
    }
    
    // Fix tunnel visibility toggle
    fixTunnelVisibility();
}

// Fix tunnel visibility by creating completely new controls
function fixTunnelVisibility() {
    // Remove any existing broken controls
    const existingToggle = document.getElementById('tunnel-visibility-toggle');
    if (existingToggle) {
        existingToggle.remove();
    }
    
    // Add CSS for compact controls
    const style = document.createElement('style');
    style.textContent = `
        .compact-controls {
            margin-bottom: 8px;
        }
        .compact-controls h3 {
            margin-top: 8px;
            margin-bottom: 8px;
            font-size: 14px;
            border-top: 1px solid #ddd;
            padding-top: 8px;
        }
        .button-row {
            display: flex;
            justify-content: space-between;
        }
        .button-row button {
            flex: 1;
            margin: 0 2px;
            padding: 5px 2px;
            font-size: 12px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            cursor: pointer;
            border-radius: 3px;
        }
        .button-row button.active {
            background-color: #4CAF50;
            color: white;
        }
        .slider-row {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .slider-row label {
            width: 80px;
            font-size: 12px;
        }
        .slider-row input {
            flex: 1;
            margin: 0 5px;
        }
        .slider-row span {
            width: 25px;
            text-align: right;
            font-size: 12px;
        }
    `;
    document.head.appendChild(style);
    
    // Find control panel
    const controlPanel = document.querySelector('.control-panel');
    if (!controlPanel) return;
    
    // Create tunnel visibility control
    const tunnelControls = document.createElement('div');
    tunnelControls.className = 'compact-controls';
    tunnelControls.innerHTML = `
        <h3>Wind Tunnel</h3>
        <div class="button-row">
            <button id="show-tunnel-btn" class="active">Show Boundaries</button>
            <button id="hide-tunnel-btn">Hide Boundaries</button>
        </div>
    `;
    
    // Append to control panel
    controlPanel.appendChild(tunnelControls);
    
    // Add event listeners
    document.getElementById('show-tunnel-btn').addEventListener('click', () => {
        document.getElementById('show-tunnel-btn').classList.add('active');
        document.getElementById('hide-tunnel-btn').classList.remove('active');
        // Show tunnel boundaries
        scene.children.forEach(child => {
            if (child.userData && child.userData.isTunnelBoundary) {
                child.visible = true;
            }
        });
    });
    
    document.getElementById('hide-tunnel-btn').addEventListener('click', () => {
        document.getElementById('hide-tunnel-btn').classList.remove('active');
        document.getElementById('show-tunnel-btn').classList.add('active');
        // Hide tunnel boundaries
        scene.children.forEach(child => {
            if (child.userData && child.userData.isTunnelBoundary) {
                child.visible = false;
            }
        });
    });
}

// Create new field visualization controls
function createNewControls() {
    console.log("Creating field visualization controls...");
    
    // Find control panel
    const controlPanel = document.querySelector('.control-panel');
    if (!controlPanel) return;
    
    // Create field controls
    const fieldControls = document.createElement('div');
    fieldControls.className = 'compact-controls';
    fieldControls.innerHTML = `
        <h3>Field Visualization</h3>
        
        <div class="button-row">
            <button id="none-field-btn" class="active">None</button>
            <button id="velocity-field-btn">Velocity</button>
            <button id="pressure-field-btn">Pressure</button>
        </div>
        
        <h3>Slice Plane</h3>
        <div class="button-row">
            <button id="x-slice-btn">X Plane</button>
            <button id="y-slice-btn">Y Plane</button>
            <button id="z-slice-btn">Z Plane</button>
        </div>
        
        <div class="slider-row">
            <label for="slice-position">Position</label>
            <input type="range" id="slice-position" min="-5" max="5" step="0.1" value="0">
            <span id="slice-position-value">0.0</span>
        </div>
        
        <div class="slider-row">
            <label for="slice-resolution">Resolution</label>
            <input type="range" id="slice-resolution" min="10" max="300" step="5" value="${sliceResolution}">
            <span id="resolution-value">${sliceResolution}</span>
        </div>
    `;
    
    // Append to control panel
    controlPanel.appendChild(fieldControls);
    
    // Add event listeners
    document.getElementById('none-field-btn').addEventListener('click', () => {
        setActiveButton('field', 'none');
        currentFieldMode = 'none';
        updateFieldVisualization();
    });
    
    document.getElementById('velocity-field-btn').addEventListener('click', () => {
        setActiveButton('field', 'velocity');
        currentFieldMode = 'velocity';
        updateFieldVisualization();
    });
    
    document.getElementById('pressure-field-btn').addEventListener('click', () => {
        setActiveButton('field', 'pressure');
        currentFieldMode = 'pressure';
        updateFieldVisualization();
    });
    
    document.getElementById('x-slice-btn').addEventListener('click', () => {
        toggleSliceButton('x');
        updateFieldVisualization();
    });
    
    document.getElementById('y-slice-btn').addEventListener('click', () => {
        toggleSliceButton('y');
        updateFieldVisualization();
    });
    
    document.getElementById('z-slice-btn').addEventListener('click', () => {
        toggleSliceButton('z');
        updateFieldVisualization();
    });
    
    const slicePositionSlider = document.getElementById('slice-position');
    const slicePositionValue = document.getElementById('slice-position-value');
    
    slicePositionSlider.addEventListener('input', () => {
        slicePosition = parseFloat(slicePositionSlider.value);
        slicePositionValue.textContent = slicePosition.toFixed(1);
        updateFieldVisualization();
    });
    
    const resolutionSlider = document.getElementById('slice-resolution');
    const resolutionValue = document.getElementById('resolution-value');
    
    resolutionSlider.addEventListener('input', () => {
        sliceResolution = parseInt(resolutionSlider.value);
        resolutionValue.textContent = sliceResolution;
        // Don't update immediately for performance reasons
    });
    
    resolutionSlider.addEventListener('change', () => {
        // Update on slider release
        updateFieldVisualization();
    });
}

// Toggle slice button - only one can be active at a time
function toggleSliceButton(sliceType) {
    // If this slice is already active, deactivate it
    if (activeSlice === sliceType) {
        document.getElementById(`${sliceType}-slice-btn`).classList.remove('active');
        activeSlice = 'none';
        return;
    }
    
    // Otherwise, deactivate all and activate this one
    document.getElementById('x-slice-btn').classList.remove('active');
    document.getElementById('y-slice-btn').classList.remove('active');
    document.getElementById('z-slice-btn').classList.remove('active');
    
    document.getElementById(`${sliceType}-slice-btn`).classList.add('active');
    activeSlice = sliceType;
}

// Set active button in a group
function setActiveButton(group, type) {
    if (group === 'field') {
        document.getElementById('none-field-btn').classList.remove('active');
        document.getElementById('velocity-field-btn').classList.remove('active');
        document.getElementById('pressure-field-btn').classList.remove('active');
        
        document.getElementById(`${type}-field-btn`).classList.add('active');
    }
}

// Setup field visualization
function setupFieldVisualization() {
    console.log("Setting up field visualization...");
    
    // Override animation function
    integrateWithAnimationLoop();
}

// Integrate with the animation loop
function integrateWithAnimationLoop() {
    // Check if animate function exists
    if (typeof window.animate !== 'function') {
        console.warn("Animation function not found. Field visualization may not update automatically.");
        return;
    }
    
    // Save original animation function
    const originalAnimate = window.animate;
    
    // Override with our version
    window.animate = function() {
        // Call original function
        originalAnimate();
        
        // Update field visualization if needed
        if (currentFieldMode !== 'none' && activeSlice !== 'none' && isSimulating) {
            // Only update occasionally for performance
            if (window.animationCount === undefined) {
                window.animationCount = 0;
            }
            
            window.animationCount++;
            if (window.animationCount % 30 === 0) { // Update approximately twice per second
                updateFieldVisualization();
            }
        }
    };
}

// Update field visualization
function updateFieldVisualization() {
    // Remove existing visualization
    if (fieldVisualization) {
        scene.remove(fieldVisualization);
        fieldVisualization = null;
    }
    
    // If no visualization selected, remove legend and return
    if (currentFieldMode === 'none' || activeSlice === 'none') {
        const existingLegend = document.getElementById('color-legend');
        if (existingLegend) {
            existingLegend.remove();
        }
        return;
    }
    
    // Create new visualization
    fieldVisualization = new THREE.Group();
    fieldVisualization.name = 'fieldVisualization';
    
    // Create field slice
    createFieldSlice(currentFieldMode, activeSlice, slicePosition, sliceResolution);
    
    // Add to scene
    scene.add(fieldVisualization);
}

// Create a field slice visualization
function createFieldSlice(mode, sliceAxis, position, resolution) {
    if (!fieldVisualization) return;
    
    // Define tunnel dimensions (reuse from wind tunnel)
    const tunnel = window.tunnelDimensions || {
        length: 20,
        width: 8,
        height: 8,
        entryX: -10,
        exitX: 10
    };
    
    // Create geometry for point cloud
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(resolution * resolution * 3);
    const colors = new Float32Array(resolution * resolution * 3);
    
    // Set positions based on slice axis
    for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
            const idx = (i * resolution + j) * 3;
            
            if (sliceAxis === 'x') {
                // YZ plane
                positions[idx] = position; // Fixed X position
                positions[idx + 1] = (i / (resolution - 1) - 0.5) * tunnel.width; // Y
                positions[idx + 2] = (j / (resolution - 1) - 0.5) * tunnel.height; // Z
            } else if (sliceAxis === 'y') {
                // XZ plane
                positions[idx] = tunnel.entryX + (i / (resolution - 1)) * tunnel.length; // X
                positions[idx + 1] = position; // Fixed Y position
                positions[idx + 2] = (j / (resolution - 1) - 0.5) * tunnel.height; // Z
            } else { // z
                // XY plane
                positions[idx] = tunnel.entryX + (i / (resolution - 1)) * tunnel.length; // X
                positions[idx + 1] = (j / (resolution - 1) - 0.5) * tunnel.width; // Y
                positions[idx + 2] = position; // Fixed Z position
            }
        }
    }
    
    // Calculate field values and colors
    calculateFieldColors(mode, positions, colors, resolution * resolution);
    
    // Set geometry attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Adjust point size based on resolution
    const pointSize = Math.max(0.05, 2.0 / resolution);
    
    // Create material
    const material = new THREE.PointsMaterial({
        size: pointSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    // Create point cloud
    const pointCloud = new THREE.Points(geometry, material);
    fieldVisualization.add(pointCloud);
    
    // Add slice outline
    addSliceOutline(sliceAxis, position, tunnel);
    
    // Add color legend
    addColorLegend(mode);
}

// Calculate field colors based on velocity or pressure
function calculateFieldColors(mode, positions, colors, pointCount) {
    // Get simulation parameters
    const freeStreamVelocity = simulationParams.freeStreamVelocity;
    const fluidDensity = simulationParams.fluidDensity;
    const objectType = simulationParams.objectType;
    const objectPos = simulationObject ? simulationObject.position : { x: 0, y: 0, z: 0 };
    const radius = 1.0; // Object radius
    
    let minValue = Infinity;
    let maxValue = -Infinity;
    const values = new Array(pointCount);
    
    // First pass: calculate field values
    for (let i = 0; i < pointCount; i++) {
        const idx = i * 3;
        
        // Get position
        const x = positions[idx];
        const y = positions[idx + 1];
        const z = positions[idx + 2];
        
        // Calculate relative position to object
        const relX = x - objectPos.x;
        const relY = y - objectPos.y;
        const relZ = z - objectPos.z;
        const r = Math.sqrt(relX*relX + relY*relY + relZ*relZ);
        
        // Calculate velocity components
        let vx = freeStreamVelocity;
        let vy = 0;
        let vz = 0;
        
        if (r > radius) {
            if (objectType === 'sphere') {
                // Velocity around sphere
                const factorSphere = Math.pow(radius, 3) / Math.pow(r, 3);
                vx = freeStreamVelocity * (1 - factorSphere * (3*relX*relX/(2*r*r) - 0.5));
                vy = freeStreamVelocity * (-factorSphere * 3*relX*relY/(2*r*r));
                vz = freeStreamVelocity * (-factorSphere * 3*relX*relZ/(2*r*r));
            } else if (objectType === 'cylinder') {
                // Velocity around cylinder
                const rxy = Math.sqrt(relX*relX + relY*relY);
                if (rxy > radius) {
                    const factorCyl = Math.pow(radius/rxy, 2);
                    vx = freeStreamVelocity * (1 - factorCyl * (2*relX*relX/(rxy*rxy) - 1));
                    vy = freeStreamVelocity * (-factorCyl * 2*relX*relY/(rxy*rxy));
                    vz = 0;
                } else {
                    vx = 0;
                    vy = 0;
                    vz = 0;
                }
            } else if (objectType === 'airfoil') {
                // Velocity around airfoil
                const rxy = Math.sqrt(relX*relX + relY*relY);
                const angle = Math.atan2(relY, relX);
                const circulation = freeStreamVelocity * 4 * Math.PI * radius * Math.sin(angle);
                
                if (rxy > radius) {
                    const factor = Math.pow(radius/rxy, 2);
                    vx = freeStreamVelocity * (1 - factor*Math.cos(2*angle));
                    vy = freeStreamVelocity*(-factor*Math.sin(2*angle)) + circulation/(2*Math.PI*rxy);
                    vz = 0.1 * relZ * (vx*vx + vy*vy) / (radius * freeStreamVelocity);
                } else {
                    vx = 0;
                    vy = 0;
                    vz = 0;
                }
            }
        } else {
            // Inside object
            vx = 0;
            vy = 0;
            vz = 0;
        }
        
        // Calculate field value based on mode
        let value;
        if (mode === 'velocity') {
            // Velocity magnitude
            value = Math.sqrt(vx*vx + vy*vy + vz*vz);
        } else { // pressure
            // Calculate pressure using Bernoulli's equation
            const v2 = vx*vx + vy*vy + vz*vz;
            const pRef = 0.5 * fluidDensity * freeStreamVelocity * freeStreamVelocity;
            value = pRef - 0.5 * fluidDensity * v2;
        }
        
        // Update min/max
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
        
        // Store value
        values[i] = value;
    }
    
    // Adjust range based on mode
    if (mode === 'velocity') {
        minValue = 0;
        maxValue = maxValue * 1.2;
    } else {
        // For pressure, center around reference pressure
        const pRef = 0.5 * fluidDensity * freeStreamVelocity * freeStreamVelocity;
        const deviation = Math.max(Math.abs(maxValue - pRef), Math.abs(minValue - pRef));
        minValue = pRef - deviation * 1.2;
        maxValue = pRef + deviation * 1.2;
    }
    
    // Second pass: set colors based on normalized values
    for (let i = 0; i < pointCount; i++) {
        const idx = i * 3;
        const value = values[i];
        
        // Normalize value
        const t = (value - minValue) / (maxValue - minValue);
        
        if (mode === 'velocity') {
            // Color scale: blue (low) -> white -> red (high)
            colors[idx] = Math.min(1.0, t * 2.0); // R
            colors[idx + 1] = Math.min(1.0, t * 2.0); // G
            colors[idx + 2] = Math.min(1.0, 2.0 - t * 2.0); // B
        } else { // pressure
            // Color scale: blue (low) -> green -> red (high)
            colors[idx] = Math.min(1.0, t * 2.0); // R
            colors[idx + 1] = Math.min(1.0, 2.0 - Math.abs(t - 0.5) * 4.0); // G
            colors[idx + 2] = Math.min(1.0, 2.0 - t * 2.0); // B
        }
    }
}

// Add slice outline
function addSliceOutline(sliceAxis, position, tunnel) {
    // Create points for outline
    const points = [];
    
    if (sliceAxis === 'x') {
        // YZ plane outline
        points.push(
            new THREE.Vector3(position, -tunnel.width/2, -tunnel.height/2),
            new THREE.Vector3(position, tunnel.width/2, -tunnel.height/2),
            new THREE.Vector3(position, tunnel.width/2, tunnel.height/2),
            new THREE.Vector3(position, -tunnel.width/2, tunnel.height/2),
            new THREE.Vector3(position, -tunnel.width/2, -tunnel.height/2)
        );
    } else if (sliceAxis === 'y') {
        // XZ plane outline
        points.push(
            new THREE.Vector3(tunnel.entryX, position, -tunnel.height/2),
            new THREE.Vector3(tunnel.exitX, position, -tunnel.height/2),
            new THREE.Vector3(tunnel.exitX, position, tunnel.height/2),
            new THREE.Vector3(tunnel.entryX, position, tunnel.height/2),
            new THREE.Vector3(tunnel.entryX, position, -tunnel.height/2)
        );
    } else { // z
        // XY plane outline
        points.push(
            new THREE.Vector3(tunnel.entryX, -tunnel.width/2, position),
            new THREE.Vector3(tunnel.exitX, -tunnel.width/2, position),
            new THREE.Vector3(tunnel.exitX, tunnel.width/2, position),
            new THREE.Vector3(tunnel.entryX, tunnel.width/2, position),
            new THREE.Vector3(tunnel.entryX, -tunnel.width/2, position)
        );
    }
    
    // Create geometry from points
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create material
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.7,
        transparent: true
    });
    
    // Create line and add to visualization
    const line = new THREE.Line(geometry, material);
    fieldVisualization.add(line);
}

// Add color legend
function addColorLegend(mode) {
    // Remove existing legend
    const existingLegend = document.getElementById('color-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    // Create legend container
    const legend = document.createElement('div');
    legend.id = 'color-legend';
    legend.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border-radius: 4px;
        padding: 6px;
        font-size: 10px;
        z-index: 1000;
    `;
    
    // Set content based on mode
    if (mode === 'velocity') {
        legend.innerHTML = `
            <div style="margin-bottom: 3px;">Velocity</div>
            <div style="display: flex; align-items: center;">
                <div style="width: 100px; height: 10px; background: linear-gradient(to right, blue, white, red);"></div>
                <div style="display: flex; justify-content: space-between; width: 100px; margin-top: 2px; font-size: 8px;">
                    <span>Low</span>
                    <span>High</span>
                </div>
            </div>
        `;
    } else { // pressure
        legend.innerHTML = `
            <div style="margin-bottom: 3px;">Pressure</div>
            <div style="display: flex; align-items: center;">
                <div style="width: 100px; height: 10px; background: linear-gradient(to right, blue, green, red);"></div>
                <div style="display: flex; justify-content: space-between; width: 100px; margin-top: 2px; font-size: 8px;">
                    <span>Low</span>
                    <span>High</span>
                </div>
            </div>
        `;
    }
    
    // Add to document
    document.body.appendChild(legend);
}

// Start initialization when the document is ready
if (document.readyState === 'complete') {
    // Wait a bit to ensure simulation is initialized
    setTimeout(waitForInitialization, 1000);
} else {
    window.addEventListener('load', () => {
        // Wait a bit to ensure simulation is initialized
        setTimeout(waitForInitialization, 1000);
    });
}