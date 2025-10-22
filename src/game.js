// game.js

import * as THREE from 'three';
// --- POST-PROCESSING IMPORTS ---
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';

// --- GAME SYSTEM IMPORTS ---
import { WorldManager } from './WorldManager.js';
import { PlayerState } from './PlayerState.js';
import { PlayerController } from './PlayerController.js';
import { CameraManager } from './CameraManager.js';
import { InteractionManager } from './InteractionManager.js';
import { AbilityManager } from './AbilityManager.js';
import { VFXManager } from './VFXManager.js';
import { UIManager } from './UIManager.js';
import { EnemyManager } from './EnemyManager.js';
import { InventoryManager } from './InventoryManager.js';
import { NPCManager } from './NPCManager.js';
import { PortalManager } from './PortalManager.js';
import { DungeonManager } from './DungeonManager.js';
import { EssenceCollectibleManager } from './EssenceCollectibleManager.js';
import { AwakeningStoneManager } from './AwakeningStoneManager.js';
import { QuestManager } from './QuestManager.js';
import { generateTextureAtlas } from './TextureGenerator.js';

// --- DATA IMPORTS ---
import {
    LesserMightEssence,
    SinEssence,
    MightEssence_Humphrey
} from './EssenceData.js';
import { HealthPotion, TrainingSword, RustySword, LeatherTunic } from './ItemData.js';
import {
    HeavyStone,
    StoneOfImpact,
    StoneOfJudgment,
    StoneOfTheChampion
} from './AwakeningStoneData.js';

// ====================================================================================
// COLYSEUS CLIENT-SIDE SETUP
// ====================================================================================

let colyseusClient;
let gameRoom;
let game; // This will be an instance of our new Game class

// This map will store all player entities, mapping their session ID to their 3D object
const playerEntities = new Map();

// --- DOM ELEMENTS FOR CONNECTION ---
const connectionPanel = document.getElementById('connection-panel');
const gameContainer = document.getElementById('game-container');
const joinButton = document.getElementById('join-button');
const usernameInput = document.getElementById('username-input');
const connectionStatus = document.getElementById('connection-status');
const loadingScreen = document.getElementById('loading-screen');

// This listener starts the connection process
window.addEventListener('DOMContentLoaded', () => {
    // Initialize the Colyseus client
    // Replace 'ws://localhost:2567' with your actual server address
    colyseusClient = new Colyseus.Client('ws://localhost:2567');

    joinButton.addEventListener('click', () => {
        connect();
    });
});

async function connect() {
    const username = usernameInput.value.trim() || 'Player' + Math.floor(Math.random() * 1000);
    connectionStatus.textContent = 'Connecting...';
    joinButton.disabled = true;

    try {
        // Attempt to join a room named "game_room"
        gameRoom = await colyseusClient.joinOrCreate('game_room', { username });

        console.log('Successfully joined room:', gameRoom.name);
        console.log('My session ID:', gameRoom.sessionId);
        
        connectionPanel.classList.add('hidden');
        loadingScreen.style.display = 'flex'; // Show loading screen for asset loading
        
        // Create and initialize the game instance
        game = new Game(gameRoom);
        await game.init();

    } catch (e) {
        console.error("Failed to join room", e);
        connectionStatus.textContent = 'Connection Failed. Is the server running?';
        joinButton.disabled = false;
    }
}


// ====================================================================================
// GAME CLASS
// Encapsulates the entire 3D world and game logic
// ====================================================================================

class Game {
    constructor(room) {
        this.room = room; // Store the Colyseus room instance
        
        // --- BASIC THREE.JS SETUP ---
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.clock = new THREE.Clock();
        
        this.localPlayer = null; // Reference to the local player's controller
        this.coordinateLogTimer = 0;
        this.LOG_INTERVAL = 2; // Log coordinates every 2 seconds
    }

    async init() {
        // --- RENDERER & SCENE SETUP ---
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        document.body.appendChild(this.renderer.domElement);
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);
        
        // --- PVP REGION ---
        this.townOfBeginnings = new THREE.Box2(new THREE.Vector2(-40, -40), new THREE.Vector2(40, 40));
        
