// aetheria-server/index.js

const colyseus = require('colyseus');
const { Schema, MapSchema, ArraySchema, type } = require('@colyseus/schema');
const http = require('http');
const express = require('express');
const THREE = require('three');
const fs = require('fs');
const path = require('path');
const { createNoise2D } = require('simplex-noise');

// --- AUTHORITATIVE DATA IMPORTS ---
const { DUNGEON_THEMES } = require('./DungeonData.js');
const { ENEMY_TYPES } = require('./EnemyData.js');
const { RANKS } = require('./DungeonData.js');
const { AIR, LAVA } = require('./BlockData.js');
const { Pathfinder } = require('./Pathfinder.js');
const { LesserMightEssence } = require('./EssenceData.js');
const { HealthPotion, RustySword } = require('./ItemData.js');
const { StoneOfImpact } = require('./AwakeningStoneData.js');

// --- SERVER-SIDE CONSTANTS ---
const GRAVITY = -30;
const MOVE_SPEED = 5;
const JUMP_STRENGTH = 10;
const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const MAX_ENEMIES_OVERWORLD = 50;
const SPAWN_INTERVAL = 1.0;
const SAFE_ZONE = { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };

// --- AUTHORITATIVE WORLD DATA ---
const NPC_DATA = [ { id: "npc_gideon", name: "Elder Gideon", x: 5, y: 11, z: 5, questId: "MSQ_01", dialogue: ["Welcome...", "Slimes are aggressive.", "Dispatch 3 of them."] } ];
const PORTAL_LOCATIONS = [ { id: "portal_iron_1", name: RANKS.IRON.name, x: 18, y: 11, z: 18, color: `#${RANKS.IRON.color.getHexString()}` } ];

// Load Quest Database on server start
let QUEST_DATABASE = {};
try {
    const questDataPath = path.resolve(__dirname, 'main-story-quests.json');
    const questDataFile = fs.readFileSync(questDataPath, 'utf8');
    QUEST_DATABASE = JSON.parse(questDataFile);
    console.log("✅ Successfully loaded quest database.");
} catch (e) {
    console.error("❌ Failed to load main-story-quests.json.", e);
}

// ====================================================================================
// 1. DEFINE THE STATE SCHEMAS
// ====================================================================================

class SyncedItem extends Schema { @type("string") id; @type("string") name; }
class ActiveQuestObjective extends Schema { @type("string") description; @type("number") progress = 0; @type("number") amount = 1; }
class ActiveQuest extends Schema { @type("string") id; @type("string") title; @type("boolean") readyForTurnIn = false; @type([ActiveQuestObjective]) objectives = new ArraySchema(); }

class Player extends Schema {
    @type("string") username = "New Player";
    @type("float32") x = 0; @type("float32") y = 30; @type("float32") z = 0;
    @type("float32") currentHealth = 100; @type("float32") maxHealth = 100;
    @type("float32") currentMana = 50; @type("float32") maxMana = 50;
    @type({ map: SyncedItem }) equipment = new MapSchema();
    @type([SyncedItem]) inventory = new ArraySchema();
    @type("string") mainStoryState = "NOT_STARTED";
    @type({ map: ActiveQuest }) activeQuests = new MapSchema();
    @type(["string"]) completedQuests = new ArraySchema();
}

class Enemy extends Schema {
    @type("string") type; @type("string") name; @type("string") classType;
    @type("float32") x; @type("float32") y; @type("float32") z;
    @type("float32") health; @type("float32") maxHealth;
}

class NPC extends Schema { @type("string") name; @type("float32") x; @type("float32") y; @type("float32") z; }
class Portal extends Schema { @type("string") name; @type("float32") x; @type("float32") y; @type("float32") z; @type("string") color; }

class MyRoomState extends Schema {
    @type({ map: Player }) players = new MapSchema();
    @type({ map: NPC }) npcs = new MapSchema();
    @type({ map: Portal }) portals = new MapSchema();
    @type({ map: Enemy }) enemies = new MapSchema();
}

// ====================================================================================
// 2. SERVER-SIDE "BRAIN" CLASSES (Non-synced logic)
// ====================================================================================

