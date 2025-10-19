import * as THREE from 'three';

// The size of each world chunk in blocks (width, depth, and height).
const CHUNK_SIZE = 32;

/**
 * A simple and efficient min-priority queue implemented with a binary heap.
 * This is used to ensure the chunks closest to the player are generated first,
 * providing a smoother loading experience.
 */
class PriorityQueue {
    constructor() {
        this._heap = [];
    }

    _getParentIndex(i) { return Math.floor((i - 1) / 2); }
    _getLeftChildIndex(i) { return 2 * i + 1; }
    _getRightChildIndex(i) { return 2 * i + 2; }
    _swap(i, j) { [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]]; }

    /**
     * Adds an item to the queue and sorts it based on its priority (distance).
     * @param {{distance: number}} item The item to add, which must have a 'distance' property.
     */
    push(item) {
        this._heap.push(item);
        let index = this._heap.length - 1;
        while (index > 0 && this._heap[index].distance < this._heap[this._getParentIndex(index)].distance) {
            this._swap(index, this._getParentIndex(index));
            index = this._getParentIndex(index);
        }
    }

    /**
     * Removes and returns the item with the highest priority (lowest distance).
     * @returns {object | undefined} The highest-priority item, or undefined if the queue is empty.
     */
    pop() {
        if (this.isEmpty()) return undefined;

        this._swap(0, this._heap.length - 1);
        const item = this._heap.pop();
        
        let index = 0;
        while (this._getLeftChildIndex(index) < this._heap.length) {
            let smallerChildIndex = this._getLeftChildIndex(index);
            if (this._getRightChildIndex(index) < this._heap.length && this._heap[this._getRightChildIndex(index)].distance < this._heap[smallerChildIndex].distance) {
                smallerChildIndex = this._getRightChildIndex(index);
            }

            if (this._heap[index].distance < this._heap[smallerChildIndex].distance) break;
            
            this._swap(index, smallerChildIndex);
            index = smallerChildIndex;
        }
        return item;
    }

    isEmpty() {
        return this._heap.length === 0;
    }

    size() {
        return this._heap.length;
    }
}

/**
 * Manages the procedural generation, loading, and unloading of the game world.
 */
export class WorldManager {
    constructor(scene, seed, portalManager) {
        this.scene = scene;
        this.seed = seed;
        this.portalManager = portalManager;

        // Data Structures
        this.chunks = new Map(); // Stores active chunk data (mesh, blocks, LOD)
        this.chunkQueue = new PriorityQueue(); // Prioritizes which chunks to generate next
        this.queuedChunkKeys = new Set(); // Tracks keys in the queue for fast duplicate checks
        this.chunkLoadCallbacks = new Map(); // Stores callbacks for when specific chunks are loaded

        // Player State
        this.lastPlayerChunk = { x: null, z: null };
        this.viewDistance = 8; // How many chunks to render around the player

        // Rendering & Assets
        this.texture = null;
        this.material = null;

        // Worker Pool for concurrent chunk generation
        this.workers = [];
        const numWorkers = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
        console.log(`Initializing WorldManager with ${numWorkers} workers.`);
        for (let i = 0; i < numWorkers; i++) {
            try {
                const worker = new Worker('./ChunkWorker.js', { type: 'module' });
                worker.onmessage = this._onWorkerMessage.bind(this);
                this.workers.push({ id: i, instance: worker, isBusy: false });
            } catch (e) {
                console.error("WorldManager Error: Failed to create worker.", e);
            }
        }

        // Level of Detail (LOD) configuration
        this.lodDistances = [
            { distance: 0, detail: 0 }, // LOD 0 (highest detail) for chunks 0-3 units away
            { distance: 4, detail: 1 }, // LOD 1 for chunks 4-5 units away
            { distance: 6, detail: 2 }, // LOD 2 (lowest detail) for chunks 6+ units away
        ];
        // Sort by distance descending to make finding the correct LOD easier
        this.lodDistances.sort((a, b) => b.distance - a.distance);
    }

    /**
     * Sets the texture atlas for the world material.
     * @param {THREE.Texture} texture The texture atlas.
     */
    setTexture(texture) {
        this.texture = texture;
        this.material = new THREE.MeshLambertMaterial({
            map: this.texture,
            side: THREE.DoubleSide,
            alphaTest: 0.1, // Discards transparent pixels
            transparent: true
        });
    }

