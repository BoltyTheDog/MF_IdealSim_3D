/**
 * Enhanced Field Visualization with Auto-Updates
 * - Updates visualization when simulation parameters change
 * - Links to velocity, density, and object type changes
 * - Maintains high performance with smart updates
 */

// Monitor original slider controls and update visualization when they change
function monitorSimulationControls() {
    console.log("Setting up visualization updates for simulation parameter changes...");
    
    // Listen for velocity slider changes
    const velocitySlider = document.getElementById('velocity');
    if (velocitySlider) {
        const originalVelocityListener = velocitySlider.oninput;
        
        velocitySlider.addEventListener('input', () => {
            // Let any original listener run first
            if (typeof originalVelocityListener === 'function') {
                originalVelocityListener.call(velocitySlider);
            }
            
            // Then update our visualization (with slight delay for better performance)
            if (currentFieldMode !== 'none' && activeSlice !== 'none') {
                // Use debounce pattern to avoid too frequent updates
                clearTimeout(window.velocityUpdateTimeout);
                window.velocityUpdateTimeout = setTimeout(() => {
                    console.log("Updating visualization due to velocity change");
                    updateFieldVisualization();
                }, 100);
            }
        });
    }
    
    // Listen for density slider changes
    const densitySlider = document.getElementById('density');
    if (densitySlider) {
        const originalDensityListener = densitySlider.oninput;
        
        densitySlider.addEventListener('input', () => {
            // Let any original listener run first
            if (typeof originalDensityListener === 'function') {
                originalDensityListener.call(densitySlider);
            }
            
            // Then update our visualization (with slight delay for better performance)
            if (currentFieldMode !== 'none' && activeSlice !== 'none') {
                // Use debounce pattern to avoid too frequent updates
                clearTimeout(window.densityUpdateTimeout);
                window.densityUpdateTimeout = setTimeout(() => {
                    console.log("Updating visualization due to density change");
                    updateFieldVisualization();
                }, 100);
            }
        });
    }
    
    // Monitor object type changes
    const objectButtons = [
        document.getElementById('sphere-btn'),
        document.getElementById('cylinder-btn'),
        document.getElementById('airfoil-btn')
    ];
    
    objectButtons.forEach(button => {
        if (button) {
            const originalClickHandler = button.onclick;
            
            button.addEventListener('click', () => {
                // Let original handler run first
                if (typeof originalClickHandler === 'function') {
                    originalClickHandler.call(button);
                }
                
                // Then update our visualization after a short delay
                // (to let object creation complete)
                if (currentFieldMode !== 'none' && activeSlice !== 'none') {
                    setTimeout(() => {
                        console.log("Updating visualization due to object type change");
                        updateFieldVisualization();
                    }, 300);
                }
            });
        }
    });
    
    // Also monitor the simulation toggle button to update when simulation starts/stops
    const toggleSimulationBtn = document.getElementById('toggle-simulation');
    if (toggleSimulationBtn) {
        const originalToggleHandler = toggleSimulationBtn.onclick;
        
        toggleSimulationBtn.addEventListener('click', () => {
            // Let original handler run first
            if (typeof originalToggleHandler === 'function') {
                originalToggleHandler.call(toggleSimulationBtn);
            }
            
            // Then update our visualization after a short delay
            if (currentFieldMode !== 'none' && activeSlice !== 'none') {
                setTimeout(() => {
                    console.log("Updating visualization due to simulation state change");
                    updateFieldVisualization();
                }, 300);
            }
        });
    }
    
    console.log("Visualization updates for simulation parameters set up successfully");
}

// Add this function call to your existing initialization
function enhanceFieldVisualization() {
    // Monitor simulation controls to update visualization when they change
    monitorSimulationControls();
    
    // Ensure the visualization is responsive to window resizing
    window.addEventListener('resize', () => {
        if (currentFieldMode !== 'none' && activeSlice !== 'none') {
            // Debounce to avoid excessive updates during resize
            clearTimeout(window.resizeTimeout);
            window.resizeTimeout = setTimeout(() => {
                console.log("Updating visualization due to window resize");
                updateFieldVisualization();
            }, 200);
        }
    });
    
    console.log("Enhanced field visualization with auto-updates initialized");
}

// Call this after your existing field visualization is set up
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Wait to ensure other initialization is complete
    setTimeout(enhanceFieldVisualization, 2000);
} else {
    window.addEventListener('load', () => {
        setTimeout(enhanceFieldVisualization, 2000);
    });
}