import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/dist/esm/simplex-noise.js';
import { RANKS, getWeightedRandomRank } from './DungeonData.js';
import {
    AIR, GRASS, STONE, DIRT, BRICK, COBBLESTONE, WOOD_PLANKS,
    ROOF_SHINGLES, GLASS, WOOD_LOG, SAND, SANDSTONE, OBSIDIAN,
    BLOCK_TEXTURES, ATLAS_SIZE_IN_TILES
} from './BlockData.js';

// --- HELPER FUNCTION ---
function createSeededRandom(seed) {
    let a = seed;
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}


// --- CONSTANTS ---
const CHUNK_SIZE = 32;

const PORTAL_SPAWN_CHANCE = 0.05;

// Biome Palettes for flat terrain generation
const BIOME_PALETTES = {
    PLAINS: { top: GRASS, under: DIRT, stone: STONE },
    DESERT: { top: SAND, under: SANDSTONE, stone: STONE },
    FOREST: { top: GRASS, under: DIRT, stone: STONE },
};


// ====================================================================================
// THE TOWN BLUEPRINT & GENERATION LOGIC
// ====================================================================================
const TOWN_BLUEPRINT = [
    { type: 'road', x: -24, z: -24, sizeX: 48, sizeZ: 48 },
    { type: 'structure', name: 'spawn_fountain', x: -2, z: -2, sizeX: 4, sizeZ: 4, height: 2, material: STONE },
    { type: 'structure', name: 'spawn_pillar', x: -1, z: -1, sizeX: 2, sizeZ: 2, height: 4, material: BRICK },
    { type: 'road', x: -4, z: -60, sizeX: 8, sizeZ: 120 },
    { type: 'road', x: -60, z: -4, sizeX: 120, sizeZ: 8 },
    { type: 'house', name: 'adventurers_guild', x: 8, z: -28, sizeX: 14, sizeZ: 18, height: 7, materials: { wall: BRICK, floor: WOOD_PLANKS, roof: ROOF_SHINGLES, foundation: STONE } },
    { type: 'house', name: 'the_adamant_forge', x: -25, z: 8, sizeX: 12, sizeZ: 10, height: 5, materials: { wall: COBBLESTONE, floor: STONE, roof: WOOD_PLANKS, foundation: STONE } },
    { type: 'house', name: 'the_verdant_spire', x: 8, z: 8, sizeX: 10, sizeZ: 10, height: 8, materials: { wall: WOOD_PLANKS, floor: WOOD_PLANKS, roof: ROOF_SHINGLES, foundation: COBBLESTONE } },
    { type: 'house', name: 'town_hall', x: -30, z: -30, sizeX: 12, sizeZ: 12, height: 6, materials: { wall: BRICK, floor: WOOD_PLANKS, roof: ROOF_SHINGLES, foundation: STONE } },
    { type: 'structure', name: 'wall_north', x: -62, z: -62, sizeX: 124, sizeZ: 2, height: 6, material: COBBLESTONE },
    { type: 'structure', name: 'wall_west', x: -62, z: -60, sizeX: 2, sizeZ: 120, height: 6, material: COBBLESTONE },
    { type: 'structure', name: 'wall_east', x: 60, z: -60, sizeX: 2, sizeZ: 120, height: 6, material: COBBLESTONE },
    { type: 'structure', name: 'wall_south_west', x: -62, z: 60, sizeX: 58, sizeZ: 2, height: 6, material: COBBLESTONE },
    { type: 'structure', name: 'wall_south_east', x: 4, z: 60, sizeX: 58, sizeZ: 2, height: 6, material: COBBLESTONE },
    { type: 'structure', name: 'gate_tower_west', x: -8, z: 58, sizeX: 4, sizeZ: 6, height: 8, material: COBBLESTONE },
    { type: 'structure', name: 'gate_tower_east', x: 4, z: 58, sizeX: 4, sizeZ: 6, height: 8, material: COBBLESTONE },
];

const TOWN_BOUNDS = { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };
const TOWN_GROUND_Y = 10;

// All town and block generation functions remain the same...
function setBlock(blocks, x, y, z, blockType) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return;
    const index = y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
    blocks[index] = blockType;
}

function createBuilding(blocks, x, y, z, sizeX, sizeZ, height, material) {
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < sizeX; i++) {
            for (let k = 0; k < sizeZ; k++) {
                setBlock(blocks, x + i, y + j, z + k, material);
            }
        }
    }
}

