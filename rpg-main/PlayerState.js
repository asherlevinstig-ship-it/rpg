// PlayerState.js

// --- CONSTANTS FOR RANK PROGRESSION (Safe to keep on client for UI display) ---
const RANK_PROGRESSION = ['Normal', 'Iron', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Transcendent'];
const XP_PER_SUB_RANK = {
    'Iron': 100,
    'Bronze': 250,
    'Silver': 500,
    'Gold': 1000,
    'Diamond': 2500
};

/**
 * Manages the LOCAL player's data as a MIRROR of the server's authoritative state.
 * This class HOLDS and COMPUTES data for rendering, but does not MODIFY critical state directly.
 * All state changes (taking damage, gaining XP, etc.) are handled by the server
 * and synchronized to this class via the `syncFromServer` method.
 */
export class PlayerState {
    constructor() {
        // --- Initialize with default values ---
        // These will be overwritten by the first state sync from the server.
        
        // --- Identity & PvP ---
        this.username = "Adventurer";
        this.isPvpEnabled = false;

        // --- Quest & Tutorial Properties ---
        this.mainStoryState = "NOT_STARTED";
        this.activeQuests = {};
        this.completedQuests = [];
        this.hasSeenEssenceTutorial = false;
        this.gold = 0;

        // --- Aura Properties ---
        this.auraControl = 0;
        this.isAuraActive = false;

        // --- Action States ---
        this.isSprinting = false;
        this.isCrouching = false;

        // --- Meditation State ---
        this.isMeditating = false;
        this.currentMeditationQuestion = null;
        this.meditationQuestions = []; // This will be populated from a local fetch

        // --- Equipment & Inventory ---
        this.equipment = {
            mainHand: null, head: null, chest: null, legs: null, feet: null
        };
        this.inventory = [];

        // --- Essence Properties ---
        this.essences = [];
        this.selectedEssenceIndex = 0;

        // --- Core Stats (Base values sent from server) ---
        this.baseStats = {
            might: 10, speed: 10, endurance: 10, recovery: 10, spirit: 10,
            health: 100, stamina: 100, mana: 50, defense: 0
        };
        
        // --- Buffs & Current Resources ---
        this.buffs = []; // Buffs with client-side timers for UI
        this.currentHealth = 100;
        this.currentMana = 50;

        // --- Callbacks for UI updates ---
        this.onPvpChange = () => {};
        this.onAuraChange = () => {};
        this.onEquipmentChange = () => {};
        this.onEssenceChange = () => {};
        this.onMeditationStart = () => {};
        this.onMeditationEnd = () => {};
        this.onMeditationSuccess = () => {};
        this.onMeditationFailure = () => {};
    }

    /**
     * The core synchronization method. Updates the entire client state
     * with the new authoritative state received from the Colyseus server.
     * @param {object} serverState - The player state object from the server's schema.
     */
    syncFromServer(serverState) {
        // This flexible loop updates all matching properties from the server state.
        for (const key in serverState) {
            if (this.hasOwnProperty(key)) {
                // A simple deep copy for objects and arrays to avoid reference issues
                if (serverState[key] && typeof serverState[key] === 'object') {
                    this[key] = JSON.parse(JSON.stringify(serverState[key]));
                } else {
                    this[key] = serverState[key];
                }
            }
        }
        
        // After syncing, trigger callbacks to ensure the UI re-renders with the new data.
        this._notifyEssenceChange();
        this.onEquipmentChange();
    }

    // ====================================================================================
    // NOTE: CRITICAL MUTATOR METHODS HAVE BEEN REMOVED
    //
    // Actions like `addXp`, `takeDamage`, `heal`, `addItemToInventory`, `socketStone`, etc.,
    // are now handled EXCLUSIVELY by the server to prevent cheating. The client sends
    // an input or an action request (e.g., `room.send("use_item", itemId)`), and the
    // server performs the logic and broadcasts the new state back to this class.
    // ====================================================================================


    // ====================================================================================
    // CLIENT-SIDE HELPER & GETTER METHODS (SAFE TO KEEP)
    // These methods READ the synchronized state and CALCULATE values for display.
    // They do not modify the state, making them secure to run on the client.
    // ====================================================================================

    /**
     * Populates meditation questions from local data. This is safe as it's static content.
     */
    setMeditationQuestions(questionsData) {
        this.meditationQuestions = questionsData;
    }

    /**
     * Client-side effect for draining mana for the aura. The actual mana value is
     * authoritative from the server, but this provides smooth visuals between updates.
     * @param {number} deltaTime The time elapsed since the last frame.
     */
    updateAuraEffects(deltaTime) {
        if (!this.isAuraActive) return;
        const manaDrainPerSecond = 5;
        const controlModifier = 1 - (this.auraControl / 100);
        // We subtract locally for immediate visual feedback. The server's sync will correct this value.
        this.currentMana -= manaDrainPerSecond * controlModifier * deltaTime;
        if (this.currentMana < 0) this.currentMana = 0;
    }

    /**
     * Client-side prediction for mana drain while sprinting.
     */
    updateSprint(deltaTime) {
        if (!this.isSprinting) return;
        this.currentMana -= 4 * deltaTime;
        if (this.currentMana < 0) this.currentMana = 0;
    }

    /**
     * Updates client-side timers on buffs for UI purposes. The server handles the
     * actual expiration and removal of statistical effects.
     */
    updateBuffs() {
        const now = performance.now();
        for (let i = this.buffs.length - 1; i >= 0; i--) {
            const buff = this.buffs[i];
            // Initialize start time on client if it's a new buff from the server
            if (!buff.startTime) buff.startTime = now; 
            // The duration property from the server should be in seconds
            if (now - buff.startTime > buff.duration * 1000) {
                this.buffs.splice(i, 1);
            }
        }
    }

    /**
     * Internal helper to trigger the `onEssenceChange` callback for UI updates.
     */
    _notifyEssenceChange() {
        if (this.onEssenceChange) {
            this.onEssenceChange(this.getSelectedEssence());
        }
    }

    /**
     * Retrieves the currently selected Essence object from the local state.
     */
    getSelectedEssence() {
        if (!this.essences || this.essences.length === 0) return null;
        return this.essences[this.selectedEssenceIndex];
    }
    
    /**
     * Determines the player's overall rank based on the lowest rank among their essences.
     */
    getOverallRank() {
        if (!this.essences || this.essences.length === 0) {
            return { rank: 'Normal', subRank: 0 };
        }

        let lowestRank = { rank: 'Transcendent', subRank: 9 };
        let lowestRankIndex = RANK_PROGRESSION.indexOf(lowestRank.rank);

        this.essences.forEach(essence => {
            const essenceRankIndex = RANK_PROGRESSION.indexOf(essence.rank);
            if (essenceRankIndex < lowestRankIndex) {
                lowestRankIndex = essenceRankIndex;
                lowestRank = { rank: essence.rank, subRank: essence.subRank };
            } else if (essenceRankIndex === lowestRankIndex && essence.subRank < lowestRank.subRank) {
                lowestRank = { rank: essence.rank, subRank: essence.subRank };
            }
        });
        return lowestRank;
    }
    
    /**
     * Gets the statistical multiplier based on the player's overall rank.
     */
    getRankMultiplier() {
        const ranks = {
            'Normal': 0.8, 'Iron': 1.0, 'Bronze': 1.5, 'Silver': 2.25,
            'Gold': 3.5, 'Diamond': 5.0, 'Ascended': 10.0, 'Transcendent': 20.0
        };
        const overallRank = this.getOverallRank();
        return ranks[overallRank.rank] || 1.0;
    }
    
    /**
     * Calculates the player's final stats by combining base stats, equipment, and rank multipliers.
     * This is essential for displaying correct information in the UI (e.g., character sheet).
     */
    getComputedStats() {
        const finalStats = { ...this.baseStats };
        let totalDefense = this.baseStats.defense;

        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item) {
                if (item.stats) {
                    for (const stat in item.stats) {
                        finalStats[stat] = (finalStats[stat] || 0) + item.stats[stat];
                    }
                }
                if (item.defense) {
                    totalDefense += item.defense;
                }
            }
        }

        const rankMultiplier = this.getRankMultiplier();
        const maxHealth = Math.floor((finalStats.health + (finalStats.endurance * 10)) * rankMultiplier);
        const maxMana = Math.floor((finalStats.mana + (finalStats.spirit * 5)) * rankMultiplier);

        return { maxHealth, maxMana, totalDefense, ...finalStats };
    }

    /**
     * Calculates the final stats of an ability, including damage and effects from Awakening Stones.
     * This is used for UI tooltips to show the player the true power of their abilities.
     */
    getComputedAbility(abilityId) {
        if (!this.essences) return null;

        let baseAbility = null;
        let parentEssence = null;
        for (const essence of this.essences) {
            if (!essence.abilities) continue;
            const foundAbility = essence.abilities.find(a => a.id === abilityId);
            if (foundAbility) {
                baseAbility = foundAbility;
                parentEssence = essence;
                break;
            }
        }

        if (!baseAbility) return null;
        
        const computedAbility = JSON.parse(JSON.stringify(baseAbility));
        computedAbility.effects = computedAbility.effects || [];
        
        const computedStats = this.getComputedStats();
        
        computedAbility.damage = (computedAbility.baseDamage || 0) + 
                                  (computedStats[computedAbility.scalingStat] * (computedAbility.scalingRatio || 1.0) || 0);

        if (parentEssence.awakeningStones) {
            for (const stone of parentEssence.awakeningStones) {
                if (stone === null || !stone.mods) continue;
                for (const mod of stone.mods) {
                    switch (mod.type) {
                        case 'ADD_FLAT_DAMAGE':
                            computedAbility.damage += mod.value;
                            break;
                        case 'ADD_EFFECT':
                            computedAbility.effects.push({ ...mod });
                            break;
                    }
                }
            }
        }
        
        return computedAbility;
    }
}