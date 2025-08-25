// Get canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// --- SETUP UI ELEMENTS ---
const setupDiv = document.getElementById('setup');
const startButton = document.getElementById('start-button');
const gameArea = document.getElementById('game-area');

// Player 1 Elements
const p1_upload = document.getElementById('p1-upload');
const p1_headEditor = document.getElementById('p1-head-editor');
const p1_headFrame = document.getElementById('p1-head-frame');
const p1_previewImg = document.getElementById('p1-preview-img');
const p1_zoomSlider = document.getElementById('p1-zoom-slider');
const p1_confirmBtn = document.getElementById('p1-confirm-head');

// Player 2 Elements
const p2_upload = document.getElementById('p2-upload');
const p2_headEditor = document.getElementById('p2-head-editor');
const p2_headFrame = document.getElementById('p2-head-frame');
const p2_previewImg = document.getElementById('p2-preview-img');
const p2_zoomSlider = document.getElementById('p2-zoom-slider');
const p2_confirmBtn = document.getElementById('p2-confirm-head');

// --- GAME STATE VARIABLES ---
const keysPressed = {};
const gravity = 0.5;
let player1, player2;
let p1_headImage = new Image();
let p2_headImage = new Image();
let p1_confirmed = false;
let p2_confirmed = false;
let gameOver = false;

// --- EVENT LISTENERS for KEYBOARD INPUT ---
window.addEventListener('keydown', (event) => { keysPressed[event.code] = true; });
window.addEventListener('keyup', (event) => { keysPressed[event.code] = false; });