        // --- LIGHTING & ATMOSPHERE ---
        this.hemisphereLight = new THREE.HemisphereLight(0xadd8e6, 0x8b4513, 1.0);
        this.scene.add(this.hemisphereLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
        this.directionalLight.position.set(30, 50, 20);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.bias = -0.0001;
        this.scene.add(this.directionalLight);

        this.atmosphere = {
            dayCycleTime: 0,
            daySpeed: 0.0005,
            dayFogColor: new THREE.Color(0x87ceeb),
            duskColor: new THREE.Color(0xff8c00),
            nightFogColor: new THREE.Color(0x000033),
        };

        // --- POST-PROCESSING ---
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
        this.ssaoPass.kernelRadius = 0.5;
        this.ssaoPass.minDistance = 0.001;
        this.ssaoPass.maxDistance = 0.1;
        // this.composer.addPass(this.ssaoPass); // Uncomment to enable SSAO

        this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
        this.outlinePass.edgeStrength = 4.0;
        this.outlinePass.edgeGlow = 0.8;
        this.outlinePass.edgeThickness = 1.0;
        this.outlinePass.visibleEdgeColor.set('#ffffff');
        this.outlinePass.hiddenEdgeColor.set('#190a05');
        this.composer.addPass(this.outlinePass);

        // --- MANAGERS INITIALIZATION ---
        const worldTexture = generateTextureAtlas();
        const masterSeed = 12345;
        
        this.playerState = new PlayerState(); // This is the LOCAL player's state
        
        const floatingLabelsContainer = document.getElementById('floating-labels-container');
        const interactionLabel = document.getElementById('interaction-label');
        const healthBar = document.querySelector('#health-bar .stat-bar-inner');
        const manaBar = document.querySelector('#mana-bar .stat-bar-inner');
        const charSheet = document.getElementById('character-sheet');
        const inventoryScreen = document.getElementById('inventory-screen');
        const activeEssenceDisplay = document.getElementById('active-essence-display');
        
        this.portalManager = new PortalManager(this.scene);
        this.worldManager = new WorldManager(this.scene, masterSeed, this.portalManager);
        this.worldManager.setTexture(worldTexture);
        this.vfxManager = new VFXManager(this.scene);
        this.npcManager = new NPCManager(this.scene, this.worldManager);

        this.dungeonManager = new DungeonManager(this.scene, null, this.worldManager, null, this.portalManager, this.npcManager);
        this.enemyManager = new EnemyManager(this.scene, this.playerState, this.worldManager, this.vfxManager, this.dungeonManager, floatingLabelsContainer, null);
        this.dungeonManager.enemyManager = this.enemyManager;
        
        this.cameraManager = new CameraManager(this.camera, []);
        // PlayerController is created when we join the room, so pass null for now to managers that need it.
        this.abilityManager = new AbilityManager(this.playerState, this.vfxManager, null, this.enemyManager);

        this.uiManager = new UIManager(this.playerState, healthBar, manaBar, charSheet, inventoryScreen, this.abilityManager, null, activeEssenceDisplay);
        this.inventoryManager = new InventoryManager(this.playerState, this.uiManager);
        this.uiManager.inventoryManager = this.inventoryManager;

        this.questManager = new QuestManager(this.playerState, this.uiManager, this.inventoryManager);
        this.enemyManager.questManager = this.questManager;

        this.essenceCollectibleManager = new EssenceCollectibleManager(this.scene, this.worldManager, this.uiManager);
        this.awakeningStoneManager = new AwakeningStoneManager(this.scene, this.worldManager);

        this.interactionManager = new InteractionManager(this.camera, null, this.playerState, this.questManager, this.npcManager, this.outlinePass, interactionLabel, this.uiManager, this.portalManager, this.dungeonManager, this.essenceCollectibleManager, this.awakeningStoneManager);
        
        // --- HOOK UP MEDITATION CALLBACKS ---
        this.playerState.onMeditationStart = (question) => this.uiManager.showMeditationQuestion(question);
        this.playerState.onMeditationEnd = () => this.uiManager.hideMeditationQuestion();
        this.playerState.onMeditationSuccess = () => this.vfxManager.createMeditationSuccessEffect(this.localPlayer.mesh);

        // --- PLAYER STARTING LOADOUT ---
        // This should eventually be sent by the server upon joining.
        this.playerState.addItemToInventory(HealthPotion);
        this.playerState.addItemToInventory(RustySword);
        this.playerState.addItemToInventory(LeatherTunic);
        this.playerState.addEssence(LesserMightEssence);
        this.playerState.addItemToInventory(StoneOfImpact);
        this.playerState.addItemToInventory(StoneOfJudgment);
        this.playerState.addItemToInventory(HeavyStone);
        this.playerState._notifyEssenceChange();

        // --- ASSET LOADING & FINAL SETUP ---
        await this.loadInitialAssets();
        this.setupRoomListeners();
        this.setupControls();

        // --- START GAME ---
        loadingScreen.style.display = 'none';
        gameContainer.classList.remove('hidden');
        this.animate();
    }
    
