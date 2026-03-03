import Phaser from 'phaser';
import {
  EffectType, WeaponType, MAX_WEAPON_LEVEL,
  XP_DROP_BASE_CHANCE, XP_DROP_LUCK_BONUS,
  GOLD_DROP_BASE_CHANCE, GOLD_DROP_LUCK_BONUS,
} from '../shared';
import { BOSS_KILL_HEAL_PCT, HEAL_GEM_PCT } from '../shared/constants';
import type { Player } from '../entities/Player';
import type { XPGemPool } from '../entities/XPGem';
import type { CameraManager } from './CameraManager';

export interface LootDeps {
  scene: Phaser.Scene;
  player: Player;
  xpGemPool: XPGemPool;
  cameraManager: CameraManager;
}

export class LootSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private xpGemPool: XPGemPool;
  private cameraManager: CameraManager;
  private kills: number = 0;

  constructor(deps: LootDeps) {
    this.scene = deps.scene;
    this.player = deps.player;
    this.xpGemPool = deps.xpGemPool;
    this.cameraManager = deps.cameraManager;

    this.scene.events.on('enemy-killed',
      (e: { state: { x: number; y: number; xpValue: number; boss: boolean }; def?: { color: number } }, w?: WeaponType) =>
        this.handleEnemyKilled(e, w),
    );
  }

  updatePickups(dt: number): void {
    const gemResult = this.xpGemPool.update(
      dt, this.player.state.x, this.player.state.y, this.player.getPickupRange(),
    );

    if (gemResult.xp > 0) {
      this.player.addXp(gemResult.xp);
    }

    if (gemResult.heals > 0) {
      const healTotal = this.player.state.maxHp * HEAL_GEM_PCT * gemResult.heals;
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healTotal);
      this.scene.events.emit('show-damage',
        this.player.state.x, this.player.state.y - 30,
        Math.floor(healTotal), '#ff4444',
      );
    }

    if (gemResult.gold > 0) {
      this.player.state.gold += gemResult.gold;
    }
  }

  getKills(): number {
    return this.kills;
  }

  reset(): void {
    this.kills = 0;
  }

  destroy(): void {
    this.scene.events.off('enemy-killed');
  }

  private handleEnemyKilled(
    enemy: { state: { x: number; y: number; xpValue: number; boss: boolean }; def?: { color: number } },
    weaponType?: WeaponType,
  ): void {
    this.kills++;
    this.spawnDeathBurst(enemy.state.x, enemy.state.y, enemy.def?.color ?? 0xffffff, enemy.state.boss);

    const luckValue = this.player.getEffectValue(EffectType.Luck);
    const dropChance = Math.min(1, XP_DROP_BASE_CHANCE + luckValue * (XP_DROP_LUCK_BONUS / 0.15));
    if (Math.random() < dropChance) {
      this.xpGemPool.spawn(enemy.state.x, enemy.state.y, enemy.state.xpValue);
    }

    // Gold drop (scaled with luck + GoldFind)
    const goldChance = Math.min(1, GOLD_DROP_BASE_CHANCE + luckValue * (GOLD_DROP_LUCK_BONUS / 0.15));
    if (Math.random() < goldChance) {
      const goldAmount = 1 + Math.floor(this.player.getEffectValue(EffectType.GoldFind));
      this.xpGemPool.spawnGold(enemy.state.x, enemy.state.y, goldAmount);
    }

    // Boss kill: level up the weapon that killed it, or heal 50%
    if (enemy.state.boss && weaponType !== undefined) {
      const weapon = this.player.state.weapons.find(w => w.type === weaponType);
      if (weapon && weapon.level < MAX_WEAPON_LEVEL) {
        weapon.level++;
        this.scene.events.emit('show-damage',
          this.player.state.x, this.player.state.y - 40,
          weapon.level, '#ffcc00',
        );
      } else {
        const healAmount = Math.floor(this.player.state.maxHp * BOSS_KILL_HEAL_PCT);
        this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healAmount);
        this.scene.events.emit('show-damage',
          this.player.state.x, this.player.state.y - 40,
          healAmount, '#ff4444',
        );
      }
      this.cameraManager.shake(300, 0.015);
    }
  }

  private spawnDeathBurst(x: number, y: number, color: number, boss: boolean): void {
    const count = boss ? 12 : 6;
    const dist = boss ? 50 : 28;
    const radius = boss ? 5 : 3;

    const gfx = this.scene.add.graphics().setDepth(15);
    gfx.fillStyle(color, 1);
    for (let i = 0; i < count; i++) {
      gfx.fillCircle(0, 0, radius);
    }

    const particles: { ax: number; ay: number; dx: number; dy: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const r = dist * (0.5 + Math.random() * 0.5);
      particles.push({
        ax: x, ay: y,
        dx: x + Math.cos(angle) * r,
        dy: y + Math.sin(angle) * r,
      });
    }

    let elapsed = 0;
    const duration = 350;
    const onUpdate = (_time: number, delta: number) => {
      elapsed += delta;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - (1 - t) * (1 - t);
      const alpha = 1 - t;
      const s = 1 - t * 0.6;

      gfx.clear();
      gfx.fillStyle(color, alpha);
      for (const p of particles) {
        const px = p.ax + (p.dx - p.ax) * ease;
        const py = p.ay + (p.dy - p.ay) * ease;
        gfx.fillCircle(px, py, radius * s);
      }

      if (t >= 1) {
        this.scene.events.off('update', onUpdate);
        gfx.destroy();
      }
    };
    this.scene.events.on('update', onUpdate);
  }
}
