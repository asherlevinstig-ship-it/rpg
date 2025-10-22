// InteractionManager.js (Client-Side for Colyseus)

import * as THREE from 'three';

const INTERACTION_RADIUS_SQ = 5.0 * 5.0; // Use squared distance for performance

/**
 * Manages player interaction with game objects. It finds nearby objects for UI feedback
 * and sends interaction requests to the server for authoritative validation.
 */
export class InteractionManager {
    constructor(
        camera,
        player,
        playerState,
        npcManager,
        outlinePass,
        interactionLabel,
        uiManager,
        portalManager,
        essenceCollectibleManager,
        awakeningStoneManager,
        room // ✨ NEW: Pass in the Colyseus room object
    ) {
        this.camera = camera;
        this.player = player;
        this.playerState = playerState;
        this.npcManager = npcManager;
        this.outlinePass = outlinePass;
        this.interactionLabel = interactionLabel;
        this.uiManager = uiManager;
        this.portalManager = portalManager;
        this.essenceCollectibleManager = essenceCollectibleManager;
        this.awakeningStoneManager = awakeningStoneManager;
        this.room = room; // The Colyseus room for sending messages

        this.closestInteractableMesh = null;
    }

    /**
     * Finds the closest interactable object for UI feedback (outlining, labels).
     * This is a purely visual, client-side operation.
     */
    update() {
        if (!this.player) return; // Don't run if the local player hasn't been created yet

        let newClosestInteractableMesh = null;
        let closestDistSq = INTERACTION_RADIUS_SQ;

        // Combine all interactable meshes from different managers into one array.
        // We now use .values() because the managers store objects in Maps.
        const interactableMeshes = [
            ...Array.from(this.npcManager.npcs.values()).map(npc => npc.mesh),
            ...Array.from(this.portalManager.portals.values()).map(p => p.mesh),
            ...Array.from(this.essenceCollectibleManager.collectibles.values()).map(c => c.mesh),
            ...Array.from(this.awakeningStoneManager.awakeningStones.values()).map(s => s.mesh),
        ];

        for (const mesh of interactableMeshes) {
            if (!mesh.visible) continue;

            const distSq = this.player.mesh.position.distanceToSquared(mesh.position);
            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                newClosestInteractableMesh = mesh;
            }
        }

        // If the highlighted object has changed, update the UI.
        if (this.closestInteractableMesh !== newClosestInteractableMesh) {
            this.closestInteractableMesh = newClosestInteractableMesh;

            if (this.closestInteractableMesh) {
                this.interactionLabel.textContent = this.closestInteractableMesh.userData.interactionText;
                this.interactionLabel.style.display = 'block';
                this.outlinePass.selectedObjects = [this.closestInteractableMesh];
            } else {
                this.interactionLabel.style.display = 'none';
                this.outlinePass.selectedObjects = [];
            }
        }
    }

    /**
     * MODIFIED: Sends an interaction request to the server based on the highlighted object.
     * This method no longer contains direct gameplay logic.
     */
    interact() {
        if (!this.closestInteractableMesh) return;

        const userData = this.closestInteractableMesh.userData;

        console.log(`Client: Attempting to interact with type: ${userData.type}`);

        switch (userData.type) {
            case 'npc':
                // Send a message to the server to start dialogue with this NPC.
                // The server will validate proximity and send back the dialogue lines.
                this.room.send("interact_npc", { npcId: userData.npc.id });
                break;

            case 'portal':
                // Call the manager's method that sends a request to the server.
                this.portalManager.requestEnter(userData.portal.id);
                break;

            case 'essence_collectible':
                // Call the manager's method that sends a request to the server.
                this.essenceCollectibleManager.collect(userData.id, this.playerState);
                break;

            case 'awakening_stone':
                // Call the manager's method that sends a request to the server.
                this.awakeningStoneManager.collect(userData.id);
                break;
                
            default:
                console.warn("Client: Unknown interaction type:", userData.type);
        }
    }
}