    isPlayerInTown(playerPosition) {
        return this.townOfBeginnings.containsPoint(new THREE.Vector2(playerPosition.x, playerPosition.z));
    }

    async loadInitialAssets() {
        try {
            const [loadedQuestions] = await Promise.all([
                fetch('questions.json').then(response => response.json()),
                this.questManager.loadQuests(),
                new Promise(resolve => {
                    this.worldManager.loadChunkAndCallback(0, 0, resolve);
                })
            ]);
            
            this.playerState.setMeditationQuestions(loadedQuestions);
            console.log(`${loadedQuestions.length} meditation questions loaded.`);
            console.log("Starting chunk loaded. Spawning world items!");

            // Initial chunk load around origin
            this.worldManager.initialLoad(new THREE.Vector3(0, 0, 0));
            
            // In a real multiplayer game, the server would dictate what spawns.
            // For now, we'll keep the client-side spawning.
            this.npcManager.spawnInitialNPCs();
            this.essenceCollectibleManager.spawnInitialEssences();
            this.awakeningStoneManager.spawnInitialStones();

        } catch (error) {
            console.error("Failed to load critical game assets:", error);
            loadingScreen.textContent = "Error: Failed to load game assets.";
            throw error; // Stop initialization
        }
    }

    setupRoomListeners() {
        this.room.onStateChange((state) => {
            state.players.forEach((player, sessionId) => {
                const isLocalPlayer = (sessionId === this.room.sessionId);

                if (!playerEntities.has(sessionId)) {
                    // === Player JOINED ===
                    if (isLocalPlayer) {
                        console.log("Creating local player controller.");
                        // Create our player controller
                        this.localPlayer = new PlayerController(this.scene, player, this.playerState, this.enemyManager, this.vfxManager, this.dungeonManager);
                        playerEntities.set(sessionId, this.localPlayer);
                        
                        // Now that localPlayer exists, connect it to managers that need it
                        this.abilityManager.player = this.localPlayer;
                        this.interactionManager.player = this.localPlayer;
                        this.dungeonManager.player = this.localPlayer;

                    } else {
                        // Create a remote player's visual representation
                        console.log(`Creating remote player entity for ${player.username}`);
                        const geometry = new THREE.CapsuleGeometry(0.5, 1.0);
                        const material = new THREE.MeshStandardMaterial({ color: 0xffa500 }); // Orange for other players
                        const remotePlayerMesh = new THREE.Mesh(geometry, material);
                        remotePlayerMesh.position.set(player.x, player.y, player.z);
                        this.scene.add(remotePlayerMesh);
                        playerEntities.set(sessionId, remotePlayerMesh);
                    }
                } else {
                    // === Player UPDATED ===
                    const entity = playerEntities.get(sessionId);
                    if (!isLocalPlayer && entity) {
                        // Smoothly interpolate remote players' positions
                        entity.position.lerp(new THREE.Vector3(player.x, player.y, player.z), 0.2);
                        // Later, we'll want to interpolate rotation as well
                    }
                }
            });

            // === Player LEFT ===
            playerEntities.forEach((entity, sessionId) => {
                if (!state.players.has(sessionId)) {
                    console.log("Player left:", sessionId);
                    this.scene.remove(entity instanceof PlayerController ? entity.mesh : entity);
                    playerEntities.delete(sessionId);
                }
            });
        });

        this.room.onLeave((code) => {
            console.log("You have been disconnected.", code);
            // Here you would show a disconnect screen
        });
        
        this.room.onMessage("chat", (message) => {
            const chatMessages = document.getElementById('chat-messages');
            const messageEl = document.createElement('div');
            messageEl.textContent = `${message.sender}: ${message.content}`;
            chatMessages.appendChild(messageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }
    
    setupControls() {
        this.keys = {};
        this.isMouseDown = false;
        
        window.addEventListener('keydown', (e) => {
            if (!this.localPlayer) return;
            const key = e.key.toLowerCase();
            if (key !== 'f' && key !== 'control') this.keys[key] = true;
            
            // Check if typing in chat
            if (document.activeElement === document.getElementById('chat-input')) return;

            if (key === 'p') this.playerState.togglePvp(this.isPlayerInTown(this.localPlayer.mesh.position));
            if (key === 'm' && this.localPlayer.canPerformAction() && !this.playerState.isMeditating) this.playerState.startMeditation();
            if (key === 'u') this.uiManager.toggleCharacterSheet();
            if (key === 'i') this.uiManager.toggleInventoryScreen();
            if (key === 'c') this.localPlayer.toggleCrouch();
            if (key === 'g') this.playerState.toggleAura();
            if (key === ' ') this.localPlayer.requestJump();
            if (key === 'pageup') this.playerState.cycleEssence(-1);
            if (key === 'pagedown') this.playerState.cycleEssence(1);
            if (key === 'e') this.interactionManager.interact();
            if (key === 'f') this.localPlayer.performMeleeAttack();
            if (key === 'control') {
                const moveDir = this.localPlayer._getMoveDirection(this.keys, this.camera);
                this.localPlayer.requestRoll(moveDir);
            }

            const abilityKeys = ['1', '2', '3', '4', '5'];
            if (abilityKeys.includes(key)) {
                this.abilityManager.startAbility(parseInt(key) - 1);
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            const abilityKeys = ['1', '2', '3', '4', '5'];
            if (abilityKeys.includes(key)) {
                this.abilityManager.releaseAbility(parseInt(key) - 1);
            }
        });

        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const chatInput = e.target;
                const message = chatInput.value;
                if(message) {
                    this.room.send('chat', message);
                    chatInput.value = '';
                    chatInput.blur(); // Unfocus after sending
                }
            }
        });
        
        this.renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 2) this.isMouseDown = true; });
        window.addEventListener('mouseup', (e) => { if (e.button === 2) this.isMouseDown = false; });
        window.addEventListener('mousemove', (e) => { if (this.isMouseDown) this.cameraManager.handleMouseMove(e.movementX, e.movementY); });
        window.addEventListener('wheel', (e) => this.cameraManager.handleMouseWheel(e.deltaY) );
        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        this.ssaoPass.setSize(window.innerWidth, window.innerHeight);
        this.outlinePass.resolution.set(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.uiManager.isTutorialVisible) {
            this.composer.render();
            return;
        }

        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // Day/Night Cycle
        this.atmosphere.dayCycleTime += this.atmosphere.daySpeed * deltaTime;
        const sunAngle = this.atmosphere.dayCycleTime;
        const sunY = Math.max(0, Math.cos(sunAngle));
        this.directionalLight.intensity = sunY * 2.5;
        this.hemisphereLight.intensity = 0.3 + sunY * 0.9;
        if (sunY > 0.1) {
            this.scene.fog.color.lerpColors(this.atmosphere.duskColor, this.atmosphere.dayFogColor, (sunY - 0.1) / 0.9);
        } else {
            this.scene.fog.color.lerpColors(this.atmosphere.nightFogColor, this.atmosphere.duskColor, (sunY + 0.1) / 0.2);
        }
        this.scene.background.copy(this.scene.fog.color);

        // Update local player and send input
        if (this.localPlayer) {
            // Update systems that depend on local player
            if (!this.playerState.isMeditating) {
                this.localPlayer.update(deltaTime, this.keys, this.camera, this.worldManager);
                this.cameraManager.handleKeyRotation(this.keys);
            }
            this.cameraManager.update(this.localPlayer.mesh);
            this.worldManager.update(this.localPlayer.mesh.position);
            
            // Send input state to server (ideally on a fixed tick, but per-frame is okay for now)
            this.room.send("input", { keys: this.keys, camera: this.camera.quaternion.toArray() });

            // Update shadow camera to follow player
            const shadowCamSize = 15;
            this.directionalLight.shadow.camera.left = -shadowCamSize;
            this.directionalLight.shadow.camera.right = shadowCamSize;
            this.directionalLight.shadow.camera.top = shadowCamSize;
            this.directionalLight.shadow.camera.bottom = -shadowCamSize;
            this.directionalLight.target = this.localPlayer.mesh;
            this.directionalLight.shadow.camera.updateProjectionMatrix();
            
            // Log coordinates
            this.coordinateLogTimer += deltaTime;
            if (this.coordinateLogTimer >= this.LOG_INTERVAL) {
                const pos = this.localPlayer.mesh.position;
                console.log(`Player Coords: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`);
                this.coordinateLogTimer = 0;
            }
        }
        
        // Update other game systems
        this.playerState.updateBuffs();
        this.playerState.updateAuraEffects(deltaTime);
        this.playerState.updateSprint(deltaTime);
        this.portalManager.update(deltaTime);
        this.interactionManager.update();
        this.uiManager.update();
        this.vfxManager.update(deltaTime);
        this.abilityManager.update(deltaTime);
        this.enemyManager.update(this.localPlayer ? this.localPlayer.mesh : null, this.playerState, elapsedTime, deltaTime);
        this.essenceCollectibleManager.update(elapsedTime);
        this.awakeningStoneManager.update(elapsedTime);
        this.uiManager.updateFloatingLabels(this.camera, this.enemyManager.enemies);

        this.composer.render();
    }
}