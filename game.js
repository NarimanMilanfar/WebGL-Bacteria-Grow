var gl;
var program;
var canvas;
var diskRadius = 0.8;
var diskSegments = 64;
var bacteria = [];
var maxBacteria = 10;
var minBacteria = 5;
var bacteriaGrowthSpeed = 0.008;
var lastTime = 0;
var bacteriaCircleSegments = 16;

var player_points = 0;
var game_points = 0;
var gameOver = false;
var pointsPerKill = 1;
var pointsPerSecond = 0.5;
var pointsForThreshold = 5;
var thresholdRadius = 0.15;
var bacteriaReachedThreshold = [];

var bacteriaColors = [
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(1.0, 1.0, 0.0, 1.0),
    vec4(1.0, 0.0, 1.0, 1.0),
    vec4(0.0, 1.0, 1.0, 1.0),
    vec4(1.0, 0.5, 0.0, 1.0),
    vec4(0.0, 0.5, 0.0, 1.0),
    vec4(0.4, 0.2, 0.1, 1.0),
    vec4(1.0, 0.8, 0.2, 1.0)
];

function Bacteria(x, y, color, id) {
    this.x = x;
    this.y = y;
    this.radius = 0.03;
    this.color = color;
    this.maxRadius = 0.25;
    this.active = true;
    this.id = id;
    this.reachedThreshold = false;
}

function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.disable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (program < 0) {
        alert("Failed to initialize shaders");
        return;
    }
    gl.useProgram(program);

    canvas.addEventListener("click", handleClick);

    generateRandomBacteria();
    console.log("Generated " + bacteria.length + " bacteria");

    updateScoreDisplay();

    lastTime = performance.now();
    render();
}

function handleClick(event) {
    if (gameOver) return;

    var rect = canvas.getBoundingClientRect();

    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;

    var glX = (mouseX / canvas.width) * 2 - 1;
    var glY = -((mouseY / canvas.height) * 2 - 1);

    for (var i = 0; i < bacteria.length; i++) {
        var b = bacteria[i];
        if (!b.active) continue;

        var dx = glX - b.x;
        var dy = glY - b.y;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= b.radius) {
            killBacteria(i);
            break;
        }
    }
}

function killBacteria(index) {
    bacteria[index].active = false;
    player_points += pointsPerKill;
    updateScoreDisplay();
    checkWinCondition();
}

function updateScoreDisplay() {
    document.getElementById('player_points').innerHTML = 'Player gains: ' + Math.floor(player_points);
    document.getElementById('game_points').innerHTML = 'Game gains: ' + Math.floor(game_points);
}

function checkWinCondition() {
    if (gameOver) return;

    var thresholdCount = 0;
    for (var i = 0; i < bacteria.length; i++) {
        if (bacteria[i].reachedThreshold) {
            thresholdCount++;
        }
    }

    if (thresholdCount >= 2) {
        gameOver = true;
        document.getElementById('win_lose').innerHTML = 'You lose!';
        document.getElementById('win_lose').style.color = '#ff6b6b';
        return;
    }

    var activeBacteria = 0;
    for (var i = 0; i < bacteria.length; i++) {
        if (bacteria[i].active) {
            activeBacteria++;
        }
    }

    if (activeBacteria === 0) {
        gameOver = true;
        document.getElementById('win_lose').innerHTML = 'You win!';
        document.getElementById('win_lose').style.color = '#00ff88';
    }
}

function generateRandomBacteria() {
    var numBacteria = Math.floor(Math.random() * (maxBacteria - minBacteria + 1)) + minBacteria;

    var availableColors = bacteriaColors.slice(0, Math.max(numBacteria, 10));

    var shuffledColors = availableColors.slice();
    for (var i = shuffledColors.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffledColors[i];
        shuffledColors[i] = shuffledColors[j];
        shuffledColors[j] = temp;
    }

    for (var i = 0; i < numBacteria; i++) {
        var angle = Math.random() * 2 * Math.PI;

        var x = diskRadius * Math.cos(angle);
        var y = diskRadius * Math.sin(angle);

        var color = shuffledColors[i];

        bacteria.push(new Bacteria(x, y, color, i));
    }
}

function createDiskVertices() {
    var vertices = [];
    var colors = [];

    vertices.push(vec2(0.0, 0.0));
    colors.push(vec4(1.0, 1.0, 1.0, 1.0));

    for (var i = 0; i <= diskSegments; i++) {
        var angle = (i / diskSegments) * 2 * Math.PI;
        var x = diskRadius * Math.cos(angle);
        var y = diskRadius * Math.sin(angle);
        vertices.push(vec2(x, y));
        colors.push(vec4(1.0, 1.0, 1.0, 1.0));
    }

    return { vertices: vertices, colors: colors };
}

function createBacteriaVertices() {
    var vertices = [];
    var colors = [];

    for (var i = 0; i < bacteria.length; i++) {
        var b = bacteria[i];
        if (!b.active || b.radius <= 0.001) {
            continue;
        }

        var centerX = b.x;
        var centerY = b.y;

        vertices.push(vec2(centerX, centerY));
        colors.push(b.color);

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

function updateBacteria(deltaTime) {
    if (gameOver) return;

    var growthRate = bacteriaGrowthSpeed * (deltaTime / 1000.0);

    game_points += pointsPerSecond * (deltaTime / 1000.0);

    for (var i = 0; i < bacteria.length; i++) {
        var b = bacteria[i];
        if (b.active) {
            b.radius += growthRate;

            if (!b.reachedThreshold && b.radius >= thresholdRadius) {
                b.reachedThreshold = true;
                game_points += pointsForThreshold;
                console.log("Bacteria " + b.id + " reached threshold!");
            }

            if (b.radius >= b.maxRadius) {
                b.radius = b.maxRadius;
            }
        }
    }

    updateScoreDisplay();
    checkWinCondition();
}

function render() {
    var currentTime = performance.now();
    var deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (!gameOver) {
        updateBacteria(deltaTime);
    }

    gl.clear(gl.COLOR_BUFFER_BIT);

    var modelViewMatrix = mat4();
    var modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    var diskData = createDiskVertices();
    drawShape(diskData.vertices, diskData.colors, gl.TRIANGLE_FAN);

    var bacteriaData = createBacteriaVertices();
    if (bacteriaData.vertices.length > 0) {
        drawBacteriaCircles(bacteriaData.vertices, bacteriaData.colors);
    }

    requestAnimationFrame(render);
}

function drawShape(vertices, colors, mode) {
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.drawArrays(mode, 0, vertices.length);
}

function drawBacteriaCircles(vertices, colors) {
    var offset = 0;

    for (var i = 0; i < bacteria.length; i++) {
        var b = bacteria[i];
        if (!b.active || b.radius <= 0.001) continue;

        var numVertices = bacteriaCircleSegments + 2;

        var bactVertices = vertices.slice(offset, offset + numVertices);
        var bactColors = colors.slice(offset, offset + numVertices);

        drawShape(bactVertices, bactColors, gl.TRIANGLE_FAN);

        offset += numVertices;
    }
}

window.onload = init;