class ServerPlayerState {
    constructor(playerSchema) { this.schema = playerSchema; this.cooldowns = new Map(); this.essences = []; this.inventory = []; this.addItem(HealthPotion); this.addItem(RustySword); this.addEssence(LesserMightEssence); if(this.essences[0]) { this.essences[0].awakeningStones[0] = StoneOfImpact; } }
    startQuest(questId) { if(this.schema.activeQuests.has(questId)||this.schema.completedQuests.includes(questId))return; const qd=QUEST_DATABASE[questId]; if(!qd)return; if(qd.type==='main_story')this.schema.mainStoryState=`${questId}_IN_PROGRESS`; const aq=new ActiveQuest(); aq.id=questId; aq.title=qd.title; qd.objectives.forEach(od=>{const o=new ActiveQuestObjective(); o.description=od.description; o.amount=od.amount; aq.objectives.push(o);}); this.schema.activeQuests.set(questId,aq); }
    notify(eventType, data) { this.schema.activeQuests.forEach(aq=>{if(aq.readyForTurnIn)return; const qd=QUEST_DATABASE[aq.id]; let p=false; qd.objectives.forEach((od,i)=>{const o=aq.objectives[i]; if(eventType==='ENEMY_KILLED'&&od.type==='kill'&&od.target===data.type){if(o.progress<o.amount){o.progress+=data.amount||1;p=true;}}}); if(p)this.checkQuestCompletion(aq.id);}); }
    checkQuestCompletion(questId) { const aq=this.schema.activeQuests.get(questId); if(!aq||aq.readyForTurnIn)return; const allMet=aq.objectives.every(o=>o.progress>=o.amount); if(allMet)aq.readyForTurnIn=true; }
    addEssence(essenceData) { const e=JSON.parse(JSON.stringify(essenceData)); this.essences.push(e); }
    addItem(itemData) { this.inventory.push(itemData); this.syncInventoryToSchema(); }
    useItem(inventoryIndex) { const i=this.inventory[inventoryIndex]; if(!i)return; switch(i.type.toLowerCase()){case'consumable':if(i.effect.type==='heal')this.schema.currentHealth=Math.min(this.schema.maxHealth,this.schema.currentHealth+i.effect.amount); this.inventory.splice(inventoryIndex,1);break; case'weapon':case'armor':this.equipItem(i,inventoryIndex);break;} this.syncInventoryToSchema(); }
    equipItem(itemToEquip, inventoryIndex) { const s=itemToEquip.slot; if(!s)return; this.inventory.splice(inventoryIndex,1); const n=new SyncedItem(); n.id=itemToEquip.id; n.name=itemToEquip.name; this.schema.equipment.set(s,n); }
    syncInventoryToSchema() { this.schema.inventory.clear(); this.inventory.forEach(i=>{const s=new SyncedItem();s.id=i.id;s.name=i.name;this.schema.inventory.push(s);}); }
    spendMana(amount) { if(this.schema.currentMana>=amount){this.schema.currentMana-=amount;return true;}return false; }
    isOnCooldown(abilityId) { const c=this.cooldowns.get(abilityId); if(!c)return false; if(Date.now()-c.lastUsed>c.duration*1000){this.cooldowns.delete(abilityId);return false;}return true; }
    startCooldown(abilityId, duration) { this.cooldowns.set(abilityId,{lastUsed:Date.now(),duration}); }
    getMeleeDamage() { let damage = 5; const weapon = this.schema.equipment.get('mainHand'); if (weapon?.id === 'item_rusty_sword') damage += 3; return damage; }
}

