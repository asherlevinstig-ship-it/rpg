// EnemyData.js (Shared, Server-Safe)

// This object contains only the authoritative game logic data for enemies.
// It has NO dependency on THREE.js.

export const ENEMY_TYPES = {
    SLIME: {
        type: 'Slime', // Used for quest progression
        name: 'Slime',
        width: 1, height: 1, // For server-side physics
        stats: {
            health: 20,
            speed: 1.5,
            xpValue: 5,
            aggroRange: 12,
        },
        abilities: [
            { type: 'MELEE', damage: 4, range: 1.5, cooldown: 2.0 }
        ]
    },
    SKELETON_ARCHER: {
        type: 'Skeleton', // Used for quest progression
        name: 'Skeleton Archer',
        width: 0.6, height: 1.8, // For server-side physics
        stats: {
            health: 30,
            speed: 1.0,
            xpValue: 10,
            aggroRange: 20,
        },
        abilities: [
            { type: 'RANGED', damage: 6, range: 15, cooldown: 3.0 }
        ]
    }
};