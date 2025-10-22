// AwakeningStoneData.js

/** -------------------- Core Stones -------------------- */

/** Belongs to: Lesser Might Essence */
const HeavyStone = {
  id: 'stone_heavy',
  name: 'Heavy Stone',
  type: 'awakening stone',
  abilityType: 'charge',
  requiredEssenceId: 'essence_might_01',
  description: 'Adds weight to physical attacks, increasing damage and potentially stunning foes.',
  mods: [
    { type: 'ADD_FLAT_DAMAGE', value: 5 },
    { type: 'ADD_EFFECT', value: 'STUN', chance: 0.25 },
    { type: 'COOLDOWN', seconds: 4 }
  ]
};

/** Belongs to: Lesser Might Essence */
const StoneOfImpact = {
  id: 'stone_impact',
  name: 'Stone of Impact',
  type: 'awakening stone',
  abilityType: 'instant',
  requiredEssenceId: 'essence_might_01',
  description: 'Unleashes a concussive blast that knocks foes back and fortifies the user.',
  mods: [
    { type: 'KNOCKBACK', force: 10, range: 4 },
    { type: 'APPLY_BUFF', name: 'Fortified', duration: 4, damageReduction: 0.2 },
    { type: 'DAMAGE', amount: 5 },
    { type: 'COOLDOWN', seconds: 8 }
  ]
};

/** Universal */
const LeechingStone = {
  id: 'stone_leeching',
  name: 'Leeching Stone',
  type: 'awakening stone',
  description: 'Drains life force from enemies over time after being struck by a powerful blow.',
  mods: [{ type: 'ADD_EFFECT', value: 'LEECH', duration: 5, healPerSecond: 3 }]
};

/** Universal */
const RendingStone = {
  id: 'stone_rending',
  name: 'Rending Stone',
  type: 'awakening stone',
  description: 'Causes deep wounds that bleed over time.',
  mods: [{ type: 'ADD_EFFECT', value: 'BLEED', damage: 3, duration: 5 }]
};

/** -------------------- Character-Flavoured Stones -------------------- */

/** Jason-flavoured (Sin/Dark/Doom/Blood themes) */
const StoneOfJudgment = {
  id: 'stone_judgment',
  name: 'Stone of Judgment',
  type: 'awakening stone',
  requiredEssenceId: ['essence_sin_01', 'essence_dark_01'],
  description: 'Condemns the guilty; increases damage to debuffed foes.',
  mods: [
    { type: 'ADD_EFFECT', value: 'VULNERABLE', amount: 0.15, duration: 5 },
    { type: 'ADD_FLAT_DAMAGE', value: 4 },
    { type: 'COOLDOWN', seconds: 1 }
  ]
};

const StoneOfInevitability = {
  id: 'stone_inevitability',
  name: 'Stone of Inevitability',
  type: 'awakening stone',
  requiredEssenceId: 'essence_doom_01',
  description: 'Afflictions build to an unavoidable detonation.',
  mods: [
    { type: 'ADD_EFFECT', value: 'INEVITABLE', duration: 4, bonusDetonatePercent: 0.35 },
    { type: 'COOLDOWN', seconds: 2 }
  ]
};

const StoneOfHemorrhage = {
  id: 'stone_hemorrhage',
  name: 'Stone of Hemorrhage',
  type: 'awakening stone',
  requiredEssenceId: ['essence_blood_01', 'essence_doom_01'],
  description: 'Wounds that feed the caster.',
  mods: [
    { type: 'ADD_EFFECT', value: 'BLEED', damage: 3, duration: 6 },
    { type: 'ADD_EFFECT', value: 'LEECH', duration: 4, healPerSecond: 2 }
  ]
};

/** Humphrey-flavoured (Might/Wing/Dragon/Magic themes) */
const StoneOfTheChampion = {
  id: 'stone_champion',
  name: 'Stone of the Champion',
  type: 'awakening stone',
  requiredEssenceId: ['essence_might_02', 'essence_dragon_01'],
  description: 'Heroic presence hardens resolve.',
  mods: [
    { type: 'APPLY_BUFF', name: 'Fortified', duration: 5, damageReduction: 0.2 },
    { type: 'ADD_FLAT_DAMAGE', value: 3 }
  ]
};

const StoneOfWingedAssault = {
  id: 'stone_winged_assault',
  name: 'Stone of Winged Assault',
  type: 'awakening stone',
  requiredEssenceId: 'essence_wing_01',
  description: 'Aerial momentum strikes harder.',
  mods: [
    { type: 'KNOCKBACK', force: 8, range: 3.0 },
    { type: 'COOLDOWN', seconds: -1 }
  ]
};

/** Sophie-flavoured (Swift/Wind/Balance/Mystic themes) */
const StoneOfTheMoment = {
  id: 'stone_moment',
  name: 'Stone of the Moment',
  type: 'awakening stone',
  requiredEssenceId: ['essence_balance_01', 'essence_mystic_01'],
  description: 'Perfect timing turns defense into offense.',
  mods: [
    { type: 'APPLY_BUFF', name: 'Counterstance', duration: 3, reflectPercent: 0.25 },
    { type: 'COOLDOWN', seconds: -1 }
  ]
};