class ServerEnemy {
    constructor(schema, room) { this.schema = schema; this.typeData = ENEMY_TYPES[schema.type]; this.room = room; this.velocity = new THREE.Vector3(); this.isGrounded = false; this.path = []; this.lastPathfindTime = 0; }
    takeDamage(amount, attackerId) { this.schema.health -= amount; if(this.schema.health<=0){ this.schema.health=0; this.handleDeath(attackerId); } }
    handleDeath(attackerId) { const c=this.room.clients.find(c=>c.sessionId===attackerId); if(c)c.userData.serverState.notify("ENEMY_KILLED",{type:this.typeData.type}); this.room.serverEnemies.delete(this.schema.id); this.room.state.enemies.delete(this.schema.id); }
    update(dt) { let cP=null; let mDSq=Infinity; this.room.state.players.forEach(p=>{const dSq=new THREE.Vector3(this.schema.x,this.schema.y,this.schema.z).distanceToSquared(new THREE.Vector3(p.x,p.y,p.z)); if(dSq<mDSq){mDSq=dSq;cP=p;}}); if(cP&&mDSq<this.typeData.stats.aggroRange**2){if(this.room.clock.elapsedTime-this.lastPathfindTime>2000){this.lastPathfindTime=this.room.clock.elapsedTime;const wMStub={getBlock:(x,y,z)=>this.room._getBlock(x,y,z)};const sV=new THREE.Vector3(this.schema.x,this.schema.y,this.schema.z),eV=new THREE.Vector3(cP.x,cP.y,cP.z);this.path=this.room.pathfinder.findPath(wMStub,sV,eV);if(this.path)this.path.shift();}if(this.path&&this.path.length>0){const nW=this.path[0],d=nW.clone().sub(new THREE.Vector3(this.schema.x,this.schema.y,this.schema.z)).normalize();this.velocity.x=d.x*this.typeData.stats.speed;this.velocity.z=d.z*this.typeData.stats.speed;if(new THREE.Vector3(this.schema.x,0,this.schema.z).distanceTo(new THREE.Vector3(nW.x,0,nW.z))<0.5)this.path.shift();}else{this.velocity.x=0;this.velocity.z=0;}}else{this.velocity.x=0;this.velocity.z=0;this.path=[];} this.velocity.y+=GRAVITY*dt; this.room._handleCollisions(this.schema,this.velocity,dt,this.typeData.width,this.typeData.height); this.isGrounded=this.room._checkGrounded(this.schema,this.typeData.height); }
}

// ====================================================================================
// 3. DEFINE THE GAME ROOM
// ====================================================================================

class GameRoom extends colyseus.Room {
    onCreate(options) {
        this.setState(new MyRoomState());
        this.setSimulationInterval((deltaTime) => this.update(deltaTime / 1000));
        this.serverEnemies = new Map(); this.spawnTimer = 0;
        this.pathfinder = new Pathfinder();
        this.spawnInitialPortals(); this.spawnInitialNPCs();

        this.onMessage("input", (c, i) => { if (c.userData) c.userData.input = i; });
        this.onMessage("interact_npc", (c, m) => { const p=this.state.players.get(c.sessionId),nd=NPC_DATA.find(n=>n.id===m.npcId);if(!p||!nd)return; const d=new THREE.Vector3(p.x,p.y,p.z).distanceTo(new THREE.Vector3(nd.x,nd.y,nd.z));if(d<3)c.send("npc_dialogue",{name:nd.name,dialogue:nd.dialogue,questId:nd.questId});});
        this.onMessage("start_quest", (c, m) => { if (c.userData.serverState) c.userData.serverState.startQuest(m.questId); });
        
        this.onMessage("enter_portal", (c, m) => {
            const p=this.state.players.get(c.sessionId),poD=PORTAL_LOCATIONS.find(p=>p.id===m.portalId);if(!p||!poD||c.userData.locationType!=='overworld')return;
            const d=new THREE.Vector3(p.x,p.y,p.z).distanceTo(new THREE.Vector3(poD.x+2,poD.y+2,poD.z));
            if (d<3.0){
                const t=Math.random()<0.5?DUNGEON_THEMES.CAVE:DUNGEON_THEMES.HELL, s=Math.random()*100000; const dD=this.generateDungeonData(t,s);
                c.userData.locationType='dungeon'; c.userData.dungeon=dD;
                c.send("load_dungeon",{dungeonData:{blocks:dD.blocks},spawnPoint:dD.spawnPoint,theme:dD.theme});
                p.x=dD.spawnPoint.x;p.y=dD.spawnPoint.y;p.z=dD.spawnPoint.z;
                this.serverEnemies.forEach(e=>this.state.enemies.delete(e.schema.id)); this.serverEnemies.clear();
            }
        });

        this.onMessage("melee_attack", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            const serverState = client.userData.serverState;
            if (!player || !serverState) return;

            const attackRangeSq = 2.5 ** 2;
            const damage = serverState.getMeleeDamage();
            
            this.serverEnemies.forEach(enemy => {
                const distSq = new THREE.Vector3(player.x, player.y, player.z).distanceToSquared(new THREE.Vector3(enemy.schema.x, enemy.schema.y, enemy.schema.z));
                if (distSq < attackRangeSq) {
                    enemy.takeDamage(damage, client.sessionId);
                }
            });
            this.broadcast("play_vfx", { type: "createMeleeSlash", position: { x: player.x, y: player.y + 1, z: player.z } });
        });
        
