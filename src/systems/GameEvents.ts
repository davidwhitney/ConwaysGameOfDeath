import type Phaser from 'phaser';
import type { WeaponType } from '../types';
import type { Enemy } from '../entities/Enemy';
import type { SfxName } from './audio/SfxSystem';

export interface GameEventMap {
  'damage-dealt': [x: number, y: number, amount: number, color?: string, crit?: boolean];
  'impact-occurred': [duration: number, intensity: number];
  'player-healed': [heal: number];
  'levelup-option-selected': [index: number];
  'levelup-rerolled': [];
  'levelup-skipped': [];
  'enemy-killed': [enemy: Enemy, weaponType?: WeaponType];
  'health-gems-dropped': [positions: { x: number; y: number }[]];
  'vortex-gem-dropped': [pos: { x: number; y: number }];
  'death-mask-dropped': [pos: { x: number; y: number }];
  'gems-cleared': [];
  'revive-accepted': [];
  'revive-declined': [];
  'achievement-unlocked': [id: string];
  'exit-gate-spawned': [pos: { x: number; y: number }];
  'player-extracted': [];
}

type GameEventName = keyof GameEventMap;
type GameEventHandler<K extends GameEventName> = (...args: GameEventMap[K]) => void;

export const GameEvents = {
  on<K extends GameEventName>(
    emitter: Phaser.Events.EventEmitter,
    event: K,
    handler: GameEventHandler<K>,
  ): void {
    emitter.on(event, handler as (...args: unknown[]) => void);
  },

  off<K extends GameEventName>(
    emitter: Phaser.Events.EventEmitter,
    event: K,
    handler?: GameEventHandler<K>,
  ): void {
    emitter.off(event, handler as ((...args: unknown[]) => void) | undefined);
  },

  emit<K extends GameEventName>(
    emitter: Phaser.Events.EventEmitter,
    event: K,
    ...args: GameEventMap[K]
  ): void {
    emitter.emit(event, ...args);
  },

  highlight(reason: string): void {
    document.dispatchEvent(new CustomEvent('game-highlight', { detail: reason }));
  },

  intensity(value: number): void {
    document.dispatchEvent(new CustomEvent('game-intensity', { detail: value }));
  },

  sfx(name: SfxName): void {
    document.dispatchEvent(new CustomEvent('sfx', { detail: name }));
  },

  pauseGame(scenes: Phaser.Scenes.ScenePlugin, sfx = true): void {
    if (sfx) document.dispatchEvent(new CustomEvent('sfx', { detail: 'pause' }));
    scenes.pause('Game');
    scenes.launch('Pause');
  },
};
