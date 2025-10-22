// EnemyManager.js (Client-Side for Colyseus)

import * as THREE from 'three';
import { Enemy } from './Enemy.js';

/**
 * Manages the VISUAL representation of Enemies in the world.
 * This class is a "dumb" renderer that creates, destroys, and moves enemy meshes
 * based on authoritative state changes from the Colyseus server.
 */
export class EnemyManager {
    constructor(scene, floatingLabelsContainer, worldManager) {
        this.scene = scene;
        this.floatingLabelsContainer = floatingLabelsContainer;
        this.worldManager = worldManager; // Still needed to place enemies on the ground

        // Maps the SERVER's unique enemy ID to the client-side Enemy instance
        this.enemies = new Map();
    }

    /**
     * Sets up listeners for the server's `enemies` state changes.
     * @param {MapSchema} enemiesSchema - The `enemies` MapSchema from the server's state.
     */
    initializeListeners(enemiesSchema) {
        // When an enemy is ADDED to the server's state...
        enemiesSchema.onAdd((serverEnemy, id) => {
            console.log(`Received 'onAdd' for enemy: ${serverEnemy.name} (${id}). Spawning visually.`);
            this.spawnEnemy(serverEnemy, id);
        });

        // When an enemy is REMOVED from the server's state...
        enemiesSchema.onRemove((serverEnemy, id) => {
            console.log(`Received 'onRemove' for enemy: ${id}. Despawning visually.`);
            const localEnemy = this.enemies.get(id);
            if (localEnemy) {
                this.removeEnemy(localEnemy, id);
            }
        });
    }

    /**
     * Creates the visual representation of an enemy based on data from the server.
     * @param {object} serverEnemy - The enemy data from the server schema.
     * @param {string} id - The unique ID of the enemy from the server.
     */
    spawnEnemy(serverEnemy, id) {
        const position = new THREE.Vector3(serverEnemy.x, serverEnemy.y, serverEnemy.z);
        
        // Find ground height to place the enemy correctly on the client's generated terrain
        position.y = this.worldManager.findGroundHeight(position.x, position.z);

        const localEnemy = new Enemy(
            this.scene,
            serverEnemy, // Pass the whole initial state
            this.floatingLabelsContainer,
            id
        );

        this.enemies.set(id, localEnemy);
    }

    /**
     * Removes an enemy's visual representation from the world.
     * @param {Enemy} localEnemy - The client-side Enemy instance to remove.
     * @param {string} id - The server ID of the enemy.
     */
    removeEnemy(localEnemy, id) {
        localEnemy.destroy(); // A method on the Enemy class to remove its mesh and label
        this.enemies.delete(id);
    }
    
    /**
     * Main update loop for interpolating enemy movement and updating their UI.
     * @param {MapSchema} enemiesSchema - The current enemy state from the server.
     * @param {THREE.Camera} camera - The main scene camera for positioning labels.
     */
    update(enemiesSchema, camera) {
        // This loop ensures enemies move smoothly towards their server-authoritative positions.
        enemiesSchema.forEach((serverEnemy, id) => {
            const localEnemy = this.enemies.get(id);
            if (localEnemy) {
                // Pass the authoritative server data to the local enemy's update loop for interpolation
                localEnemy.update(serverEnemy, camera);
            }
        });
    }

    hideAll() {
        this.enemies.forEach(enemy => enemy.hide());
    }

    showAll() {
        this.enemies.forEach(enemy => enemy.show());
    }

    clearAll() {
        this.enemies.forEach((enemy, id) => {
            this.removeEnemy(enemy, id);
        });
    }
}