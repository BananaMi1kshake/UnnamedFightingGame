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
const p1_rotateBtn = document.getElementById('p1-rotate-btn');
const p1_confirmBtn = document.getElementById('p1-confirm-head');
const p1_nameInput = document.getElementById('p1-name');

// Player 2 Elements
const p2_upload = document.getElementById('p2-upload');
const p2_headEditor = document.getElementById('p2-head-editor');
const p2_headFrame = document.getElementById('p2-head-frame');
const p2_previewImg = document.getElementById('p2-preview-img');
const p2_zoomSlider = document.getElementById('p2-zoom-slider');
const p2_rotateBtn = document.getElementById('p2-rotate-btn');
const p2_confirmBtn = document.getElementById('p2-confirm-head');
const p2_nameInput = document.getElementById('p2-name');


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
function setupHeadEditor(uploadEl, editorEl, frameEl, previewEl, zoomEl, rotateBtn, confirmBtn, playerImage, onConfirm) {
    let isDragging = false;
    let startX, startY, imgStartX, imgStartY;
    let horizontalScale = 1; // 1 = normal, -1 = flipped

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

    rotateBtn.addEventListener('click', () => {
        horizontalScale *= -1; // Toggle between 1 and -1
        previewEl.style.transform = `scaleX(${horizontalScale})`;
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

        if (horizontalScale === -1) {
            headCtx.translate(frameSize, 0);
            headCtx.scale(-1, 1);
        }

        const scale = previewEl.width / previewEl.naturalWidth;
        const sX = -previewEl.offsetLeft / scale;
        const sY = -previewEl.offsetTop / scale;
        const sWidth = frameEl.offsetWidth / scale;
        const sHeight = frameEl.offsetHeight / scale;

        headCtx.drawImage(previewEl, sX, sY, sWidth, sHeight, 0, 0, frameSize, frameSize);
        headCtx.setTransform(1, 0, 0, 1, 0, 0);

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = frameSize;
        finalCanvas.height = frameSize;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.beginPath();
        finalCtx.arc(frameSize / 2, frameSize / 2, frameSize / 2, 0, Math.PI * 2, true);
        finalCtx.clip();
        finalCtx.drawImage(headCanvas, 0, 0);
        
        playerImage.src = finalCanvas.toDataURL();
        editorEl.style.display = 'none';
        onConfirm();

        horizontalScale = 1;
        previewEl.style.transform = 'scaleX(1)';
    });
}

setupHeadEditor(p1_upload, p1_headEditor, p1_headFrame, p1_previewImg, p1_zoomSlider, p1_rotateBtn, p1_confirmBtn, p1_headImage, () => { p1_confirmed = true; });
setupHeadEditor(p2_upload, p2_headEditor, p2_headFrame, p2_previewImg, p2_zoomSlider, p2_rotateBtn, p2_confirmBtn, p2_headImage, () => { p2_confirmed = true; });


// --- CORE GAME FUNCTIONS ---

function createPlayer(x, y, headImage, name) {
    const handsDownAngle = Math.PI / 2; // 90 degrees
    return {
        x, y, headImage, name: name || 'Player',
        width: 60, height: 150,
        vx: 0, vy: 0,
        knockbackVx: 0,
        health: 100, isJumping: false,
        direction: 'right', canAttack: true, attackCooldown: 0,
        body: {
            torso: { width: 40, height: 60 },
            // CHANGED: Set the initial and target rotation for arms to be down.
            arms: {
                left: { rotation: -handsDownAngle, targetRotation: -handsDownAngle },
                right: { rotation: handsDownAngle, targetRotation: handsDownAngle }
            },
            legs: { left: { rotation: 0, targetRotation: 0 }, right: { rotation: 0, targetRotation: 0 } },
            armLength: 40, legLength: 50,
            animState: 'idle', animTimer: 0
        }
    };
}

function handleControls() {
    player1.vx = 0;
    player2.vx = 0;

    if (keysPressed['KeyA']) player1.vx = -5;
    if (keysPressed['KeyD']) player1.vx = 5;
    if (keysPressed['KeyC'] && !player1.isJumping) {
        player1.vy = -12; player1.isJumping = true;
    }
    if (keysPressed['KeyZ'] && player1.canAttack) performAttack(player1, 'punch');
    if (keysPressed['KeyX'] && player1.canAttack) performAttack(player1, 'kick');

    if (keysPressed['ArrowLeft']) player2.vx = -5;
    if (keysPressed['ArrowRight']) player2.vx = 5;
    if (keysPressed['Comma'] && !player2.isJumping) {
        player2.vy = -12; player2.isJumping = true;
    }
    if (keysPressed['Slash'] && player2.canAttack) performAttack(player2, 'punch');
    if (keysPressed['Period'] && player2.canAttack) performAttack(player2, 'kick');
}

function performAttack(attacker, attackType) {
    attacker.canAttack = false;
    attacker.attackCooldown = 500;
    attacker.body.animState = attackType;
    attacker.body.animTimer = 250;
    
    // --- Hitbox Logic ---
    const opponent = (attacker === player1) ? player2 : player1;
    const hitbox = {
        x: 0, y: 0, width: 0, height: 0
    };
    const attackReach = (attackType === 'punch') ? 40 : 50;
    
    // Position the hitbox based on the attacker's position and direction
    const attackerPivotX = attacker.x + attacker.width / 2;
    if (attacker.direction === 'right') {
        hitbox.x = attackerPivotX;
        hitbox.width = attackReach;
    } else {
        hitbox.x = attackerPivotX - attackReach;
        hitbox.width = attackReach;
    }
    hitbox.y = attacker.y - attacker.height + (attackType === 'punch' ? 40 : 80);
    hitbox.height = 20;

    // Define the opponent's hurtbox
    const opponentHurtbox = {
        x: opponent.x,
        y: opponent.y - opponent.height,
        width: opponent.width,
        height: opponent.height
    };

    // Check for collision
    if (hitbox.x < opponentHurtbox.x + opponentHurtbox.width &&
        hitbox.x + hitbox.width > opponentHurtbox.x &&
        hitbox.y < opponentHurtbox.y + opponentHurtbox.height &&
        hitbox.y + hitbox.height > opponentHurtbox.y)
    {
        opponent.health -= (attackType === 'punch' ? 10 : 15);
        opponent.knockbackVx = (attacker.direction === 'right' ? 8 : -8);
    }
}


