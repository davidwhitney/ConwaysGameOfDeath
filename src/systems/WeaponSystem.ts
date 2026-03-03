import Phaser from 'phaser';
import {
  type WeaponInstance, type WeaponDef, WeaponType, EffectType,
  WEAPON_DEFS, getWeaponStats, circlesOverlap, directionTo, angleToVec2,
} from '../shared';
import { CRIT_DAMAGE_MULTIPLIER } from '../shared/constants';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { EnemyPool } from './EnemyPool';
import type { DamageNumberSystem } from '../ui/DamageNumber';

interface ActiveProjectile {
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
  weaponType: WeaponType;
  // For boomerang return
  returning?: boolean;
  originX?: number;
  originY?: number;
  // For scythe spiral
  angle?: number;
  spiralDist?: number;
}

interface ActiveMelee {
  weaponType: WeaponType;
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  age: number;
  hitEnemies: Set<number>;
  gfx: Phaser.GameObjects.Graphics;
}

interface ActiveAoE {
  weaponType: WeaponType;
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  age: number;
  tickTimer: number;
  gfx: Phaser.GameObjects.Graphics;
}

export class WeaponSystem {
  private scene: Phaser.Scene;
  private projectiles: ActiveProjectile[] = [];
  private projectilePool: Phaser.GameObjects.Sprite[] = [];
  private melees: ActiveMelee[] = [];
  private aoes: ActiveAoE[] = [];
  private nextProjectileId = 1;
  private critChance = 0;

  // Force field state
  private forceFieldGfx: Phaser.GameObjects.Graphics;
  private forceFieldTickTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.forceFieldGfx = scene.add.graphics();
    this.forceFieldGfx.setDepth(8);

