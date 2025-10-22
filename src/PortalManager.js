import * as THREE from 'three';

/**
 * Manages the VISUAL representation of dungeon portals in the world.
 * This class is a "dumb" renderer; it creates and destroys meshes and particle effects
 * based on authoritative state changes received from the Colyseus server.
 */
export class PortalManager {
    constructor(scene, room) {
        this.scene = scene;
        this.room = room; // The Colyseus room instance for sending messages

        // This maps the SERVER's unique portal ID to the client-side THREE.js objects.
        this.portals = new Map();
        this.particleSystems = [];
    }

    /**
     * Sets up listeners for the server's `portals` state changes.
     * This is the entry point for this manager.
     * @param {MapSchema} portalsSchema - The `portals` MapSchema from the server's state.
     */
    initializeListeners(portalsSchema) {
        // When a portal is ADDED to the server's state map...
        portalsSchema.onAdd((serverPortal, id) => {
            console.log(`Received 'onAdd' for portal: ${serverPortal.name} (${id}). Spawning visually.`);
            this.spawnPortal(serverPortal, id);
        });

        // When a portal is REMOVED from the server's state map...
        portalsSchema.onRemove((serverPortal, id) => {
            console.log(`Received 'onRemove' for portal: ${id}. Despawning visually.`);
            const localPortal = this.portals.get(id);
            if (localPortal) {
                this.removePortal(localPortal, id);
            }
        });
    }

    /**
     * Creates the visual representation of a portal based on data from the server.
     * @param {object} serverPortal - The portal data from the server schema.
     * @param {string} id - The unique ID of the portal from the server.
     */
    spawnPortal(serverPortal, id) {
        const position = new THREE.Vector3(serverPortal.x, serverPortal.y, serverPortal.z);
        const rank = { name: serverPortal.name, color: new THREE.Color(serverPortal.color) };

        // --- Interaction Box ---
        const interactionGeometry = new THREE.BoxGeometry(3, 4, 1);
        const interactionMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const interactionBox = new THREE.Mesh(interactionGeometry, interactionMaterial);
        // Position the interaction box to align with the portal frame/arch
        interactionBox.position.set(position.x + 2, position.y + 2, position.z);
        this.scene.add(interactionBox);

        // --- Particle System ---
        const particleSystem = this._createParticleSystem(position, rank);
        this.scene.add(particleSystem);
        this.particleSystems.push(particleSystem);

        // --- Local Portal Object ---
        // This holds references to all the client-side Three.js objects for this portal.
        const localPortal = {
            id: id,
            mesh: interactionBox,
            particleSystem: particleSystem,
            rank: rank,
        };
        
        // Add data to the interaction box so the InteractionManager can identify it.
        interactionBox.userData = {
            type: 'portal',
            portal: localPortal, // A reference back to the local portal object
            interactionText: `Press [E] to Enter ${rank.name}-Rank Dungeon`
        };

        this.portals.set(id, localPortal);
    }

    /**
     * Sends a request to the server to enter a portal.
     * This method no longer contains any direct gameplay logic.
     * @param {string} portalId - The unique ID of the portal the player is trying to enter.
     */
    requestEnter(portalId) {
        if (this.portals.has(portalId)) {
            console.log(`Client: Sending 'enter_portal' request for ${portalId}`);
            this.room.send("enter_portal", { portalId: portalId });
        }
    }

    /**
     * Removes a portal's visual representation from the world.
     * This is called in response to an `onRemove` event from the server.
     * @param {object} localPortal - The client-side object containing the portal's meshes.
     * @param {string} id - The server ID of the portal being removed.
     */
    removePortal(localPortal, id) {
        this.scene.remove(localPortal.mesh);
        this.scene.remove(localPortal.particleSystem);

        // Dispose of Three.js resources to prevent memory leaks.
        localPortal.mesh.geometry.dispose();
        localPortal.particleSystem.geometry.dispose();
        localPortal.particleSystem.material.dispose();
        
        // Remove the particle system from the animation list.
        const particleIndex = this.particleSystems.indexOf(localPortal.particleSystem);
        if (particleIndex > -1) this.particleSystems.splice(particleIndex, 1);

        this.portals.delete(id);
    }
    
    /**
     * The update loop for the particle animations, which are purely visual and client-side.
     * @param {number} deltaTime - The time elapsed since the last frame.
     */
    update(deltaTime) {
        for (const system of this.particleSystems) {
            if (!system.visible) continue;

            const positions = system.geometry.attributes.position.array;
            const velocities = system.userData.velocities;
            const center = system.userData.center;
            const size = system.userData.size;

            for (let i = 0; i < positions.length / 3; i++) {
                const i3 = i * 3;
                
                positions[i3] += velocities[i3] * deltaTime;
                positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
                positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

                // Reset particle to the bottom if it flies off the top.
                if (positions[i3 + 1] > center.y + size.height / 2) {
                    positions[i3] = center.x + (Math.random() - 0.5) * size.width;
                    positions[i3 + 1] = center.y - size.height / 2;
                    positions[i3 + 2] = center.z;
                }
            }
            system.geometry.attributes.position.needsUpdate = true;
        }
    }

    /**
     * Helper function to create the purely visual particle system for a portal.
     * This is a client-side effect and does not need to change.
     * @param {THREE.Vector3} position The base position of the portal arch.
     * @param {object} rank The rank object containing the portal's name and color.
     * @returns {THREE.Points} The created particle system.
     */
    _createParticleSystem(position, rank) {
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        const portalCenter = new THREE.Vector3(position.x + 2, position.y + 2, position.z);
        const portalSize = { width: 3, height: 4 };

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = portalCenter.x + (Math.random() - 0.5) * portalSize.width;
            positions[i3 + 1] = portalCenter.y + (Math.random() - 0.5) * portalSize.height;
            positions[i3 + 2] = portalCenter.z;
            
            rank.color.toArray(colors, i3);

            velocities[i3] = (Math.random() - 0.5) * 0.2; // X swirl
            velocities[i3 + 1] = Math.random() * 1.5 + 0.5; // Y upward drift
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.2; // Z swirl
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
        });

        const particleSystem = new THREE.Points(geometry, material);
        particleSystem.userData.velocities = velocities;
        particleSystem.userData.center = portalCenter;
        particleSystem.userData.size = portalSize;

        return particleSystem;
    }

    /** Hides all portals. Used when entering a dungeon. */
    hideAll() {
        this.portals.forEach(portal => {
            portal.mesh.visible = false; // Hide the interaction box
            portal.particleSystem.visible = false;
        });
    }

    /** Shows all portals. Used when returning to the overworld. */
    showAll() {
        this.portals.forEach(portal => {
            portal.mesh.visible = false; // Keep the interaction box invisible
            portal.particleSystem.visible = true;
        });
    }
}