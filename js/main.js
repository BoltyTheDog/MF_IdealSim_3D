// Main.js - Fluid Simulation Visualization
// This file handles the Three.js setup and visualization

// Global variables
let scene, camera, renderer, controls;
let simulationObject, particles;
let isSimulating = false;
let simulationParams = {
    freeStreamVelocity: 1.0,
    particleCount: 1000,
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
    scene.background = new THREE.Color(0xf0f8ff);
    
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
    
    // Add grid for reference
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
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

// Create airfoil geometry
function createAirfoilGeometry() {
    // Create a simple airfoil shape using extruded 2D shape
    const shape = new THREE.Shape();
    
    // Generate NACA 0012 airfoil points
    const points = [];
    for (let i = 0; i <= 1; i += 0.01) {
        const x = i * 2 - 1; // -1 to 1
        // NACA 0012 formula (simplified)
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

// Initialize particles for fluid simulation
function initializeParticles() {
    // Remove previous particles if exist
    if (particles) {
        scene.remove(particles);
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(simulationParams.particleCount * 3);
    const particleColors = new Float32Array(simulationParams.particleCount * 3);
    
    // Initialize particle positions in a grid pattern
    const gridSize = Math.ceil(Math.pow(simulationParams.particleCount, 1/3));
    const spacing = 10 / gridSize;
    
    for (let i = 0; i < simulationParams.particleCount; i++) {
        const ix = i % gridSize;
        const iy = Math.floor((i / gridSize) % gridSize);
        const iz = Math.floor(i / (gridSize * gridSize));
        
        // Position upstream of the object
        particlePositions[i * 3] = (ix - gridSize / 2) * spacing - 5; // Start from left side
        particlePositions[i * 3 + 1] = (iy - gridSize / 2) * spacing;
        particlePositions[i * 3 + 2] = (iz - gridSize / 2) * spacing;
        
        // Blue color with slight variations
        particleColors[i * 3] = 0.1 + Math.random() * 0.1; // R
        particleColors[i * 3 + 1] = 0.4 + Math.random() * 0.2; // G
        particleColors[i * 3 + 2] = 0.8 + Math.random() * 0.2; // B
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.velocities = new Float32Array(simulationParams.particleCount * 3);
    
    // Initialize velocities (free stream velocity in x direction)
    for (let i = 0; i < simulationParams.particleCount; i++) {
        particles.userData.velocities[i * 3] = simulationParams.freeStreamVelocity;
        particles.userData.velocities[i * 3 + 1] = 0;
        particles.userData.velocities[i * 3 + 2] = 0;
    }
    
    scene.add(particles);
}

// Update particle positions based on velocity potential
function updateParticles() {
    if (!particles || !simulationObject) return;
    
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;
    
    // Time step
    const dt = 0.01;
    
    if (wasmLoaded && wasmModule && typeof window.updateVelocities === 'function') {
        // Use WebAssembly for calculations if available
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
                1.0 // Object radius or scale
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
        // Fallback to JavaScript
        updateVelocitiesJS();
    }
    
    // Update positions based on velocities
    for (let i = 0; i < simulationParams.particleCount; i++) {
        const idx = i * 3;
        
        // Update positions
        positions[idx] += velocities[idx] * dt;
        positions[idx + 1] += velocities[idx + 1] * dt;
        positions[idx + 2] += velocities[idx + 2] * dt;
        
        // Reset particles that go too far
        if (positions[idx] > 10) {
            positions[idx] = -10;
            positions[idx + 1] = (Math.random() - 0.5) * 8;
            positions[idx + 2] = (Math.random() - 0.5) * 8;
        }
    }
    
    particles.geometry.attributes.position.needsUpdate = true;
}

// JavaScript fallback for velocity calculations
function updateVelocitiesJS() {
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;
    const objectPos = simulationObject.position;
    const freeStreamVelocity = simulationParams.freeStreamVelocity;
    
    // Object radius (assumes sphere-like object for simplicity)
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
                    const rxy = Math.sqrt(x*x + y*y);
                    if (rxy > radius) {
                        const factorCyl = Math.pow(radius/rxy, 2);
                        vx = freeStreamVelocity * (1 - factorCyl * (2*x*x/(rxy*rxy) - 1));
                        vy = freeStreamVelocity * (-factorCyl * 2*x*y/(rxy*rxy));
                    } else {
                        vx = 0;
                        vy = 0;
                    }
                    break;
                    
                case 'airfoil':
                    // Simplified flow around airfoil
                    const angle = Math.atan2(y, x);
                    // Approximation of circulation for lift
                    const circulation = freeStreamVelocity * 2 * Math.PI * radius * Math.sin(angle);
                    
                    // Combine doublet and vortex
                    const rxy2 = Math.sqrt(x*x + y*y);
                    if (rxy2 > radius) {
                        const factorAirfoil = Math.pow(radius/rxy2, 2);
                        vx = freeStreamVelocity * (1 - factorAirfoil * Math.cos(2*angle));
                        vy = freeStreamVelocity * (-factorAirfoil * Math.sin(2*angle)) + circulation/(2*Math.PI*rxy2);
                        vz = 0;
                    } else {
                        vx = 0;
                        vy = 0;
                        vz = 0;
                    }
                    break;
            }
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