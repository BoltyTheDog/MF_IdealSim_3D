// Main.js - Fluid Simulation Visualization
// This file handles the Three.js setup and visualization

// Global variables
let scene, camera, renderer, controls;
let simulationObject, particles;
let isSimulating = false;
let simulationParams = {
    freeStreamVelocity: 1.0,
    particleCount: 5000,
    fluidDensity: 1.0,
    objectType: 'sphere'
};

// WebAssembly module for fluid calculations
let wasmModule = null;
let wasmLoaded = false;

function initScene() {
    // Get the container element
    const container = document.getElementById('simulation-container');
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2A2A2A);
    
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 5;
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // Create orbit controls - important fix for mouse control
    try {
        // Make THREE.OrbitControls globally available
        if (typeof THREE.OrbitControls !== 'function') {
            console.warn("OrbitControls not found as THREE.OrbitControls - attempting to find it in window scope");
            if (typeof OrbitControls === 'function') {
                // If OrbitControls is in global scope but not attached to THREE
                THREE.OrbitControls = OrbitControls;
            } else {
                throw new Error("OrbitControls not found");
            }
        }
        
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.rotateSpeed = 0.5;
        controls.minDistance = 2;
        controls.maxDistance = 15;
        
        console.log("Orbit controls initialized successfully");
    } catch (e) {
        console.warn("Failed to initialize OrbitControls:", e);
        console.warn("Camera will be static. Using keyboard controls as fallback");
        
        // Provide basic keyboard controls as fallback
        document.addEventListener('keydown', handleKeyDown);
    }
    
    // Basic keyboard controls as fallback
    function handleKeyDown(event) {
        const keyCode = event.which;
        if (keyCode === 37) {      // left arrow
            camera.position.x -= 0.1;
        } else if (keyCode === 38) { // up arrow
            camera.position.y += 0.1;
        } else if (keyCode === 39) { // right arrow
            camera.position.x += 0.1;
        } else if (keyCode === 40) { // down arrow
            camera.position.y -= 0.1;
        } else if (keyCode === 189) { // minus
            camera.position.z += 0.1;
        } else if (keyCode === 187) { // plus
            camera.position.z -= 0.1;
        }
        camera.lookAt(scene.position);
    }
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}


// Window resize handler
function onWindowResize() {
    const container = document.getElementById('simulation-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (controls && typeof controls.update === 'function') {
        controls.update();
    }
    
    if (isSimulating && particles) {
        updateParticles();
    }
    
    renderer.render(scene, camera);
}
// Create or update the simulation object in the scene
function createSimulationObject() {
    // Remove previous object if exists
    if (simulationObject) {
        scene.remove(simulationObject);
    }
    
    let geometry;
    const material = new THREE.MeshPhongMaterial({
        color: 0x2194ce,
        opacity: 0.8,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create geometry based on selected object type
    switch (simulationParams.objectType) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(1, 32, 32);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 32);
            geometry.rotateX(Math.PI / 2); // Rotate to align with flow direction
            break;
        case 'airfoil':
            // Create simplified NACA 0012 airfoil shape
            geometry = createAirfoilGeometry();
            break;
        default:
            geometry = new THREE.SphereGeometry(1, 32, 32);
    }
    
    simulationObject = new THREE.Mesh(geometry, material);
    scene.add(simulationObject);
}

function createAirfoilGeometry() {
    // Create a simple airfoil shape using extruded 2D shape
    const shape = new THREE.Shape();
    
    // Generate NACA 0012 airfoil points
    const points = [];
    for (let i = 0; i <= 1; i += 0.01) {
        const x = i * 2 - 1; // -1 to 1
        // NACA 0012 formula with simplified trailing edge - matches WASM implementation better
        const y = 0.12 * 5 * (0.2969 * Math.sqrt(Math.abs(x)) - 0.1260 * x - 0.3516 * x * x + 0.2843 * Math.pow(x, 3) - 0.1015 * Math.pow(x, 4));
        points.push(new THREE.Vector2(x * 2, y));
    }
    
    // Create shape from points
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].y);
    }
    for (let i = points.length - 1; i >= 0; i--) {
        shape.lineTo(points[i].x, -points[i].y);
    }
    
    // Create extruded geometry
    const extrudeSettings = {
        steps: 1,
        depth: 0.5,
        bevelEnabled: false
    };
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}


