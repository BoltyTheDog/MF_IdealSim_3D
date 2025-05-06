# Build script for 3D Fluid Dynamics WebAssembly module on Windows

# Check Go version first
$goVersion = (go version) -replace "go version go([0-9]+\.[0-9]+\.[0-9]+).*", '$1'
Write-Host "Detected Go version: $goVersion" -ForegroundColor Cyan

# Check if Go version is adequate for WASM
$goVersionParts = $goVersion -split '\.'
$majorVersion = [int]$goVersionParts[0]
$minorVersion = [int]$goVersionParts[1]

if ($majorVersion -lt 1 -or ($majorVersion -eq 1 -and $minorVersion -lt 11)) {
    Write-Host "Error: WebAssembly requires Go 1.11 or later!" -ForegroundColor Red
    Write-Host "Please upgrade your Go installation." -ForegroundColor Red
    exit 1
}

Write-Host "Building WebAssembly module for Fluid Dynamics Simulator..." -ForegroundColor Cyan

# Set environment variables for WebAssembly compilation
$env:GOOS = "js"
$env:GOARCH = "wasm"

# Create directory structure if it doesn't exist
if (-not (Test-Path ".\wasm")) {
    New-Item -Path ".\wasm" -ItemType Directory | Out-Null
    Write-Host "Created wasm directory" -ForegroundColor Green
}

if (-not (Test-Path ".\js")) {
    New-Item -Path ".\js" -ItemType Directory | Out-Null
    Write-Host "Created js directory" -ForegroundColor Green
}

# Copy the wasm_exec.js support file from Go installation
$goRoot = go env GOROOT
$wasmExecPath = Join-Path $goRoot "misc\wasm\wasm_exec.js"

if (-not (Test-Path $wasmExecPath)) {
    # Try alternate path for newer Go versions
    $wasmExecPath = Join-Path $goRoot "misc\wasm\static\wasm_exec.js"
    
    if (-not (Test-Path $wasmExecPath)) {
        Write-Host "Error: Could not find wasm_exec.js in your Go installation!" -ForegroundColor Red
        Write-Host "Looked in: $goRoot\misc\wasm\wasm_exec.js" -ForegroundColor Red
        Write-Host "and $goRoot\misc\wasm\static\wasm_exec.js" -ForegroundColor Red
        exit 1
    }
}

Copy-Item $wasmExecPath -Destination ".\js\wasm_exec.js" -Force
Write-Host "Copied wasm_exec.js from Go installation to js directory" -ForegroundColor Green

# Create a Go module if not already initialized
if (-not (Test-Path "go.mod")) {
    Write-Host "Initializing Go module..." -ForegroundColor Cyan
    go mod init fluid_simulation
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to initialize Go module!" -ForegroundColor Red
        exit 1
    }
}

# Make sure the syscall/js package is available
Write-Host "Verifying syscall/js package availability..." -ForegroundColor Cyan
$testFile = @"
//go:build js && wasm
// +build js,wasm

package main

import (
    "syscall/js"
)

func main() {
    js.Global().Set("message", "Hello, WebAssembly!")
}
"@

Set-Content -Path "test_wasm.go" -Value $testFile

# Try to compile the test file to see if syscall/js is available
go build -o .\wasm\test.wasm test_wasm.go

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: syscall/js package is not available in your Go installation!" -ForegroundColor Red
    Write-Host "This might be due to:" -ForegroundColor Yellow
    Write-Host "1. Using an outdated Go version (need 1.11+)" -ForegroundColor Yellow
    Write-Host "2. Misconfigured GOROOT/GOPATH environment variables" -ForegroundColor Yellow
    Write-Host "3. Missing WebAssembly support files in your Go installation" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "syscall/js package verified successfully" -ForegroundColor Green
    Remove-Item "test_wasm.go"
    Remove-Item ".\wasm\test.wasm"
}

# Build the Go code to WebAssembly
Write-Host "Compiling fluid_sim.go to WebAssembly..." -ForegroundColor Cyan

# Add WebAssembly build tag to fluid_sim.go if not already present
$fluidSimContent = Get-Content -Path "fluid_sim.go" -Raw
if (-not ($fluidSimContent -match "//go:build js && wasm")) {
    $newContent = @"
//go:build js && wasm
// +build js,wasm

$fluidSimContent
"@
    Set-Content -Path "fluid_sim.go" -Value $newContent
    Write-Host "Added WebAssembly build tags to fluid_sim.go" -ForegroundColor Green
}

# Try the build
go build -o .\wasm\fluid_sim.wasm fluid_sim.go

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Files created:" -ForegroundColor Green
    Write-Host "  - wasm\fluid_sim.wasm" -ForegroundColor Green
    Write-Host "  - js\wasm_exec.js" -ForegroundColor Green
    
    # Verify file sizes to ensure they were created properly
    $wasmSize = (Get-Item ".\wasm\fluid_sim.wasm").Length
    $jsSize = (Get-Item ".\js\wasm_exec.js").Length
    
    Write-Host "WebAssembly file size: $($wasmSize) bytes" -ForegroundColor Green
    Write-Host "Support JS file size: $($jsSize) bytes" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "To test locally, run:" -ForegroundColor Cyan
    Write-Host "  python -m http.server 8000" -ForegroundColor Yellow
    Write-Host "Then open http://localhost:8000 in your browser" -ForegroundColor Yellow
    
    # Check for netlify.toml file and create if doesn't exist
    if (-not (Test-Path ".\netlify.toml")) {
        $netlifyContent = @'
# netlify.toml - Configuration for Netlify deployment

[build]
  publish = "./"
  
[[headers]]
  for = "/wasm/*"
  [headers.values]
    Content-Type = "application/wasm"
    Content-Disposition = "attachment; filename=fluid_sim.wasm"

[[headers]]
  for = "/*"
    [headers.values]
    Cross-Origin-Embedder-Policy = "require-corp"
    Cross-Origin-Opener-Policy = "same-origin"
'@
        Set-Content -Path ".\netlify.toml" -Value $netlifyContent
        Write-Host "Created netlify.toml file with proper WASM configuration" -ForegroundColor Green
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}