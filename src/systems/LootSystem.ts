import Phaser from 'phaser';
import { EffectType, WeaponType } from '../types';
import {
  MAX_WEAPON_LEVEL, XP_DROP_BASE_CHANCE, XP_DROP_LUCK_BONUS,
  GOLD_DROP_BASE_CHANCE, GOLD_DROP_LUCK_BONUS,
  BOSS_KILL_HEAL_PCT, HEAL_GEM_PCT,
} from '../constants';
import type { Player } from '../entities/Player';
import { XPGemPool } from '../entities/XPGem';
import type { UpdateContext } from './UpdateContext';
import type { GameSystem } from './GameSystem';
import { GameEvents } from './GameEvents';

export class LootSystem implements GameSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private xpGemPool: XPGemPool;
  private kills: number = 0;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.xpGemPool = new XPGemPool(scene);

    GameEvents.on(this.scene.events, 'enemy-killed', (e, w) => this.handleEnemyKilled(e, w));

    GameEvents.on(this.scene.events, 'scatter-health-gems', (positions) => {
      for (const p of positions) {
        this.xpGemPool.spawnHealth(p.x, p.y);
      }
    });

    GameEvents.on(this.scene.events, 'scatter-vortex-gem', (pos) => {
      this.xpGemPool.spawnVortex(pos.x, pos.y);
    });

    GameEvents.on(this.scene.events, 'clear-gems', () => {
      this.xpGemPool.clearAll();
    });
  }

  update(ctx: UpdateContext): void {
    const dt = ctx.time.delta;
    const gemResult = this.xpGemPool.update(
      dt, this.player.state.x, this.player.state.y, this.player.getPickupRange(),
    );

    if (gemResult.xp > 0) {
      this.player.addXp(gemResult.xp);
      GameEvents.sfx('gem-collect');
    }

    if (gemResult.heals > 0) {
      const healTotal = this.player.state.maxHp * HEAL_GEM_PCT * gemResult.heals;
      this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healTotal);
      GameEvents.emit(this.scene.events, 'show-damage',
        this.player.state.x, this.player.state.y - 30,
        Math.floor(healTotal), '#ff4444',
      );
      GameEvents.highlight('heal-gem');
      GameEvents.sfx('heal');
    }

    if (gemResult.vortex > 0) {
      GameEvents.highlight('vortex-gem');
      GameEvents.sfx('vortex');
    }

    if (gemResult.gold > 0) {
      this.player.state.gold += gemResult.gold;
      GameEvents.sfx('gold-collect');
    }
  }

  getKills(): number {
    return this.kills;
  }

  reset(): void {
    this.kills = 0;
  }

  destroy(): void {
    GameEvents.off(this.scene.events, 'enemy-killed');
    GameEvents.off(this.scene.events, 'scatter-health-gems');
    GameEvents.off(this.scene.events, 'scatter-vortex-gem');
    GameEvents.off(this.scene.events, 'clear-gems');
    this.xpGemPool.destroy();
  }

  private handleEnemyKilled(
    enemy: import('../entities/Enemy').Enemy,
    weaponType?: WeaponType,
  ): void {
    this.kills++;
    this.spawnDeathBurst(enemy.state.x, enemy.state.y, enemy.def.color, enemy.state.boss);

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
        GameEvents.sfx('weapon-upgrade');
        GameEvents.emit(this.scene.events, 'show-damage',
          this.player.state.x, this.player.state.y - 40,
          weapon.level, '#ffcc00',
        );
      } else {
        const healAmount = Math.floor(this.player.state.maxHp * BOSS_KILL_HEAL_PCT);
        this.player.state.hp = Math.min(this.player.state.maxHp, this.player.state.hp + healAmount);
        GameEvents.emit(this.scene.events, 'show-damage',
          this.player.state.x, this.player.state.y - 40,
          healAmount, '#ff4444',
        );
      }
      GameEvents.emit(this.scene.events, 'screen-shake', 300, 0.015);
    }
  }

  private static readonly BURST_PALETTE = [
    0xff2266, 0xff6600, 0xffcc00, 0x00ff66,
    0x00ccff, 0x8844ff, 0xff44cc, 0xffffff,
  ];

  private spawnDeathBurst(x: number, y: number, _color: number, boss: boolean): void {
    const count = boss ? 28 : 14;
    const dist = boss ? 90 : 55;
    const radius = boss ? 8 : 5;
    const palette = LootSystem.BURST_PALETTE;

    const gfx = this.scene.add.graphics().setDepth(15);

    const particles: { ax: number; ay: number; dx: number; dy: number; size: number; color: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 1.0;
      const rDist = dist * (0.3 + Math.random() * 0.7);
      particles.push({
        ax: x, ay: y,
        dx: x + Math.cos(angle) * rDist,
        dy: y + Math.sin(angle) * rDist,
        size: radius * (0.5 + Math.random() * 1.0),
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }

    let elapsed = 0;
    const duration = 500;
    const onUpdate = (_time: number, delta: number) => {
      elapsed += delta;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - (1 - t) * (1 - t);
      const alpha = 1 - t;
      const s = 1 - t * 0.4;

      gfx.clear();

      // Central flash — big multicolour burst
      if (t < 0.35) {
        const flashAlpha = (1 - t / 0.35);
        gfx.fillStyle(0xffffff, flashAlpha * 0.8);
        gfx.fillCircle(x, y, radius * 4 * (1 - t));
        gfx.fillStyle(0xff44cc, flashAlpha * 0.4);
        gfx.fillCircle(x, y, radius * 7 * (1 - t));
        gfx.fillStyle(0x00ccff, flashAlpha * 0.25);
        gfx.fillCircle(x, y, radius * 10 * (1 - t));
      }

      for (const p of particles) {
        const px = p.ax + (p.dx - p.ax) * ease;
        const py = p.ay + (p.dy - p.ay) * ease;
        const pSize = p.size * s;
        // Outer glow in particle color
        gfx.fillStyle(p.color, alpha * 0.3);
        gfx.fillCircle(px, py, pSize * 2.5);
        // Core particle
        gfx.fillStyle(p.color, alpha);
        gfx.fillCircle(px, py, pSize);
        // White-hot center
        gfx.fillStyle(0xffffff, alpha * 0.6);
        gfx.fillCircle(px, py, pSize * 0.35);
      }

      if (t >= 1) {
        this.scene.events.off('update', onUpdate);
        gfx.destroy();
      }
    };
    this.scene.events.on('update', onUpdate);
  }
}
