// DungeonData.js
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

import { STONE, COBBLESTONE, OBSIDIAN, DIRT } from './BlockData.js';

// Defines the properties for each dungeon rank
export const RANKS = {
    IRON: {
        name: 'Iron',
        color: new THREE.Color(0x8d8d8d), // Dull gray
        weight: 40, // More likely to spawn
    },
    BRONZE: {
        name: 'Bronze',
        color: new THREE.Color(0xcd7f32), // Coppery brown
        weight: 30,
    },
    SILVER: {
        name: 'Silver',
        color: new THREE.Color(0xc0c0c0), // Bright silver
        weight: 15,
    },
    GOLD: {
        name: 'Gold',
        color: new THREE.Color(0xffd700), // Glistening gold
        weight: 10,
    },
    DIAMOND: {
        name: 'Diamond',
        color: new THREE.Color(0xb9f2ff), // Light cyan/diamond blue
        weight: 4,
    },
    TRANSCENDENT: {
        name: 'Transcendent',
        color: new THREE.Color(0x9932cc), // Deep purple
        weight: 0.9,
    },
    ASCENDED: {
        name: 'Ascended',
        color: new THREE.Color(0xffffff), // Pure, bright white
        weight: 0.1, // Extremely rare
    }
};

// A helper function to pick a rank based on weighted probability
export function getWeightedRandomRank(prng) {
    const totalWeight = Object.values(RANKS).reduce((sum, rank) => sum + rank.weight, 0);
    let random = prng() * totalWeight;

    for (const rank of Object.values(RANKS)) {
        if (random < rank.weight) {
            return rank;
        }
        random -= rank.weight;
    }
    return RANKS.IRON; // Fallback
}


// Defines the properties for each dungeon theme
export const DUNGEON_THEMES = {
    CAVE: {
        name: 'Cave',
        palette: {
            wall: STONE,
            floor: COBBLESTONE,
            detail: DIRT,
        }
    },
    HELL: {
        name: 'Hell',
        palette: {
            wall: OBSIDIAN,
            floor: OBSIDIAN,
            detail: STONE,
        }
    }
};