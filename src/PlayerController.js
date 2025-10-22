import * as THREE from 'three';

// --- CONSTANTS ---
// These control the feel of the client-side prediction and animations.
const GRAVITY = -30;
const MOVE_SPEED = 5;
const JUMP_STRENGTH = 10;
const SPRINT_MULTIPLIER = 1.8;
const CROUCH_MULTIPLIER = 0.5;
const ROLL_SPEED = 12;
const ROLL_DURATION = 0.4;
const ROLL_COOLDOWN = 1.0;
const WALK_ANIM_SPEED = 10;
const WALK_ANIM_SWING = 0.4;

const AURA_COLORS = {
    'Iron': new THREE.Color(0x8d9091),
    'Bronze': new THREE.Color(0xcd7f32),
    'Silver': new THREE.Color(0xc0c0c0),
    'Gold': new THREE.Color(0xffd700),
};

/**
 * Manages the LOCAL player's 3D representation, animations, and input-driven PREDICTION.
 * This class moves the character mesh locally for immediate feedback, but the server
 * has the final say on the player's true position.
 */
export class PlayerController {
    constructor(scene, playerSchema, playerState, vfxManager, dungeonManager, room) {
        this.scene = scene;
        this.playerState = playerState;
        this.vfxManager = vfxManager;
        this.dungeonManager = dungeonManager;
        this.room = room; // Store the Colyseus room to send messages

        // --- Core Physics & State (for client-side prediction) ---
        this.width = 0.6;
        this.baseHeight = 1.8;
        this.height = this.baseHeight;
        this.velocity = new THREE.Vector3();
        this.isGrounded = false;
        this.jumpRequested = false;
        this.walkTime = 0;

        // --- Action States (for animations and input locking) ---
        this.isAttacking = false;
        this.attackAnimTime = 0;
        this.attackDuration = 0.4;
        this.lastAttackTime = 0;
        this.attackCooldown = 500;
        this.isRolling = false;
        this.rollTime = 0;
        this.lastRollTime = -ROLL_COOLDOWN;
        this.rollDirection = new THREE.Vector3();

        // --- Character Model Setup ---
        this.mesh = new THREE.Group();
        const headSize = 0.5;
        const bodyWidth = 0.6;
        const bodyHeight = 0.8;
        const bodyDepth = 0.4;
        const legHeight = this.baseHeight - bodyHeight - headSize;
        const armHeight = 0.8;

        const headGeometry = new THREE.BoxGeometry(headSize, headSize, headSize);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x906040 });
        this.head = new THREE.Mesh(headGeometry, headMaterial);

        const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.05);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.1, 0.05, 0.25);
        this.rightEye.position.set(0.1, 0.05, 0.25);
        this.head.add(this.leftEye, this.rightEye);

        const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
        this.bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x008080 });
        this.body = new THREE.Mesh(bodyGeometry, this.bodyMaterial);

        const armGeometry = new THREE.BoxGeometry(0.2, armHeight, 0.2);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x906040 });
        const legGeometry = new THREE.BoxGeometry(bodyWidth / 2, legHeight, bodyDepth);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x00008b });

        armGeometry.translate(0, -armHeight / 2, 0);
        legGeometry.translate(0, -legHeight / 2, 0);
        this.leftArm = new THREE.Mesh(armGeometry, armMaterial);
        this.rightArm = new THREE.Mesh(armGeometry, armMaterial);
        this.leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.rightLeg = new THREE.Mesh(legGeometry, legMaterial);

        this.body.position.set(0, legHeight + bodyHeight / 2, 0);
        this.head.position.set(0, legHeight + bodyHeight + headSize / 2, 0);
        const shoulderY = legHeight + bodyHeight;
        this.leftArm.position.set(-bodyWidth / 2 - 0.1, shoulderY, 0);
        this.rightArm.position.set(bodyWidth / 2 + 0.1, shoulderY, 0);
        this.leftLeg.position.set(-bodyWidth / 4, legHeight, 0);
        this.rightLeg.position.set(bodyWidth / 4, legHeight, 0);

        this.originalBodyY = this.body.position.y;
        this.originalHeadY = this.head.position.y;
        this.originalLeftArmY = this.leftArm.position.y;
        this.originalRightArmY = this.rightArm.position.y;

        this.mesh.add(this.head, this.body, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
        
        this.equippedWeaponMesh = null;
        this.weaponHolder = new THREE.Group();
        this.weaponHolder.position.y = -armHeight + 0.1;
        this.rightArm.add(this.weaponHolder);

        this.aura = null;
        this.auraBasePositions = null;
        this._createAura();

        this.mesh.position.set(playerSchema.x, playerSchema.y, playerSchema.z);
        this.mesh.traverse((child) => {
            if (child.isMesh) child.castShadow = true;
        });
        this.scene.add(this.mesh);
        
        // --- Callbacks for updating visuals based on state changes ---
        this.playerState.onEquipmentChange = () => this.updateEquippedVisuals();
        this.playerState.onAuraChange = (isActive, rank) => this.updateAuraState(isActive, rank);
        
        this.updateEquippedVisuals();
    }
    
    /**
     * Reconciles the predicted client position with the authoritative server position.
     * This is called from the main game loop whenever a server update is received.
     * @param {object} serverState - The player schema object from the server.
     */
    reconcile(serverState) {
        const serverPosition = new THREE.Vector3(serverState.x, serverState.y, serverState.z);
        
        // If the client's predicted position is too far from the server's authoritative position...
        if (this.mesh.position.distanceTo(serverPosition) > 0.1) {
            // ...smoothly interpolate (lerp) the local mesh towards the server's position.
            // This prevents jarring visual snaps on the client's screen due to lag.
            this.mesh.position.lerp(serverPosition, 0.2);
        }
    }
    
    /**
     * Checks if the player is in a state that allows a new action.
     */
    canPerformAction() {
        return !this.isRolling && !this.isAttacking && this.isGrounded;
    }

    /**
     * Sends an "attack" request to the server instead of handling logic locally.
     * The client just plays the animation immediately for responsiveness.
     */
    performMeleeAttack() {
        const now = performance.now();
        if (now - this.lastAttackTime < this.attackCooldown || !this.canPerformAction()) {
            return;
        }
        this.lastAttackTime = now;

        // 1. Play the visual animation immediately on the client.
        this.playReleaseAnimation();

        // 2. Send a message to the server to perform the actual authoritative attack.
        this.room.send("melee_attack");
    }

    /**
     * Sends a "roll" request to the server and starts the client-side animation.
     */
    requestRoll(moveDirection) {
        const now = performance.now() / 1000;
        if (now - this.lastRollTime < ROLL_COOLDOWN || this.isRolling) {
            return;
        }
        this.lastRollTime = now;
        this.isRolling = true;
        this.rollTime = 0;
        
        if (moveDirection.lengthSq() > 0.01) {
            this.rollDirection.copy(moveDirection);
        } else {
            this.mesh.getWorldDirection(this.rollDirection);
            this.rollDirection.y = 0;
            this.rollDirection.normalize();
        }

        // We don't need to send a message here because the standard "input" message
        // will tell the server that the 'control' key is down, which the server
        // will interpret as a roll request.
    }
    
    /**
     * The main update loop for the local player. It handles input, predicts movement,
     * and updates animations. The result of this local simulation is corrected by `reconcile()`.
     */
    update(deltaTime, keys, camera, worldManager) {
        const dt = Math.min(deltaTime, 1 / 20);

        this._updateAuraAnimation(dt);
        const collisionManager = this.dungeonManager.isInDungeon() ? this.dungeonManager : worldManager;

        // --- 1. PREDICT MOVEMENT & HANDLE PHYSICS LOCALLY ---
        if (this.isRolling) {
            this.rollTime += dt;
            this.velocity.x = this.rollDirection.x * ROLL_SPEED;
            this.velocity.z = this.rollDirection.z * ROLL_SPEED;
            this.body.rotation.x = (this.rollTime / ROLL_DURATION) * Math.PI * 2;
            if (this.rollTime >= ROLL_DURATION) {
                this.isRolling = false;
                this.body.rotation.x = 0;
            }
        } else {
            const moveDirection = this._getMoveDirection(keys, camera);
            const isMoving = moveDirection.lengthSq() > 0;
            let speedMultiplier = 1.0;
            
            this.playerState.isSprinting = keys['shift'] && isMoving && !this.playerState.isCrouching && this.playerState.currentMana > 0;
            if (this.playerState.isSprinting) {
                speedMultiplier = SPRINT_MULTIPLIER;
            } else if (this.playerState.isCrouching) {
                speedMultiplier = CROUCH_MULTIPLIER;
            }
            
            this.velocity.x = moveDirection.x * MOVE_SPEED * speedMultiplier;
            this.velocity.z = moveDirection.z * MOVE_SPEED * speedMultiplier;

            if (isMoving) {
                const angle = Math.atan2(moveDirection.x, moveDirection.z);
                const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.mesh.quaternion.slerp(targetQuaternion, 0.15);
            }
            this.updateWalkAnimation(dt, isMoving, speedMultiplier);
        }
        
        this.velocity.y += GRAVITY * dt;
        if (this.jumpRequested && this.isGrounded) {
            this.velocity.y = JUMP_STRENGTH;
        }
        this.jumpRequested = false;

        this._handleCollisions(dt, collisionManager);
        this.isGrounded = this._checkGrounded(collisionManager);

        // --- 2. UPDATE ATTACK ANIMATION ---
        this.updateAttackAnimation(dt);
    }

    // --- ANIMATION METHODS (Client-Side Only) ---
    
    updateWalkAnimation(dt, isMoving, speedMultiplier) {
        if (this.isAttacking) return;

        if (isMoving && this.isGrounded) {
            this.walkTime += dt * WALK_ANIM_SPEED * speedMultiplier;
        }
        const swingAngle = Math.sin(this.walkTime) * WALK_ANIM_SWING;
        const lerpFactor = 0.1;

        if (isMoving && this.isGrounded) {
            this.rightArm.rotation.x = swingAngle;
            this.leftArm.rotation.x = -swingAngle;
            this.rightLeg.rotation.x = -swingAngle;
            this.leftLeg.rotation.x = swingAngle;
        } else {
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, lerpFactor);
            this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, lerpFactor);
            this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, lerpFactor);
            this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, lerpFactor);
        }
    }

    updateAttackAnimation(dt) {
        if (!this.isAttacking) return;

        this.attackAnimTime += dt;
        const attackProgress = this.attackAnimTime / this.attackDuration;
        const swing = Math.sin(attackProgress * Math.PI);
        this.rightArm.rotation.x = -Math.PI * 0.8 * swing;
        this.rightArm.rotation.z = -Math.PI * 0.2 * swing;

        if (attackProgress >= 1) {
            this.isAttacking = false;
            this.rightArm.rotation.set(0, 0, 0);
        }
    }

    playReleaseAnimation() {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.attackAnimTime = 0;
    }

    // --- VISUAL & HELPER METHODS (Client-Side Only) ---

    requestJump() {
        if (this.playerState.isCrouching) return;
        this.jumpRequested = true;
    }

    toggleCrouch() {
        // This is a purely visual state change on the client
        this.playerState.isCrouching = !this.playerState.isCrouching;
        const crouchOffset = this.baseHeight - (this.baseHeight * 0.6);
        if (this.playerState.isCrouching) {
            this.height = this.baseHeight * 0.6;
            this.body.position.y -= crouchOffset;
            this.head.position.y -= crouchOffset;
            this.leftArm.position.y -= crouchOffset;
            this.rightArm.position.y -= crouchOffset;
        } else {
            this.height = this.baseHeight;
            this.body.position.y += crouchOffset;
            this.head.position.y += crouchOffset;
            this.leftArm.position.y += crouchOffset;
            this.rightArm.position.y += crouchOffset;
        }
    }

    updateEquippedVisuals() {
        // Weapon
        if (this.equippedWeaponMesh) {
            this.weaponHolder.remove(this.equippedWeaponMesh);
            this.equippedWeaponMesh = null;
        }
        const mainHandItem = this.playerState.equipment.mainHand;
        if (mainHandItem && mainHandItem.type.toLowerCase() === 'weapon') {
            this.equippedWeaponMesh = this.vfxManager.createSwordMesh();
            this.weaponHolder.add(this.equippedWeaponMesh);
        }

        // Armor
        const chestItem = this.playerState.equipment.chest;
        this.bodyMaterial.color.set(chestItem && chestItem.name === 'Leather Tunic' ? 0x8b4513 : 0x008080);
    }
    
    updateAuraState(isActive, rank) {
        if (this.aura) {
            this.aura.visible = isActive;
            if (isActive) {
                const auraColor = AURA_COLORS[rank] || new THREE.Color(0xffffff);
                this.aura.material.color.set(auraColor);
            }
        }
    }

    _createAura() {
        // ... (Aura creation logic is purely visual and remains unchanged)
    }

    _updateAuraAnimation(deltaTime) {
        // ... (Aura animation logic is purely visual and remains unchanged)
    }
    
    _getMoveDirection(keys, camera) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

        const moveDirection = new THREE.Vector3();
        if (keys['w']) moveDirection.add(forward);
        if (keys['s']) moveDirection.sub(forward);
        if (keys['a']) moveDirection.sub(right);
        if (keys['d']) moveDirection.add(right);
        
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize();
        }
        return moveDirection;
    }

    _handleCollisions(dt, collisionManager) {
        // This entire block is kept for client-side prediction.
        const halfWidth = this.width / 2;

        // Vertical collision
        this.mesh.position.y += this.velocity.y * dt;
        if (this.velocity.y < 0) { // Moving down
            if (this._isColliding(collisionManager, 'feet')) {
                this.mesh.position.y = Math.floor(this.mesh.position.y + 0.1) + 1; // Adjust to prevent sinking
                this.velocity.y = 0;
            }
        }
        if (this.velocity.y > 0) { // Moving up
            if (this._isColliding(collisionManager, 'head')) {
                this.mesh.position.y = Math.floor(this.mesh.position.y + this.height) - this.height;
                this.velocity.y = 0;
            }
        }
        
        // Horizontal X collision
        this.mesh.position.x += this.velocity.x * dt;
        if (this._isColliding(collisionManager, this.velocity.x > 0 ? 'right' : 'left')) {
            this.mesh.position.x = this.velocity.x > 0 ? Math.floor(this.mesh.position.x + halfWidth) - halfWidth : Math.floor(this.mesh.position.x - halfWidth) + 1 + halfWidth;
            this.velocity.x = 0;
        }
        
        // Horizontal Z collision
        this.mesh.position.z += this.velocity.z * dt;
        if (this._isColliding(collisionManager, this.velocity.z > 0 ? 'front' : 'back')) {
            this.mesh.position.z = this.velocity.z > 0 ? Math.floor(this.mesh.position.z + halfWidth) - halfWidth : Math.floor(this.mesh.position.z - halfWidth) + 1 + halfWidth;
            this.velocity.z = 0;
        }
    }
    
    _isColliding(collisionManager, side) {
        const points = this._getCollisionPoints(side);
        for (const p of points) {
            if (collisionManager.getBlock(p.x, p.y, p.z) !== 0) {
                return true;
            }
        }
        return false;
    }

    _checkGrounded(collisionManager) {
        const points = this._getCollisionPoints('feet', 0.1);
        for (const p of points) {
            if (collisionManager.getBlock(p.x, p.y, p.z) !== 0) {
                return true;
            }
        }
        return false;
    }

    _getCollisionPoints(side, offset = 0) {
        const { x, y, z } = this.mesh.position;
        const halfWidth = this.width / 2;
        const stepHeight = 0.5; // How high up the player's body to check for collisions
        const heights = [0.1, stepHeight, this.height - 0.1];

        switch(side) {
            case 'feet':
                return [ new THREE.Vector3(x - halfWidth, y - offset, z - halfWidth), new THREE.Vector3(x + halfWidth, y - offset, z - halfWidth), new THREE.Vector3(x - halfWidth, y - offset, z + halfWidth), new THREE.Vector3(x + halfWidth, y - offset, z + halfWidth) ];
            case 'head':
                return [ new THREE.Vector3(x - halfWidth, y + this.height + offset, z - halfWidth), new THREE.Vector3(x + halfWidth, y + this.height + offset, z - halfWidth), new THREE.Vector3(x - halfWidth, y + this.height + offset, z + halfWidth), new THREE.Vector3(x + halfWidth, y + this.height + offset, z + halfWidth) ];
            case 'left':
                return heights.map(h => new THREE.Vector3(x - halfWidth, y + h, z));
            case 'right':
                return heights.map(h => new THREE.Vector3(x + halfWidth, y + h, z));
            case 'front':
                return heights.map(h => new THREE.Vector3(x, y + h, z + halfWidth));
            case 'back':
                return heights.map(h => new THREE.Vector3(x, y + h, z - halfWidth));
            default:
                return [];
        }
    }
}