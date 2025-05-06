//go:build js && wasm
// +build js,wasm

// fluid_sim.go - Velocity Potential-Based Fluid Simulation
package main

import (
	"math"
	"syscall/js"
)

// Global constants
const (
	SPHERE   = 0
	CYLINDER = 1
	AIRFOIL  = 2
)

// updateVelocities calculates velocities based on velocity potential
//
// Parameters:
// - positions: Float32Array of particle positions [x1,y1,z1,x2,y2,z2,...]
// - count: Number of particles
// - freeStreamVelocity: Velocity of the free stream
// - fluidDensity: Density of the fluid
// - objectX, objectY, objectZ: Position of the object
// - objectType: Type of the object (0=sphere, 1=cylinder, 2=airfoil)
// - objectRadius: Radius or characteristic length of the object
//
// Returns:
// - Float32Array of updated velocities [vx1,vy1,vz1,vx2,vy2,vz2,...]
func updateVelocities(this js.Value, args []js.Value) interface{} {
	positionsJS := args[0]
	count := args[1].Int()
	freeStreamVelocity := args[2].Float()
	fluidDensity := args[3].Float()
	objectX := args[4].Float()
	objectY := args[5].Float()
	objectZ := args[6].Float()
	objectType := args[7].Int()
	objectRadius := args[8].Float()

	// Create output array
	resultJS := js.Global().Get("Float32Array").New(count * 3)

	// Process each particle
	for i := 0; i < count; i++ {
		idx := i * 3

		// Extract position relative to object
		x := positionsJS.Index(idx).Float() - objectX
		y := positionsJS.Index(idx+1).Float() - objectY
		z := positionsJS.Index(idx+2).Float() - objectZ

		// Calculate distance from object center
		r := math.Sqrt(x*x + y*y + z*z)

		// Default to free stream velocity
		vx := freeStreamVelocity
		vy := 0.0
		vz := 0.0

		// Only calculate potential flow if outside the object
		if r > objectRadius {
			switch objectType {
			case SPHERE:
				// Velocity potential flow around sphere
				factor := math.Pow(objectRadius, 3) / math.Pow(r, 3)
				vx = freeStreamVelocity * (1 - factor*(3*x*x/(2*r*r)-0.5))
				vy = freeStreamVelocity * (-factor * 3 * x * y / (2 * r * r))
				vz = freeStreamVelocity * (-factor * 3 * x * z / (2 * r * r))

			case CYLINDER:
				// Velocity potential flow around cylinder (2D in XY plane)
				rxy := math.Sqrt(x*x + y*y)
				if rxy > objectRadius {
					factor := math.Pow(objectRadius/rxy, 2)
					vx = freeStreamVelocity * (1 - factor*(2*x*x/(rxy*rxy)-1))
					vy = freeStreamVelocity * (-factor * 2 * x * y / (rxy * rxy))

					// Apply pressure gradient from Bernoulli's equation
					pressure := fluidDensity * (0.5*freeStreamVelocity*freeStreamVelocity - 0.5*(vx*vx+vy*vy))

					// Z-component adjustment based on pressure gradient
					vz += z * pressure * 0.01
				} else {
					// Inside the cylinder but outside core
					vx = 0
					vy = 0
					vz = 0
				}

			case AIRFOIL:
				// Simplified airfoil model using doublet and vortex
				rxy := math.Sqrt(x*x + y*y)
				angle := math.Atan2(y, x)

				// Add circulation for lift (using Kutta condition)
				circulation := freeStreamVelocity * 4 * math.Pi * objectRadius * math.Sin(angle)

				if rxy > objectRadius {
					// Combine doublet and vortex flow
					factor := math.Pow(objectRadius/rxy, 2)
					vx = freeStreamVelocity * (1 - factor*math.Cos(2*angle))
					vy = freeStreamVelocity*(-factor*math.Sin(2*angle)) + circulation/(2*math.Pi*rxy)

					// Scale z velocity based on xz plane
					vz = 0.1 * z * (vx*vx + vy*vy) / (objectRadius * freeStreamVelocity)
				} else {
					// Inside airfoil
					vx = 0
					vy = 0
					vz = 0
				}
			}
		} else {
			// Inside object, zero velocity
			vx = 0
			vy = 0
			vz = 0
		}

		// Set velocities in result array
		resultJS.SetIndex(idx, vx)
		resultJS.SetIndex(idx+1, vy)
		resultJS.SetIndex(idx+2, vz)
	}

	return resultJS
}

// Calculate pressure field based on velocities (Bernoulli's equation)
func calculatePressure(this js.Value, args []js.Value) interface{} {
	velocitiesJS := args[0]
	count := args[1].Int()
	freeStreamVelocity := args[2].Float()
	fluidDensity := args[3].Float()

	// Create output array
	resultJS := js.Global().Get("Float32Array").New(count)

	// Use Bernoulli's equation: p + 0.5*rho*v^2 = constant
	// Assuming p_infinity + 0.5*rho*V_infinity^2 is our reference
	pRef := 0.5 * fluidDensity * freeStreamVelocity * freeStreamVelocity

	for i := 0; i < count; i++ {
		idx := i * 3
		vx := velocitiesJS.Index(idx).Float()
		vy := velocitiesJS.Index(idx + 1).Float()
		vz := velocitiesJS.Index(idx + 2).Float()

		// Velocity magnitude squared
		v2 := vx*vx + vy*vy + vz*vz

		// Pressure from Bernoulli (p = pRef - 0.5*rho*v^2)
		pressure := pRef - 0.5*fluidDensity*v2

		resultJS.SetIndex(i, pressure)
	}

	return resultJS
}

// Register functions to be callable from JavaScript
func registerCallbacks() {
	js.Global().Set("updateVelocities", js.FuncOf(updateVelocities))
	js.Global().Set("calculatePressure", js.FuncOf(calculatePressure))
}

func main() {
	// Register functions
	registerCallbacks()

	// Keep the Go program running
	<-make(chan bool)
}

