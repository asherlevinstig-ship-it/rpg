// InventoryManager.js (Client-Side for Colyseus)

export class InventoryManager {
    constructor(playerState, uiManager, room) {
        this.playerState = playerState;
        this.uiManager = uiManager;
        this.room = room; // The Colyseus room for sending messages
    }

    /**
     * MODIFIED: Sends a request to the server to use an item from the inventory.
     * @param {number} inventoryIndex The inventory slot of the item being used.
     */
    useItem(inventoryIndex) {
        const item = this.playerState.inventory[inventoryIndex];
        if (!item) return;

        console.log(`Client: Requesting to use ${item.name}...`);

        switch (item.type.toLowerCase()) {
            case 'consumable':
            case 'weapon':
            case 'armor':
            case 'essence':
                // For all items that are "used" or "equipped", we send one simple message.
                // The server will figure out what to do based on the item's type.
                this.room.send("use_item", { inventoryIndex });
                break;

            case 'awakening stone':
                // Opening the socketing UI is a purely client-side action. No message needed yet.
                this.uiManager.openSocketingScreen(item, inventoryIndex);
                break;

            default:
                console.log(`Client: Don't know how to use item of type: ${item.type}`);
        }
    }

    /**
     * MODIFIED: Sends a request to the server to socket a stone into an essence.
     * @param {object} essence The target essence for socketing.
     * @param {number} essenceSocketIndex The target socket index on the essence.
     * @param {object} stone The stone to be socketed.
     * @param {number} stoneInventoryIndex The inventory index of the stone.
     */
    socketStone(essence, essenceSocketIndex, stone, stoneInventoryIndex) {
        // The compatibility check can remain on the client to provide instant UI feedback
        // (e.g., preventing the player from even clicking an invalid slot).
        if (!this._isStoneCompatible(stone, essence)) {
            console.error(`UI Validation: Cannot socket ${stone.name} into ${essence.name}. Requirement not met.`);
            this.uiManager.showError("This stone is not compatible with this Essence."); // Example UI feedback
            return;
        }

        // If UI validation passes, send the authoritative request to the server.
        console.log(`Client: Sending 'socket_stone' request...`);
        this.room.send("socket_stone", {
            essenceId: essence.id,
            essenceSocketIndex: essenceSocketIndex,
            stoneInventoryIndex: stoneInventoryIndex
        });

        // The client no longer modifies its inventory or essence state directly.
        // It waits for the server to send back the updated state.
        this.uiManager.closeSocketingScreen();
    }

    /**
     * HELPER: Checks if a stone is compatible with an essence (for UI purposes).
     * This logic is safe on the client as the server performs the final authoritative check.
     */
    _isStoneCompatible(stone, essence) {
        const requirement = stone.requiredEssenceId;
        if (!requirement) return true;
        if (typeof requirement === 'string') return requirement === essence.id;
        if (Array.isArray(requirement)) return requirement.includes(essence.id);
        return false;
    }

    /**
     * DELETED: The `equipItem` and `equipEssence` methods have been removed.
     * Their logic is now handled by the server in response to the "use_item" message.
     */
}