    // Pre-allocate projectile sprites
    for (let i = 0; i < 50; i++) {
      const s = scene.add.sprite(-1000, -1000, 'projectile');
      s.setVisible(false);
      s.setDepth(7);
      this.projectilePool.push(s);
    }
  }

  update(dt: number, player: Player, enemyPool: EnemyPool, damageNumbers: DamageNumberSystem): void {
    const now = this.scene.time.now;
    const dmgMul = player.getDamageMultiplier();
    const cdReduction = player.getCooldownReduction();
    const auraMul = player.getAuraMultiplier();
    const furyReduction = player.getFuryReduction();
    const focusedLevel = player.getFocusedLevel();
    this.critChance = player.getEffectValue(EffectType.Luck);

    // Process each weapon
    for (const weapon of player.state.weapons) {
      weapon.cooldownTimer -= dt * 1000;

      if (weapon.cooldownTimer <= 0) {
        const def = WEAPON_DEFS[weapon.type];
        const stats = getWeaponStats(def, weapon.level);
        let cooldown = stats.cooldown * (1 - cdReduction);

        switch (def.category) {
          case 'melee':
            cooldown *= (1 - furyReduction);
            this.fireMelee(player, def, stats, dmgMul);
            break;
          case 'aoe':
            this.fireAoE(player, def, stats, dmgMul, enemyPool, auraMul);
            break;
          case 'projectile':
            this.fireProjectile(player, def, stats, dmgMul, enemyPool, focusedLevel);
            break;
          case 'forcefield':
            // Force fields don't fire on cooldown, they're always active
            break;
        }

        weapon.cooldownTimer = cooldown;
      }
    }

    // Update projectiles
    this.updateProjectiles(dt, player, enemyPool, damageNumbers, dmgMul);

    // Update melee attacks
    this.updateMelees(dt, enemyPool, damageNumbers, dmgMul);

    // Update AoE zones
    this.updateAoEs(dt, enemyPool, damageNumbers, dmgMul);

    // Update force fields
    this.updateForceFields(dt, player, enemyPool, damageNumbers, dmgMul, auraMul);
  }

  private fireMelee(player: Player, def: WeaponDef, stats: ReturnType<typeof getWeaponStats>, dmgMul: number): void {
    for (let i = 0; i < stats.amount; i++) {
      const angle = Math.atan2(player.facingY, player.facingX) + (i - (stats.amount - 1) / 2) * 0.5;
      const gfx = this.scene.add.graphics();
      gfx.setDepth(9);

      this.melees.push({
        weaponType: def.type,
        x: player.state.x + Math.cos(angle) * stats.area * 0.6,
        y: player.state.y + Math.sin(angle) * stats.area * 0.6,
        radius: stats.area,
        damage: Math.floor(stats.damage * dmgMul),
        duration: stats.duration,
        age: 0,
        hitEnemies: new Set(),
        gfx,
      });
    }
  }

  private findNearestEnemy(enemies: Enemy[], px: number, py: number): Enemy | null {
    let nearest: Enemy | null = null;
    let nearDist = Infinity;
    for (const e of enemies) {
      const dx = e.state.x - px;
      const dy = e.state.y - py;
      const d = dx * dx + dy * dy;
      if (d < nearDist) { nearDist = d; nearest = e; }
    }
    return nearest;
  }

  private fireAoE(player: Player, def: WeaponDef, stats: ReturnType<typeof getWeaponStats>, dmgMul: number, enemyPool: EnemyPool, auraMul: number = 1): void {
    for (let i = 0; i < stats.amount; i++) {
      let targetX = player.state.x;
      let targetY = player.state.y;

      if (def.type === WeaponType.Lightning) {
        // Target nearest enemy
        const nearest = this.findNearestEnemy(enemyPool.getActive(), player.state.x, player.state.y);
        if (nearest) { targetX = nearest.state.x; targetY = nearest.state.y; }
      } else {
        // Random position near player
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 150;
        targetX += Math.cos(angle) * dist;
        targetY += Math.sin(angle) * dist;
      }

      const gfx = this.scene.add.graphics();
      gfx.setDepth(6);

      this.aoes.push({
        weaponType: def.type,
        x: targetX,
        y: targetY,
        radius: stats.area * auraMul,
        damage: Math.floor(stats.damage * dmgMul),
        duration: Math.max(stats.duration, 300),
        age: 0,
        tickTimer: 0,
        gfx,
      });
    }
  }

  private fireProjectile(player: Player, def: WeaponDef, stats: ReturnType<typeof getWeaponStats>, dmgMul: number, enemyPool: EnemyPool, focusedLevel: number = 0): void {
    const totalAmount = stats.amount + focusedLevel;
    const speedMul = 1 + focusedLevel * 0.15;
    for (let i = 0; i < totalAmount; i++) {
      let angle: number;

      if (def.type === WeaponType.MagicMissile) {
        // Aim at nearest enemy
        const nearest = this.findNearestEnemy(enemyPool.getActive(), player.state.x, player.state.y);
        if (nearest) {
          angle = Math.atan2(nearest.state.y - player.state.y, nearest.state.x - player.state.x);
        } else {
          angle = Math.atan2(player.facingY, player.facingX);
        }
      } else if (def.type === WeaponType.IceShard) {
        // Spread pattern
        const baseAngle = Math.atan2(player.facingY, player.facingX);
        angle = baseAngle + (i - (totalAmount - 1) / 2) * 0.3;
      } else if (def.type === WeaponType.Scythe) {
        angle = (i / totalAmount) * Math.PI * 2;
      } else {
        angle = Math.atan2(player.facingY, player.facingX) + (i - (totalAmount - 1) / 2) * 0.2;
      }

      const texMap: Partial<Record<WeaponType, string>> = {
        [WeaponType.MagicMissile]: 'proj-magic',
        [WeaponType.Fireball]: 'proj-fire',
        [WeaponType.IceShard]: 'proj-ice',
        [WeaponType.Boomerang]: 'proj-boomerang',
        [WeaponType.Scythe]: 'proj-scythe',
      };

      const sprite = this.getProjectileSprite(texMap[def.type] || 'projectile');

      this.projectiles.push({
        id: this.nextProjectileId++,
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
        weaponType: def.type,
        returning: false,
        originX: player.state.x,
        originY: player.state.y,
        angle: angle,
        spiralDist: 30,
      });
    }
  }

  private getProjectileSprite(texture: string): Phaser.GameObjects.Sprite {
    if (this.projectilePool.length > 0) {
      const s = this.projectilePool.pop()!;
      s.setTexture(texture);
      s.setVisible(true);
      return s;
    }
    const s = this.scene.add.sprite(-1000, -1000, texture);
    s.setDepth(7);
    return s;
  }

  private updateProjectiles(dt: number, player: Player, enemyPool: EnemyPool, dmgNums: DamageNumberSystem, dmgMul: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt * 1000;

      if (p.age >= p.lifetime || p.pierce <= 0) {
        p.sprite.setVisible(false);
        this.projectilePool.push(p.sprite);
        this.projectiles.splice(i, 1);
        continue;
      }

      // Special movement
      if (p.weaponType === WeaponType.Boomerang && p.age > p.lifetime * 0.5 && !p.returning) {
        p.returning = true;
      }
      if (p.returning) {
        const dir = directionTo(p, { x: player.state.x, y: player.state.y });
        const speed = 350;
        p.vx = dir.x * speed;
        p.vy = dir.y * speed;
        // Despawn if close to player
        const dx = p.x - player.state.x;
        const dy = p.y - player.state.y;
        if (dx * dx + dy * dy < 400) {
          p.sprite.setVisible(false);
          this.projectilePool.push(p.sprite);
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      if (p.weaponType === WeaponType.Scythe) {
        // Spiral outward
        p.angle! += dt * 4;
        p.spiralDist! += dt * 80;
        p.x = player.state.x + Math.cos(p.angle!) * p.spiralDist!;
        p.y = player.state.y + Math.sin(p.angle!) * p.spiralDist!;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      p.sprite.setPosition(p.x, p.y);
      p.sprite.setRotation(Math.atan2(p.vy, p.vx));

      // Check enemy collisions
      const enemies = enemyPool.getEnemiesInRadius(p.x, p.y, p.radius + 20);
      for (const enemy of enemies) {
        if (p.hitEnemies.has(enemy.state.id)) continue;
        if (circlesOverlap(p.x, p.y, p.radius, enemy.state.x, enemy.state.y, enemy.effectiveSize)) {
          p.hitEnemies.add(enemy.state.id);
          p.pierce--;
          this.hitEnemy(enemy, p.damage, p.weaponType, dmgNums);
        }
      }
    }
  }

  private updateMelees(dt: number, enemyPool: EnemyPool, dmgNums: DamageNumberSystem, dmgMul: number): void {
    for (let i = this.melees.length - 1; i >= 0; i--) {
      const m = this.melees[i];
      m.age += dt * 1000;

      if (m.age >= m.duration) {
        m.gfx.destroy();
        this.melees.splice(i, 1);
        continue;
      }

      // Draw melee swing
      const alpha = 1 - m.age / m.duration;
      m.gfx.clear();
      const def = WEAPON_DEFS[m.weaponType];
      m.gfx.fillStyle(def.color, alpha * 0.4);
      m.gfx.fillCircle(m.x, m.y, m.radius * alpha);
      m.gfx.lineStyle(2, def.color, alpha * 0.8);
      m.gfx.strokeCircle(m.x, m.y, m.radius * alpha);

      // Check enemy collisions
      const enemies = enemyPool.getEnemiesInRadius(m.x, m.y, m.radius);
      for (const enemy of enemies) {
        if (m.hitEnemies.has(enemy.state.id)) continue;
        m.hitEnemies.add(enemy.state.id);
        this.hitEnemy(enemy, m.damage, m.weaponType, dmgNums);
      }
    }
  }

  private updateAoEs(dt: number, enemyPool: EnemyPool, dmgNums: DamageNumberSystem, dmgMul: number): void {
    for (let i = this.aoes.length - 1; i >= 0; i--) {
      const a = this.aoes[i];
      a.age += dt * 1000;

      if (a.age >= a.duration) {
        a.gfx.destroy();
        this.aoes.splice(i, 1);
        continue;
      }

      // Draw AoE effect
      const progress = a.age / a.duration;
      const alpha = progress < 0.1 ? progress * 10 : (progress > 0.8 ? (1 - progress) * 5 : 1);
      const def = WEAPON_DEFS[a.weaponType];
      a.gfx.clear();
      a.gfx.fillStyle(def.color, alpha * 0.3);
      a.gfx.fillCircle(a.x, a.y, a.radius);
      a.gfx.lineStyle(2, def.color, alpha * 0.6);
      a.gfx.strokeCircle(a.x, a.y, a.radius);

      // Tick damage
      a.tickTimer += dt * 1000;
      if (a.tickTimer >= 200) {
        a.tickTimer -= 200;
        const enemies = enemyPool.getEnemiesInRadius(a.x, a.y, a.radius);
        for (const enemy of enemies) {
          this.hitEnemy(enemy, a.damage, a.weaponType, dmgNums);
          if (a.weaponType === WeaponType.Garlic) {
            enemy.applySlow(0.6, 400);
          }
        }
      }
    }
  }

  private updateForceFields(dt: number, player: Player, enemyPool: EnemyPool, dmgNums: DamageNumberSystem, dmgMul: number, auraMul: number = 1): void {
    this.forceFieldGfx.clear();
    this.forceFieldTickTimer += dt * 1000;
    const doTick = this.forceFieldTickTimer >= 200;
    if (doTick) this.forceFieldTickTimer -= 200;

    for (const weapon of player.state.weapons) {
      const def = WEAPON_DEFS[weapon.type];
      if (def.category !== 'forcefield') continue;
      const stats = getWeaponStats(def, weapon.level);
      const area = stats.area * auraMul;

      if (def.type === WeaponType.HolyShield) {
        // Rotating orbs
        const time = this.scene.time.now * 0.002 * stats.speed;
        for (let i = 0; i < stats.amount; i++) {
          const angle = time + (i / stats.amount) * Math.PI * 2;
          const ox = player.state.x + Math.cos(angle) * area;
          const oy = player.state.y + Math.sin(angle) * area;
          this.forceFieldGfx.fillStyle(def.color, 0.7);
          this.forceFieldGfx.fillCircle(ox, oy, 8);

          if (doTick) {
            const enemies = enemyPool.getEnemiesInRadius(ox, oy, 15);
            for (const enemy of enemies) {
              this.hitEnemy(enemy, Math.floor(stats.damage * dmgMul), def.type, dmgNums);
            }
          }
        }
      } else {
        // Aura-type force fields
        this.forceFieldGfx.fillStyle(def.color, 0.1);
        this.forceFieldGfx.fillCircle(player.state.x, player.state.y, area);
        this.forceFieldGfx.lineStyle(1, def.color, 0.3);
        this.forceFieldGfx.strokeCircle(player.state.x, player.state.y, area);

        const enemies = enemyPool.getEnemiesInRadius(player.state.x, player.state.y, area);

        // Vortex: pull enemies toward player every frame
        if (def.type === WeaponType.Vortex) {
          for (const enemy of enemies) {
            const dir = directionTo(enemy.state, { x: player.state.x, y: player.state.y });
            const pullSpeed = 120;
            enemy.state.x += dir.x * pullSpeed * dt;
            enemy.state.y += dir.y * pullSpeed * dt;
          }
        }

        if (doTick) {
          for (const enemy of enemies) {
            if (def.type === WeaponType.VoidField) {
              enemy.applySlow(0.4, 300);
            } else {
              this.hitEnemy(enemy, Math.floor(stats.damage * dmgMul), def.type, dmgNums);
              if (def.type === WeaponType.FrostAura) {
                enemy.applySlow(0.5, 500);
              }
            }
          }
        }
      }
    }
  }

  private hitEnemy(enemy: Enemy, damage: number, weaponType: WeaponType, dmgNums: DamageNumberSystem): void {
    let finalDamage = damage;
    let isCrit = false;
    if (this.critChance > 0 && Math.random() < this.critChance) {
      isCrit = true;
      finalDamage = Math.floor(damage * (CRIT_DAMAGE_MULTIPLIER + this.critChance));
    }
    const killed = enemy.takeDamage(finalDamage);
    dmgNums.show(enemy.state.x, enemy.state.y - 15, finalDamage, isCrit ? '#ff2222' : '#ffffff', isCrit);
    if (killed) {
      this.scene.events.emit('enemy-killed', enemy, weaponType);
    }
  }

  destroy(): void {
    for (const p of this.projectiles) p.sprite.destroy();
    for (const m of this.melees) m.gfx.destroy();
    for (const a of this.aoes) a.gfx.destroy();
    for (const s of this.projectilePool) s.destroy();
    this.forceFieldGfx.destroy();
  }
}
