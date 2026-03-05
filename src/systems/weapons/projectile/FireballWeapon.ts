import { BaseProjectileWeapon, type ActiveProjectile } from '../BaseProjectileWeapon';

export class FireballWeapon extends BaseProjectileWeapon {
  protected getTexture(): string {
    return 'proj-fire';
  }

  protected drawTrail(gfx: Phaser.GameObjects.Graphics, p: ActiveProjectile): void {
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    const nx = -p.vx / speed;
    const ny = -p.vy / speed;
    // Fire trail — flickering warm circles behind projectile
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      const ox = p.x + nx * i * 6;
      const oy = p.y + ny * i * 6;
      const jx = (Math.random() - 0.5) * 4;
      const jy = (Math.random() - 0.5) * 4;
      const size = p.radius * (1 - t * 0.6);
      // Orange outer
      gfx.fillStyle(0xff6600, (1 - t) * 0.4);
      gfx.fillCircle(ox + jx, oy + jy, size * 1.5);
      // Yellow core
      gfx.fillStyle(0xffcc00, (1 - t) * 0.6);
      gfx.fillCircle(ox + jx, oy + jy, size);
    }
  }
}