function initializeParticles() {
    // Remove previous particles if exist
    if (particles) {
        scene.remove(particles);
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(simulationParams.particleCount * 3);
    const particleColors = new Float32Array(simulationParams.particleCount * 3);
    
    // Define tunnel dimensions - particles will be recycled within these bounds
    const tunnel = {
        length: 20,       // Total tunnel length (-10 to +10 on x-axis)
        width: 8,         // Tunnel width (-4 to +4 on y-axis)
        height: 8,        // Tunnel height (-4 to +4 on z-axis)
        entryX: -10,      // Entry plane x position
        exitX: 10,        // Exit plane x position
    };
    
    // Store tunnel dimensions on particles object for reuse in update function
    if (!window.tunnelDimensions) {
        window.tunnelDimensions = tunnel;
    }
    
    // Distribute particles randomly throughout the entire tunnel
    // This ensures we have a continuous flow from the beginning
    for (let i = 0; i < simulationParams.particleCount; i++) {
        // Random position within the full tunnel volume
        particlePositions[i * 3] = tunnel.entryX + Math.random() * tunnel.length;
        particlePositions[i * 3 + 1] = -tunnel.width/2 + Math.random() * tunnel.width;
        particlePositions[i * 3 + 2] = -tunnel.height/2 + Math.random() * tunnel.height;
        
        // Blue color with slight variations - more noticeable for better visualization
        particleColors[i * 3] = 0.1 + Math.random() * 0.1;     // R
        particleColors[i * 3 + 1] = 0.3 + Math.random() * 0.3; // G
        particleColors[i * 3 + 2] = 0.7 + Math.random() * 0.3; // B
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    // Make particles more visible
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.9
    });
    
    particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.velocities = new Float32Array(simulationParams.particleCount * 3);
    
    // Initialize velocities with slight randomness for more natural flow
    for (let i = 0; i < simulationParams.particleCount; i++) {
        particles.userData.velocities[i * 3] = simulationParams.freeStreamVelocity;
        particles.userData.velocities[i * 3 + 1] = 0;
        particles.userData.velocities[i * 3 + 2] = 0;
    }
    
    scene.add(particles);
    
    // Add boundary markers to visualize the wind tunnel
    addWindTunnelBoundaries(tunnel);
}
function addWindTunnelBoundaries(tunnel) {
    // Remove any existing tunnel boundaries
    scene.children.forEach(child => {
        if (child.userData && child.userData.isTunnelBoundary) {
            scene.remove(child);
        }
    });
    
    // Create a wireframe box to represent the tunnel
    const tunnelGeometry = new THREE.BoxGeometry(
        tunnel.length, 
        tunnel.width, 
        tunnel.height
    );
    
    // Position the tunnel so entry is at entryX
    const centerX = tunnel.entryX + tunnel.length/2;
    
    // Create wireframe material
    const tunnelMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    
    const tunnelMesh = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
    tunnelMesh.position.set(centerX, 0, 0);
    tunnelMesh.userData.isTunnelBoundary = true;
    
    // Add entry and exit planes with higher opacity
    const planeGeometry = new THREE.PlaneGeometry(tunnel.width, tunnel.height);
    const entryMaterial = new THREE.MeshBasicMaterial({
        color: 0x003366,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    
    const exitMaterial = new THREE.MeshBasicMaterial({
        color: 0x663300,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide
    });
    
    // Create and position entry plane
    const entryPlane = new THREE.Mesh(planeGeometry, entryMaterial);
    entryPlane.position.set(tunnel.entryX, 0, 0);
    entryPlane.rotation.set(0, Math.PI/2, 0); // Rotate to face x-axis
    entryPlane.userData.isTunnelBoundary = true;
    
    // Create and position exit plane
    const exitPlane = new THREE.Mesh(planeGeometry, exitMaterial);
    exitPlane.position.set(tunnel.exitX, 0, 0);
    exitPlane.rotation.set(0, Math.PI/2, 0); // Rotate to face x-axis
    exitPlane.userData.isTunnelBoundary = true;
    
    // Add all tunnel elements to the scene
    scene.add(tunnelMesh);
    scene.add(entryPlane);
    scene.add(exitPlane);
}

function updateParticles() {
    if (!particles || !simulationObject) return;
    
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;
    const tunnel = window.tunnelDimensions || {
        entryX: -10,
        exitX: 10,
        width: 8,
        height: 8
    };
    
    // Time step
    const dt = 0.01;
    
    // Use WebAssembly if available, otherwise fall back to JS
    if (wasmLoaded && wasmModule && typeof window.updateVelocities === 'function') {
        try {
            const velocityResults = window.updateVelocities(
                positions, 
                simulationParams.particleCount,
                simulationParams.freeStreamVelocity,
                simulationParams.fluidDensity,
                simulationObject.position.x,
                simulationObject.position.y,
                simulationObject.position.z,
                simulationParams.objectType === 'sphere' ? 0 : 
                simulationParams.objectType === 'cylinder' ? 1 : 2,
                1.0 // Object radius
            );
            
            for (let i = 0; i < simulationParams.particleCount; i++) {
                const idx = i * 3;
                velocities[idx] = velocityResults[idx];
                velocities[idx + 1] = velocityResults[idx + 1];
                velocities[idx + 2] = velocityResults[idx + 2];
            }
        } catch (e) {
            console.warn("WASM calculation error, falling back to JS", e);
            updateVelocitiesJS();
        }
    } else {
        updateVelocitiesJS();
    }
    
    // Update positions and recycle particles
    for (let i = 0; i < simulationParams.particleCount; i++) {
        const idx = i * 3;
        
        // Update position based on velocity
        positions[idx] += velocities[idx] * dt;
        positions[idx + 1] += velocities[idx + 1] * dt;
        positions[idx + 2] += velocities[idx + 2] * dt;
        
        // Check if particle has exited the tunnel (on right side or beyond boundary)
        if (positions[idx] > tunnel.exitX || 
            Math.abs(positions[idx + 1]) > tunnel.width/2 || 
            Math.abs(positions[idx + 2]) > tunnel.height/2) {
            
            // Recycle particle back to entry plane with slight randomness
            positions[idx] = tunnel.entryX;
            
            // If the particle left through the sides, respawn it more centrally
            if (Math.abs(positions[idx + 1]) > tunnel.width/2 || 
                Math.abs(positions[idx + 2]) > tunnel.height/2) {
                // Recycle to a random position on the entry plane
                positions[idx + 1] = (Math.random() - 0.5) * tunnel.width * 0.8; // 80% of width
                positions[idx + 2] = (Math.random() - 0.5) * tunnel.height * 0.8; // 80% of height
            }
            
            // Reset to free stream velocity at entry
            velocities[idx] = simulationParams.freeStreamVelocity;
            velocities[idx + 1] = 0;
            velocities[idx + 2] = 0;
        }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
}

// Add a button to toggle wind tunnel boundaries visibility
function addTunnelVisibilityToggle() {
    const controlPanel = document.querySelector('.control-panel');
    if (!controlPanel) return;
    
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'control-group';
    toggleDiv.innerHTML = `
        <label>Tunnel Boundaries</label>
        <div class="button-group">
            <button id="show-tunnel-btn" class="active">Show</button>
            <button id="hide-tunnel-btn">Hide</button>
        </div>
    `;
    
    // Insert before the toggle simulation button
    const toggleSimulationBtn = document.getElementById('toggle-simulation');
    if (toggleSimulationBtn && toggleSimulationBtn.parentNode) {
        controlPanel.insertBefore(toggleDiv, toggleSimulationBtn.parentNode);
    } else {
        controlPanel.appendChild(toggleDiv);
    }
    
    // Add event listeners
    document.getElementById('show-tunnel-btn').addEventListener('click', () => {
        document.getElementById('show-tunnel-btn').classList.add('active');
        document.getElementById('hide-tunnel-btn').classList.remove('active');
        scene.children.forEach(child => {
            if (child.userData && child.userData.isTunnelBoundary) {
                child.visible = true;
            }
        });
    });
    
    document.getElementById('hide-tunnel-btn').addEventListener('click', () => {
        document.getElementById('hide-tunnel-btn').classList.add('active');
        document.getElementById('show-tunnel-btn').classList.remove('active');
        scene.children.forEach(child => {
            if (child.userData && child.userData.isTunnelBoundary) {
                child.visible = false;
            }
        });
    });
}

// Function to initialize the wind tunnel simulation
function initializeWindTunnel() {
    // Replace original functions with our wind tunnel versions
    window.originalInitializeParticles = initializeParticles;
    window.originalUpdateParticles = updateParticles;
    
    // Add the toggle for tunnel visibility
    addTunnelVisibilityToggle();
    
    console.log("Wind tunnel simulation initialized");
}

// Run initialization when the document is fully loaded
if (document.readyState === 'complete') {
    initializeWindTunnel();
} else {
    window.addEventListener('load', initializeWindTunnel);
}

function updateVelocitiesJS() {
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;
    const objectPos = simulationObject.position;
    const freeStreamVelocity = simulationParams.freeStreamVelocity;
    const fluidDensity = simulationParams.fluidDensity;
    
    // Object radius (characteristic length)
    const radius = 1.0;
    
    for (let i = 0; i < simulationParams.particleCount; i++) {
        const idx = i * 3;
        const x = positions[idx] - objectPos.x;
        const y = positions[idx + 1] - objectPos.y;
        const z = positions[idx + 2] - objectPos.z;
        const r = Math.sqrt(x*x + y*y + z*z);
        
        // Default freestream velocity
        let vx = freeStreamVelocity;
        let vy = 0;
        let vz = 0;
        
        if (r > radius) {
            // Modify velocity based on object type and velocity potential
            switch (simulationParams.objectType) {
                case 'sphere':
                    // Velocity potential for flow around a sphere
                    const factorSphere = Math.pow(radius, 3) / Math.pow(r, 3);
                    vx = freeStreamVelocity * (1 - factorSphere * (3*x*x/(2*r*r) - 0.5));
                    vy = freeStreamVelocity * (-factorSphere * 3*x*y/(2*r*r));
                    vz = freeStreamVelocity * (-factorSphere * 3*x*z/(2*r*r));
                    break;
                    
                case 'cylinder':
                    // Velocity potential for flow around cylinder (2D in XY plane)
                    const rxyC = Math.sqrt(x*x + y*y);
                    if (rxyC > radius) {
                        const factorCyl = Math.pow(radius/rxyC, 2);
                        vx = freeStreamVelocity * (1 - factorCyl * (2*x*x/(rxyC*rxyC) - 1));
                        vy = freeStreamVelocity * (-factorCyl * 2*x*y/(rxyC*rxyC));
                        
                        // Apply pressure gradient from Bernoulli's equation - match WASM
                        const pressure = fluidDensity * (0.5*freeStreamVelocity*freeStreamVelocity - 0.5*(vx*vx+vy*vy));
                        // Z-component adjustment based on pressure gradient
                        vz += z * pressure * 0.01;
                    } else {
                        vx = 0;
                        vy = 0;
                        vz = 0;
                    }
                    break;
                    
                case 'airfoil':
                    // Match WASM implementation - Use complex airfoil model
                    const rxyA = Math.sqrt(x*x + y*y);
                    const angle = Math.atan2(y, x);
                    
                    // Add circulation for lift (using Kutta condition)
                    // Use the SAME formula as in the Go code
                    const circulation = freeStreamVelocity * 4 * Math.PI * radius * Math.sin(angle);
                    
                    if (rxyA > radius) {
                        // Combine doublet and vortex flow
                        const factor = Math.pow(radius/rxyA, 2);
                        vx = freeStreamVelocity * (1 - factor*Math.cos(2*angle));
                        vy = freeStreamVelocity*(-factor*Math.sin(2*angle)) + circulation/(2*Math.PI*rxyA);
                        
                        // Scale z velocity based on xz plane - exactly matching WASM
                        vz = 0.1 * z * (vx*vx + vy*vy) / (radius * freeStreamVelocity);
                    } else {
                        // Inside airfoil
                        vx = 0;
                        vy = 0;
                        vz = 0;
                    }
                    break;
            }
        } else {
            // Inside object, zero velocity
            vx = 0;
            vy = 0;
            vz = 0;
        }
        
        // Update velocities with damping for stability
        velocities[idx] = velocities[idx] * 0.95 + vx * 0.05;
        velocities[idx + 1] = velocities[idx + 1] * 0.95 + vy * 0.05;
        velocities[idx + 2] = velocities[idx + 2] * 0.95 + vz * 0.05;
    }
}
// Load WebAssembly module
async function loadWasmModule() {
    try {
        console.log("Attempting to load WebAssembly module...");
        
        // Show loading indicator
        const container = document.getElementById('simulation-container');
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-indicator';
        loadingEl.innerHTML = '<div class="spinner"></div><p>Loading simulation engine...</p>';
        container.appendChild(loadingEl);
        
        // Check if WebAssembly is supported
        if (typeof WebAssembly === 'undefined') {
            throw new Error("WebAssembly not supported in this browser");
        }
        
        // Check if Go object is available from wasm_exec.js
        if (typeof Go === 'undefined') {
            throw new Error("Go WASM support not loaded. Make sure wasm_exec.js is included.");
        }
        
        // Try loading the WASM module
        try {
            // Use wasm_exec.js bridge
            const go = new Go();
            const response = await fetch('wasm/fluid_sim.wasm');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
            }
            
            const buffer = await response.arrayBuffer();
            const result = await WebAssembly.instantiate(buffer, go.importObject);
            wasmModule = result.instance;
            go.run(wasmModule);
            
            wasmLoaded = true;
            console.log("WebAssembly module loaded successfully");
        } catch (loadError) {
            console.warn("Error loading WASM file:", loadError);
            throw loadError;
        }
        
        // Remove loading indicator
        container.removeChild(loadingEl);
    } catch (e) {
        console.warn("Failed to load WebAssembly module:", e);
        // Show a non-intrusive notification instead of an alert
        const infoBox = document.querySelector('.info-box');
        if (infoBox) {
            const noteEl = document.createElement('p');
            noteEl.className = 'warning';
            noteEl.innerHTML = 'WebAssembly not available. Using JavaScript implementation.';
            infoBox.appendChild(noteEl);
        }
        wasmLoaded = false;
    }
}

// Initialize UI controls
function initControls() {
    // Velocity slider
    const velocitySlider = document.getElementById('velocity');
    const velocityValue = document.getElementById('velocity-value');
    velocitySlider.addEventListener('input', () => {
        simulationParams.freeStreamVelocity = parseFloat(velocitySlider.value);
        velocityValue.textContent = simulationParams.freeStreamVelocity.toFixed(1);
    });
    
    // Particle count slider
    const particlesSlider = document.getElementById('particles');
    const particlesValue = document.getElementById('particles-value');
    particlesSlider.addEventListener('input', () => {
        simulationParams.particleCount = parseInt(particlesSlider.value);
        particlesValue.textContent = simulationParams.particleCount;
        
        if (isSimulating) {
            // Reinitialize particles if simulation is running
            initializeParticles();
        }
    });
    
    // Fluid density slider
    const densitySlider = document.getElementById('density');
    const densityValue = document.getElementById('density-value');
    densitySlider.addEventListener('input', () => {
        simulationParams.fluidDensity = parseFloat(densitySlider.value);
        densityValue.textContent = simulationParams.fluidDensity.toFixed(1);
    });
    
    // Object type buttons
    const sphereBtn = document.getElementById('sphere-btn');
    const cylinderBtn = document.getElementById('cylinder-btn');
    const airfoilBtn = document.getElementById('airfoil-btn');
    
    // Add click handlers for object type selection
    sphereBtn.addEventListener('click', () => {
        sphereBtn.classList.add('active');
        cylinderBtn.classList.remove('active');
        airfoilBtn.classList.remove('active');
        simulationParams.objectType = 'sphere';
        createSimulationObject();
    });
    
    cylinderBtn.addEventListener('click', () => {
        sphereBtn.classList.remove('active');
        cylinderBtn.classList.add('active');
        airfoilBtn.classList.remove('active');
        simulationParams.objectType = 'cylinder';
        createSimulationObject();
    });
    
    airfoilBtn.addEventListener('click', () => {
        sphereBtn.classList.remove('active');
        cylinderBtn.classList.remove('active');
        airfoilBtn.classList.add('active');
        simulationParams.objectType = 'airfoil';
        createSimulationObject();
    });
    
    // Simulation toggle button
    const toggleBtn = document.getElementById('toggle-simulation');
    toggleBtn.addEventListener('click', () => {
        if (isSimulating) {
            // Stop simulation
            isSimulating = false;
            toggleBtn.textContent = 'Start Simulation';
            toggleBtn.classList.remove('stop');
        } else {
            // Start simulation
            isSimulating = true;
            toggleBtn.textContent = 'Stop Simulation';
            toggleBtn.classList.add('stop');
            initializeParticles();
        }
    });
    
    // Set initial values on UI
    velocityValue.textContent = simulationParams.freeStreamVelocity.toFixed(1);
    particlesValue.textContent = simulationParams.particleCount;
    densityValue.textContent = simulationParams.fluidDensity.toFixed(1);
}

// Initialize everything once the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Document loaded, initializing application...");
    
    // Initialize 3D scene
    initScene();
    
    // Create initial simulation object
    createSimulationObject();
    
    // Initialize UI controls
    initControls();
    
    // Try to load WebAssembly module, but don't wait for it
    loadWasmModule().catch(e => {
        console.warn("WASM module failed to load, but application will continue with JavaScript implementation", e);
    });
});

