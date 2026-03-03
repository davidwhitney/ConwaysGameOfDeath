import { type WeaponInstance, circlesOverlap } from '../../shared';
import type { Player } from '../../entities/Player';
import { BaseWeapon } from './BaseWeapon';

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

  protected getTexture(): string {
    return 'projectile';
  }

  protected computeAngle(index: number, total: number, player: Player): number {
    return Math.atan2(player.facingY, player.facingX) + (index - (total - 1) / 2) * 0.2;
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
        lifetime: stats.duration,
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

      const enemies = this.ctx.enemyPool.getEnemiesInRadius(p.x, p.y, p.radius + 20);
      for (const enemy of enemies) {
        if (p.hitEnemies.has(enemy.state.id)) continue;
        if (circlesOverlap(p.x, p.y, p.radius, enemy.state.x, enemy.state.y, enemy.effectiveSize)) {
          p.hitEnemies.add(enemy.state.id);
          p.pierce--;
          this.ctx.hitEnemy(enemy, p.damage, this.def.type);
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
  }
}
