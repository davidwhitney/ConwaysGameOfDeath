import type { WeaponInstance } from '../../types';
import { circlesOverlap } from '../../utils/math';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';

export interface TrailLayer {
  color: number;
  alpha: number;
  radiusScale: number;
  radiusTaper?: number;
}

export interface TrailConfig {
  count: number;
  spacing: number;
  jitter: number;
  layers: TrailLayer[];
}

export interface ActiveProjectile {
  id: number;
  sprite: Phaser.GameObjects.Sprite;
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
  weaponType: number;
  returning: boolean;
  originX: number;
  originY: number;
  angle: number;
  spiralDist: number;
}

let nextProjectileId = 1;

export class BaseProjectileWeapon extends BaseWeapon {
  protected projectiles: ActiveProjectile[] = [];
  protected trailGfx: Phaser.GameObjects.Graphics | null = null;

  protected getTexture(): string {
    return 'projectile';
  }

  /** Override to return a trail config for data-driven trail rendering. */
  protected getTrailConfig(): TrailConfig | null {
    return null;
  }

  /** Override for custom trail rendering (e.g. ScytheWeapon's angle-based trail). */
  protected drawTrail(gfx: Phaser.GameObjects.Graphics, p: ActiveProjectile): void {
    const config = this.getTrailConfig();
    if (!config) return;
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
    const nx = -p.vx / speed;
    const ny = -p.vy / speed;
    for (let i = 1; i <= config.count; i++) {
      const t = i / config.count;
      const ox = p.x + nx * i * config.spacing;
      const oy = p.y + ny * i * config.spacing;
      const jx = config.jitter ? (Math.random() - 0.5) * config.jitter : 0;
      const jy = config.jitter ? (Math.random() - 0.5) * config.jitter : 0;
      for (const layer of config.layers) {
        const taper = layer.radiusTaper ?? 0;
        const radius = p.radius * (layer.radiusScale - t * taper);
        gfx.fillStyle(layer.color, (1 - t) * layer.alpha);
        gfx.fillCircle(ox + jx, oy + jy, radius);
      }
    }
  }

  private ensureTrailGfx(): Phaser.GameObjects.Graphics {
    if (!this.trailGfx) {
      this.trailGfx = this.ctx.scene.add.graphics();
      this.trailGfx.setDepth(6); // behind projectile sprites (depth 7)
    }
    return this.trailGfx;
  }

  protected computeAngle(index: number, total: number, player: Player): number {
    return Math.atan2(player.facingY, player.facingX) + (index - (total - 1) / 2) * 0.2;
  }

  protected angleToNearest(player: Player): number {
    const nearest = this.findNearestEnemy(player.state.x, player.state.y);
    if (nearest) {
      return Math.atan2(nearest.state.y - player.state.y, nearest.state.x - player.state.x);
    }
    return Math.atan2(player.facingY, player.facingX);
  }

  protected moveProjectile(proj: ActiveProjectile, dt: number, _player: Player): boolean {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    return true; // still alive
  }

  protected fire(weapon: WeaponInstance, player: Player): void {
    const stats = this.getStats(weapon);
    const dmgMul = player.getDamageMultiplier();
    const focusedLevel = player.getFocusedLevel();
    const totalAmount = stats.amount + focusedLevel;
    const speedMul = 1 + focusedLevel * 0.15;
    const texture = this.getTexture();

    for (let i = 0; i < totalAmount; i++) {
      const angle = this.computeAngle(i, totalAmount, player);
      const sprite = this.ctx.getProjectileSprite(texture);

      this.projectiles.push({
        id: nextProjectileId++,
        sprite,
        x: player.state.x,
        y: player.state.y,
        vx: Math.cos(angle) * stats.speed * speedMul,
        vy: Math.sin(angle) * stats.speed * speedMul,
        damage: Math.floor(stats.damage * dmgMul),
        pierce: stats.pierce,
        radius: stats.area,
        lifetime: stats.duration * player.getDurationMultiplier(),
        age: 0,
        hitEnemies: new Set(),
        weaponType: this.def.type,
        returning: false,
        originX: player.state.x,
        originY: player.state.y,
        angle,
        spiralDist: 30,
      });
    }
  }

  protected updateActive(dt: number, player: Player): void {
    const gfx = this.ensureTrailGfx();
    gfx.clear();

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt * 1000;

      if (p.age >= p.lifetime || p.pierce <= 0) {
        this.returnSprite(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      const alive = this.moveProjectile(p, dt, player);
      if (!alive) {
        this.returnSprite(p);
        this.projectiles.splice(i, 1);
        continue;
      }

      p.sprite.setPosition(p.x, p.y);
      p.sprite.setRotation(Math.atan2(p.vy, p.vx));
      this.drawTrail(gfx, p);

      const enemies = this.ctx.enemyPool.getEnemiesInRadius(p.x, p.y, p.radius + 20);
      for (const enemy of enemies) {
        if (p.hitEnemies.has(enemy.state.id)) continue;
        if (circlesOverlap(p.x, p.y, p.radius, enemy.state.x, enemy.state.y, enemy.effectiveSize)) {
          p.hitEnemies.add(enemy.state.id);
          p.pierce--;
          this.hitEnemy(enemy, p.damage, this.def.type, player);
        }
      }
    }
  }

  private returnSprite(p: ActiveProjectile): void {
    p.sprite.setVisible(false);
    this.ctx.returnProjectileSprite(p.sprite);
  }

  destroy(): void {
    for (const p of this.projectiles) this.returnSprite(p);
    this.projectiles.length = 0;
    this.trailGfx?.destroy();
    this.trailGfx = null;
  }
}
