import { WeaponType } from './types';
import {
  PLAYER_BASE_HP, PLAYER_BASE_SPEED, PLAYER_PICKUP_RANGE,
  MAX_WEAPONS, MAX_EFFECTS,
} from './constants';
import { WEAPON_DEFS } from './entities/weapons';

// ─── Game Config ───
// A mutable configuration object that perks modify before each game run.

export interface GameConfig {
  // Player
  startingHp: number;
  startingSpeed: number;
  hpRegen: number;
  armor: number;
  pickupRange: number;

  // Game timing
  gameSpeedMult: number;      // >1 = faster game clock, enemies spawn faster, etc.
  playerSpeedMult: number;    // compensates for game speed so player doesn't feel sluggish

  // XP & Loot
  xpMult: number;
  goldMult: number;
  startingGold: number;

  // Enemies
  enemyHpMult: number;
  enemyDmgMult: number;
  enemyXpMult: number;

  // Weapons
  weaponDmgMult: number;
  weaponCooldownMult: number; // <1 = faster cooldowns
  startingWeapon: WeaponType;
  startingWeaponLevel: number;
  randomStartWeapon: boolean;

  // Slots
  maxWeapons: number;
  maxEffects: number;
}

export function defaultGameConfig(): GameConfig {
  return {
    startingHp: PLAYER_BASE_HP,
    startingSpeed: PLAYER_BASE_SPEED,
    hpRegen: 0,
    armor: 0,
    pickupRange: PLAYER_PICKUP_RANGE,
    gameSpeedMult: 1,
    playerSpeedMult: 1,
    xpMult: 1,
    goldMult: 1,
    startingGold: 0,
    enemyHpMult: 1,
    enemyDmgMult: 1,
    enemyXpMult: 1,
    weaponDmgMult: 1,
    weaponCooldownMult: 1,
    startingWeapon: WeaponType.Whip,
    startingWeaponLevel: 1,
    randomStartWeapon: false,
    maxWeapons: MAX_WEAPONS,
    maxEffects: MAX_EFFECTS,
  };
}

// ─── Perk Definitions ───

export interface PerkDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  /** Short description per level (1-indexed: index 0 = level 1) */
  levelDesc: string[];
  /** Apply this perk at the given level to a GameConfig */
  apply: (cfg: GameConfig, level: number) => void;
}

// Time warp durations: level 1-5 → 27, 24, 21, 18, 15 minutes
const TIME_WARP_DURATIONS = [27, 24, 21, 18, 15];

