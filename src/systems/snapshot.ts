/**
 * Lightweight game state snapshot for pause/resume.
 * Stores plain data objects — no custom serialization methods needed.
 */
import type { PlayerState, EnemyState } from '../types';
import type { GemKind } from '../entities/XPGem';
import { MAP_WIDTH, MAP_HEIGHT } from '../constants';

export interface GameSnapshot {
  version: 1;
  timestamp: number;
  seed: number;
  endless: boolean;
  elapsed: number;
  kills: number;
  deathMasksHeld: number;
  reviveCount: number;
  rngState: number;
  player: PlayerState;
  baseMaxHp: number;
  map: string;               // bit-packed base64
  enemies: EnemyState[];
  gems: SerializedGem[];
}

export interface SerializedGem {
  x: number;
  y: number;
  value: number;
  kind: GemKind;
}

// ─── Map compression (bit-packing) ───

export function packMap(map: Uint8Array): string {
  const byteLen = Math.ceil(map.length / 8);
  const packed = new Uint8Array(byteLen);
  for (let i = 0; i < map.length; i++) {
    if (map[i]) packed[i >> 3] |= (1 << (i & 7));
  }
  return uint8ToBase64(packed);
}

export function unpackMap(encoded: string): Uint8Array {
  const packed = base64ToUint8(encoded);
  const size = MAP_WIDTH * MAP_HEIGHT;
  const map = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    map[i] = (packed[i >> 3] >> (i & 7)) & 1;
  }
  return map;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