        this.onMessage("use_ability", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            const serverState = client.userData.serverState;
            if (!player || !serverState) return;
            const ability = (message.slotIndex === 0) ? serverState.essences[0]?.abilities[0] : serverState.essences[0]?.awakeningStones[0];
            if (!ability) return;
            const cooldown = (ability.mods?.find(m => m.type === 'COOLDOWN')?.seconds) || ability.cooldown || 0;
            const cost = ability.cost || 0;
            if (serverState.isOnCooldown(ability.id) || !serverState.spendMana(cost)) return;
            if (cooldown > 0) serverState.startCooldown(ability.id, cooldown);
            this.executeAbility(player, client.sessionId, serverState, ability);
        });
    }

    onJoin(client, options) {
        const player = new Player(); player.username = options.username; this.state.players.set(client.sessionId, player);
        const serverState = new ServerPlayerState(player);
        client.userData = { velocity: new THREE.Vector3(), input: { keys: {} }, serverState: serverState, locationType: 'overworld', dungeon: null };
    }

    update(dt) {
        this.state.players.forEach((p, sId) => { const c=this.clients.find(c=>c.sessionId===sId); if(!c||!c.userData?.input)return; const {velocity:v,input:i,dungeon:d}=c.userData; const mD=this._getMoveDirection(i.keys); v.x=mD.x*MOVE_SPEED; v.z=mD.z*MOVE_SPEED; v.y+=GRAVITY*dt; if(i.keys[' '&&c.userData.isGrounded])v.y=JUMP_STRENGTH; this._handleCollisions(p,v,dt,PLAYER_WIDTH,PLAYER_HEIGHT,d); c.userData.isGrounded=this._checkGrounded(p,PLAYER_HEIGHT,d); });
        this.serverEnemies.forEach(e => e.update(dt));
        this.spawnTimer+=dt; const pIO=this.clients.filter(c=>c.userData.locationType==='overworld'); if(this.spawnTimer>SPAWN_INTERVAL&&this.state.enemies.size<MAX_ENEMIES_OVERWORLD&&pIO.length>0){this.spawnTimer=0;const rP=pIO[Math.floor(Math.random()*pIO.length)].state;this.spawnEnemyNearPlayer(rP);}
    }

    onLeave(client, consented) { const p=this.state.players.get(client.sessionId); if(p) this.state.players.delete(client.sessionId); }
    onDispose() {}

    spawnInitialPortals() { PORTAL_LOCATIONS.forEach(loc => { const p = new Portal(); Object.assign(p, loc); this.state.portals.set(loc.id, p); }); }
    spawnInitialNPCs() { NPC_DATA.forEach(data => { const n = new NPC(); Object.assign(n, data); this.state.npcs.set(data.id, n); }); }
    
    spawnEnemyNearPlayer(player) {
        const angle = Math.random() * Math.PI * 2, radius = 40 + Math.random() * 40, spawnX = Math.round(player.x + Math.cos(angle) * radius), spawnZ = Math.round(player.z + Math.sin(angle) * radius);
        if (spawnX > SAFE_ZONE.minX && spawnX < SAFE_ZONE.maxX && spawnZ > SAFE_ZONE.minZ && spawnZ < SAFE_ZONE.maxZ) return;
        if (this._getBlock(spawnX, 10, spawnZ) === 0) return;
        const enemyKeys = Object.keys(ENEMY_TYPES), randomKey = enemyKeys[Math.floor(Math.random() * enemyKeys.length)], typeData = ENEMY_TYPES[randomKey];
        const enemy = new Enemy(); enemy.id = colyseus.generateId(); enemy.type = randomKey; enemy.name = typeData.name; enemy.classType = Math.random() < 0.1 ? 'elite' : 'minion';
        enemy.x = spawnX; enemy.y = 11; enemy.z = spawnZ; enemy.maxHealth = typeData.stats.health * (enemy.classType === 'elite' ? 2 : 1); enemy.health = enemy.maxHealth;
        this.state.enemies.set(enemy.id, enemy); this.serverEnemies.set(enemy.id, new ServerEnemy(enemy, this));
    }

    executeAbility(player, sessionId, serverState, ability) {
        console.log(`✅ ${player.username} used ability: ${ability.name}`);
        this.broadcast("play_vfx", { type: ability.vfx, position: { x: player.x, y: player.y, z: player.z } });
        if (ability.type === 'AOE_DAMAGE') {
            const rangeSq = ability.range ** 2;
            this.serverEnemies.forEach(enemy => {
                const distSq = new THREE.Vector3(player.x, player.y, player.z).distanceToSquared(new THREE.Vector3(enemy.schema.x, enemy.schema.y, enemy.schema.z));
                if (distSq < rangeSq) enemy.takeDamage(ability.damage, sessionId);
            });
        }
    }
    
    _getMoveDirection(k={}) { const mD=new THREE.Vector3();if(k['w'])mD.z-=1;if(k['s'])mD.z+=1;if(k['a'])mD.x-=1;if(k['d'])mD.x+=1;if(mD.lengthSq()>0)mD.normalize();return mD; }
    _handleCollisions(e, v, dt, w, h, dD) { const hW=w/2; e.y+=v.y*dt; if(this._isCollidingOnAxis(e,'y',w,h,dD)){v.y=0;e.y=(v.y<0)?Math.floor(e.y)+1:Math.floor(e.y+h)-h;} e.x+=v.x*dt; if(this._isCollidingOnAxis(e,'x',w,h,dD)){e.x=(v.x>0)?Math.floor(e.x+hW)-hW:Math.floor(e.x-hW)+1+hW;} e.z+=v.z*dt; if(this._isCollidingOnAxis(e,'z',w,h,dD)){e.z=(v.z>0)?Math.floor(e.z+hW)-hW:Math.floor(e.z-hW)+1+hW;} }
    _isCollidingOnAxis(e, a, w, h, dD) { const hW=w/2,hs=[0.1,h/2,h-0.1]; for(const H of hs){const yP=e.y+H; if(a==='y'){if(this._getBlock(e.x,e.y,e.z,dD)!==0||this._getBlock(e.x,e.y+h,e.z,dD)!==0)return true;}else if(a==='x'){if(this._getBlock(e.x-hW,yP,e.z,dD)!==0||this._getBlock(e.x+hW,yP,e.z,dD)!==0)return true;}else{if(this._getBlock(e.x,yP,e.z-hW,dD)!==0||this._getBlock(e.x,yP,e.z+hW,dD)!==0)return true;}}return false; }
    _checkGrounded(e, h, dD) { return this._getBlock(e.x,e.y-0.1,e.z,dD)!==0; }
    _getBlock(wX,wY,wZ,dD=null) { if(dD){const DW=128,DH=32,DD=128,x=Math.floor(wX),y=Math.floor(wY),z=Math.floor(wZ);if(!dD.blocks||x<0||x>=DW||y<0||y>=DH||z<0||z>=DD)return 0;const i=y*DD*DW+z*DW+x;return new Uint8Array(dD.blocks)[i];}else{if(wY<10)return 1;return 0;} }
    generateDungeonData(t, s) { const DW=128,DH=32,DD=128,b=new Uint8Array(DW*DH*DD).fill(AIR),n2D=createNoise2D(()=>s),sc=0.05,bH=4,a=8; for(let x=0;x<DW;x++){for(let z=0;z<DD;z++){const nV=(n2D(x*sc,z*sc)+1)/2,h=bH+Math.floor(nV*a);for(let y=0;y<=h;y++){b[y*DD*DW+z*DW+x]=t.palette.wall;}}} const cH=20; for(let x=0;x<DW;x++){for(let z=0;z<DD;z++){b[cH*DD*DW+z*DW+x]=t.palette.wall;}} if(t.name==='Hell'){const lL=4;for(let x=0;x<DW;x++){for(let z=0;z<DD;z++){const i=lL*DD*DW+z*DW+x;if(b[i]!==AIR)b[i]=LAVA;}}} const sP={x:64.5,y:15,z:64.5}; for(let y=DH-1;y>=0;y--){if(this._getBlock(sP.x,y,sP.z,{blocks:b.buffer})!==0){sP.y=y+1.1;break;}} return{blocks:b.buffer,meshData:{},spawnPoint:sP,theme:t}; }
}

// ====================================================================================
// 4. SET UP AND START THE GAME SERVER
// ====================================================================================

const express = require("express");
const { listen } = require("@colyseus/tools");
const { GameRoom } = require("./rooms/GameRoom");

listen({
  options: {
    initializeGameServer: (gameServer) => {
      // Define your rooms here
      gameServer.define("game_room", GameRoom);
    },
  },

  // Optional: customize Express (HTTP endpoints)
  initializeExpress: (app) => {
    app.use(express.json());
    app.get("/", (req, res) => {
      res.send("Aetheria server is running.");
    });
  },
});