// EssenceData.js

export const LesserMightEssence = {
    id: "essence_might_01",
    name: "Lesser Might Essence",
    type: "Essence", // Required for inventory system
    description: "Grants basic physical enhancement abilities.",
    abilities: [
        {
            id: "power_strike",
            name: "Power Strike",
            unlocked: true,
            cost: 10,
            cooldown: 2,
            description: "A powerful blow that deals extra damage in an area.",
            type: "AOE_DAMAGE",
            baseDamage: 10,
            scalingStat: "might",
            range: 4.0,
            vfx: "createPowerStrikeEffect"
        }
    ],
    awakeningStones: [null, null, null, null, null]
};

// === HWFWM Character-Themed Essences ===

// Jason
export const DarkEssence = {
  id: "essence_dark_01",
  name: "Dark Essence",
  type: "Essence",
  description: "Shadowcraft that isolates, weakens and repositions foes.",
  abilities: [{
    id: "shadow_maw",
    name: "Shadow Maw",
    unlocked: true,
    cost: 12,
    cooldown: 6,
    description: "Eruptive darkness damages and briefly silences enemies in a small radius.",
    type: "AOE_DAMAGE",
    baseDamage: 9,
    scalingStat: "spirit",
    range: 3.5,
    vfx: "createShadowMawEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const BloodEssence = {
  id: "essence_blood_01",
  name: "Blood Essence",
  type: "Essence",
  description: "Vitae manipulation—predation, sustain, and control.",
  abilities: [{
    id: "scarlet_surge",
    name: "Scarlet Surge",
    unlocked: true,
    cost: 10,
    cooldown: 5,
    description: "A pulsing wave that damages and applies a minor leech mark.",
    type: "AOE_DAMAGE",
    baseDamage: 8,
    scalingStat: "might",
    range: 3.5,
    vfx: "createScarletSurgeEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const SinEssence = {
  id: "essence_sin_01",
  name: "Sin Essence",
  type: "Essence",
  description: "Judgement and punishment through amplifying transgressions.",
  abilities: [{
    id: "censure",
    name: "Censure",
    unlocked: true,
    cost: 11,
    cooldown: 7,
    description: "Damages and applies a stacking Vulnerable debuff.",
    type: "AOE_DAMAGE",
    baseDamage: 7,
    scalingStat: "spirit",
    range: 4.0,
    vfx: "createCensureEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const DoomEssence = {
  id: "essence_doom_01",
  name: "Doom Essence",
  type: "Essence",
  description: "Affliction specialist—inevitability made manifest.",
  abilities: [{
    id: "verdict_pulse",
    name: "Verdict Pulse",
    unlocked: true,
    cost: 14,
    cooldown: 9,
    description: "A pulse that deals damage and seeds an Inevitable mark that detonates on expiry.",
    type: "AOE_DAMAGE",
    baseDamage: 10,
    scalingStat: "spirit",
    range: 4.0,
    vfx: "createVerdictPulseEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

// Humphrey
export const MagicEssence_Humphrey = {
  id: "essence_magic_01",
  name: "Magic Essence",
  type: "Essence",
  description: "Arcane might channeled through martial forms.",
  abilities: [{
    id: "spectral_armory",
    name: "Spectral Armory",
    unlocked: true,
    cost: 8,
    cooldown: 6,
    description: "Conjure arcane blades that spin out and return.",
    type: "AOE_DAMAGE",
    baseDamage: 6,
    scalingStat: "spirit",
    range: 3.0,
    vfx: "createSpectralArmoryEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const MightEssence_Humphrey = {
  id: "essence_might_02",
  name: "Might Essence",
  type: "Essence",
  description: "Heroic power and forceful breaks.",
  abilities: [{
    id: "shield_break",
    name: "Shield Break",
    unlocked: true,
    cost: 10,
    cooldown: 6,
    description: "Smash that deals heavy damage and sunders defenses.",
    type: "AOE_DAMAGE",
    baseDamage: 10,
    scalingStat: "might",
    range: 3.0,
    vfx: "createShieldBreakEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const WingEssence = {
  id: "essence_wing_01",
  name: "Wing Essence",
  type: "Essence",
  description: "Mobility and aerial strikes.",
  abilities: [{
    id: "razor_dive",
    name: "Razor Dive",
    unlocked: true,
    cost: 9,
    cooldown: 5,
    description: "Leap and slam, damaging and briefly launching enemies.",
    type: "AOE_DAMAGE",
    baseDamage: 7,
    scalingStat: "speed", // Changed from agility to match baseStats
    range: 3.5,
    vfx: "createRazorDiveEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const DragonEssence = {
  id: "essence_dragon_01",
  name: "Dragon Essence",
  type: "Essence",
  description: "Draconic resilience and breath weaponry.",
  abilities: [{
    id: "ember_breath",
    name: "Ember Breath",
    unlocked: true,
    cost: 12,
    cooldown: 7,
    description: "A cone-like pulse around you that deals burning damage over a short duration.",
    type: "AOE_DAMAGE",
    baseDamage: 8,
    scalingStat: "spirit",
    range: 3.0,
    vfx: "createEmberBreathEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

// Sophie
export const SwiftEssence = {
  id: "essence_swift_01",
  name: "Swift Essence",
  type: "Essence",
  description: "Explosive acceleration and repositioning.",
  abilities: [{
    id: "blink_strike",
    name: "Blink Strike",
    unlocked: true,
    cost: 8,
    cooldown: 4,
    description: "Short-range dash that damages in a small radius at start and end.",
    type: "AOE_DAMAGE",
    baseDamage: 6,
    scalingStat: "speed", // Changed from agility
    range: 2.5,
    vfx: "createBlinkStrikeEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const WindEssence = {
  id: "essence_wind_02",
  name: "Wind Essence",
  type: "Essence",
  description: "Cutting currents and cleansing gusts.",
  abilities: [{
    id: "wind_wave",
    name: "Wind Wave",
    unlocked: true,
    cost: 10,
    cooldown: 6,
    description: "A sweeping arc that damages and applies Slow.",
    type: "AOE_DAMAGE",
    baseDamage: 7,
    scalingStat: "speed", // Changed from agility
    range: 5.0,
    vfx: "createWindWaveEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const BalanceEssence = {
  id: "essence_balance_01",
  name: "Balance Essence",
  type: "Essence",
  description: "Equilibrium—mitigation, timing, and flow.",
  abilities: [{
    id: "equilibrium_field",
    name: "Equilibrium Field",
    unlocked: true,
    cost: 11,
    cooldown: 8,
    description: "Light damage pulse and brief self-shield.",
    type: "AOE_DAMAGE",
    baseDamage: 5,
    scalingStat: "spirit",
    range: 4.0,
    vfx: "createEquilibriumFieldEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const MysticEssence = {
  id: "essence_mystic_01",
  name: "Mystic Essence",
  type: "Essence",
  description: "Soul focus—clarity, counters, and empowered strikes.",
  abilities: [{
    id: "radiant_fist",
    name: "Radiant Fist",
    unlocked: true,
    cost: 9,
    cooldown: 5,
    description: "Self-centered burst that empowers your next few hits.",
    type: "AOE_DAMAGE",
    baseDamage: 6,
    scalingStat: "spirit",
    range: 3.0,
    vfx: "createRadiantFistEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

// Clive
export const RuneEssence = {
  id: "essence_rune_01",
  name: "Rune Essence",
  type: "Essence",
  description: "Glyphs, traps, and space-bending sigils.",
  abilities: [{
    id: "rune_burst",
    name: "Rune Burst",
    unlocked: true,
    cost: 10,
    cooldown: 6,
    description: "Place a rune that detonates after a short delay.",
    type: "AOE_DAMAGE",
    baseDamage: 8,
    scalingStat: "spirit",
    range: 4.0,
    vfx: "createRuneBurstEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const KarmicEssence = {
  id: "essence_karmic_01",
  name: "Karmic Essence",
  type: "Essence",
  description: "Retribution and reflection.",
  abilities: [{
    id: "vengeance_mirror",
    name: "Vengeance Mirror",
    unlocked: true,
    cost: 11,
    cooldown: 7,
    description: "Pulse that tags foes; a portion of their next hit is reflected.",
    type: "AOE_DAMAGE",
    baseDamage: 6,
    scalingStat: "spirit",
    range: 3.5,
    vfx: "createVengeanceMirrorEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

// Belinda
export const TrapEssence = {
  id: "essence_trap_01",
  name: "Trap Essence",
  type: "Essence",
  description: "Ambush, tethering and battlefield control.",
  abilities: [{
    id: "force_tether",
    name: "Force Tether",
    unlocked: true,
    cost: 9,
    cooldown: 6,
    description: "Damage and attach a short-range tether that yanks on movement.",
    type: "AOE_DAMAGE",
    baseDamage: 6,
    scalingStat: "spirit",
    range: 3.0,
    vfx: "createForceTetherEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const CharlatanEssence = {
  id: "essence_charlatan_01",
  name: "Charlatan Essence",
  type: "Essence",
  description: "Deception, echoes, and misdirection.",
  abilities: [{
    id: "echo_confound",
    name: "Echo Confound",
    unlocked: true,
    cost: 8,
    cooldown: 6,
    description: "Light damage and summon a decoy that taunts briefly.",
    type: "AOE_DAMAGE",
    baseDamage: 5,
    scalingStat: "spirit",
    range: 3.0,
    vfx: "createEchoConfoundEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

// Farrah
export const VolcanoEssence = {
  id: "essence_volcano_01",
  name: "Volcano Essence",
  type: "Essence",
  description: "Explosive magma power and lingering fire.",
  abilities: [{
    id: "magma_bloom",
    name: "Magma Bloom",
    unlocked: true,
    cost: 14,
    cooldown: 8,
    description: "Eruption that damages and leaves burning ground.",
    type: "AOE_DAMAGE",
    baseDamage: 10,
    scalingStat: "spirit",
    range: 4.0,
    vfx: "createMagmaBloomEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

export const EarthEssence = {
  id: "essence_earth_02",
  name: "Earth Essence",
  type: "Essence",
  description: "Obsidian armor and spiking terrain.",
  abilities: [{
    id: "obsidian_spire",
    name: "Obsidian Spire",
    unlocked: true,
    cost: 10,
    cooldown: 7,
    description: "Raise spikes that damage and briefly immobilize.",
    type: "AOE_DAMAGE",
    baseDamage: 8,
    scalingStat: "might",
    range: 3.0,
    vfx: "createObsidianSpireEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};

// Neil (healer/support)
export const ShieldEssence = {
  id: "essence_shield_01",
  name: "Shield Essence",
  type: "Essence",
  description: "Protective barriers and rescue plays.",
  abilities: [{
    id: "guardian_pulse",
    name: "Guardian Pulse",
    unlocked: true,
    cost: 9,
    cooldown: 6,
    description: "Damages enemies lightly and grants brief damage reduction to allies.",
    type: "AOE_DAMAGE",
    baseDamage: 4,
    scalingStat: "spirit",
    range: 4.0,
    vfx: "createGuardianPulseEffect"
  }],
  awakeningStones: [null, null, null, null, null]
};