function updatePlayer(player) {
    // Apply player-controlled velocity
    player.x += player.vx;
    // Apply and decay knockback
    player.x += player.knockbackVx;
    player.knockbackVx *= 0.90; // Friction
    if (Math.abs(player.knockbackVx) < 0.1) player.knockbackVx = 0;

    // Apply gravity
    player.vy += gravity;
    player.y += player.vy;

    // Boundary and floor checks
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y > canvas.height) {
        player.y = canvas.height;
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
    
    // --- UPDATED ANIMATION LOGIC ---
    const handsDownAngle = Math.PI / 2;
    
    // Set default idle rotations
    player.body.arms.right.targetRotation = handsDownAngle;
    player.body.arms.left.targetRotation = -handsDownAngle;
    player.body.legs.right.targetRotation = 0;
    player.body.legs.left.targetRotation = 0;

    // Set attack rotations based on state and direction
    if (player.body.animState === 'punch') {
        if (player.direction === 'right') {
            player.body.arms.right.targetRotation = 0; // Punch straight
        } else {
            player.body.arms.left.targetRotation = 0; // Punch straight
        }
    } else if (player.body.animState === 'kick') {
        if (player.direction === 'right') {
            player.body.legs.right.targetRotation = -0.5; // Kick forward
        } else {
            player.body.legs.left.targetRotation = 0.5; // Kick forward
        }
    }

    // Tweening for smooth animation
    for (const limb of [player.body.arms.left, player.body.arms.right, player.body.legs.left, player.body.legs.right]) {
        limb.rotation += (limb.targetRotation - limb.rotation) * 0.25; // Increased speed slightly
    }
}


function drawPlayer(player) {
    const { x, y, width, body, headImage, direction } = player;

    ctx.save();
    const pivotX = x + width / 2;
    const pivotY = y; 

    // Flipping the entire character for direction is now handled by individual limb rotations
    // The main canvas flip is no longer needed here if limbs are drawn symmetrically.
    // However, we'll keep it for the head.
    if (direction === 'left') {
        ctx.translate(pivotX, pivotY - body.legLength - body.torso.height); 
        ctx.scale(-1, 1);
        ctx.translate(-pivotX, -(pivotY - body.legLength - body.torso.height));
    }
    
    const torsoTop = pivotY - body.legLength - body.torso.height;

    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.save();
    ctx.translate(pivotX - body.torso.width / 4, pivotY - body.legLength);
    ctx.rotate(body.legs.left.rotation);
    ctx.fillRect(-5, 0, 10, body.legLength);
    ctx.restore();
    ctx.save();
    ctx.translate(pivotX + body.torso.width / 4, pivotY - body.legLength);
    ctx.rotate(body.legs.right.rotation);
    ctx.fillRect(-5, 0, 10, body.legLength);
    ctx.restore();

    // Torso
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(pivotX - body.torso.width / 2, torsoTop, body.torso.width, body.torso.height);
    
    // Arms
    ctx.fillStyle = '#34495e';
    ctx.save();
    ctx.translate(pivotX - body.torso.width / 2, torsoTop + 10);
    ctx.rotate(body.arms.left.rotation);
    ctx.fillRect(0, -5, body.armLength, 10); // Draw relative to pivot
    ctx.restore();
    ctx.save();
    ctx.translate(pivotX + body.torso.width / 2, torsoTop + 10);
    ctx.rotate(body.arms.right.rotation);
    ctx.fillRect(-body.armLength, -5, body.armLength, 10); // Draw relative to pivot
    ctx.restore();

    // Neck & Head
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(pivotX - 5, torsoTop - 10, 10, 10);
    const headSize = 60;
    ctx.drawImage(headImage, pivotX - headSize / 2, torsoTop - 10 - headSize, headSize, headSize);

    ctx.restore();
}


function drawUI() {
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(player1.name, 15, 65);
    ctx.textAlign = 'right';
    ctx.fillText(player2.name, canvas.width - 15, 65);
    
    // Health Bars
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 300, 30);
    ctx.fillRect(canvas.width - 310, 10, 300, 30);
    ctx.fillStyle = 'green';
    ctx.fillRect(10, 10, (player1.health / 100) * 300, 30);
    ctx.fillRect(canvas.width - 310, 10, (player2.health / 100) * 300, 30);
}

function displayWinner() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    
    if (player1.health <= 0) {
        ctx.fillText(`${player2.name} Wins!`, canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillText(`${player1.name} Wins!`, canvas.width / 2, canvas.height / 2);
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
    
    const p1_name = p1_nameInput.value;
    const p2_name = p2_nameInput.value;
    const startY = canvas.height; 

    player1 = createPlayer(100, startY, p1_headImage, p1_name);
    player2 = createPlayer(600, startY, p2_headImage, p2_name);
    
    setupDiv.style.display = 'none';
    gameArea.style.display = 'block';

    gameLoop();
});
