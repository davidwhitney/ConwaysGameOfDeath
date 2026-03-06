import type Phaser from 'phaser';
import type { WeaponType } from '../types';
import type { Enemy } from '../entities/Enemy';
import type { SfxName } from './audio/SfxSystem';

export interface GameEventMap {
  'show-damage': [x: number, y: number, amount: number, color?: string, crit?: boolean];
  'screen-shake': [duration: number, intensity: number];
  'blood-aura-heal': [heal: number];
  'levelup-choice': [index: number];
  'levelup-reroll': [];
  'levelup-skip': [];
  'enemy-killed': [enemy: Enemy, weaponType?: WeaponType];
  'scatter-health-gems': [positions: { x: number; y: number }[]];
  'scatter-vortex-gem': [pos: { x: number; y: number }];
  'scatter-death-mask': [pos: { x: number; y: number }];
  'clear-gems': [];
  'revive-accept': [];
  'revive-decline': [];
  'achievement': [id: string];
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
