// ─── Core Types ───

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Entity Types ───

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  xp: number;
  xpToNext: number;
  weapons: WeaponInstance[];
  effects: EffectInstance[];
  alive: boolean;
  invincibleUntil: number;
  gold: number;
}

export interface EnemyState {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  alive: boolean;
  xpValue: number;
  boss: boolean;
}

export interface ProjectileState {
  id: number;
  weaponType: WeaponType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  radius: number;
  lifetime: number;
  age: number;
  hitEnemies: Set<number>;
}

export interface XPGemState {
  id: number;
  x: number;
  y: number;
  value: number;
  alive: boolean;
}

// ─── Weapon Types ───

export type WeaponCategory = 'melee' | 'aoe' | 'forcefield' | 'projectile';

export interface WeaponDef {
  type: WeaponType;
  name: string;
  category: WeaponCategory;
  description: string;
  color: number;
  baseDamage: number;
  baseCooldown: number;
  baseArea: number;
  baseDuration: number;
  baseSpeed: number;
  baseAmount: number;
  basePierce: number;
  levelScaling: WeaponLevelScaling;
}

export interface WeaponLevelScaling {
  damage: number;    // multiplier per level
  cooldown: number;  // reduction per level
  area: number;      // multiplier per level
  amount: number;    // extra per 2 levels
  pierce: number;    // extra per 3 levels
  duration: number;  // multiplier per level
}

export interface WeaponInstance {
  type: WeaponType;
  level: number;     // 1-8
  cooldownTimer: number;
}

// ─── Effect Types ───

export interface EffectDef {
  type: EffectType;
  name: string;
  description: string;
  color: number;
  maxLevel: number;
  levelValues: number[]; // value per level
}

export interface EffectInstance {
  type: EffectType;
  level: number;     // 1-5
}

// ─── Enemy Types ───

export interface EnemyDef {
  type: EnemyType;
  name: string;
  color: number;
  size: number;
  baseHp: number;
  baseDamage: number;
  baseSpeed: number;
  xpValue: number;
  unlockAt: number;     // game progress fraction (0–1) when this enemy starts spawning
  behavior: EnemyBehavior;
}

export type EnemyBehavior = 'chase' | 'cross' | 'orbit' | 'teleport' | 'swarm';

// ─── Enums ───

export enum EnemyType {
  Bat = 0,
  Skeleton,
  Zombie,
  Ghost,
  Werewolf,
  Mummy,
  Vampire,
  Lich,
  Dragon,
  Reaper,
}

export enum WeaponType {
  // Melee (0-4)
  Whip = 0,
  Sword,
  Axe,
  Knife,
  Cross,
  // AoE (5-9)
  Garlic,
  HolyWater,
  FireWand,
  Lightning,
  Meteor,
  // Force Field (10-14)
  HolyShield,
  FrostAura,
  PoisonCloud,
  ThunderRing,
  VoidField,
  VoidBurn,
  Vortex,
  // Projectile (17-21)
  MagicMissile,
  Fireball,
  IceShard,
  Boomerang,
  Scythe,
}

export enum EffectType {
  XPBoost = 0,
  Speed,
  Regen,
  Shield,
  Magnet,
  Cooldown,
  Might,
  Armor,
  Luck,
  Revival,
  StrongAuras,
  Fury,
  Focused,
  Evolution,
}

// ─── Map Types ───

export const enum TileType {
  Floor = 0,
  Wall = 1,
}

export type TileMap = Uint8Array;

// ─── Level Up ───

export interface LevelUpOption {
  kind: 'weapon' | 'effect' | 'gold' | 'heal';
  type: WeaponType | EffectType | -1;
  newLevel: number;
  name: string;
  description: string;
}
