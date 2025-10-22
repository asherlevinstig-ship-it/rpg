// VFXManager.js (Client-Side for Colyseus)

import * as THREE from 'three';

/**
 * Manages all client-side visual effects (VFX).
 * This includes "fire-and-forget" effects triggered by the server and rendering
 * the visual representation of server-controlled projectiles. This class contains
 * NO authoritative game logic.
 */
export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.effects = []; // For temporary, fire-and-forget effects

        // This now maps the SERVER's unique projectile ID to the client's visual mesh.
        this.projectiles = new Map();
    }
    
    /**
     * Sets up listeners for server-driven VFX and projectiles. This should be
     * called once the client has successfully joined a room.
     * @param {Colyseus.Room} room The connected game room.
     * @param {MapSchema} projectilesSchema The synchronized map of projectiles from the server state.
     */
    initializeListeners(room, projectilesSchema) {
        // Listen for generic "play this effect here" messages from the server.
        room.onMessage("play_vfx", (message) => {
            const position = new THREE.Vector3(message.position.x, message.position.y, message.position.z);
            // Check if a method with the given name exists on this manager and call it.
            if (typeof this[message.type] === 'function') {
                this[message.type](position);
            }
        });

        // Listen for changes to the authoritative projectile state.
        projectilesSchema.onAdd((projectile, id) => {
            this.spawnProjectile(projectile, id);
        });

        projectilesSchema.onRemove((projectile, id) => {
            this.removeProjectile(id);
        });
    }

    /**
     * Spawns the VISUAL representation of a server-controlled projectile.
     * This contains no game logic.
     */
    spawnProjectile(serverProjectile, id) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x964B00 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(serverProjectile.x, serverProjectile.y, serverProjectile.z);
        
        this.scene.add(mesh);
        // Store a reference to the mesh and its corresponding server state for interpolation.
        this.projectiles.set(id, { mesh, serverState: serverProjectile });
    }

    /**
     * Removes the visual representation of a server-controlled projectile.
     */
    removeProjectile(id) {
        const proj = this.projectiles.get(id);
        if (proj) {
            this.scene.remove(proj.mesh);
            proj.mesh.geometry.dispose();
            proj.mesh.material.dispose();
            this.projectiles.delete(id);
        }
    }

    // --- "Fire-and-Forget" Effect Methods ---
    // All of these methods are purely visual and are triggered by server messages.
    // The code within them is unchanged.

    createMeditationSuccessEffect(targetMesh) {
        const pulseGeometry = new THREE.SphereGeometry(0.1, 32, 16);
        const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulse.position.copy(targetMesh.position).y += 1.0;
        this.scene.add(pulse);
        this.effects.push({ mesh: pulse, type: 'meditation-pulse', startTime: performance.now(), duration: 3000 });

        const particleCount = 20;
        const positions = new Float32Array(particleCount * 3);
        const particleGeometry = new THREE.BufferGeometry();
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1.0;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({ color: 0xffe066, size: 0.08, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.copy(targetMesh.position).y += 1.0;
        this.scene.add(particles);
        this.effects.push({ mesh: particles, type: 'meditation-particles', startTime: performance.now(), duration: 3000 });
    }

    createImpactStompEffect(position) {
        const pulseGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32, 1, true);
        const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
        const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulse.position.copy(position);
        this.scene.add(pulse);
        this.effects.push({ mesh: pulse, type: 'stomp-pulse', startTime: performance.now(), duration: 300 });

        const ringGeometry = new THREE.TorusGeometry(1, 0.2, 8, 48);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.effects.push({ mesh: ring, type: 'impact-shockwave', startTime: performance.now(), duration: 500 });
    }

    createFortifyAura(targetMesh, duration) {
        const auraGeometry = new THREE.SphereGeometry(1.2, 32, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.2, side: THREE.BackSide });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        targetMesh.add(aura);
        this.effects.push({ mesh: aura, target: targetMesh, type: 'persistent-aura', startTime: performance.now(), duration: duration * 1000 });
    }

    createPowerStrikeEffect(position) {
        this.createImpactStompEffect(position);
    }

    createShadowMawEffect(position) {
        const geometry = new THREE.SphereGeometry(1, 16, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x4b0082, transparent: true, opacity: 0.8 });
        const maw = new THREE.Mesh(geometry, material);
        maw.position.copy(position);
        this.scene.add(maw);
        this.effects.push({ mesh: maw, type: 'shadow-maw', startTime: performance.now(), duration: 400, range: 3.5 });
    }

    createScarletSurgeEffect(position) {
        const geometry = new THREE.TorusGeometry(1, 0.2, 8, 48);
        const material = new THREE.MeshBasicMaterial({ color: 0xcc0000, transparent: true });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.effects.push({ mesh: ring, type: 'scarlet-surge', startTime: performance.now(), duration: 600, range: 4.0 });
    }

    createMagmaBloomEffect(position) {
        const groundGeo = new THREE.CylinderGeometry(4, 4, 0.1, 32);
        const groundMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.5 });
        const bloom = new THREE.Mesh(groundGeo, groundMat);
        bloom.position.copy(position);
        this.scene.add(bloom);
        this.effects.push({ mesh: bloom, type: 'magma-bloom-ground', startTime: performance.now(), duration: 5000 });
    }

    createObsidianSpireEffect(position, range = 5) {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = Math.random() * range;
            const spikePos = position.clone().add(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
            const geometry = new THREE.ConeGeometry(0.3, 1.5 + Math.random(), 4);
            const material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
            const spike = new THREE.Mesh(geometry, material);
            spike.position.copy(spikePos);
            spike.position.y -= 0.75;
            this.scene.add(spike);
            this.effects.push({ mesh: spike, type: 'obsidian-spire', startTime: performance.now(), duration: 800 });
        }
    }

    createMeleeSlash(position) {
        const geometry = new THREE.RingGeometry(0.2, 0.5, 32, 1, 0, Math.PI);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, depthTest: false });
        const slash = new THREE.Mesh(geometry, material);
        slash.position.copy(position);
        slash.position.y += 1.0;
        slash.lookAt(this.scene.position);
        this.scene.add(slash);
        this.effects.push({ mesh: slash, type: 'melee-slash', startTime: performance.now(), duration: 200 });
    }

    // Utility for creating a visual sword mesh. No gameplay logic.
    createSwordMesh() {
        const swordGroup = new THREE.Group();
        const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.4 });
        const hiltMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const bladeGeo = new THREE.BoxGeometry(0.15, 1.2, 0.05);
        const blade = new THREE.Mesh(bladeGeo, bladeMaterial);
        blade.position.y = 0.6;
        const hiltGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
        const hilt = new THREE.Mesh(hiltGeo, hiltMaterial);
        hilt.position.y = -0.15;
        const crossguardGeo = new THREE.BoxGeometry(0.3, 0.05, 0.05);
        const crossguard = new THREE.Mesh(crossguardGeo, bladeMaterial);
        swordGroup.add(blade, hilt, crossguard);
        swordGroup.rotation.x = -Math.PI / 2;
        swordGroup.rotation.y = Math.PI;
        return swordGroup;
    }

    // --- MAIN UPDATE LOOP ---
    update(deltaTime) {
        const now = performance.now();

        // Handle temporary "fire-and-forget" effects.
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            const elapsedTime = now - effect.startTime;
            const progress = Math.min(elapsedTime / effect.duration, 1.0);

            if (progress >= 1) {
                if (effect.target) effect.target.remove(effect.mesh);
                else if (effect.mesh) this.scene.remove(effect.mesh);
                
                if (effect.mesh) {
                    effect.mesh.geometry.dispose();
                    effect.mesh.material.dispose();
                }
                this.effects.splice(i, 1);
            } else {
                // Animate the effect based on its type
                switch(effect.type) {
                    case 'stomp-pulse':
                        effect.mesh.scale.y = 1 + progress * 10;
                        effect.mesh.material.opacity = 0.9 * (1 - progress);
                        break;
                    case 'impact-shockwave': {
                        const scale = 1 + progress * 4;
                        effect.mesh.scale.set(scale, scale, scale);
                        effect.mesh.material.opacity = 0.8 * (1 - progress);
                        break;
                    }
                    case 'persistent-aura': {
                        const pulse = 1 + Math.sin(elapsedTime / 150) * 0.05;
                        effect.mesh.scale.set(pulse, pulse, pulse);
                        if (progress < 0.1) effect.mesh.material.opacity = progress / 0.1 * 0.2;
                        else if (progress > 0.8) effect.mesh.material.opacity = (1 - progress) / 0.2 * 0.2;
                        else effect.mesh.material.opacity = 0.2;
                        break;
                    }
                    case 'melee-slash': {
                        const scale = 1 + progress * 2;
                        effect.mesh.scale.set(scale, scale, scale);
                        effect.mesh.material.opacity = 1.0 - progress;
                        break;
                    }
                    case 'shadow-maw': {
                        const scale = progress * effect.range;
                        effect.mesh.scale.set(scale, scale, scale);
                        effect.mesh.material.opacity = 1.0 - progress;
                        break;
                    }
                    case 'scarlet-surge': {
                        const scale = 1 + progress * effect.range;
                        effect.mesh.scale.set(scale, scale, scale);
                        effect.mesh.material.opacity = 1.0 - progress;
                        break;
                    }
                    case 'magma-bloom-ground': {
                        const pulse = 0.4 + Math.sin(elapsedTime * 0.01) * 0.1;
                        effect.mesh.material.opacity = (1.0 - progress) * pulse;
                        break;
                    }
                    case 'obsidian-spire': {
                        if (progress < 0.5) effect.mesh.position.y = -0.75 + (progress / 0.5) * 1.5;
                        else effect.mesh.material.opacity = 1.0 - ((progress - 0.5) / 0.5);
                        break;
                    }
                    case 'meditation-pulse': {
                        const scale = 15 * (1 - Math.pow(1 - (elapsedTime / effect.duration), 3));
                        effect.mesh.scale.setScalar(scale);
                        const life = elapsedTime / effect.duration;
                        if (life < 0.2) effect.mesh.material.opacity = life / 0.2 * 0.6;
                        else if (life > 0.6) effect.mesh.material.opacity = (1.0 - life) / 0.4 * 0.6;
                        break;
                    }
                    case 'meditation-particles': {
                        effect.mesh.position.y += 0.5 * deltaTime;
                        effect.mesh.material.opacity = 1.0 - progress;
                        effect.mesh.rotation.y += 0.2 * deltaTime;
                        break;
                    }
                }
            }
        }

        // MODIFIED: Update loop for projectiles now only handles visual interpolation.
        this.projectiles.forEach((proj, id) => {
            const serverState = proj.serverState;
            const targetPosition = new THREE.Vector3(serverState.x, serverState.y, serverState.z);
            proj.mesh.position.lerp(targetPosition, 0.5);

            // A full implementation would sync rotation (quaternion) as well for non-symmetrical projectiles.
        });
    }
}