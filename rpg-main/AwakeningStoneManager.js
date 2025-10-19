// AwakeningStoneManager.js (Client-Side for Colyseus)

import * as THREE from 'three';

const CHUNK_SIZE = 32;

/**
 * Manages the VISUAL representation of Awakening Stone collectibles.
 * This class is a "dumb" renderer that reacts to authoritative state changes
 * from the Colyseus server. It does not contain any gameplay logic.
 */
export class AwakeningStoneManager {
    constructor(scene, worldManager, room) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.room = room; // The Colyseus room for sending messages

        // Maps the SERVER's unique ID to the client-side THREE.js object group
        this.awakeningStones = new Map();
        this.baseYPositions = new Map(); // For the bobbing animation
    }

    /**
     * NEW: Sets up listeners for the server's `awakeningStones` state changes.
     * @param {MapSchema} stonesSchema - The `awakeningStones` MapSchema from the server's state.
     */
    initializeListeners(stonesSchema) {
        // When a stone is ADDED to the server's state...
        stonesSchema.onAdd((serverStone, id) => {
            console.log(`Received 'onAdd' for stone: ${serverStone.name} (${id}). Spawning visually.`);
            this.spawnStone(serverStone, id);
        });

        // When a stone is REMOVED from the server's state...
        stonesSchema.onRemove((serverStone, id) => {
            console.log(`Received 'onRemove' for stone: ${id}. Despawning visually.`);
            const localStone = this.awakeningStones.get(id);
            if (localStone) {
                this.removeCollectible(localStone, id);
            }
        });
    }

    /**
     * Creates the visual representation of a stone based on data from the server.
     * @param {object} serverStone - The stone data from the server schema.
     * @param {string} id - The unique ID of the stone from the server.
     */
    spawnStone(serverStone, id) {
        const geometry = new THREE.OctahedronGeometry(0.3, 0); // Gem-like shape
        const color = new THREE.Color(serverStone.color);
        const position = new THREE.Vector3(serverStone.x, serverStone.y, serverStone.z);

        const chunkX = Math.floor(position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / CHUNK_SIZE);

        this.worldManager.loadChunkAndCallback(chunkX, chunkZ, () => {
            const groundY = this.worldManager.findGroundHeight(position.x, position.z);
            const spawnPosition = new THREE.Vector3(position.x, groundY + 0.6, position.z);

            const material = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(spawnPosition);
            
            mesh.userData = {
                type: 'awakening_stone',
                id: id, // Store the server's unique ID for interaction
                interactionText: `[E] Collect ${serverStone.name}`
            };
            
            const light = new THREE.PointLight(color, 2, 6);
            mesh.add(light);

            const beam = this._createLocationBeam(new THREE.Vector3(spawnPosition.x, groundY, spawnPosition.z));
            
            this.scene.add(mesh, beam);
            
            const collectible = { mesh, name: serverStone.name, light, beam };
            this.awakeningStones.set(id, collectible);
            this.baseYPositions.set(mesh.uuid, mesh.position.y);
        });
    }

    /**
     * MODIFIED: Sends a request to the server to collect the stone.
     * @param {string} stoneId - The ID of the stone to be collected.
     */
    collect(stoneId) {
        if (this.awakeningStones.has(stoneId)) {
            this.room.send("collect_stone", { id: stoneId });
            console.log(`Sent request to server to collect stone: ${stoneId}`);
        }
    }

    /**
     * Removes a stone from the world after it's been collected.
     * @param {object} collectibleToRemove - The client-side object to remove.
     * @param {string} id - The server ID of the collectible.
     */
    removeCollectible(collectibleToRemove, id) {
        this.scene.remove(collectibleToRemove.mesh);
        collectibleToRemove.mesh.geometry.dispose();
        collectibleToRemove.mesh.material.dispose();
        
        this.scene.remove(collectibleToRemove.beam);
        collectibleToRemove.beam.geometry.dispose();
        collectibleToRemove.beam.material.dispose();

        this.awakeningStones.delete(id);
        console.log(`Visually removed ${collectibleToRemove.name}.`);
    }

    /**
     * Update loop for purely visual animations.
     * @param {number} time - The total elapsed time from the game clock.
     */
    update(time) {
        for (const collectible of this.awakeningStones.values()) {
            const baseY = this.baseYPositions.get(collectible.mesh.uuid);
            if (baseY !== undefined) {
                collectible.mesh.position.y = baseY + Math.sin(time * 1.5) * 0.2;
                collectible.mesh.rotation.y += 0.015;
                collectible.mesh.rotation.x += 0.005;
            }
        }
    }

    _createLocationBeam(position) {
        const beamHeight = 40;
        const geometry = new THREE.CylinderGeometry(0.15, 0.15, beamHeight, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x9400D3, // Dark Violet
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const beam = new THREE.Mesh(geometry, material);
        beam.position.copy(position);
        beam.position.y += beamHeight / 2;
        return beam;
    }
}