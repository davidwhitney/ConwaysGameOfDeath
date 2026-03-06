import Phaser from 'phaser';

/** Draw a 3-layer glowing circle: outer glow → core → white-hot center. */
export function drawGlowCircle(
  gfx: Phaser.GameObjects.Graphics,
  x: number, y: number, radius: number,
  color: number, alpha: number,
  glowScale: number = 2.0,
  glowAlpha: number = 0.3,
  hotCenter: boolean = true,
): void {
  // Outer glow
  gfx.fillStyle(color, alpha * glowAlpha);
  gfx.fillCircle(x, y, radius * glowScale);
  // Core
  gfx.fillStyle(color, alpha);
  gfx.fillCircle(x, y, radius);
  // White-hot center
  if (hotCenter) {
    gfx.fillStyle(0xffffff, alpha * 0.6);
    gfx.fillCircle(x, y, radius * 0.35);
  }
}

export function drawEffectCircle(
  gfx: Phaser.GameObjects.Graphics,
  x: number, y: number, radius: number,
  color: number, fillAlpha: number, strokeAlpha: number,
  strokeWidth: number = 2,
): void {
  // Outer glow halo
  gfx.fillStyle(color, fillAlpha * 0.3);
  gfx.fillCircle(x, y, radius * 1.15);
  // Main fill — always translucent
  gfx.fillStyle(color, fillAlpha);
  gfx.fillCircle(x, y, radius);
  // Bright edge stroke
  gfx.lineStyle(strokeWidth, color, strokeAlpha);
  gfx.strokeCircle(x, y, radius);
}