function createHouse(blocks, x, y, z, sizeX, sizeZ, height, materials) {
    const { wall, floor, roof, foundation } = materials;
    createBuilding(blocks, x, y - 1, z, sizeX, sizeZ, 1, foundation || wall);
    createBuilding(blocks, x, y, z, sizeX, sizeZ, 1, floor);
    for (let j = 1; j < height; j++) {
        for (let i = 0; i < sizeX; i++) {
            setBlock(blocks, x + i, y + j, z, wall);
            setBlock(blocks, x + i, y + j, z + sizeZ - 1, wall);
        }
        for (let k = 1; k < sizeZ - 1; k++) {
            setBlock(blocks, x, y + j, z + k, wall);
            setBlock(blocks, x + sizeX - 1, y + j, z + k, wall);
        }
    }
    createBuilding(blocks, x, y + height, z, sizeX, sizeZ, 1, roof);
}

function createTownOfBeginnings(blocks, chunkX, chunkZ) {
    const isTownChunk = chunkX >= TOWN_BOUNDS.minX && chunkX <= TOWN_BOUNDS.maxX &&
        chunkZ >= TOWN_BOUNDS.minZ && chunkZ <= TOWN_BOUNDS.maxZ;
    if (!isTownChunk) return;

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            setBlock(blocks, x, TOWN_GROUND_Y - 1, z, DIRT);
            setBlock(blocks, x, TOWN_GROUND_Y, z, GRASS);
            for (let y = TOWN_GROUND_Y + 1; y < CHUNK_SIZE; y++) {
                setBlock(blocks, x, y, z, AIR);
            }
        }
    }

    const chunkWorldX = chunkX * CHUNK_SIZE;
    const chunkWorldZ = chunkZ * CHUNK_SIZE;
    const chunkWorldEndX = chunkWorldX + CHUNK_SIZE;
    const chunkWorldEndZ = chunkWorldZ + CHUNK_SIZE;

    TOWN_BLUEPRINT.forEach(part => {
        const partEndX = part.x + part.sizeX;
        const partEndZ = part.z + part.sizeZ;
        if (part.x < chunkWorldEndX && partEndX > chunkWorldX && part.z < chunkWorldEndZ && partEndZ > chunkWorldZ) {
            const startX = Math.max(part.x, chunkWorldX);
            const endX = Math.min(partEndX, chunkWorldEndX);
            const startZ = Math.max(part.z, chunkWorldZ);
            const endZ = Math.min(partEndZ, chunkWorldEndZ);
            const localX = startX - chunkWorldX;
            const localZ = startZ - chunkWorldZ;
            const sizeX = endX - startX;
            const sizeZ = endZ - startZ;

            if (part.type === 'road') {
                createBuilding(blocks, localX, TOWN_GROUND_Y, localZ, sizeX, sizeZ, 1, COBBLESTONE);
            } else if (part.type === 'structure') {
                createBuilding(blocks, localX, TOWN_GROUND_Y + 1, localZ, sizeX, sizeZ, part.height, part.material);
            } else if (part.type === 'house') {
                createHouse(blocks, localX, TOWN_GROUND_Y + 1, localZ, sizeX, sizeZ, part.height, part.materials);
            }
        }
    });
}

function createPortalArch(blocks, localX, localY, localZ) {
    const arch = [
        [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0],
        [0, 1, 0], [0, 2, 0], [0, 3, 0], [0, 4, 0],
        [4, 1, 0], [4, 2, 0], [4, 3, 0], [4, 4, 0],
        [1, 5, 0], [2, 5, 0], [3, 5, 0], [0, 5, 0], [4, 5, 0]
    ];
    arch.forEach(([dx, dy, dz]) => {
        setBlock(blocks, localX + dx, localY + dy, localZ + dz, OBSIDIAN);
    });
}

// Restored simple UV function
function getUVs(textureCoords) {
    const [tx, ty] = textureCoords;
    const tileU = 1 / ATLAS_SIZE_IN_TILES;
    const tileV = 1 / ATLAS_SIZE_IN_TILES;
    const epsilon = 0.001;
    const u0 = tx * tileU + epsilon;
    const v0 = 1.0 - (ty + 1) * tileV + epsilon;
    const u1 = (tx + 1) * tileU - epsilon;
    const v1 = 1.0 - ty * tileV - epsilon;
    return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
}