export const PERK_DEFS: PerkDef[] = [
  {
    id: 'vitality',
    name: 'Vitality',
    description: 'Increase starting HP',
    maxLevel: 5,
    levelDesc: ['+20 HP', '+40 HP', '+60 HP', '+80 HP', '+100 HP'],
    apply: (cfg, lvl) => { cfg.startingHp += lvl * 20; },
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Passive HP regeneration from the start',
    maxLevel: 5,
    levelDesc: ['+0.5/s', '+1.0/s', '+1.5/s', '+2.0/s', '+3.0/s'],
    apply: (cfg, lvl) => { cfg.hpRegen += [0.5, 1.0, 1.5, 2.0, 3.0][lvl - 1]; },
  },
  {
    id: 'swiftness',
    name: 'Swiftness',
    description: 'Increase base movement speed',
    maxLevel: 5,
    levelDesc: ['+5%', '+10%', '+15%', '+20%', '+25%'],
    apply: (cfg, lvl) => { cfg.startingSpeed *= 1 + lvl * 0.05; },
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    description: 'Compress game duration — everything accelerates',
    maxLevel: 5,
    levelDesc: ['27 min', '24 min', '21 min', '18 min', '15 min'],
    apply: (cfg, lvl) => {
      const durationMin = TIME_WARP_DURATIONS[lvl - 1];
      const ratio = 30 / durationMin; // e.g. 30/15 = 2x speed
      cfg.gameSpeedMult *= ratio;
      // Compensate player speed so they don't feel slow
      cfg.playerSpeedMult *= 1 + (ratio - 1) * 0.5;
    },
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Earn more XP from all sources',
    maxLevel: 5,
    levelDesc: ['+10%', '+20%', '+35%', '+50%', '+75%'],
    apply: (cfg, lvl) => { cfg.xpMult *= 1 + [0.10, 0.20, 0.35, 0.50, 0.75][lvl - 1]; },
  },
  {
    id: 'prospector',
    name: 'Prospector',
    description: 'Find more gold from enemies',
    maxLevel: 5,
    levelDesc: ['+20%', '+40%', '+60%', '+80%', '+100%'],
    apply: (cfg, lvl) => { cfg.goldMult *= 1 + lvl * 0.20; },
  },
  {
    id: 'weakening',
    name: 'Weakening',
    description: 'Enemies have less HP',
    maxLevel: 5,
    levelDesc: ['-5%', '-10%', '-15%', '-20%', '-25%'],
    apply: (cfg, lvl) => { cfg.enemyHpMult *= 1 - lvl * 0.05; },
  },
  {
    id: 'fortitude',
    name: 'Fortitude',
    description: 'Start with flat damage reduction',
    maxLevel: 5,
    levelDesc: ['+2', '+4', '+6', '+8', '+10'],
    apply: (cfg, lvl) => { cfg.armor += lvl * 2; },
  },
  {
    id: 'arsenal',
    name: 'Arsenal',
    description: 'All weapons deal more damage',
    maxLevel: 5,
    levelDesc: ['+5%', '+10%', '+15%', '+20%', '+30%'],
    apply: (cfg, lvl) => { cfg.weaponDmgMult *= 1 + [0.05, 0.10, 0.15, 0.20, 0.30][lvl - 1]; },
  },
  {
    id: 'quick_draw',
    name: 'Quick Draw',
    description: 'Weapons fire faster',
    maxLevel: 5,
    levelDesc: ['-4%', '-8%', '-12%', '-16%', '-20%'],
    apply: (cfg, lvl) => { cfg.weaponCooldownMult *= 1 - lvl * 0.04; },
  },
  {
    id: 'scavenger',
    name: 'Scavenger',
    description: 'Increase XP gem pickup range',
    maxLevel: 5,
    levelDesc: ['+20%', '+40%', '+60%', '+80%', '+100%'],
    apply: (cfg, lvl) => { cfg.pickupRange *= 1 + lvl * 0.20; },
  },
  {
    id: 'weapon_mastery',
    name: 'Weapon Mastery',
    description: 'Starting weapon begins at a higher level',
    maxLevel: 5,
    levelDesc: ['Lv 2', 'Lv 3', 'Lv 4', 'Lv 5', 'Lv 6'],
    apply: (cfg, lvl) => { cfg.startingWeaponLevel = lvl + 1; },
  },
  {
    id: 'random_weapon',
    name: 'Random Arsenal',
    description: 'Start with a random weapon instead of the Whip',
    maxLevel: 1,
    levelDesc: ['Enabled'],
    apply: (cfg) => { cfg.randomStartWeapon = true; },
  },
  {
    id: 'head_start',
    name: 'Head Start',
    description: 'Begin each run with bonus gold',
    maxLevel: 5,
    levelDesc: ['20g', '50g', '100g', '200g', '500g'],
    apply: (cfg, lvl) => { cfg.startingGold += [20, 50, 100, 200, 500][lvl - 1]; },
  },
  {
    id: 'tough_foes',
    name: 'Tough Foes',
    description: 'Enemies are stronger but give more XP',
    maxLevel: 5,
    levelDesc: ['+15% HP / +20% XP', '+30% HP / +40% XP', '+50% HP / +65% XP', '+75% HP / +100% XP', '+100% HP / +150% XP'],
    apply: (cfg, lvl) => {
      const hpBonus = [0.15, 0.30, 0.50, 0.75, 1.00][lvl - 1];
      const xpBonus = [0.20, 0.40, 0.65, 1.00, 1.50][lvl - 1];
      cfg.enemyHpMult *= 1 + hpBonus;
      cfg.enemyXpMult *= 1 + xpBonus;
    },
  },
];

/** Map perk ID → definition for fast lookup */
export const PERK_MAP = new Map(PERK_DEFS.map(p => [p.id, p]));

/** Allocated perk levels: perkId → level (0 means unallocated) */
export type PerkAllocation = Record<string, number>;

export function emptyPerkAllocation(): PerkAllocation {
  return {};
}

/** Count total points spent */
export function totalPointsSpent(alloc: PerkAllocation): number {
  let total = 0;
  for (const lvl of Object.values(alloc)) total += lvl;
  return total;
}

/** Build a GameConfig by applying all allocated perks to the default */
export function buildGameConfig(alloc: PerkAllocation, rng: () => number): GameConfig {
  const cfg = defaultGameConfig();
  for (const [id, level] of Object.entries(alloc)) {
    if (level <= 0) continue;
    const def = PERK_MAP.get(id);
    if (def) def.apply(cfg, level);
  }
  // Resolve random weapon after all perks applied
  if (cfg.randomStartWeapon) {
    const weapons = WEAPON_DEFS.filter(w => w.type !== WeaponType.Whip);
    cfg.startingWeapon = weapons[Math.floor(rng() * weapons.length)].type;
  }
  return cfg;
}

/** Apply debug overrides to a GameConfig */
export function applyDebugConfig(cfg: GameConfig, debugLevel: number): void {
  if (debugLevel > 1) {
    cfg.startingGold = 1000000;
  }
}
