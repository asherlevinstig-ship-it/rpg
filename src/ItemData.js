// ItemData.js
// This file will store the definitions for all items in the game.

const HealthPotion = {
    id: 'item_health_potion_01',
    name: 'Health Potion',
    type: 'Consumable',
    description: 'A simple brew that restores a small amount of health.',
    effect: {
        type: 'heal',
        amount: 25
    }
};

// --- NEW WEAPON ---
const RustySword = {
    id: 'wep_rusty_sword_01',
    name: 'Rusty Sword',
    type: 'Weapon',
    slot: 'mainHand', // Where it gets equipped
    description: 'A worn, but serviceable blade.',
    damage: 8, // The weapon's base damage
    stats: { // Optional stat bonuses
        might: 1
    }
};

// --- NEW ARMOR ---
const LeatherTunic = {
    id: 'arm_leather_tunic_01',
    name: 'Leather Tunic',
    type: 'Armor',
    slot: 'chest', // Where it gets equipped
    description: 'Simple hardened leather armor.',
    defense: 5, // A new stat for damage reduction
    stats: {
        endurance: 2
    }
};

const TrainingSword = {
    id: 'wep_wood_sword_01',
    name: 'Training Sword',
    type: 'Weapon',
    slot: 'mainHand',
    description: 'A simple wooden sword for practice. Better than your fists.',
    damage: 4
};

module.exports = {
    HealthPotion,
    RustySword,
    LeatherTunic,
    TrainingSword
};