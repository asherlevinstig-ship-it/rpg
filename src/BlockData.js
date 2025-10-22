// BlockData.js

// Block IDs
const AIR = 0;
const GRASS = 1;
const STONE = 2;
const DIRT = 3;
const BRICK = 4;
const COBBLESTONE = 5;
const WOOD_PLANKS = 6;
const ROOF_SHINGLES = 7;
const GLASS = 8;
const WOOD_LOG = 9;
const SAND = 10;
const SANDSTONE = 11;
const OBSIDIAN = 12;
const LAVA = 13;
const HELLSTONE = 14; // <-- New Block

// Special, non-rendered block IDs for game logic
const LAVA_LIGHT_SOURCE = 254;
const FIREFLY_LIGHT_SOURCE = 255;

const ATLAS_SIZE_IN_TILES = 16;

// Texture Mapping: [col, row] in the texture atlas
const BLOCK_TEXTURES = {
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
    [HELLSTONE]: { all: [3, 0] }, // <-- Maps HELLSTONE to the red brick texture
};

module.exports = {
    ATLAS_SIZE_IN_TILES,
    AIR,
    GRASS,
    STONE,
    DIRT,
    BRICK,
    COBBLESTONE,
    WOOD_PLANKS,
    ROOF_SHINGLES,
    GLASS,
    WOOD_LOG,
    SAND,
    SANDSTONE,
    OBSIDIAN,
    LAVA,
    HELLSTONE,
    LAVA_LIGHT_SOURCE,
    FIREFLY_LIGHT_SOURCE,
    BLOCK_TEXTURES
};