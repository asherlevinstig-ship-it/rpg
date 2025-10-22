// ItemData.js (ES6 module for client)

export const HealthPotion = {
    id: 'item_health_potion_01',
    name: 'Health Potion',
    type: 'Consumable',
    description: 'A simple brew that restores a small amount of health.',
    effect: {
        type: 'heal',
        amount: 25
    }
};

export const RustySword = {
    id: 'wep_rusty_sword_01',
    name: 'Rusty Sword',
    type: 'Weapon',
    slot: 'mainHand',
    description: 'A worn, but serviceable blade.',
    damage: 8,
    stats: {
        might: 1
    }
};

export const LeatherTunic = {
    id: 'arm_leather_tunic_01',
    name: 'Leather Tunic',
    type: 'Armor',
    slot: 'chest',
    description: 'Simple hardened leather armor.',
    defense: 5,
    stats: {
        endurance: 2
    }
};

export const TrainingSword = {
    id: 'wep_wood_sword_01',
    name: 'Training Sword',
    type: 'Weapon',
    slot: 'mainHand',
    description: 'A simple wooden sword for practice. Better than your fists.',
    damage: 4
};