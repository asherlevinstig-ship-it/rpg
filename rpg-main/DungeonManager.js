// DungeonManager.js (Client-Side for Colyseus)

import * as THREE from 'three';
import { DUNGEON_THEMES } from './DungeonData.js';

const MAX_DUNGEON_LIGHTS = 20;

/**
 * Manages the VISUAL representation and client-side state for dungeons.
 * This class is a "dumb" renderer that builds a dungeon's visuals based on
 * authoritative data from the server and handles the cleanup.
 */
export class DungeonManager {
    constructor(scene, player, worldManager, enemyManager, portalManager, npcManager, room) {
        this.scene = scene;
        this.player = player;
        this.worldManager = worldManager;
        this.enemyManager = enemyManager;
        this.portalManager = portalManager;
        this.npcManager = npcManager;
        this.room = room; // The Colyseus room

        this.dungeonWorker = new Worker('./DungeonWorker.js', { type: 'module' });
        this.activeMeshes = [];
        this.dungeonLights = [];
        this.fireflySystem = null;
        this.dungeonBlocks = null;
        this.inDungeon = false;

        this.emissiveMaterial = new THREE.MeshBasicMaterial({ map: worldManager.texture });
        this._setupWorkerListener();
    }

    /**
     * NEW: Sets up listeners for server commands related to dungeons.
     */
    initializeListeners() {
        this.room.onMessage("load_dungeon", (message) => {
            console.log("Client: Received 'load_dungeon' command from server.");
            this.buildDungeon(message.dungeonData, message.spawnPoint, message.theme);
        });

        this.room.onMessage("unload_dungeon", () => {
            console.log("Client: Received 'unload_dungeon' command from server.");
            this.exitDungeon();
        });
    }

    isInDungeon() {
        return this.inDungeon;
    }

    /**
     * MODIFIED: Builds the dungeon visuals from data sent by the server.
     * @param {object} dungeonData - The block and mesh data from the server.
     * @param {object} spawnPoint - The player's start position in the dungeon.
     * @param {object} theme - The visual theme of the dungeon.
     */
    buildDungeon(dungeonData, spawnPoint, theme) {
        if (this.inDungeon) return;
        this.inDungeon = true;

        // Hide overworld entities
        this.worldManager.hideWorld();
        this.enemyManager.hideAll(); // Hide overworld enemies, don't clear them
        this.portalManager.hideAll();
        this.npcManager.hideAll();

        this.activeTheme = theme;
        this.dungeonBlocks = new Uint8Array(dungeonData.blocks);

        // Build standard mesh
        const standardGeo = new THREE.BufferGeometry();
        standardGeo.setAttribute('position', new THREE.BufferAttribute(dungeonData.meshData.standard.positions, 3));
        standardGeo.setAttribute('normal', new THREE.BufferAttribute(dungeonData.meshData.standard.normals, 3));
        standardGeo.setAttribute('uv', new THREE.BufferAttribute(dungeonData.meshData.standard.uvs, 2));
        const standardMesh = new THREE.Mesh(standardGeo, this.worldManager.material);
        standardMesh.castShadow = true;
        standardMesh.receiveShadow = true;
        this.scene.add(standardMesh);
        this.activeMeshes.push(standardMesh);

        // Build emissive mesh (if it exists)
        if (dungeonData.meshData.emissive.positions.length > 0) {
            const emissiveGeo = new THREE.BufferGeometry();
            emissiveGeo.setAttribute('position', new THREE.BufferAttribute(dungeonData.meshData.emissive.positions, 3));
            emissiveGeo.setAttribute('uv', new THREE.BufferAttribute(dungeonData.meshData.emissive.uvs, 2));
            const emissiveMesh = new THREE.Mesh(emissiveGeo, this.emissiveMaterial);
            this.scene.add(emissiveMesh);
            this.activeMeshes.push(emissiveMesh);
        }

        // The player's position is set authoritatively by the server. The client's reconciliation
        // logic in `game.js` will handle moving the visual mesh smoothly.
        console.log("Client: Dungeon visuals built. Waiting for server to update player position.");
    }

    /**
     * Cleans up the dungeon and returns the player to the overworld visuals.
     * This is now called in response to a server message.
     */
    exitDungeon() {
        if (!this.inDungeon) return;
        console.log("Client: Exiting dungeon visuals...");

        this.activeMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        });
        
        // Cleanup other dungeon visuals
        this.dungeonLights.forEach(light => this.scene.remove(light));
        if (this.fireflySystem) this.scene.remove(this.fireflySystem);

        this.activeMeshes = [];
        this.dungeonLights = [];
        this.fireflySystem = null;
        this.dungeonBlocks = null;
        this.activeTheme = null;
        this.inDungeon = false;

        // Show the overworld again
        this.worldManager.showWorld();
        this.enemyManager.showAll();
        this.portalManager.showAll();
        this.npcManager.showAll();
    }

    /**
     * This is no longer used, as the worker is only used for building visuals from server data.
     * The generation logic is now on the server.
     */
    _setupWorkerListener() {
        // This can be kept if you want to use a worker for building the BufferGeometry
        // on the client, which is still a good idea for performance.
        // For this example, we will do it on the main thread for simplicity.
    }
    
    // The getBlock method is still necessary for client-side collision PREDICTION.
    getBlock(worldX, worldY, worldZ) {
        const DUNGEON_WIDTH = 128;
        const DUNGEON_HEIGHT = 32;
        const DUNGEON_DEPTH = 128;
        const x = Math.floor(worldX);
        const y = Math.floor(worldY);
        const z = Math.floor(worldZ);

        if (!this.dungeonBlocks || x < 0 || x >= DUNGEON_WIDTH || y < 0 || y >= DUNGEON_HEIGHT || z < 0 || z >= DUNGEON_DEPTH) {
            return 0; // Treat out of bounds as air
        }
        const index = y * DUNGEON_DEPTH * DUNGEON_WIDTH + z * DUNGEON_WIDTH + x;
        return this.dungeonBlocks[index];
    }
    
    // Visual helper methods remain unchanged.
    _createDungeonLights(lightSourcePositions, theme) { /* ... (code is unchanged) ... */ }
    _createFireflySystem(positions) { /* ... (code is unchanged) ... */ }
}