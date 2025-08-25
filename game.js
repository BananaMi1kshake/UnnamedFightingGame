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

// --- GAME STATE VARIABLES ---
const keysPressed = {};
const gravity = 0.5;
let player1, player2;
let gameOver = false;

// --- EVENT LISTENERS for KEYBOARD INPUT ---
window.addEventListener('keydown', (event) => {
    keysPressed[event.code] = true;
});

window.addEventListener('keyup', (event) => {
    keysPressed[event.code] = false;
});

// --- CORE FUNCTIONS ---

/**
 * Reads an uploaded image file and loads it into an Image object.
 */
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

/**
 * Creates a player object with all necessary properties.
 */
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
        direction: 'right', // 'left' or 'right'
        canAttack: true,
        attackCooldown: 0,
    };
}

/**
 * Checks the keysPressed object and updates player actions.
 */
function handleControls() {
    // --- Player 1 Controls (WASD, C, Z, X) ---
    player1.vx = 0;
    if (keysPressed['KeyA']) {
        player1.vx = -5;
    }
    if (keysPressed['KeyD']) {
        player1.vx = 5;
    }
    if (keysPressed['KeyC'] && !player1.isJumping) {
        player1.vy = -12;
        player1.isJumping = true;
    }
    if (keysPressed['KeyZ'] && player1.canAttack) {
        performAttack(player1, 'punch');
    }
    if (keysPressed['KeyX'] && player1.canAttack) {
        performAttack(player1, 'kick');
    }

    // --- Player 2 Controls (Arrow Keys, Comma, Slash, Period) ---
    player2.vx = 0;
    if (keysPressed['ArrowLeft']) {
        player2.vx = -5;
    }
    if (keysPressed['ArrowRight']) {
        player2.vx = 5;
    }
    if (keysPressed['Comma'] && !player2.isJumping) {
        player2.vy = -12;
        player2.isJumping = true;
    }
    if (keysPressed['Slash'] && player2.canAttack) {
        performAttack(player2, 'punch');
    }
    if (keysPressed['Period'] && player2.canAttack) {
        performAttack(player2, 'kick');
    }
}

/**
 * Handles attack logic, hit detection, and cooldowns.
 */
function performAttack(attacker, attackType) {
    attacker.canAttack = false;
    attacker.attackCooldown = 500; // 500ms cooldown

    const opponent = (attacker === player1) ? player2 : player1;
    let hitbox;

    // Define hitbox based on attack type and direction
    if (attackType === 'punch') {
        const xOffset = attacker.direction === 'right' ? attacker.width : -40;
        hitbox = { x: attacker.x + xOffset, y: attacker.y + 20, width: 40, height: 20 };
    } else { // kick
        const xOffset = attacker.direction === 'right' ? attacker.width : -60;
        hitbox = { x: attacker.x + xOffset, y: attacker.y + 70, width: 60, height: 30 };
    }

    // Check for collision between hitbox and opponent
    if (hitbox.x < opponent.x + opponent.width && hitbox.x + hitbox.width > opponent.x &&
        hitbox.y < opponent.y + opponent.height && hitbox.y + hitbox.height > opponent.y) {
        opponent.health -= (attackType === 'punch' ? 10 : 15);
    }
}

/**
 * Updates a player's position, physics, and state every frame.
 */
function updatePlayer(player) {
    player.x += player.vx;
    player.vy += gravity;
    player.y += player.vy;

    // Screen boundary checks
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Floor collision
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.vy = 0;
        player.isJumping = false;
    }

    // Handle attack cooldown
    if (!player.canAttack) {
        player.attackCooldown -= 16; // Roughly 16ms per frame (for 60fps)
        if (player.attackCooldown <= 0) {
            player.canAttack = true;
        }
    }
}

/**
 * Draws the player sprite on the canvas, flipping it based on direction.
 */
function drawPlayer(player) {
    ctx.save(); // Save the current canvas state
    if (player.direction === 'left') {
        ctx.scale(-1, 1); // Flip the context horizontally
        // Draw the image on the flipped context, adjusting the x-position
        ctx.drawImage(player.image, -player.x - player.width, player.y, player.width, player.height);
    } else {
        ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
    }
    ctx.restore(); // Restore the canvas state to normal
}

/**
 * Draws the UI elements like health bars.
 */
function drawUI() {
    // Player 1 Health Bar
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 300, 30);
    ctx.fillStyle = 'green';
    ctx.fillRect(10, 10, (player1.health / 100) * 300, 30);

    // Player 2 Health Bar
    ctx.fillStyle = 'red';
    ctx.fillRect(canvas.width - 310, 10, 300, 30);
    ctx.fillStyle = 'green';
    ctx.fillRect(canvas.width - 310, 10, (player2.health / 100) * 300, 30);
}

/**
 * Displays the winner message when the game is over.
 */
function displayWinner() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    
    if (player1.health <= 0) {
        ctx.fillText('Player 2 Wins!', canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillText('Player 1 Wins!', canvas.width / 2, canvas.height / 2);
    }
}

/**
 * The main game loop that runs every frame.
 */
function gameLoop() {
    if (gameOver) return;

    // 1. Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Handle player input
    handleControls();
    
    // 3. Update game state
    updatePlayer(player1);
    updatePlayer(player2);
    
    // 4. Determine player facing direction
    if (player1.x < player2.x) {
        player1.direction = 'right';
        player2.direction = 'left';
    } else {
        player1.direction = 'left';
        player2.direction = 'right';
    }

    // 5. Draw everything
    drawPlayer(player1);
    drawPlayer(player2);
    drawUI();

    // 6. Check for win condition
    if (player1.health <= 0 || player2.health <= 0) {
        gameOver = true;
        displayWinner();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

// --- INITIALIZATION ---
p1_upload.addEventListener('change', (e) => handleImageUpload(e, p1_image));
p2_upload.addEventListener('change', (e) => handleImageUpload(e, p2_image));

startButton.addEventListener('click', () => {
    if (!p1_image.src || !p2_image.src) {
        alert("Please upload an image for both players!");
        return;
    }
    
    player1 = createPlayer(100, 250, p1_image);
    player2 = createPlayer(600, 250, p2_image);
    
    setupDiv.style.display = 'none';
    gameArea.style.display = 'block';

    gameLoop();
});
