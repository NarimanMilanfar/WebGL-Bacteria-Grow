// Super Bug Zapper - Assignment 1
// Circular disk with bacteria growing on circumference
// Uses pure WebGL with triangle fans - no arc functions or tree.js

var gl;
var program;
var diskRadius = 0.8;
var diskSegments = 64; // Number of segments for smooth circle
var bacteria = [];
var maxBacteria = 10; // Fixed number: up to 10 different bacteria
var bacteriaGrowthSpeed = 0.02; // radius growth per second (slower)
var lastTime = 0;
var bacteriaCircleSegments = 16; // Segments for smooth circular bacteria

// Distinct color palette for bacteria - 10 very different colors
var bacteriaColors = [
    vec4(1.0, 0.0, 0.0, 1.0),      // Red
    vec4(0.0, 1.0, 0.0, 1.0),      // Green
    vec4(0.0, 0.0, 1.0, 1.0),      // Blue
    vec4(1.0, 1.0, 0.0, 1.0),      // Yellow
    vec4(1.0, 0.0, 1.0, 1.0),      // Magenta
    vec4(0.0, 1.0, 1.0, 1.0),      // Cyan
    vec4(1.0, 0.5, 0.0, 1.0),      // Orange
    vec4(0.0, 0.5, 0.0, 1.0),      // Dark Green
    vec4(0.4, 0.2, 0.1, 1.0),      // Dark Brown
    vec4(1.0, 0.8, 0.2, 1.0)       // Gold
];

// Bacteria class
function Bacteria(x, y, color) {
    this.x = x; // X position on the disk
    this.y = y; // Y position on the disk
    this.radius = 0.03; // Initial radius (visible size)
    this.color = color;
    this.maxRadius = 0.12; // Maximum radius (can be adjusted)
    this.active = true;
}

// Initialize WebGL
function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.disable(gl.DEPTH_TEST); // Disable depth testing for 2D rendering

    // Load shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (program < 0) {
        alert("Failed to initialize shaders");
        return;
    }
    gl.useProgram(program);

    // Create initial bacteria
    generateRandomBacteria();
    console.log("Generated " + bacteria.length + " bacteria");

    // Start animation loop
    lastTime = performance.now();
    render();
}

// Generate random bacteria positioned around the circumference of the disk
// Generates up to 10 different bacteria, each with a different color
function generateRandomBacteria() {
    // Random number from 1 to 10 (up to fixed number of 10)
    var numBacteria = Math.floor(Math.random() * maxBacteria) + 1;
    
    // Ensure we have at least 10 distinct colors
    // Take first 10 colors from our palette (we have 20, so this is fine)
    var availableColors = bacteriaColors.slice(0, Math.max(numBacteria, 10));
    
    // Shuffle colors to ensure distinct colors for each bacteria
    var shuffledColors = availableColors.slice();
    for (var i = shuffledColors.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffledColors[i];
        shuffledColors[i] = shuffledColors[j];
        shuffledColors[j] = temp;
    }
    
    for (var i = 0; i < numBacteria; i++) {
        // Random angle around the circumference
        var angle = Math.random() * 2 * Math.PI;
        
        // Position on the circumference (at diskRadius distance from center)
        var x = diskRadius * Math.cos(angle);
        var y = diskRadius * Math.sin(angle);
        
        // Assign distinct color - each bacteria gets a different color
        var color = shuffledColors[i];
        
        bacteria.push(new Bacteria(x, y, color));
    }
}

// Create vertices for the circular disk
function createDiskVertices() {
    var vertices = [];
    var colors = [];
    
    // Center vertex (white for the disk)
    vertices.push(vec2(0.0, 0.0));
    colors.push(vec4(1.0, 1.0, 1.0, 1.0)); // White center
    
    // Create vertices around the circumference
    for (var i = 0; i <= diskSegments; i++) {
        var angle = (i / diskSegments) * 2 * Math.PI;
        var x = diskRadius * Math.cos(angle);
        var y = diskRadius * Math.sin(angle);
        vertices.push(vec2(x, y));
        colors.push(vec4(1.0, 1.0, 1.0, 1.0)); // White for disk edge
    }
    
    return { vertices: vertices, colors: colors };
}

// Create vertices for circular bacteria positioned over the main disk
function createBacteriaVertices() {
    var vertices = [];
    var colors = [];
    
    for (var i = 0; i < bacteria.length; i++) {
        var b = bacteria[i];
        if (!b.active || b.radius <= 0.001) {
            continue; // Skip if too small to see
        }
        
        // Use the bacteria's position (x, y) as center
        var centerX = b.x;
        var centerY = b.y;
        
        // Create circular bacteria using triangle fan
        // Center vertex
        vertices.push(vec2(centerX, centerY));
        colors.push(b.color);
        
        // Create vertices around the circle
        for (var j = 0; j <= bacteriaCircleSegments; j++) {
            var angle = (j / bacteriaCircleSegments) * 2 * Math.PI;
            var x = centerX + b.radius * Math.cos(angle);
            var y = centerY + b.radius * Math.sin(angle);
            vertices.push(vec2(x, y));
            colors.push(b.color);
        }
    }
    
    return { vertices: vertices, colors: colors };
}

// Update bacteria growth
function updateBacteria(deltaTime) {
    var growthRate = bacteriaGrowthSpeed * (deltaTime / 1000.0); // Convert to radius per second
    
    for (var i = 0; i < bacteria.length; i++) {
        var b = bacteria[i];
        if (b.active) {
            b.radius += growthRate;
            if (b.radius >= b.maxRadius) {
                b.radius = b.maxRadius;
            }
        }
    }
}

// Render the scene
function render() {
    var currentTime = performance.now();
    var deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Update bacteria growth
    updateBacteria(deltaTime);
    
    // Clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Set up model-view matrix (identity for 2D view from above)
    var modelViewMatrix = mat4();
    var modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    
    // Draw the circular disk
    var diskData = createDiskVertices();
    drawShape(diskData.vertices, diskData.colors, gl.TRIANGLE_FAN);
    
    // Draw circular bacteria
    var bacteriaData = createBacteriaVertices();
    if (bacteriaData.vertices.length > 0) {
        drawBacteriaCircles(bacteriaData.vertices, bacteriaData.colors);
    }
    
    // Continue animation
    requestAnimationFrame(render);
}

// Draw a shape using triangle fan or triangles
function drawShape(vertices, colors, mode) {
    // Create and bind vertex buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Create and bind color buffer
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    
    // Draw
    gl.drawArrays(mode, 0, vertices.length);
}

// Draw circular bacteria (each bacteria is drawn as a triangle fan)
function drawBacteriaCircles(vertices, colors) {
    var offset = 0;
    
    for (var i = 0; i < bacteria.length; i++) {
        var b = bacteria[i];
        if (!b.active || b.radius <= 0.001) continue; // Skip if too small to see
        
        // Calculate number of vertices for this bacteria circle
        // 1 center vertex + (segments + 1) edge vertices
        var numVertices = bacteriaCircleSegments + 2;
        
        // Extract vertices and colors for this bacteria
        var bactVertices = vertices.slice(offset, offset + numVertices);
        var bactColors = colors.slice(offset, offset + numVertices);
        
        // Draw this bacteria as triangle fan (circular)
        drawShape(bactVertices, bactColors, gl.TRIANGLE_FAN);
        
        offset += numVertices;
    }
}

// Start the application when page loads
window.onload = init;