    /** Generates a unique string key for a chunk from its coordinates. */
    _getChunkKey(x, z) {
        return `${x},${z}`;
    }

    /**
     * Handles messages received from the chunk generation workers.
     * @param {MessageEvent} e The message event from the worker.
     */
    _onWorkerMessage(e) {
        if (e.data.error) {
            console.error("Error from ChunkWorker:", e.data.error, e.data.stack);
            if (e.data.workerId != null) this.workers[e.data.workerId].isBusy = false;
            this._processChunkQueue(); // Try to process the next chunk
            return;
        }

        const { workerId, chunkX, chunkZ, lod, positions, normals, uvs, blocks, portalsGenerated } = e.data;
        const key = this._getChunkKey(chunkX, chunkZ);
        
        // Create BufferGeometry from the worker's data
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // If a mesh for this chunk already exists (e.g., a lower LOD version), replace it
        const existingChunk = this.chunks.get(key);
        if (existingChunk && existingChunk.mesh) {
            this.scene.remove(existingChunk.mesh);
            existingChunk.mesh.geometry.dispose();
        }

        this.scene.add(mesh);
        this.chunks.set(key, { mesh, blocks, lod });

        // If the worker generated portals, create them using the PortalManager
        if (portalsGenerated && portalsGenerated.length > 0) {
            portalsGenerated.forEach(portalData => {
                portalData.rank.color = new THREE.Color(portalData.rank.color.r, portalData.rank.color.g, portalData.rank.color.b);
                this.portalManager.createPortal(portalData.position, portalData.rank);
            });
        }

        // Execute and clear any pending callback for this chunk
        if (this.chunkLoadCallbacks.has(key)) {
            this.chunkLoadCallbacks.get(key)();
            this.chunkLoadCallbacks.delete(key);
        }

        // Mark the worker as available and process the next item in the queue
        this.workers[workerId].isBusy = false;
        this._processChunkQueue();
    }

    /**
     * Assigns pending chunk generation tasks to available workers.
     */
    _processChunkQueue() {
        if (this.chunkQueue.isEmpty()) return;

        const availableWorker = this.workers.find(w => !w.isBusy);
        if (!availableWorker) return; // All workers are busy

        const chunkData = this.chunkQueue.pop();
        this.queuedChunkKeys.delete(this._getChunkKey(chunkData.x, chunkData.z));
        
        availableWorker.isBusy = true;
        availableWorker.instance.postMessage({
            workerId: availableWorker.id,
            chunkX: chunkData.x,
            chunkZ: chunkData.z,
            lod: chunkData.lod,
            seed: this.seed
        });

        // Immediately check if another worker is free for the next task
        this._processChunkQueue();
    }

    /**
     * Queues a chunk for generation if it's needed or needs a higher LOD.
     * @param {number} x The chunk's X coordinate.
     * @param {number} z The chunk's Z coordinate.
     * @param {number} distance The chunk's distance from the player (in chunk units).
     */
    _queueChunkGeneration(x, z, distance) {
        const key = this._getChunkKey(x, z);
        const existingChunk = this.chunks.get(key);
        
        // Determine the required level of detail based on distance
        const requiredLod = this.lodDistances.find(lod => distance >= lod.distance).detail;

        // If the chunk already exists at the required LOD or better, do nothing
        if (existingChunk && existingChunk.lod <= requiredLod) {
            return;
        }

        // If this chunk is already in the queue, do nothing
        if (this.queuedChunkKeys.has(key)) {
            return;
        }

        // Add the generation task to the priority queue
        this.chunkQueue.push({ x, z, lod: requiredLod, distance });
        this.queuedChunkKeys.add(key);
    }

    /**
     * Loads the initial set of chunks around the player's starting position.
     * @param {THREE.Vector3} playerPosition The player's initial position.
     */
    initialLoad(playerPosition) {
        this.update(playerPosition, true);
    }

    /**
     * The main update loop for managing chunks based on player position.
     * @param {THREE.Vector3} playerPosition The player's current position.
     * @param {boolean} [isInitialLoad=false] - True if this is the first load.
     */
    update(playerPosition, isInitialLoad = false) {
        const chunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
        const chunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);

        // Only update if the player has moved to a new chunk
        if (!isInitialLoad && this.lastPlayerChunk.x === chunkX && this.lastPlayerChunk.z === chunkZ) {
            return;
        }
        this.lastPlayerChunk.x = chunkX;
        this.lastPlayerChunk.z = chunkZ;

