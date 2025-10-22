// NPCManager.js
import * as THREE from 'three';

export class NPCManager {
    constructor(scene, worldManager) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.npcs = new Map();
    }

    spawnInitialNPCs() {
        // NPCs will be synced from the server via Colyseus
        console.log('NPCManager: Ready to spawn NPCs from server state');
    }

    addNPC(id, data) {
        // Create NPC mesh
        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(data.x, data.y, data.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.scene.add(mesh);
        
        this.npcs.set(id, {
            id,
            mesh,
            data
        });
    }

    removeNPC(id) {
        const npc = this.npcs.get(id);
        if (npc) {
            this.scene.remove(npc.mesh);
            this.npcs.delete(id);
        }
    }

    updateNPC(id, data) {
        const npc = this.npcs.get(id);
        if (npc) {
            npc.mesh.position.set(data.x, data.y, data.z);
            npc.data = data;
        }
    }

    hideAll() {
        this.npcs.forEach(npc => {
            npc.mesh.visible = false;
        });
    }

    showAll() {
        this.npcs.forEach(npc => {
            npc.mesh.visible = true;
        });
    }

    update(deltaTime) {
        // Update NPC animations, behaviors, etc.
    }
}