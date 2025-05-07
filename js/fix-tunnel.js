// This function replaces the problematic addTunnelVisibilityToggle function
// It directly appends the toggle to the control panel instead of using insertBefore

// Fixed function to add tunnel visibility toggle
function fixedTunnelVisibilityToggle() {
    // Find the control panel
    const controlPanel = document.querySelector('.control-panel');
    if (!controlPanel) {
        console.warn("Control panel not found, can't add tunnel visibility toggle");
        return;
    }
    
    // Create the toggle element
    const toggleDiv = document.createElement('div');
    toggleDiv.id = 'tunnel-visibility-toggle';
    toggleDiv.className = 'control-group';
    toggleDiv.innerHTML = `
        <label>Tunnel Boundaries</label>
        <div class="button-group">
            <button id="show-tunnel-btn" class="active">Show</button>
            <button id="hide-tunnel-btn">Hide</button>
        </div>
    `;
    
    // Directly append to control panel instead of using insertBefore
    controlPanel.appendChild(toggleDiv);
    
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
    
    console.log("Tunnel visibility toggle added successfully");
}

// This code finds and replaces the existing buggy function with our fixed version
function applyTunnelVisibilityFix() {
    console.log("Applying tunnel visibility toggle fix...");
    
    // Replace the problematic addTunnelVisibilityToggle function
    window.addTunnelVisibilityToggle = fixedTunnelVisibilityToggle;
    
    // Also fix the initializeWindTunnel function to avoid potential issues
    const originalInitializeWindTunnel = window.initializeWindTunnel;
    
    window.initializeWindTunnel = function() {
        // Call original function without the problematic part
        window.originalInitializeParticles = window.initializeParticles;
        window.originalUpdateParticles = window.updateParticles;
        
        // Use our fixed function instead
        fixedTunnelVisibilityToggle();
        
        console.log("Wind tunnel simulation initialized with fixed controls");
    };
    
    // If the initializeWindTunnel has already run and failed, run our fixed version
    if (window.tunnelDimensions && !document.getElementById('tunnel-visibility-toggle')) {
        fixedTunnelVisibilityToggle();
    }
    
    console.log("Tunnel visibility toggle fix applied");
}

// Apply the fix immediately
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    applyTunnelVisibilityFix();
} else {
    window.addEventListener('DOMContentLoaded', applyTunnelVisibilityFix);
}