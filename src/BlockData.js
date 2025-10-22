// BlockData.js (ES6 module for client)

export const ATLAS_SIZE_IN_TILES = 16;

// Block IDs
export const AIR = 0;
export const GRASS = 1;
export const STONE = 2;
export const DIRT = 3;
export const BRICK = 4;
export const COBBLESTONE = 5;
export const WOOD_PLANKS = 6;
export const ROOF_SHINGLES = 7;
export const GLASS = 8;
export const WOOD_LOG = 9;
export const SAND = 10;
export const SANDSTONE = 11;
export const OBSIDIAN = 12;
export const LAVA = 13;
export const HELLSTONE = 14;

// Special, non-rendered block IDs for game logic
export const LAVA_LIGHT_SOURCE = 254;
export const FIREFLY_LIGHT_SOURCE = 255;

// Texture Mapping: [col, row] in the texture atlas
export const BLOCK_TEXTURES = {
    [GRASS]: { top: [0, 0], bottom: [2, 0], side: [1, 0] },
    [STONE]: { all: [2, 1] },
    [DIRT]: { all: [2, 0] },
    [BRICK]: { all: [3, 0] },
    [COBBLESTONE]: { all: [0, 1] },
    [WOOD_PLANKS]: { all: [3, 1] },
    [ROOF_SHINGLES]: { all: [0, 2] },
    [GLASS]: { all: [1, 2] },
    [WOOD_LOG]: { all: [1, 1] },
    [SAND]: { all: [0, 3] },
    [SANDSTONE]: { all: [1, 3] },
    [OBSIDIAN]: { all: [3, 3] },
    [LAVA]: { all: [2, 3] },
    [HELLSTONE]: { all: [3, 0] },
};