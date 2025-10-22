// EnemyModels.js (Client-Side Only)

import * as THREE from 'three';

// This file contains only the functions for building the visual 3D models of enemies.

function buildSlimeModel() {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0x33ff33 });
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    const body = new THREE.Mesh(bodyGeo, material);
    body.position.y = 0.5;
    group.add(body);
    return group;
}

function buildSkeletonModel() {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const armGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);

    const head = new THREE.Mesh(headGeo, material);
    const body = new THREE.Mesh(bodyGeo, material);
    const leftArm = new THREE.Mesh(armGeo, material);
    const rightArm = new THREE.Mesh(armGeo, material);
    const leftLeg = new THREE.Mesh(legGeo, material);
    const rightLeg = new THREE.Mesh(legGeo, material);

    const yOffset = 1.1;
    leftLeg.position.set(-0.2, -0.75 + yOffset, 0);
    rightLeg.position.set(0.2, -0.75 + yOffset, 0);
    body.position.y = 0 + yOffset;
    head.position.y = 0.65 + yOffset;
    leftArm.position.set(-0.4, 0 + yOffset, 0);
    rightArm.position.set(0.4, 0 + yOffset, 0);
    
    group.add(head, body, leftArm, rightArm, leftLeg, rightLeg);
    return group;
}

// This map connects the enemy type string from the server to the client-side model function.
export const ENEMY_MODELS = {
    SLIME: buildSlimeModel,
    SKELETON_ARCHER: buildSkeletonModel,
};