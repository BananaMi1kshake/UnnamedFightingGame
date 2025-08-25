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
        
        const scale = previewEl.width / previewEl.naturalWidth;
        const frameWidthOnScreen = frameEl.offsetWidth;
        const frameWidthInImage = frameWidthOnScreen / scale;
        
        let sX; // The source X coordinate to start cropping from
        const sY = -previewEl.offsetTop / scale;
        const sWidth = frameWidthInImage;
        const sHeight = frameEl.offsetHeight / scale;

        // Calculate sX differently based on whether the image is flipped.
        if (horizontalScale === 1) {
            // If not flipped, the calculation is simple.
            sX = -previewEl.offsetLeft / scale;
        } else {
            // If flipped, we must account for the reversed image.
            const rightEdgeOffset = previewEl.offsetLeft + previewEl.offsetWidth;
            sX = (previewEl.naturalWidth * scale - rightEdgeOffset) / scale;
        }
        
        headCtx.drawImage(previewEl, sX, sY, sWidth, sHeight, 0, 0, frameSize, frameSize);
        
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

        // Reset the state for the next use
        horizontalScale = 1;
        previewEl.style.transform = 'scaleX(1)';
    });
}

setupHeadEditor(p1_upload, p1_headEditor, p1_headFrame, p1_previewImg, p1_zoomSlider, p1_rotateBtn, p1_confirmBtn, p1_headImage, () => { p1_confirmed = true; });
setupHeadEditor(p2_upload, p2_headEditor, p2_headFrame, p2_previewImg, p2_zoomSlider, p2_rotateBtn, p2_confirmBtn, p2_headImage, () => { p2_confirmed = true; });


// --- CORE GAME FUNCTIONS ---

function createPlayer(x, y, headImage, name) {
    const handsDownAngle = Math.PI / 2;
    return {
        x, y, headImage, name: name || 'Player',
        width: 60, height: 150,
        vx: 0, vy: 0,
        knockbackVx: 0,
        health: 100, isJumping: false,
        direction: 'right', canAttack: true, attackCooldown: 0,
        body: {
            torso: { width: 40, height: 60 },
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
    if (gameOver) return;
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
    
    const opponent = (attacker === player1) ? player2 : player1;
    
    const opponentHurtbox = {
        x: opponent.x,
        y: opponent.y - opponent.height,
        width: opponent.width,
        height: opponent.height
    };

    const hitbox = { x: 0, y: 0, width: 0, height: 0 };
    const attackReach = (attackType === 'punch') ? attacker.body.armLength : attacker.body.legLength;
    const attackerPivotX = attacker.x + attacker.width / 2;

    if (attacker.direction === 'right') {
        hitbox.x = attackerPivotX + attacker.body.torso.width / 2;
        hitbox.width = attackReach;
    } else {
        hitbox.x = attackerPivotX - attacker.body.torso.width / 2 - attackReach;
        hitbox.width = attackReach;
    }
    
    if (attackType === 'punch') {
        hitbox.y = attacker.y - attacker.body.legLength - attacker.body.torso.height + 10;
        hitbox.height = 10;
    } else {
        hitbox.y = attacker.y - attacker.body.legLength;
        hitbox.height = 10;
    }

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
    player.x += player.vx;
    player.x += player.knockbackVx;
    player.knockbackVx *= 0.90;
    if (Math.abs(player.knockbackVx) < 0.1) player.knockbackVx = 0;

    player.vy += gravity;
    player.y += player.vy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y > canvas.height) {
        player.y = canvas.height;
        player.vy = 0;
        player.isJumping = false;
    }

    if (!player.canAttack) {
        player.attackCooldown -= 16;
        if (player.attackCooldown <= 0) player.canAttack = true;
    }
    if (player.body.animTimer > 0) {
        player.body.animTimer -= 16;
        if (player.body.animTimer <= 0) player.body.animState = 'idle';
    }
    
    const handsDownAngle = Math.PI / 2;
    
    player.body.arms.right.targetRotation = handsDownAngle;
    player.body.arms.left.targetRotation = -handsDownAngle;
    player.body.legs.right.targetRotation = 0;
    player.body.legs.left.targetRotation = 0;

    if (player.body.animState === 'punch') {
        if (player.direction === 'right') {
            player.body.arms.right.targetRotation = 0;
        } else {
            player.body.arms.left.targetRotation = 0;
        }
    } else if (player.body.animState === 'kick') {
        if (player.direction === 'right') {
            player.body.legs.right.targetRotation = -0.5;
        } else {
            player.body.legs.left.targetRotation = 0.5;
        }
    }

    for (const limb of [player.body.arms.left, player.body.arms.right, player.body.legs.left, player.body.legs.right]) {
        limb.rotation += (limb.targetRotation - limb.rotation) * 0.25;
    }
}


function drawPlayer(player) {
    const { x, y, width, body, headImage, direction } = player;

    ctx.save();
    const pivotX = x + width / 2;
    const pivotY = y; 

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
    ctx.fillRect(0, -5, body.armLength, 10);
    ctx.restore();
    ctx.save();
    ctx.translate(pivotX + body.torso.width / 2, torsoTop + 10);
    ctx.rotate(body.arms.right.rotation);
    ctx.fillRect(-body.armLength, -5, body.armLength, 10);
    ctx.restore();

    // Head
    ctx.save();
    const headSize = 60;
    const headX = pivotX - headSize / 2;
    const headY = torsoTop - 10 - headSize;
    if (direction === 'left') {
        ctx.translate(headX + headSize, headY);
        ctx.scale(-1, 1);
        ctx.drawImage(headImage, 0, 0, headSize, headSize);
    } else {
        ctx.drawImage(headImage, headX, headY, headSize, headSize);
    }
    ctx.restore();
    
    // Neck is drawn after the head to appear behind it
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(pivotX - 5, torsoTop - 10, 10, 10);

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
