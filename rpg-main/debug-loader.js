console.log("--- Starting Module Load Test ---");

const modulesToTest = [
    // Add the full Three.js URLs first to ensure they work
    'https://unpkg.com/three@0.157.0/build/three.module.js',
    'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/EffectComposer.js',
    'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/RenderPass.js',
    'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/OutlinePass.js',
    'https://unpkg.com/three@0.157.0/examples/jsm/postprocessing/SSAOPass.js',

    // Your local game files
    './WorldManager.js',
    './PlayerState.js',
    './PlayerController.js',
    './CameraManager.js',
    './InteractionManager.js',
    './AbilityManager.js',
    './VFXManager.js',
    './UIManager.js',
    './EnemyManager.js',
    './InventoryManager.js',
    './NPCManager.js',
    './PortalManager.js',
    './TextureGenerator.js',
    './EssenceData.js',
    './ItemData.js',
    './AwakeningStoneData.js',
    './DungeonData.js', // Make sure this file exists
    './ChunkWorker.js' // We can test this too
];

async function testModules() {
    let allSucceeded = true;
    for (const path of modulesToTest) {
        try {
            await import(path);
            console.log(`✅ SUCCESS: Loaded module -> ${path}`);
        } catch (error) {
            console.error(`❌ FAILED: Could not load module -> ${path}`, error);
            allSucceeded = false;
        }
    }

    if (allSucceeded) {
        console.log("%c--- All modules loaded successfully! ---", "color: green; font-size: 1.2em;");
        console.log("This means the issue is not with file loading, but with the code execution order after loading.");
    } else {
        console.error("%c--- One or more modules failed to load. The file marked with ❌ is the source of the problem. Check its path and for any syntax errors. ---", "color: red; font-size: 1.2em;");
    }
}

testModules();