// --- HEAD EDITOR LOGIC ---
function setupHeadEditor(uploadEl, editorEl, frameEl, previewEl, zoomEl, confirmBtn, playerImage, onConfirm) {
    let isDragging = false;
    let startX, startY, imgStartX, imgStartY;

    uploadEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewEl.src = event.target.result;
                editorEl.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    zoomEl.addEventListener('input', (e) => {
        previewEl.style.width = e.target.value + '%';
    });

    frameEl.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        imgStartX = previewEl.offsetLeft;
        imgStartY = previewEl.offsetTop;
        frameEl.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            previewEl.style.left = `${imgStartX + dx}px`;
            previewEl.style.top = `${imgStartY + dy}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        frameEl.style.cursor = 'move';
    });

    confirmBtn.addEventListener('click', () => {
        const headCanvas = document.createElement('canvas');
        const frameSize = 150;
        headCanvas.width = frameSize;
        headCanvas.height = frameSize;
        const headCtx = headCanvas.getContext('2d');

        headCtx.beginPath();
        headCtx.arc(frameSize / 2, frameSize / 2, frameSize / 2, 0, Math.PI * 2, true);
        headCtx.clip();
        
        const scale = previewEl.width / previewEl.naturalWidth;
        const sX = -previewEl.offsetLeft / scale;
        const sY = -previewEl.offsetTop / scale;
        const sWidth = frameEl.offsetWidth / scale;
        const sHeight = frameEl.offsetHeight / scale;

        headCtx.drawImage(previewEl, sX, sY, sWidth, sHeight, 0, 0, frameSize, frameSize);
        playerImage.src = headCanvas.toDataURL();
        editorEl.style.display = 'none';
        onConfirm();
    });
}

setupHeadEditor(p1_upload, p1_headEditor, p1_headFrame, p1_previewImg, p1_zoomSlider, p1_confirmBtn, p1_headImage, () => { p1_confirmed = true; });
setupHeadEditor(p2_upload, p2_headEditor, p2_headFrame, p2_previewImg, p2_zoomSlider, p2_confirmBtn, p2_headImage, () => { p2_confirmed = true; });


// --- CORE GAME FUNCTIONS ---

function createPlayer(x, y, headImage) {
    return {
        x, y,
        headImage,
        width: 80, // Head width
        height: 80, // Head height
        vx: 0, vy: 0,
        health: 100,
        isJumping: false,
        direction: 'right',
        canAttack: true,
        attackCooldown: 0,
        body: {
            torso: { width: 40, height: 70 },
            arms: { left: { rotation: 0 }, right: { rotation: 0 } },
            legs: { left: { rotation: 0 }, right: { rotation: 0 } },
            armLength: 35,
            legLength: 45,
            animState: 'idle', // 'punch', 'kick'
            animTimer: 0
        }
    };
}

function handleControls() {
    // Player 1
    player1.vx = 0;
    if (keysPressed['KeyA']) player1.vx = -5;
    if (keysPressed['KeyD']) player1.vx = 5;
    if (keysPressed['KeyC'] && !player1.isJumping) {
        player1.vy = -12;
        player1.isJumping = true;
    }
    if (keysPressed['KeyZ'] && player1.canAttack) performAttack(player1, 'punch');
    if (keysPressed['KeyX'] && player1.canAttack) performAttack(player1, 'kick');

    // Player 2
    player2.vx = 0;
    if (keysPressed['ArrowLeft']) player2.vx = -5;
    if (keysPressed['ArrowRight']) player2.vx = 5;
    if (keysPressed['Comma'] && !player2.isJumping) {
        player2.vy = -12;
        player2.isJumping = true;
    }
    if (keysPressed['Slash'] && player2.canAttack) performAttack(player2, 'punch');
    if (keysPressed['Period'] && player2.canAttack) performAttack(player2, 'kick');
}

function performAttack(attacker, attackType) {
    attacker.canAttack = false;
    attacker.attackCooldown = 500;
    attacker.body.animState = attackType;
    attacker.body.animTimer = 250; // Animation lasts for 250ms

    // ... (hitbox logic remains the same as before) ...
}


function updatePlayer(player) {
    player.x += player.vx;
    player.vy += gravity;
    player.y += player.vy;

    // Boundary and floor checks
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.vy = 0;
        player.isJumping = false;
    }

    // Cooldown and Animation Timers
    if (!player.canAttack) {
        player.attackCooldown -= 16;
        if (player.attackCooldown <= 0) player.canAttack = true;
    }
    if (player.body.animTimer > 0) {
        player.body.animTimer -= 16;
        if (player.body.animTimer <= 0) player.body.animState = 'idle';
    }

    // Update limb animations based on state
    if (player.body.animState === 'punch') {
        player.body.arms[player.direction === 'right' ? 'right' : 'left'].rotation = 1.57; // 90 deg
    } else if (player.body.animState === 'kick') {
        player.body.legs[player.direction === 'right' ? 'right' : 'left'].rotation = 1.2;
    } else { // Idle
        player.body.arms.left.rotation = 0;
        player.body.arms.right.rotation = 0;
        player.body.legs.left.rotation = 0;
        player.body.legs.right.rotation = 0;
    }
}


function drawPlayer(player) {
    const { body, x, y, width, height } = player;
    const torsoX = x + (width - body.torso.width) / 2;
    const torsoY = y + height - body.torso.height;

    ctx.save();
    if (player.direction === 'left') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        // Adjust drawing for flipped canvas
        const flippedX = canvas.width - x - width;
        drawProceduralBody(player, flippedX, y);
    } else {
        drawProceduralBody(player, x, y);
    }
    ctx.restore();
}

function drawProceduralBody(player, drawX, drawY) {
    const { body, headImage, width, height } = player;
    const torsoX = drawX + (width - body.torso.width) / 2;
    const torsoY = drawY + height - body.torso.height;

    // Torso
    ctx.fillStyle = '#333';
    ctx.fillRect(torsoX, torsoY, body.torso.width, body.torso.height);
    
    // Right Arm
    ctx.save();
    ctx.translate(torsoX + body.torso.width, torsoY + 10);
    ctx.rotate(body.arms.right.rotation);
    ctx.fillRect(0, -5, body.armLength, 10);
    ctx.restore();

    // Head
    ctx.drawImage(headImage, drawX, drawY, width, height);
}


// ... (drawUI, displayWinner functions remain the same as before) ...
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


function gameLoop() {
    if (gameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    handleControls();
    updatePlayer(player1);
    updatePlayer(player2);
    if (player1.x < player2.x) {
        player1.direction = 'right';
        player2.direction = 'left';
    } else {
        player1.direction = 'left';
        player2.direction = 'right';
    }
    drawPlayer(player1);
    drawPlayer(player2);
    drawUI();
    if (player1.health <= 0 || player2.health <= 0) {
        gameOver = true;
        displayWinner();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

// --- INITIALIZATION ---
startButton.addEventListener('click', () => {
    if (!p1_confirmed || !p2_confirmed) {
        alert("Please confirm a head for both players!");
        return;
    }
    
    player1 = createPlayer(100, 250, p1_headImage);
    player2 = createPlayer(600, 250, p2_headImage);
    
    setupDiv.style.display = 'none';
    gameArea.style.display = 'block';

    gameLoop();
});