// --- WORKER MESSAGE HANDLER ---
self.onmessage = (e) => {
    try {
        const { workerId, chunkX, chunkZ, seed, lod } = e.data;
        const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
        const portalsGenerated = [];

        const getBlock = (x, y, z) => {
            if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return AIR;
            return blocks[y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x];
        };
        
        createTownOfBeginnings(blocks, chunkX, chunkZ); // Simplified for clarity

        if (chunkX === 0 && chunkZ === 0) { // Test portal
            createPortalArch(blocks, 18, 11, 18);
            portalsGenerated.push({ position: { x: chunkX * 32 + 18, y: 11, z: chunkZ * 32 + 18 }, rank: RANKS.IRON });
        }

        // ============================================================================
        // 5. MESH GENERATION (REVERTED TO STABLE NAIVE ALGORITHM)
        // ============================================================================
        const positions = [];
        const normals = [];
        const uvs = [];
        const worldOffsetX = chunkX * CHUNK_SIZE;
        const worldOffsetZ = chunkZ * CHUNK_SIZE;

        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                for (let x = 0; x < CHUNK_SIZE; x++) {
                    const blockType = getBlock(x, y, z);
                    if (blockType === AIR) continue;

                    const textureMap = BLOCK_TEXTURES[blockType];
                    if (!textureMap) continue;

                    const worldX = worldOffsetX + x;
                    const worldY = y;
                    const worldZ = worldOffsetZ + z;

                    const faces = [
                        { dir: [-1, 0, 0], normal: [-1, 0, 0], texture: textureMap.side || textureMap.all, corners: [[worldX, worldY, worldZ], [worldX, worldY, worldZ + 1], [worldX, worldY + 1, worldZ + 1], [worldX, worldY + 1, worldZ]] },
                        { dir: [1, 0, 0],  normal: [1, 0, 0],  texture: textureMap.side || textureMap.all, corners: [[worldX + 1, worldY, worldZ + 1], [worldX + 1, worldY, worldZ], [worldX + 1, worldY + 1, worldZ], [worldX + 1, worldY + 1, worldZ + 1]] },
                        { dir: [0, -1, 0], normal: [0, -1, 0], texture: textureMap.bottom || textureMap.all, corners: [[worldX + 1, worldY, worldZ], [worldX, worldY, worldZ], [worldX, worldY, worldZ + 1], [worldX + 1, worldY, worldZ + 1]] },
                        { dir: [0, 1, 0],  normal: [0, 1, 0],  texture: textureMap.top || textureMap.all, corners: [[worldX, worldY + 1, worldZ], [worldX, worldY + 1, worldZ + 1], [worldX + 1, worldY + 1, worldZ + 1], [worldX + 1, worldY + 1, worldZ]] },
                        { dir: [0, 0, -1], normal: [0, 0, -1], texture: textureMap.side || textureMap.all, corners: [[worldX + 1, worldY, worldZ], [worldX, worldY, worldZ], [worldX, worldY + 1, worldZ], [worldX + 1, worldY + 1, worldZ]] },
                        { dir: [0, 0, 1],  normal: [0, 0, 1],  texture: textureMap.side || textureMap.all, corners: [[worldX, worldY, worldZ + 1], [worldX + 1, worldY, worldZ + 1], [worldX + 1, worldY + 1, worldZ + 1], [worldX, worldY + 1, worldZ + 1]] },
                    ];

                    for (const { dir, normal, texture, corners } of faces) {
                        if (getBlock(x + dir[0], y + dir[1], z + dir[2]) === AIR) {
                            const [v1, v2, v3, v4] = corners;
                            positions.push(...v1, ...v2, ...v3, ...v1, ...v3, ...v4);
                            normals.push(...normal, ...normal, ...normal, ...normal, ...normal, ...normal);
                            const [uv1, uv2, uv3, uv4] = getUVs(texture);
                            uvs.push(...uv1, ...uv2, ...uv3, ...uv1, ...uv3, ...uv4);
                        }
                    }
                }
            }
        }

        // Send Data Back to Main Thread
        const pos = new Float32Array(positions);
        const norm = new Float32Array(normals);
        const uv = new Float32Array(uvs);

        self.postMessage({
            workerId, lod, chunkX, chunkZ,
            positions: pos, normals: norm, uvs: uv,
            blocks, portalsGenerated
        }, [pos.buffer, norm.buffer, uv.buffer, blocks.buffer]);

    } catch (e) {
        self.postMessage({ workerId: e.data?.workerId, error: e.message, stack: e.stack });
    }
};