const StoneOfTheSky = {
  id: 'stone_sky',
  name: 'Stone of the Sky',
  type: 'awakening stone',
  requiredEssenceId: ['essence_swift_01', 'essence_wind_02'],
  description: 'Fleet steps touch only air.',
  mods: [
    { type: 'APPLY_BUFF', name: 'Haste', duration: 3, speedBonus: 0.3 },
    { type: 'ADD_FLAT_DAMAGE', value: 2 }
  ]
};

/** Clive-flavoured (Rune/Karmic themes) */
const StoneOfRunicEcho = {
  id: 'stone_runic_echo',
  name: 'Stone of Runic Echo',
  type: 'awakening stone',
  requiredEssenceId: 'essence_rune_01',
  description: 'Glyphs reverberate with a delayed second burst.',
  mods: [
    { type: 'ADD_EFFECT', value: 'ECHO_HIT', percent: 0.4, delay: 0.5 },
    { type: 'COOLDOWN', seconds: 1 }
  ]
};

const StoneOfEquilibrium = {
  id: 'stone_equilibrium',
  name: 'Stone of Equilibrium',
  type: 'awakening stone',
  requiredEssenceId: 'essence_karmic_01',
  description: 'Balance redistributes excess power.',
  mods: [
    { type: 'APPLY_BUFF', name: 'Mana Shield', duration: 4, shieldAmount: 18 },
    { type: 'ADD_FLAT_DAMAGE', value: 2 }
  ]
};

/** Belinda-flavoured (Charlatan/Trap themes) */
const StoneOfSpeciousAllies = {
  id: 'stone_specious_allies',
  name: 'Stone of Specious Allies',
  type: 'awakening stone',
  requiredEssenceId: 'essence_charlatan_01',
  description: 'Illusory assistants harry your foes.',
  mods: [
    { type: 'ADD_EFFECT', value: 'DECOY', duration: 4, taunt: true },
    { type: 'ADD_FLAT_DAMAGE', value: 3 }
  ]
};

const StoneOfSnarework = {
  id: 'stone_snarework',
  name: 'Stone of Snarework',
  type: 'awakening stone',
  requiredEssenceId: 'essence_trap_01',
  description: 'Tethers bite deeper and hold longer.',
  mods: [
    { type: 'ADD_EFFECT', value: 'ROOT', duration: 1.25, chance: 0.35 },
    { type: 'COOLDOWN', seconds: 1 }
  ]
};

/** Farrah-flavoured (Volcano/Earth themes) */
const StoneOfCinderfall = {
  id: 'stone_cinderfall',
  name: 'Stone of Cinderfall',
  type: 'awakening stone',
  requiredEssenceId: 'essence_volcano_01',
  description: 'Ignites ground into lingering embers.',
  mods: [
    { type: 'ADD_EFFECT', value: 'BURN', damage: 4, duration: 5 },
    { type: 'ADD_FLAT_DAMAGE', value: 4 }
  ]
};

const StoneOfObsidianAegis = {
  id: 'stone_obsidian_aegis',
  name: 'Stone of Obsidian Aegis',
  type: 'awakening stone',
  requiredEssenceId: 'essence_earth_02',
  description: 'Stone-skin hardens under fire.',
  mods: [
    { type: 'APPLY_BUFF', name: 'Obsidian Armor', duration: 5, damageReduction: 0.25 },
    { type: 'COOLDOWN', seconds: 2 }
  ]
};

/** Neil-flavoured (Shield/support themes) */
const StoneOfRenewal = {
  id: 'stone_renewal',
  name: 'Stone of Renewal',
  type: 'awakening stone',
  requiredEssenceId: 'essence_shield_01',
  description: 'Washes pain away over time.',
  mods: [
    { type: 'APPLY_BUFF', name: 'Regeneration', duration: 5, healPerSecond: 4 },
    { type: 'DAMAGE', amount: -2 }
  ]
};

const StoneOfProsperity = {
  id: 'stone_prosperity',
  name: 'Stone of Prosperity',
  type: 'awakening stone',
  requiredEssenceId: 'essence_shield_01',
  description: 'Abundance spills into protection.',
  mods: [
    { type: 'APPLY_BUFF', name: 'Barrier Dividend', duration: 4, shieldAmount: 16 },
    { type: 'COOLDOWN', seconds: -1 }
  ]
};

module.exports = {
    HeavyStone,
    StoneOfImpact,
    LeechingStone,
    RendingStone,
    StoneOfJudgment,
    StoneOfInevitability,
    StoneOfHemorrhage,
    StoneOfTheChampion,
    StoneOfWingedAssault,
    StoneOfTheMoment,
    StoneOfTheSky,
    StoneOfRunicEcho,
    StoneOfEquilibrium,
    StoneOfSpeciousAllies,
    StoneOfSnarework,
    StoneOfCinderfall,
    StoneOfObsidianAegis,
    StoneOfRenewal,
    StoneOfProsperity
};