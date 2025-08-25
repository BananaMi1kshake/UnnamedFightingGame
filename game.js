// Get canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Player setup elements
const p1_upload = document.getElementById('p1-upload');
const p2_upload = document.getElementById('p2-upload');
const startButton = document.getElementById('start-button');

// Game area elements
const setupDiv = document.getElementById('setup');
const gameArea = document.getElementById('game-area');

// Player image objects
let p1_image = new Image();
let p2_image = new Image();

// --- PHASE 1 START ---

// Object to store the state of currently pressed keys
const keysPressed = {};

window.addEventListener('keydown', (event) => {
    keysPressed[event.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (event) => {
    keysPressed[event.key.toLowerCase()] = false;
});

const gravity = 0.5;
let player1, player2;

// --- CORE FUNCTIONS ---

function handleImageUpload(event, playerImage) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            playerImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function createPlayer(x, y, image) {
    return {
        x: x,
        y: y,
        width: 100,
        height: 150,
        vx: 0, // Velocity x
        vy: 0, // Velocity y
        image: image,
        health: 100,
        isJumping: false,
    };
}

function handleControls() {
    // --- Player 1 Controls (WASD + c) ---
    player1.vx = 0; // Reset horizontal velocity to prevent sliding
    if (keysPressed['a']) {
        player1.vx = -5; // Move left
    }
    if (keysPressed['d']) {
        player1.vx = 5;  // Move right
    }
    if (keysPressed['c'] && !player1.isJumping) {
        player1.vy = -12; // A negative vertical velocity creates the jump
        player1.isJumping = true;
    }

    // --- Player 2 Controls (Arrow Keys + ,) ---
    player2.vx = 0;
    if (keysPressed['arrowleft']) {
        player2.vx = -5;
    }
    if (keysPressed['arrowright']) {
        player2.vx = 5;
    }
    if (keysPressed[','] && !player2.isJumping) {
        player2.vy = -12;
        player2.isJumping = true;
    }
}

function updatePlayer(player) {
    // Apply horizontal movement
    player.x += player.vx;

    // Apply gravity
    player.vy += gravity;
    player.y += player.vy;

    // Screen boundary check (left and right walls)
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    // Floor collision
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.vy = 0;
        player.isJumping = false;
    }
}

function drawPlayer(player) {
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}

function gameLoop() {
    // 1. Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Check for player input
    handleControls();
    
    // 3. Update player positions and states
    updatePlayer(player1);
    updatePlayer(player2);
    
    // 4. Draw players
    drawPlayer(player1);
    drawPlayer(player2);

    // 5. Request the next frame to create the animation loop
    requestAnimationFrame(gameLoop);
}


// --- EVENT LISTENERS ---

p1_upload.addEventListener('change', (e) => handleImageUpload(e, p1_image));
p2_upload.addEventListener('change', (e) => handleImageUpload(e, p2_image));

startButton.addEventListener('click', () => {
    // Make sure both images are loaded before starting
    if (!p1_image.src || !p2_image.src) {
        alert("Please upload an image for both players!");
        return;
    }
    
    // Initialize players
    player1 = createPlayer(100, 250, p1_image);
    player2 = createPlayer(600, 250, p2_image);
    
    // Hide setup and show game
    setupDiv.style.display = 'none';
    gameArea.style.display = 'block';

    // Start the game loop!
    gameLoop();
});
