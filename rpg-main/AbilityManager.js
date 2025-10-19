// AbilityManager.js (Client-Side for Colyseus)

export class AbilityManager {
    /**
     * Manages the player's abilities, cooldowns (for UI), and action requests.
     * This class SENDS action requests to the server but does not EXECUTE gameplay logic.
     */
    constructor(playerState, vfxManager, player, room) {
        this.playerState = playerState;
        this.vfxManager = vfxManager;
        this.player = player;
        this.room = room; // The Colyseus room for sending messages

        this.abilities = []; // The list of abilities currently on the hotbar
        this.abilityCooldowns = new Map(); // Client-side cooldowns for UI feedback

        this.isCharging = false;
        this.chargeTime = 0;
        this.chargingSlot = -1;

        this.playerState.onEssenceChange = (newEssence) => {
            this.loadAbilitiesFromEssence(newEssence);
        };
    }

    /**
     * Gathers usable abilities from the equipped essence to display on the hotbar.
     * This logic is for UI display only and is safe to keep on the client.
     */
    loadAbilitiesFromEssence(essence) {
        this.abilities = [];
        if (!essence) return;

        // Load base abilities from the Essence
        if (essence.abilities) {
            for (const baseAbility of essence.abilities) {
                const computedAbility = this.playerState.getComputedAbility(baseAbility.id);
                if (computedAbility) this.abilities.push(computedAbility);
            }
        }

        // Load abilities from compatible Awakening Stones
        for (const stone of essence.awakeningStones) {
            if (stone && (stone.abilityType === 'instant' || stone.abilityType === 'charge')) {
                const requirement = stone.requiredEssenceId;
                let isRequirementMet = !requirement || 
                                       (typeof requirement === 'string' && requirement === essence.id) ||
                                       (Array.isArray(requirement) && requirement.includes(essence.id));

                if (isRequirementMet) this.abilities.push(stone);
            }
        }
    }

    /**
     * Gets the current cooldown status for the UI.
     * This is a client-side prediction and will be corrected by the server if needed.
     */
    getCooldownStatus(abilityId) {
        const cd = this.abilityCooldowns.get(abilityId);
        if (!cd) return null;

        const elapsed = (performance.now() - cd.lastUsed) / 1000;
        if (elapsed >= cd.duration) {
            this.abilityCooldowns.delete(abilityId);
            return null;
        }
        return { remaining: cd.duration - elapsed, duration: cd.duration };
    }

    /**
     * Called when an ability key is first pressed. Sends a request to the server.
     */
    startAbility(slotIndex) {
        if (this.isCharging) return;
        const ability = this.abilities[slotIndex];
        if (!ability) return;

        // For charge abilities, we start charging locally for immediate visual feedback.
        if (ability.abilityType === 'charge') {
            this.isCharging = true;
            this.chargeTime = 0;
            this.chargingSlot = slotIndex;
            console.log(`Client: Started charging ${ability.name}...`);
        } else {
            // For instant abilities, send the request to the server immediately.
            this.useInstantAbility(ability, slotIndex);
        }
    }

    /**
     * MODIFIED: Sends a request to the server to use an instant ability.
     */
    useInstantAbility(ability, slotIndex) {
        // Client-side cooldown check to prevent spamming messages to the server.
        // The server will perform the definitive check.
        if (this.getCooldownStatus(ability.id) !== null) {
            console.log(`Client: ${ability.name} is on cooldown (UI prediction).`);
            return;
        }

        console.log(`Client: Sending 'use_ability' request for slot ${slotIndex}`);
        this.room.send("use_ability", { slotIndex });

        // Predictively start the cooldown on the UI for a responsive feel.
        const cooldown = (ability.mods?.find(m => m.type === 'COOLDOWN')?.seconds) || ability.cooldown || 0;
        if (cooldown > 0) {
            this.abilityCooldowns.set(ability.id, { lastUsed: performance.now(), duration: cooldown });
        }
    }

    /**
     * Called when a charging ability key is released. Sends the final request.
     */
    releaseAbility(slotIndex) {
        if (!this.isCharging || this.chargingSlot !== slotIndex) return;

        const ability = this.abilities[slotIndex];
        if (!ability) return;
        
        console.log(`Client: Releasing charged ability, sending 'use_ability' request for slot ${slotIndex}`);
        this.room.send("use_ability", { slotIndex, chargeTime: this.chargeTime });

        // Predictively start the cooldown on the UI.
        const cooldown = ability.mods?.find(m => m.type === 'COOLDOWN')?.seconds || 0;
        if (cooldown > 0) {
            this.abilityCooldowns.set(ability.id, { lastUsed: performance.now(), duration: cooldown });
        }

        // Play the release animation locally for immediate feedback.
        this.player.playReleaseAnimation();
        this.resetChargeState();
    }

    /**
     * REMOVED: All gameplay logic from `executeAbilityEffects` is now on the server.
     * This function has been deleted from the client-side manager.
     */
    // executeAbilityEffects() { ... DELETED ... }

    resetChargeState() {
        this.isCharging = false;
        this.chargeTime = 0;
        this.chargingSlot = -1;
        this.player.updateChargeAnimation(0); // Reset the visual charge animation
    }

    update(deltaTime) {
        // The update loop is now only needed for the client-side charging animation.
        if (this.isCharging) {
            this.chargeTime += deltaTime;
            this.player.updateChargeAnimation(this.chargeTime);
        }
    }
}