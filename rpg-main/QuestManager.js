// QuestManager.js (Client-Side for Colyseus)

/**
 * Manages the DISPLAY of quest-related information and sends quest-related
 * requests to the server for authoritative processing.
 */
export class QuestManager {
    constructor(playerState, uiManager, room) {
        if (!playerState || !uiManager || !room) {
            throw new Error("QuestManager requires PlayerState, UIManager, and a Colyseus Room object.");
        }
        
        this.playerState = playerState;
        this.uiManager = uiManager;
        this.room = room; // The Colyseus room for sending messages

        this.questDatabase = {}; // Stores all static quest data loaded from JSON
        this.isLoaded = false;
    }

    /**
     * Asynchronously loads static quest data from JSON files for display purposes
     * (e.g., showing quest titles, descriptions, and objective text).
     */
    async loadQuests(mainStoryPath = 'main-story-quests.json') {
        try {
            const response = await fetch(mainStoryPath);
            if (!response.ok) throw new Error('Failed to fetch quest file.');
            
            const questData = await response.json();
            this.questDatabase = questData; // Assumes it's an object keyed by ID
            this.isLoaded = true;
            console.log("QuestManager: Static quest data loaded successfully for UI display.");
        } catch (error) {
            console.error("QuestManager: Failed to load static quest data.", error);
            this.isLoaded = false;
        }
    }

    /**
     * Retrieves the static display data for a quest by its unique ID.
     */
    getQuestDataById(questId) {
        return this.questDatabase[questId] || null;
    }
    
    /**
     * Sends a request to the server to start a quest.
     * @param {string} questId - The unique ID of the quest to start.
     */
    requestStartQuest(questId) {
        if (!this.isLoaded) {
            console.error("QuestManager: Cannot start quest, static data not loaded.");
            return;
        }
        console.log(`Client: Sending 'start_quest' request for ID: ${questId}`);
        this.room.send("start_quest", { questId });
    }

    /**
     * Sends a request to the server to complete (turn in) a quest.
     * @param {string} questId - The ID of the quest to complete.
     */
    requestCompleteQuest(questId) {
        console.log(`Client: Sending 'complete_quest' request for ID: ${questId}`);
        this.room.send("complete_quest", { questId });
    }

    /**
     * Updates the on-screen quest tracker based on the player's current main story state.
     * This method READS the synchronized state, it does not modify it.
     */
    updateTracker() {
        const msqState = this.playerState.mainStoryState;

        if (!msqState || msqState === "NOT_STARTED" || !msqState.includes("_IN_PROGRESS")) {
            this.uiManager.updateQuestTracker(null, null); // Hide tracker
            return;
        }

        const questId = msqState.replace('_IN_PROGRESS', '');
        const questData = this.getQuestDataById(questId);
        
        if (questData) {
            // A real implementation would look at playerState.activeQuests to get live progress.
            // For simplicity, we'll just display the first objective.
            const objectiveText = `${questData.objectives[0].description} (0 / ${questData.objectives[0].amount})`;
            this.uiManager.updateQuestTracker(questData.title, objectiveText);
        }
    }

    /**
     * DELETED: The `notify`, `checkAllObjectives`, and `completeQuest` methods have been
     * removed from the client. All quest progress logic is now handled exclusively by the server.
     */
}