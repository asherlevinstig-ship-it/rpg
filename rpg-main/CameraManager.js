// CameraManager.js
import * as THREE from 'three';

export class CameraManager {
    constructor(camera, collidableObjects) {
        this.camera = camera;
        this.collidableObjects = collidableObjects;

        this.angle = {
            horizontal: Math.PI, // Start looking forward
            vertical: Math.PI / 6  // A bit of a downward angle
        };

        this.distance = 15.0;
        this.minDistance = 3.0;
        this.maxDistance = 30.0;

        // --- PRE-ALLOCATED OBJECTS FOR PERFORMANCE ---
        this.v3_target = new THREE.Vector3();
        this.v3_idealOffset = new THREE.Vector3();
        this.v3_idealPosition = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
    }

    // --- Public Methods ---

    /**
     * Handles mouse movement to rotate the camera.
     * @param {number} movementX - The change in horizontal mouse position.
     * @param {number} movementY - The change in vertical mouse position.
     */
    handleMouseMove(movementX, movementY) {
        this.angle.horizontal -= movementX * 0.005;
        this.angle.vertical -= movementY * 0.005;
        // Clamp vertical angle to prevent camera flipping
        this.angle.vertical = Math.max(0.1, Math.min(Math.PI / 2, this.angle.vertical));
    }

    /**
     * Handles keyboard arrows to rotate the camera.
     * @param {object} keys - The current state of pressed keys.
     */
    handleKeyRotation(keys) {
        const rotationSpeed = 0.03;
        if (keys['arrowleft']) this.angle.horizontal += rotationSpeed;
        if (keys['arrowright']) this.angle.horizontal -= rotationSpeed;
        if (keys['arrowup']) this.angle.vertical += rotationSpeed;
        if (keys['arrowdown']) this.angle.vertical -= rotationSpeed;
        // Clamp vertical angle
        this.angle.vertical = Math.max(0.1, Math.min(Math.PI / 2, this.angle.vertical));
    }

    /**
     * Handles the scroll wheel to zoom the camera.
     * @param {number} deltaY - The amount scrolled.
     */
    handleMouseWheel(deltaY) {
        this.distance += deltaY * 0.01;
        // Clamp zoom distance
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
    }

    /**
     * Updates the camera's position and rotation to follow the player.
     * @param {THREE.Object3D} playerMesh - The player's 3D object to follow.
     * @param {number} deltaTime - The time elapsed since the last frame (for lerp).
     */
    update(playerMesh, deltaTime = 0.15) {
        // 1. Calculate the ideal camera position without collisions
        this.v3_idealOffset.set(
            Math.sin(this.angle.horizontal) * Math.cos(this.angle.vertical),
            Math.sin(this.angle.vertical),
            Math.cos(this.angle.horizontal) * Math.cos(this.angle.vertical)
        ).normalize();
        
        // The point the camera looks at (player's torso area)
        this.v3_target.copy(playerMesh.position).add({ x: 0, y: 1.5, z: 0 });

        this.v3_idealPosition.copy(this.v3_target).add(this.v3_idealOffset.clone().multiplyScalar(this.distance));

        // 2. Check for collisions from the ideal position back to the player
        const rayDirection = this.v3_target.clone().sub(this.v3_idealPosition).normalize();
        this.raycaster.set(this.v3_idealPosition, rayDirection);
        this.raycaster.far = this.distance;

        const intersects = this.raycaster.intersectObjects(this.collidableObjects);
        
        let actualDistance = this.distance;
        if (intersects.length > 0) {
            // If we hit something, shorten the camera distance to just before the collision point
            actualDistance = intersects[0].distance - 0.5; // -0.5 buffer to prevent clipping
        }
        
        // 3. Calculate the final, corrected camera position
        const finalPosition = this.v3_target.clone().add(this.v3_idealOffset.multiplyScalar(actualDistance));
        
        // 4. Smoothly move the camera to its new position
        this.camera.position.lerp(finalPosition, deltaTime);
        this.camera.lookAt(this.v3_target);
    }
}