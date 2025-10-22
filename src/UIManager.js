// UIManager.js

import * as THREE from 'three';

// --- CONSTANTS FOR RANK PROGRESSION ---
const RANK_PROGRESSION = ['Normal', 'Iron', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Transcendent'];
const XP_PER_SUB_RANK = {
    'Iron': 100,
    'Bronze': 250,
    'Silver': 500,
    'Gold': 1000,
    'Diamond': 2500
};

export class UIManager {
    constructor(playerState, healthBarElement, manaBarElement, charSheet, inventoryScreen, abilityManager, inventoryManager, activeEssenceDisplayElement) {
        this.playerState = playerState;
        this.abilityManager = abilityManager;
        this.inventoryManager = inventoryManager;

        // --- HUD Elements ---
        this.healthBar = healthBarElement;
        this.manaBar = manaBarElement;
        this.activeEssenceDisplay = activeEssenceDisplayElement;
        this.overallRankDisplay = document.getElementById('overall-rank-display');
        
        // --- Character Sheet Elements ---
        this.charSheet = charSheet;
        this.charSheetVisible = false;
        this.charRank = document.getElementById('char-rank');
        this.charXp = document.getElementById('char-xp');
        this.xpBar = document.getElementById('xp-bar-inner');
        this.charMight = document.getElementById('char-might');
        this.charSpeed = document.getElementById('char-speed');
        this.charEndurance = document.getElementById('char-endurance');
        this.charRecovery = document.getElementById('char-recovery');
        this.charSpirit = document.getElementById('char-spirit');
        this.charDefense = document.getElementById('char-defense');
        
        // --- Inventory Elements ---
        this.inventoryScreen = inventoryScreen;
        this.inventoryGrid = document.getElementById('inventory-grid');
        this.inventoryVisible = false;
        
        // --- Hotbar Elements ---
        this.hotbarSlots = [];
        for (let i = 0; i < 5; i++) {
            const slot = document.getElementById(`hotbar-slot-${i}`);
            this.hotbarSlots.push({
                slot: slot,
                content: slot.querySelector('.hotbar-content'),
                overlay: slot.querySelector('.cooldown-overlay'),
                text: slot.querySelector('.cooldown-text')
            });
        }
        
        // --- Dialogue Elements ---
        this.dialogueBox = document.getElementById('dialogue-box');
        this.dialogueName = document.getElementById('dialogue-npc-name');
        this.dialogueText = document.getElementById('dialogue-text');
        this.dialogueNextButton = document.getElementById('dialogue-next-button');
        this.activeNPC = null;
        this.dialogueNextButton.addEventListener('click', () => this.advanceDialogue());

        // --- Meditation Elements ---
        this.meditationPanel = document.getElementById('meditation-panel');
        this.meditationQuestion = document.getElementById('meditation-question');
        this.meditationOptions = document.getElementById('meditation-options');

        // --- Socketing Elements ---
        this.socketingScreen = document.getElementById('socketing-screen');
        this.socketingItemName = document.getElementById('socketing-item-name');
        this.socketingOptions = document.getElementById('socketing-options');
        this.socketingCancelButton = document.getElementById('socketing-cancel-button');
        this.isSocketing = false;
        this.socketingStone = null;
        this.socketingStoneInventoryIndex = -1;
        this.socketingCancelButton.addEventListener('click', () => this.closeSocketingScreen());
        
        // --- Floating Labels ---
        this.floatingLabelsContainer = document.getElementById('floating-labels-container');
        if (!this.floatingLabelsContainer) {
            console.warn('UI Manager: Element with ID "floating-labels-container" not found. Creating one.');
            this.floatingLabelsContainer = document.createElement('div');
            this.floatingLabelsContainer.id = 'floating-labels-container';
            document.body.appendChild(this.floatingLabelsContainer);
        }

        // --- Quest Tracker Elements ---
        this.questTracker = document.getElementById('quest-tracker');
        this.questTitle = document.getElementById('quest-title');
        this.questObjective = document.getElementById('quest-objective');

        // --- Tutorial Popup Elements ---
        this.tutorialPopupOverlay = document.getElementById('tutorial-popup-overlay');
        this.tutorialPopupCloseButton = document.getElementById('tutorial-popup-close');
        this.isTutorialVisible = false;

        // *** DEBUGGING STEP 1: Check if the button element is being found ***
        console.log("UIManager trying to find button:", this.tutorialPopupCloseButton);

        if (!this.tutorialPopupCloseButton) {
            console.error("FATAL: Tutorial close button was NOT found in the HTML!");
        } else {
            console.log("SUCCESS: Tutorial close button was found. Attaching listener...");
            this.tutorialPopupCloseButton.addEventListener('click', () => {
                // *** DEBUGGING STEP 2: Check if the click event fires ***
                console.log("EVENT FIRED: 'Got It!' button was clicked!");
                this.hideTutorialPopup();
            });
        }
    }
    
    openSocketingScreen(stone, inventoryIndex) {
        this.isSocketing = true;
        this.socketingStone = stone;
        this.socketingStoneInventoryIndex = inventoryIndex;
        this.socketingItemName.textContent = `Choose a slot for: ${stone.name}`;
        this.socketingOptions.innerHTML = ''; 
        const equippedEssences = this.playerState.essences;
        if (equippedEssences.length === 0) {
            this.socketingOptions.innerHTML = '<p>You have no equipped Essences.</p>';
        } else {
            equippedEssences.forEach(essence => {
                const essenceContainer = document.createElement('div');
                essenceContainer.className = 'socket-essence-container';
                const essenceTitle = document.createElement('h4');
                essenceTitle.textContent = essence.name;
                essenceContainer.appendChild(essenceTitle);
                const slotsContainer = document.createElement('div');
                slotsContainer.className = 'socket-slots-container';
                essence.awakeningStones.forEach((stoneInSlot, i) => {
                    const slot = document.createElement('div');
                    slot.className = 'socket-slot';
                    if (stoneInSlot) {
                        slot.classList.add('filled');
                        slot.textContent = stoneInSlot.name;
                    } else {
                        slot.classList.add('empty');
                        slot.textContent = 'Empty';
                        slot.addEventListener('click', () => {
                            this.inventoryManager.socketStone(essence, i, this.socketingStone, this.socketingStoneInventoryIndex);
                        });
                    }
                    slotsContainer.appendChild(slot);
                });
                essenceContainer.appendChild(slotsContainer);
                this.socketingOptions.appendChild(essenceContainer);
            });
        }
        this.socketingScreen.style.display = 'block';
        this.inventoryScreen.style.display = 'none';
        this.inventoryVisible = false;
    }

    closeSocketingScreen() {
        this.isSocketing = false;
        this.socketingScreen.style.display = 'none';
    }

    openDialogue(npc) {
        this.activeNPC = npc;
        this.activeNPC.dialogueIndex = 0;
        this.dialogueName.textContent = npc.name;
        this.dialogueText.textContent = npc.dialogue[0];
        this.dialogueBox.classList.remove('hidden');
    }

    advanceDialogue() {
        if (!this.activeNPC) return;
        this.activeNPC.dialogueIndex++;
        if (this.activeNPC.dialogue[this.activeNPC.dialogueIndex]) {
            this.dialogueText.textContent = this.activeNPC.dialogue[this.activeNPC.dialogueIndex];
        } else {
            this.closeDialogue();
        }
    }

    closeDialogue() {
        this.dialogueBox.classList.add('hidden');
        this.activeNPC = null;
    }

    showMeditationQuestion(questionData) {
        this.meditationQuestion.textContent = questionData.question;
        this.meditationOptions.innerHTML = '';
        questionData.options.forEach((optionText, index) => {
            const li = document.createElement('li');
            li.textContent = optionText;
            li.dataset.index = index;
            li.addEventListener('click', (e) => {
                const selectedIndex = parseInt(e.target.dataset.index);
                this.playerState.answerMeditationQuestion(selectedIndex);
            });
            this.meditationOptions.appendChild(li);
        });
        this.meditationPanel.style.display = 'block';
    }

    hideMeditationQuestion() {
        this.meditationPanel.style.display = 'none';
    }

    toggleCharacterSheet() {
        this.charSheetVisible = !this.charSheetVisible;
        if (this.charSheetVisible) {
            this.updateCharacterSheet();
            this.charSheet.style.display = 'block';
            if (this.inventoryVisible) this.toggleInventoryScreen();
        } else {
            this.charSheet.style.display = 'none';
        }
    }

    toggleInventoryScreen() {
        this.inventoryVisible = !this.inventoryVisible;
        if (this.inventoryVisible) {
            this.renderInventory();
            this.inventoryScreen.style.display = 'block';
            if (this.charSheetVisible) this.toggleCharacterSheet();
        } else {
            this.inventoryScreen.style.display = 'none';
        }
    }

    renderInventory() {
        this.inventoryGrid.innerHTML = '';
        this.playerState.inventory.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.textContent = item.name;
            slot.addEventListener('click', () => {
                this.inventoryManager.useItem(index);
            });
            this.inventoryGrid.appendChild(slot);
        });
    }

    updateCharacterSheet() {
        const overallRank = this.playerState.getOverallRank();
        this.charRank.textContent = `${overallRank.rank} ${overallRank.subRank}`;

        const selectedEssence = this.playerState.getSelectedEssence();
        if (selectedEssence) {
            const xpToNext = XP_PER_SUB_RANK[selectedEssence.rank];
            if (xpToNext) {
                const xpPercent = (selectedEssence.xp / xpToNext) * 100;
                this.charXp.textContent = `Essence XP: ${Math.floor(selectedEssence.xp)} / ${xpToNext} (${xpPercent.toFixed(0)}%)`;
                this.xpBar.style.width = `${xpPercent}%`;
            } else {
                this.charXp.textContent = "Essence at Max Rank";
                this.xpBar.style.width = '100%';
            }
        } else {
            this.charXp.textContent = "No Essence Selected";
            this.xpBar.style.width = '0%';
        }
        
        const stats = this.playerState.getComputedStats();
        this.charMight.textContent = stats.might;
        this.charSpeed.textContent = stats.speed;
        this.charEndurance.textContent = stats.endurance;
        this.charRecovery.textContent = stats.recovery;
        this.charSpirit.textContent = stats.spirit;
        this.charDefense.textContent = stats.totalDefense;

        for (const slot in this.playerState.equipment) {
            const item = this.playerState.equipment[slot];
            document.getElementById(`equip-${slot}`).textContent = item ? item.name : 'Empty';
        }

        const essenceContainer = document.getElementById('essence-slots-container');
        essenceContainer.innerHTML = '';
        this.playerState.essences.forEach((essence, index) => {
            const slot = document.createElement('div');
            slot.className = 'essence-slot-display';
            if (index === this.playerState.selectedEssenceIndex) slot.classList.add('selected');

            const essenceInfo = document.createElement('div');
            essenceInfo.className = 'essence-info';
            const xpToNext = XP_PER_SUB_RANK[essence.rank];
            const xpPercent = xpToNext ? (essence.xp / xpToNext * 100).toFixed(0) : 100;
            essenceInfo.innerHTML = `<strong>${essence.name}</strong><br><small>${essence.rank} ${essence.subRank} (${xpPercent}%)</small>`;
            slot.appendChild(essenceInfo);

            const stonesDiv = document.createElement('div');
            stonesDiv.className = 'essence-stones';
            essence.awakeningStones.forEach(stone => {
                const p = document.createElement('p');
                p.textContent = stone ? `- ${stone.name}` : '- Empty';
                stonesDiv.appendChild(p);
            });
            slot.appendChild(stonesDiv);

            essenceContainer.appendChild(slot);
        });
    }

    update() {
        const stats = this.playerState.getComputedStats();
        this.healthBar.style.width = `${(this.playerState.currentHealth / stats.maxHealth) * 100}%`;
        this.manaBar.style.width = `${(this.playerState.currentMana / stats.maxMana) * 100}%`;
        
        const essence = this.playerState.getSelectedEssence();
        this.activeEssenceDisplay.textContent = essence ? `${essence.name} (${essence.rank} ${essence.subRank})` : 'No Essence';
        
        const overallRank = this.playerState.getOverallRank();
        this.overallRankDisplay.textContent = `Rank: ${overallRank.rank} ${overallRank.subRank}`;
        
        this.updateHotbar();
        if (this.charSheetVisible) this.updateCharacterSheet();
    }
    
    updateHotbar() {
        for (let i = 0; i < this.hotbarSlots.length; i++) {
            const s = this.hotbarSlots[i];
            const ability = this.abilityManager.abilities[i];
            if (ability) {
                s.slot.classList.add('filled');
                s.content.textContent = ability.name;
                const cd = this.abilityManager.getCooldownStatus(ability.id);
                if (cd) {
                    s.overlay.style.height = `${(cd.remaining / cd.duration) * 100}%`;
                    s.text.style.display = 'block';
                    s.text.textContent = Math.ceil(cd.remaining);
                } else {
                    s.overlay.style.height = '0%';
                    s.text.style.display = 'none';
                }
            } else {
                s.slot.classList.remove('filled');
                s.content.textContent = '';
                s.overlay.style.height = '0%';
                s.text.style.display = 'none';
            }
        }
    }

    updateFloatingLabels(camera, enemies) {
        enemies.forEach(enemy => {
            if (!enemy.labelElement || enemy.isDead) {
                if(enemy.labelElement) enemy.labelElement.style.display = 'none';
                return;
            }

            const enemyHeight = 2.0;
            const position3D = enemy.mesh.position.clone().add(new THREE.Vector3(0, enemyHeight, 0));
            const screenPosition = position3D.project(camera);

            const isBehindCamera = screenPosition.z > 1;
            if (isBehindCamera) {
                enemy.labelElement.style.display = 'none';
                return;
            }

            const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
            const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;

            enemy.labelElement.style.display = 'block';
            enemy.labelElement.style.left = `${x}px`;
            enemy.labelElement.style.top = `${y}px`;
        });
    }

    updateQuestTracker(title, objective) {
        if (title && objective) {
            this.questTitle.textContent = title;
            this.questObjective.textContent = objective;
            this.questTracker.style.display = 'block';
        } else {
            this.questTracker.style.display = 'none';
        }
    }
    
    showTutorialPopup() {
        // Only show if it hasn't been seen before
        if (!this.playerState.hasSeenEssenceTutorial) {
            this.tutorialPopupOverlay.classList.remove('hidden');
            this.playerState.hasSeenEssenceTutorial = true; // Set the flag immediately
            this.isTutorialVisible = true;
        }
    }

    hideTutorialPopup() {
        this.tutorialPopupOverlay.classList.add('hidden');
        this.isTutorialVisible = false;
    }

    isUIVisible() {
        return this.charSheetVisible ||
               this.inventoryVisible ||
               this.isSocketing ||
               this.activeNPC !== null ||
               this.meditationPanel.style.display !== 'none' ||
               this.isTutorialVisible;
    }
}