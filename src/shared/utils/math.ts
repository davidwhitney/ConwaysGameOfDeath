import type { Vec2 } from '../types';

export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt(distanceSq(a, b));
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function directionTo(from: Vec2, to: Vec2): Vec2 {
  return normalize({ x: to.x - from.x, y: to.y - from.y });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function angleToVec2(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function vec2ToAngle(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

export function circlesOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rSum = r1 + r2;
  return dx * dx + dy * dy < rSum * rSum;
}

export function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}
