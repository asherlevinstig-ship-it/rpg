// Pathfinder.js
import * as THREE from 'three';

// A Node represents a single block in the world grid for pathfinding
class Node {
    constructor(x, y, z, parent = null) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.parent = parent;
        this.gCost = 0; // Distance from starting node
        this.hCost = 0; // Heuristic distance to end node
    }

    get fCost() {
        return this.gCost + this.hCost;
    }

    equals(other) {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }
}

export class Pathfinder {
    findPath(worldManager, start, end) {
        // --- Limit the search range to prevent performance issues on impossible paths ---
        const MAX_SEARCH_DISTANCE = 60; 
        if (start.distanceTo(end) > MAX_SEARCH_DISTANCE) {
            return null; // Path is too long, don't even try
        }

        const startNode = new Node(Math.floor(start.x), Math.floor(start.y), Math.floor(start.z));
        const endNode = new Node(Math.floor(end.x), Math.floor(end.y), Math.floor(end.z));

        const openSet = [startNode];
        const closedSet = new Set();
        let searchLimit = 500; // Failsafe to prevent infinite loops

        while (openSet.length > 0 && searchLimit > 0) {
            searchLimit--;

            // --- PERFORMANCE FIX: The best node is always at the start of the sorted array ---
            let currentNode = openSet.shift(); 
            
            closedSet.add(`${currentNode.x},${currentNode.y},${currentNode.z}`);

            if (currentNode.equals(endNode)) {
                return this.reconstructPath(currentNode);
            }

            for (const neighborPos of this.getNeighbors(currentNode)) {
                const neighborNode = new Node(neighborPos.x, neighborPos.y, neighborPos.z, currentNode);
                const key = `${neighborNode.x},${neighborNode.y},${neighborNode.z}`;

                if (closedSet.has(key)) continue;

                // An enemy needs two vertical blocks of empty space to walk through
                const isSpaceFree = worldManager.getBlock(neighborNode.x, neighborNode.y, neighborNode.z) === 0;
                const isHeadSpaceFree = worldManager.getBlock(neighborNode.x, neighborNode.y + 1, neighborNode.z) === 0;
                // And it needs a solid block to stand on
                const hasGround = worldManager.getBlock(neighborNode.x, neighborNode.y - 1, neighborNode.z) !== 0;

                if (!isSpaceFree || !isHeadSpaceFree || !hasGround) {
                    closedSet.add(key);
                    continue;
                }

                const newGCost = currentNode.gCost + this.getDistance(currentNode, neighborNode);
                const existingNodeIndex = openSet.findIndex(node => node.equals(neighborNode));

                if (newGCost < (existingNodeIndex !== -1 ? openSet[existingNodeIndex].gCost : Infinity)) {
                    neighborNode.gCost = newGCost;
                    neighborNode.hCost = this.getDistance(neighborNode, endNode);
                    neighborNode.parent = currentNode;

                    if (existingNodeIndex === -1) {
                        openSet.push(neighborNode);
                    } else {
                        openSet[existingNodeIndex] = neighborNode; // Update the existing node
                    }
                }
            }
            
            // --- PERFORMANCE FIX: Sort the array after modifications to keep the best node at the front ---
            openSet.sort((a, b) => a.fCost - b.fCost);
        }

        return null; // No path found
    }

    reconstructPath(endNode) {
        const path = [];
        let currentNode = endNode;
        while (currentNode) {
            path.push(new THREE.Vector3(currentNode.x + 0.5, currentNode.y, currentNode.z + 0.5));
            currentNode = currentNode.parent;
        }
        return path.reverse();
    }

    // --- LOGIC FIX: Now checks in 3D space (including up and down) ---
    getNeighbors(node) {
        const neighbors = [];
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    if (x === 0 && y === 0 && z === 0) continue;
                    neighbors.push({ x: node.x + x, y: node.y + y, z: node.z + z });
                }
            }
        }
        return neighbors;
    }
    
    // Heuristic for 3D distance
    getDistance(nodeA, nodeB) {
        const dstX = Math.abs(nodeA.x - nodeB.x);
        const dstY = Math.abs(nodeA.y - nodeB.y);
        const dstZ = Math.abs(nodeA.z - nodeB.z);

        const cost = 10; // Cost for straight movement
        const diagonalCost = 14; // Cost for diagonal movement

        // A simplified but effective heuristic for 3D grids
        return cost * (dstX + dstY + dstZ) + (diagonalCost - 3 * cost) * Math.min(dstX, dstY, dstZ);
    }
}