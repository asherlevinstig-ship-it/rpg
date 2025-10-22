import * as THREE from 'three';

const CHUNK_SIZE = 32;

/**
 * Manages the VISUAL representation of essence collectibles in the world.
 * This class is a "dumb" renderer; it creates and destroys meshes based on
 * authoritative state changes received from the Colyseus server. It does not
 * contain any gameplay logic itself.
 */
export class EssenceCollectibleManager {
    constructor(scene, worldManager, uiManager, room) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.uiManager = uiManager;
        this.room = room; // The Colyseus room instance for sending messages

        // This maps the SERVER's unique collectible ID to the client-side THREE.js object group.
        this.collectibles = new Map();
        this.baseYPositions = new Map(); // Stores original Y-position for the bobbing animation.
    }

    /**
     * Sets up listeners for the server's `collectibles` state changes.
     * This is the entry point for this manager and replaces the old `spawnInitialEssences` method.
     * @param {MapSchema} collectiblesSchema - The `collectibles` MapSchema from the server's state.
     */
    initializeListeners(collectiblesSchema) {
        // When a collectible is ADDED to the server's state map...
        collectiblesSchema.onAdd((serverCollectible, id) => {
            console.log(`Received 'onAdd' for collectible: ${serverCollectible.name} (${id}). Spawning visually.`);
            this.spawnCollectible(serverCollectible, id);
        });

        // When a collectible is REMOVED from the server's state map...
        collectiblesSchema.onRemove((serverCollectible, id) => {
            console.log(`Received 'onRemove' for collectible: ${id}. Despawning visually.`);
            const localCollectible = this.collectibles.get(id);
            if (localCollectible) {
                this.removeCollectible(localCollectible, id);
            }
        });
    }

    /**
     * Creates the visual representation of a collectible based on data from the server.
     * @param {object} serverCollectible - The collectible data from the server schema.
     * @param {string} id - The unique ID of the collectible from the server.
     */
    spawnCollectible(serverCollectible, id) {
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const color = new THREE.Color(serverCollectible.color);
        const position = new THREE.Vector3(serverCollectible.x, serverCollectible.y, serverCollectible.z);

        const chunkX = Math.floor(position.x / CHUNK_SIZE);
        const chunkZ = Math.floor(position.z / CHUNK_SIZE);
        
        // Ensure the local terrain chunk is loaded before placing the object to get the correct ground height.
        this.worldManager.loadChunkAndCallback(chunkX, chunkZ, () => {
            const groundY = this.worldManager.findGroundHeight(position.x, position.z);
            const spawnPosition = new THREE.Vector3(position.x, groundY + 0.7, position.z);

            const material = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.7
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(spawnPosition);

            // Add userData to the mesh so the InteractionManager can identify it.
            mesh.userData = {
                type: 'essence_collectible',
                id: id, // Store the server's unique ID for interaction requests.
                interactionText: `[E] Collect ${serverCollectible.name}`
            };

            const light = new THREE.PointLight(color, 2, 5);
            mesh.add(light);

            const beam = this._createLocationBeam(new THREE.Vector3(spawnPosition.x, groundY, spawnPosition.z), color);
            this.scene.add(mesh, beam);

            const localCollectible = { mesh, light, beam, name: serverCollectible.name };
            
            this.collectibles.set(id, localCollectible);
            this.baseYPositions.set(mesh.uuid, mesh.position.y);
        });
    }
    
    /**
     * Sends a request to the server to collect an essence.
     * This method NO LONGER modifies the player's state directly.
     * @param {string} collectibleId - The unique ID of the collectible the player is trying to collect.
     * @param {PlayerState} playerState - The local player's state (used for the client-side tutorial check).
     */
    collect(collectibleId, playerState) {
        if (this.collectibles.has(collectibleId)) {
            // Send a message to the server, requesting to collect this specific item.
            this.room.send("collect_essence", { id: collectibleId });
            console.log(`Sent request to server to collect essence: ${collectibleId}`);

            // The tutorial popup is a purely client-side effect, so it's safe to trigger here.
            if (!playerState.hasSeenEssenceTutorial) {
                this.uiManager.showTutorialPopup();
                // The authoritative `hasSeenEssenceTutorial` flag will be set on the server
                // and synchronized back down to the client's PlayerState.
            }
        }
    }
    
    /**
     * Removes an essence's visual representation from the world.
     * This is called in response to an `onRemove` event from the server.
     * @param {object} localCollectible - The client-side object containing the meshes and light.
     * @param {string} id - The server ID of the collectible.
     */
    removeCollectible(localCollectible, id) {
        this.scene.remove(localCollectible.mesh);
        localCollectible.mesh.geometry.dispose();
        localCollectible.mesh.material.dispose();

        this.scene.remove(localCollectible.beam);
        localCollectible.beam.geometry.dispose();
        localCollectible.beam.material.dispose();
        
        this.collectibles.delete(id);
        console.log(`Visually removed ${localCollectible.name}.`);
    }

    /**
     * Update loop for client-side-only animations, like the item's bobbing effect.
     * @param {number} time - The total elapsed time from the main game loop.
     */
    update(time) {
        for (const collectible of this.collectibles.values()) {
            const baseY = this.baseYPositions.get(collectible.mesh.uuid);
            if (baseY) {
                // Animate the bobbing and rotation effect.
                collectible.mesh.position.y = baseY + Math.sin(time * 2) * 0.15;
                collectible.mesh.rotation.y += 0.01;
            }
        }
    }

    /**
     * Helper function to create the purely visual beam of light for a collectible.
     * This is a client-side effect and does not need to change.
     * @param {THREE.Vector3} position - The ground position for the beam.
     * @param {string|number} color - The hex color of the beam.
     * @returns {THREE.Mesh} The created beam mesh.
     */
    _createLocationBeam(position, color) {
        const beamHeight = 50;
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, beamHeight, 16);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const beam = new THREE.Mesh(geometry, material);
        beam.position.copy(position);
        beam.position.y += beamHeight / 2;
        return beam;
    }
}