        const chunksToKeep = new Set();
        
        // Queue chunks within the view distance for loading/updating
        for (let x = chunkX - this.viewDistance; x <= chunkX + this.viewDistance; x++) {
            for (let z = chunkZ - this.viewDistance; z <= chunkZ + this.viewDistance; z++) {
                const key = this._getChunkKey(x, z);
                chunksToKeep.add(key);
                const distance = Math.hypot(x - chunkX, z - chunkZ);
                this._queueChunkGeneration(x, z, distance);
            }
        }

        // Unload chunks that are now out of view
        for (const [key, chunk] of this.chunks.entries()) {
            if (!chunksToKeep.has(key)) {
                this.scene.remove(chunk.mesh);
                chunk.mesh.geometry.dispose();
                this.chunks.delete(key);
            }
        }
        
        // Kick off the generation process for any newly queued chunks
        this._processChunkQueue();
    }

    /**
     * Loads a specific chunk and executes a callback once it's finished.
     * @param {number} chunkX The chunk's X coordinate.
     * @param {number} chunkZ The chunk's Z coordinate.
     * @param {function} callback The function to execute after the chunk loads.
     */
    loadChunkAndCallback(chunkX, chunkZ, callback) {
        const key = this._getChunkKey(chunkX, chunkZ);
        if (this.chunks.has(key)) {
            callback(); // Chunk is already loaded
        } else {
            this.chunkLoadCallbacks.set(key, callback);
            const distance = 0; // Give it highest priority
            this._queueChunkGeneration(chunkX, chunkZ, distance);
            this._processChunkQueue();
        }
    }

    /** Hides all world chunks, useful for entering dungeons. */
    hideWorld() {
        for (const chunk of this.chunks.values()) {
            if (chunk.mesh) chunk.mesh.visible = false;
        }
    }

    /** Shows all world chunks. */
    showWorld() {
        for (const chunk of this.chunks.values()) {
            if (chunk.mesh) chunk.mesh.visible = true;
        }
    }

    /**
     * Retrieves the block type at a specific world coordinate.
     * @param {number} worldX - Global X coordinate.
     * @param {number} worldY - Global Y coordinate.
     * @param {number} worldZ - Global Z coordinate.
     * @returns {number | null} The block ID, or null if the chunk isn't loaded.
     */
    getBlock(worldX, worldY, worldZ) {
        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const localX = THREE.MathUtils.euclideanModulo(worldX, CHUNK_SIZE);
        const localZ = THREE.MathUtils.euclideanModulo(worldZ, CHUNK_SIZE);
        const localY = worldY;

        const key = this._getChunkKey(chunkX, chunkZ);
        const chunk = this.chunks.get(key);

        if (!chunk || !chunk.blocks || localY < 0 || localY >= 128) { // Assuming max height
            return null;
        }

        const blockIndex = Math.floor(localY) * CHUNK_SIZE * CHUNK_SIZE + Math.floor(localZ) * CHUNK_SIZE + Math.floor(localX);
        return chunk.blocks[blockIndex];
    }
    
    /**
     * Finds the Y coordinate of the ground at a given (X, Z) world position.
     * @param {number} worldX Global X coordinate.
     * @param {number} worldZ Global Z coordinate.
     * @returns {number} The Y coordinate of the ground.
     */
    findGroundHeight(worldX, worldZ) {
        const chunkX = Math.floor(worldX / CHUNK_SIZE);
        const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
        const key = this._getChunkKey(chunkX, chunkZ);
        const chunk = this.chunks.get(key);
    
        if (!chunk || !chunk.blocks) {
            return 10; // Fallback height if chunk is not loaded
        }
    
        const localX = Math.floor(THREE.MathUtils.euclideanModulo(worldX, CHUNK_SIZE));
        const localZ = Math.floor(THREE.MathUtils.euclideanModulo(worldZ, CHUNK_SIZE));
    
        // Scan from top to bottom to find the first non-air block
        for (let y = 127; y >= 0; y--) { // Assuming max height of 128
            const blockIndex = y * CHUNK_SIZE * CHUNK_SIZE + localZ * CHUNK_SIZE + localX;
            if (chunk.blocks[blockIndex] !== 0) { // 0 is assumed to be AIR
                return y + 1; // Return the top surface of the block
            }
        }
    
        return 10; // Fallback if no ground is found
    }
}