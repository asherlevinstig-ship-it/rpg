// Enemy.js (Client-Side for Colyseus)

import * as THREE from 'three';
import { ENEMY_MODELS } from './EnemyModels.js'; // Use the new client-only models file

/**
 * Represents the VISUALS of an Enemy in the game world.
 * This class is a "dumb puppet" that creates a mesh and smoothly interpolates
 * its position and health bar to match the authoritative state sent by the server.
 */
export class Enemy {
    constructor(scene, initialServerState, floatingLabelsContainer, id) {
        this.scene = scene;
        this.floatingLabelsContainer = floatingLabelsContainer;
        this.id = id;

        // --- Model Creation ---
        // Look up the correct model-building function from the new EnemyModels.js file
        const modelBuilder = ENEMY_MODELS[initialServerState.type];
        if (!modelBuilder) {
            console.error(`No model found for enemy type: ${initialServerState.type}`);
            this.mesh = new THREE.Group(); // Create empty group to avoid crashes
        } else {
            this.mesh = modelBuilder();
        }

        const classMultipliers = {
            minion: { scale: 1.0, color: '#f0f0f0' },
            elite: { scale: 1.2, color: '#ff6666' }
        };
        const m = classMultipliers[initialServerState.classType] || classMultipliers.minion;

        this.mesh.scale.setScalar(m.scale);
        if (initialServerState.classType === 'elite') {
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.color.set(m.color);
                }
            });
        }
        
        this.mesh.position.set(initialServerState.x, initialServerState.y, initialServerState.z);
        this.scene.add(this.mesh);

        // --- HTML Label Creation ---
        this.createLabel(initialServerState.name, initialServerState.classType);
        this.updateHealthBar(initialServerState.health, initialServerState.maxHealth);
    }

    createLabel(name, classType) {
        this.labelElement = document.createElement('div');
        this.labelElement.classList.add('enemy-label');
        
        const nameSpan = document.createElement('span');
        nameSpan.classList.add('name');
        nameSpan.textContent = name;
        this.labelElement.appendChild(nameSpan);

        if (classType === 'elite') {
            const rankSpan = document.createElement('span');
            rankSpan.classList.add('rank', 'elite');
            rankSpan.textContent = `[Elite]`;
            this.labelElement.appendChild(rankSpan);
        }

        const healthBarDiv = document.createElement('div');
        healthBarDiv.classList.add('health-bar');
        this.healthBarInner = document.createElement('div');
        this.healthBarInner.classList.add('health-bar-inner');
        healthBarDiv.appendChild(this.healthBarInner);
        this.labelElement.appendChild(healthBarDiv);

        this.floatingLabelsContainer.appendChild(this.labelElement);
    }

    updateHealthBar(currentHealth, maxHealth) {
        if (this.healthBarInner) {
            const healthPercentage = (maxHealth > 0) ? (currentHealth / maxHealth) * 100 : 0;
            this.healthBarInner.style.width = `${Math.max(0, healthPercentage)}%`;
        }
    }
    
    update(serverEnemy, camera) {
        // --- Interpolate Position ---
        const targetPosition = new THREE.Vector3(serverEnemy.x, serverEnemy.y, serverEnemy.z);
        this.mesh.position.lerp(targetPosition, 0.2);

        // --- Update Health Bar ---
        this.updateHealthBar(serverEnemy.health, serverEnemy.maxHealth);

        // --- Update Label Position ---
        if (this.labelElement) {
            const position3D = this.mesh.position.clone().add(new THREE.Vector3(0, this.typeData?.height || 2.0, 0));
            const screenPosition = position3D.project(camera);
            const isBehind = screenPosition.z > 1;

            if (isBehind) {
                this.labelElement.style.display = 'none';
            } else {
                const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
                const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;
                this.labelElement.style.display = 'flex';
                this.labelElement.style.left = `${x}px`;
                this.labelElement.style.top = `${y}px`;
            }
        }
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.isMaterial) child.material.dispose();
                }
            });
        }
        if (this.labelElement && this.labelElement.parentNode) {
            this.labelElement.parentNode.removeChild(this.labelElement);
        }
    }

    hide() {
        if (this.mesh) this.mesh.visible = false;
        if (this.labelElement) this.labelElement.style.display = 'none';
    }

    show() {
        if (this.mesh) this.mesh.visible = true;
        if (this.labelElement) this.labelElement.style.display = 'flex';
    }
}