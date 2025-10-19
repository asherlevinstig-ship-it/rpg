import * as THREE from 'three';

// This defines where on our generated texture each block face will be drawn.
// It must match the coordinates used by ChunkWorker.js.
const BLOCK_TEXTURE_MAP = {
    grass_top:     [0, 0],
    grass_side:    [1, 0],
    dirt:          [2, 0],
    brick:         [3, 0],
    cobblestone:   [0, 1],
    wood:          [1, 1], // Oak Log
    stone:         [2, 1],
    wood_planks:   [3, 1],
    roof_shingles: [0, 2],
    glass:         [1, 2],
    // --- NEW TERRAIN & FLORA TEXTURES ---
    sand:          [0, 3],
    sandstone:     [1, 3],
    leaves:        [2, 3],
};

const TILE_SIZE = 16; // Each texture tile will be 16x16 pixels
const ATLAS_WIDTH_IN_TILES = 16;

export function generateTextureAtlas() {
    const canvas = document.createElement('canvas');
    const canvasSize = TILE_SIZE * ATLAS_WIDTH_IN_TILES;
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false; // Keep it pixelated

    // Helper to draw a speckled pattern
    const drawSpeckles = (x, y, w, h, baseColor, numSpeckles, speckleColors) => {
        context.fillStyle = baseColor;
        context.fillRect(x, y, w, h);
        for (let i = 0; i < numSpeckles; i++) {
            const speckleX = x + Math.floor(Math.random() * w);
            const speckleY = y + Math.floor(Math.random() * h);
            context.fillStyle = speckleColors[Math.floor(Math.random() * speckleColors.length)];
            context.fillRect(speckleX, speckleY, 1, 1);
        }
    };

    // --- Draw Grass Top [0, 0] ---
    let [tx, ty] = BLOCK_TEXTURE_MAP.grass_top;
    drawSpeckles(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE, '#548f40', 40, ['#4a7d38', '#63a34c']);

    // --- Draw Grass Side [1, 0] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.grass_side;
    context.fillStyle = '#7a553a'; // Dirt color
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.fillStyle = '#548f40'; // Green top
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, 3);

    // --- Draw Dirt [2, 0] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.dirt;
    drawSpeckles(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE, '#7a553a', 30, ['#6e4c34', '#8a6243']);

    // --- Draw Brick [3, 0] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.brick;
    const brickColor = '#a84c3c';
    const mortarColor = '#6b6b6b';
    context.fillStyle = mortarColor;
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.fillStyle = brickColor;
    for (let y = 0; y < TILE_SIZE; y += 4) {
        const isStaggered = (y / 4) % 2 !== 0;
        for (let x = 0; x < TILE_SIZE; x += 8) {
            context.fillRect(tx * TILE_SIZE + x + (isStaggered ? 4 : 0), ty * TILE_SIZE + y, 7, 3);
        }
    }

    // --- Draw Cobblestone [0, 1] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.cobblestone;
    drawSpeckles(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE, '#8a8a8a', 50, ['#7b7b7b', '#9c9c9c', '#6e6e6e']);
    context.strokeStyle = '#636363';
    context.lineWidth = 1;
    context.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

    // --- Draw Wood Log [1, 1] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.wood;
    context.fillStyle = '#6b4f39';
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.fillStyle = '#5e4532';
    context.fillRect(tx * TILE_SIZE + 2, ty * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    context.fillStyle = '#8a6d54';
    context.fillRect(tx * TILE_SIZE + 4, ty * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);

    // --- Draw Stone [2, 1] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.stone;
    drawSpeckles(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE, '#808080', 30, ['#757575', '#909090']);

    // --- Draw Wood Planks [3, 1] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.wood_planks;
    context.fillStyle = '#a38059';
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.fillStyle = '#8a6d4d';
    for(let y = 0; y < TILE_SIZE; y += 4) {
        context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE + y, TILE_SIZE, 1);
    }

    // --- Draw Roof Shingles [0, 2] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.roof_shingles;
    const shingleColor = '#7d3a3a';
    const shingleShadow = '#6e3131';
    context.fillStyle = shingleColor;
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.fillStyle = shingleShadow;
    for (let y = 0; y < TILE_SIZE; y += 4) {
        for (let x = (y/4 % 2 === 0) ? 0 : -4; x < TILE_SIZE; x += 8) {
            context.fillRect(tx * TILE_SIZE + x, ty * TILE_SIZE + y, 8, 2);
        }
    }

    // --- Draw Glass [1, 2] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.glass;
    context.fillStyle = '#e1f5fe';
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillRect(tx * TILE_SIZE + 2, ty * TILE_SIZE + 2, 6, 6);

    // --- NEW: Draw Sand [0, 3] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.sand;
    drawSpeckles(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE, '#e0d1a1', 40, ['#d4c595', '#e8d9ab']);

    // --- NEW: Draw Sandstone [1, 3] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.sandstone;
    context.fillStyle = '#d1b987';
    context.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.strokeStyle = '#c5a971';
    context.lineWidth = 1;
    context.strokeRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    context.beginPath();
    context.moveTo(tx * TILE_SIZE, ty * TILE_SIZE + 4);
    context.lineTo(tx * TILE_SIZE + TILE_SIZE, ty * TILE_SIZE + 4);
    context.moveTo(tx * TILE_SIZE, ty * TILE_SIZE + 9);
    context.lineTo(tx * TILE_SIZE + TILE_SIZE, ty * TILE_SIZE + 9);
    context.stroke();

    // --- NEW: Draw Leaves [2, 3] ---
    [tx, ty] = BLOCK_TEXTURE_MAP.leaves;
    drawSpeckles(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE, '#3a752a', 60, ['#2e5c21', '#4b9436']);


    // Create a Three.js texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; // Keep pixels sharp
    texture.minFilter = THREE.NearestFilter;
    return texture;
}
