import { XP_BASE, XP_GROWTH, MAX_LEVEL, MAX_WEAPONS, MAX_EFFECTS, MAX_WEAPON_LEVEL, MAX_EFFECT_LEVEL } from '../constants';
import { WeaponType, EffectType, type LevelUpOption, type WeaponInstance, type EffectInstance, type WeaponDef, type EffectDef } from '../types';
import { WEAPON_DEFS } from '../entities/weapons';
import { EFFECT_DEFS } from '../entities/effects';

/** Calculate XP needed for a given level (quadratic curve) */
export function xpForLevel(level: number): number {
  // level 2 = 5xp, level 100 ≈ 2000xp
  return Math.floor(XP_BASE + XP_GROWTH * (level - 1) * (level - 1));
}

/** Total XP from level 1 to given level */
export function totalXpToLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

/** Calculate weapon stats at a given level (max 3 levels) */
export function getWeaponStats(def: WeaponDef, level: number) {
  const lvl = level - 1; // 0-indexed for scaling (0, 1, 2)
  return {
    damage: Math.floor(def.baseDamage * (1 + def.levelScaling.damage * lvl)),
    cooldown: Math.max(100, def.baseCooldown * (1 - def.levelScaling.cooldown * lvl)),
    area: def.baseArea * (1 + def.levelScaling.area * lvl),
    amount: def.baseAmount + (lvl >= 2 ? def.levelScaling.amount : 0),
    pierce: def.basePierce + (lvl >= 1 ? def.levelScaling.pierce : 0),
    duration: def.baseDuration * (1 + def.levelScaling.duration * lvl),
    speed: def.baseSpeed,
  };
}

/**
 * Generate level-up choices.
 * Rules:
 * - 3 choices offered
 * - Can offer new weapons (if < MAX_WEAPONS) or upgrade existing ones (if < max level)
 * - Can offer new effects (if < MAX_EFFECTS) or upgrade existing ones
 * - Owned items are weighted 3x more likely to appear
 */
export function generateLevelUpOptions(
  weapons: WeaponInstance[],
  effects: EffectInstance[],
  rng: () => number,
): LevelUpOption[] {
  const pool: Array<{ option: LevelUpOption; weight: number }> = [];

  // Weapon upgrades for owned weapons
  for (const w of weapons) {
    if (w.level < MAX_WEAPON_LEVEL) {
      const def = WEAPON_DEFS[w.type];
      pool.push({
        option: {
          kind: 'weapon',
          type: w.type,
          newLevel: w.level + 1,
          name: def.name,
          description: `Level ${w.level + 1}: +damage, improved stats`,
        },
        weight: 3,
      });
    }
  }

  // Effect upgrades for owned effects
  for (const e of effects) {
    const def = EFFECT_DEFS[e.type];
    if (e.level < def.maxLevel) {
      pool.push({
        option: {
          kind: 'effect',
          type: e.type,
          newLevel: e.level + 1,
          name: def.name,
          description: `Level ${e.level + 1}: ${def.description}`,
        },
        weight: 3,
      });
    }
  }

  // New weapons (if slots available)
  if (weapons.length < MAX_WEAPONS) {
    const ownedTypes = new Set(weapons.map(w => w.type));
    for (const def of WEAPON_DEFS) {
      if (!ownedTypes.has(def.type)) {
        pool.push({
          option: {
            kind: 'weapon',
            type: def.type,
            newLevel: 1,
            name: def.name,
            description: def.description,
          },
          weight: 1,
        });
      }
    }
  }

  // New effects (if slots available)
  if (effects.length < MAX_EFFECTS) {
    const ownedTypes = new Set(effects.map(e => e.type));
    for (const def of EFFECT_DEFS) {
      if (!ownedTypes.has(def.type)) {
        pool.push({
          option: {
            kind: 'effect',
            type: def.type,
            newLevel: 1,
            name: def.name,
            description: def.description,
          },
          weight: 1,
        });
      }
    }
  }

  // Weighted random selection of 3 unique options
  const selected: LevelUpOption[] = [];
  const remaining = [...pool];

  while (selected.length < 3 && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng() * totalWeight;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      roll -= remaining[i].weight;
      if (roll <= 0) { idx = i; break; }
    }
    selected.push(remaining[idx].option);
    remaining.splice(idx, 1);
  }

  return selected;
}

/**
 * Generate post-max-level options: gold or 25% HP recovery.
 */
export function generatePostMaxOptions(level: number): LevelUpOption[] {
  const goldAmount = 10 + Math.floor(level / 10) * 5;
  return [
    {
      kind: 'gold',
      type: -1,
      newLevel: 0,
      name: 'Gold',
      description: `Collect ${goldAmount} gold`,
    },
    {
      kind: 'heal',
      type: -1,
      newLevel: 0,
      name: 'Recovery',
      description: 'Recover 25% of max HP',
    },
  ];
}
