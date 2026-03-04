import type Phaser from 'phaser';
import type { WeaponType } from '../shared';
import type { Enemy } from '../entities/Enemy';

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
  'clear-gems': [];
  'revive-accept': [];
  'revive-decline': [];
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
};
