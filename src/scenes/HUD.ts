import Phaser from 'phaser';
import type { PlayerState, WeaponInstance, EffectInstance } from '../types';
import { GAME_DURATION_MS, MAX_LEVEL, MAX_WEAPONS, MAX_EFFECTS } from '../constants';
import { WEAPON_DEFS } from '../entities/weapons';
import { EFFECT_DEFS } from '../entities/effects';
import { GameEvents } from '../systems/GameEvents';
import { applyUIZoom } from '../ui/uiScale';
import { Colors } from '../colors';

const SLOT_SIZE = 32;
const SLOT_GAP = 4;
let detectedTouch = false;

export class HUDScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private seedText!: Phaser.GameObjects.Text;
  private inventoryGfx!: Phaser.GameObjects.Graphics;
  private inventoryTexts: Phaser.GameObjects.Text[] = [];
  private seed: number = 0;
  private pauseBtn: Phaser.GameObjects.Container | null = null;
  private deathMaskGfx!: Phaser.GameObjects.Graphics;
  private deathMaskText!: Phaser.GameObjects.Text;
  private lastDeathMasks = -1;

  // Dirty tracking to avoid redraws when nothing changed
  private lastHp = -1;
  private lastMaxHp = -1;
  private lastXp = -1;
  private lastXpToNext = -1;
  private lastInvKey = '';

  constructor() {
    super({ key: 'HUD' });
  }

  init(data: { seed?: number }): void {
    this.seed = data.seed ?? 0;
  }

  create(): void {
    const { width } = applyUIZoom(this);

    this.pauseBtn = null;
    this.lastInvKey = '';
    this.lastHp = -1;
    this.lastMaxHp = -1;
    this.lastXp = -1;
    this.lastXpToNext = -1;
    this.lastDeathMasks = -1;

    this.hpBar = this.add.graphics();
    this.xpBar = this.add.graphics();
    this.inventoryGfx = this.add.graphics();

    this.hpText = this.add.text(10, 8, 'HP: 100/100', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.levelText = this.add.text(10, 34, 'Lv 1', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.timerText = this.add.text(width / 2, 10, '00:00', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    this.killText = this.add.text(width - 10, 10, 'Kills: 0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff8888',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0);

    this.enemyCountText = this.add.text(width - 10, 28, 'Enemies: 0', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0);

    this.goldText = this.add.text(10, 52, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.deathMaskGfx = this.add.graphics();
    this.deathMaskText = this.add.text(28, 70, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#dd66ff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });

    this.seedText = this.add.text(width / 2, 32, `Seed: ${this.seed}`, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#444466',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5, 0);

    // Show pause button on touch devices (immediately if already detected, otherwise on first touch)
    if (detectedTouch) {
      this.createPauseButton();
    } else {
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.wasTouch && !detectedTouch) {
          detectedTouch = true;
          this.createPauseButton();
        }
      });
    }
  }

  private createPauseButton(): void {
    if (this.pauseBtn && this.pauseBtn.active) return;
    const { width } = applyUIZoom(this);

    const size = 34;
    const margin = 8;
    const btnX = width - margin - size / 2;
    const btnY = margin + size / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x222244, 0.7);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, 6);
    bg.lineStyle(1, 0x555577, 0.8);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 6);

    // Draw pause icon (two vertical bars)
    const icon = this.add.graphics();
    const barW = 5;
    const barH = 16;
    const gap = 4;
    icon.fillStyle(0xffffff, 0.9);
    icon.fillRect(-gap / 2 - barW, -barH / 2, barW, barH);
    icon.fillRect(gap / 2, -barH / 2, barW, barH);

    this.pauseBtn = this.add.container(btnX, btnY, [bg, icon]);

    // Make interactive with a generous hit area
    const hitZone = new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size);
    this.pauseBtn.setInteractive(hitZone, Phaser.Geom.Rectangle.Contains);
    this.pauseBtn.on('pointerdown', () => {
      if (!this.scene.isPaused('Game')) {
        GameEvents.pauseGame(this.scene);
      }
    });
  }

  updateHUD(player: PlayerState, gameTimeMs: number, kills: number, enemyCount: number, deathMasks: number = 0): void {
    const { width, height } = applyUIZoom(this);

    // HP bar — only redraw when values change
    if (player.hp !== this.lastHp || player.maxHp !== this.lastMaxHp) {
      this.lastHp = player.hp;
      this.lastMaxHp = player.maxHp;
      const hpPct = player.hp / player.maxHp;
      this.hpBar.clear();
      this.hpBar.fillStyle(0x333333, 0.8);
      this.hpBar.fillRect(10, 24, 200, 8);
      const hpColor = hpPct > 0.5 ? 0x44ff44 : hpPct > 0.25 ? 0xffcc00 : 0xff4444;
      this.hpBar.fillStyle(hpColor, 1);
      this.hpBar.fillRect(10, 24, 200 * hpPct, 8);
      this.hpText.setText(`HP: ${Math.ceil(player.hp)}/${player.maxHp}`);
    }

    // XP bar — only redraw when values change
    if (player.xp !== this.lastXp || player.xpToNext !== this.lastXpToNext) {
      this.lastXp = player.xp;
      this.lastXpToNext = player.xpToNext;
      const xpBarH = 8;
      const xpPct = player.xpToNext > 0 ? player.xp / player.xpToNext : 0;
      this.xpBar.clear();
      const xpBarY = height - xpBarH;
      this.xpBar.fillStyle(0x333333, 0.6);
      this.xpBar.fillRect(0, xpBarY, width, xpBarH);
      this.xpBar.fillStyle(0x00ccff, 1);
      this.xpBar.fillRect(0, xpBarY, width * xpPct, xpBarH);
    }

    // Level
    this.levelText.setText(`Lv ${player.level}`);

    // Timer (reposition for resize)
    const totalSeconds = Math.floor(gameTimeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timerText.setText(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    this.timerText.setX(width / 2);

    // Seed (reposition for resize)
    this.seedText.setX(width / 2);

    // Kills (reposition for resize — shift left on touch to avoid pause button)
    const rightMargin = detectedTouch ? 52 : 10;
    this.killText.setText(`Kills: ${kills}`);
    this.killText.setX(width - rightMargin);
    this.enemyCountText.setText(`Enemies: ${enemyCount}`);
    this.enemyCountText.setX(width - rightMargin);

    // Reposition pause button on resize
    if (this.pauseBtn) {
      this.pauseBtn.setPosition(width - 8 - 17, 8 + 17);
    }

    // Gold (only show once player has some)
    this.goldText.setText(player.gold > 0 ? `Gold: ${player.gold}` : '');

    // Death mask counter
    if (deathMasks !== this.lastDeathMasks) {
      this.lastDeathMasks = deathMasks;
      this.deathMaskGfx.clear();
      if (deathMasks > 0) {
        // Draw small purple diamond icon
        const ix = 14, iy = 78, half = 7;
        const c = Colors.gems.deathMask;
        this.deathMaskGfx.fillStyle(c.main, 1);
        this.deathMaskGfx.fillTriangle(ix, iy - half, ix + half, iy, ix, iy + half);
        this.deathMaskGfx.fillTriangle(ix, iy - half, ix - half, iy, ix, iy + half);
        this.deathMaskGfx.fillStyle(c.bright, 0.7);
        const ih = half * 0.5;
        this.deathMaskGfx.fillTriangle(ix, iy - ih, ix + ih, iy, ix, iy + ih);
        this.deathMaskGfx.fillTriangle(ix, iy - ih, ix - ih, iy, ix, iy + ih);
        this.deathMaskText.setText(`x${deathMasks}`);
        this.deathMaskText.setVisible(true);
      } else {
        this.deathMaskText.setVisible(false);
      }
    }

    // Inventory bar — only redraw when contents change
    const invKey = this.computeInvKey(player.weapons, player.effects);
    if (invKey !== this.lastInvKey) {
      this.lastInvKey = invKey;
      this.drawInventory(player.weapons, player.effects, width, height);
    }
  }

  private computeInvKey(weapons: WeaponInstance[], effects: EffectInstance[]): string {
    let key = '';
    for (const w of weapons) key += `${w.type}:${w.level},`;
    key += '|';
    for (const e of effects) key += `${e.type}:${e.level},`;
    return key;
  }

  private drawInventory(weapons: WeaponInstance[], effects: EffectInstance[], screenW: number, screenH: number): void {
    this.inventoryGfx.clear();

    // Destroy old labels (only runs on inventory change, not every frame)
    for (const t of this.inventoryTexts) t.destroy();
    this.inventoryTexts = [];

    // 6x2 grid: weapons on top row, effects on bottom row (always show all slots)
    const COLS = 6;
    const xpBarH = 8;
    const barWidth = COLS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const startX = (screenW - barWidth) / 2;
    const rowBottom = screenH - xpBarH - SLOT_SIZE - 6;
    const rowTop = rowBottom - SLOT_SIZE - 14;

    // Draw all weapon slots (top row)
    for (let i = 0; i < MAX_WEAPONS; i++) {
      const x = startX + i * (SLOT_SIZE + SLOT_GAP);
      if (i < weapons.length) {
        const def = WEAPON_DEFS[weapons[i].type];
        this.drawSlot(x, rowTop, def.color, def.name, weapons[i].level);
      } else {
        this.drawEmptySlot(x, rowTop);
      }
    }

    // Draw all effect slots (bottom row)
    for (let i = 0; i < MAX_EFFECTS; i++) {
      const x = startX + i * (SLOT_SIZE + SLOT_GAP);
      if (i < effects.length) {
        const def = EFFECT_DEFS[effects[i].type];
        this.drawSlot(x, rowBottom, def.color, def.name, effects[i].level);
      } else {
        this.drawEmptySlot(x, rowBottom);
      }
    }
  }

  private drawEmptySlot(x: number, y: number): void {
    this.inventoryGfx.fillStyle(0x111122, 0.4);
    this.inventoryGfx.fillRect(x, y, SLOT_SIZE, SLOT_SIZE);
    this.inventoryGfx.lineStyle(1, 0x333344, 0.6);
    this.inventoryGfx.strokeRect(x, y, SLOT_SIZE, SLOT_SIZE);
  }

  private drawSlot(x: number, y: number, color: number, name: string, level: number): void {
    // Background
    this.inventoryGfx.fillStyle(0x111122, 0.85);
    this.inventoryGfx.fillRect(x, y, SLOT_SIZE, SLOT_SIZE);

    // Colored icon square
    this.inventoryGfx.fillStyle(color, 0.9);
    this.inventoryGfx.fillRect(x + 4, y + 4, SLOT_SIZE - 8, SLOT_SIZE - 8);

    // Border
    this.inventoryGfx.lineStyle(1, 0x555577, 1);
    this.inventoryGfx.strokeRect(x, y, SLOT_SIZE, SLOT_SIZE);

    // Level number
    const lvlText = this.add.text(x + SLOT_SIZE - 2, y + SLOT_SIZE - 2, `${level}`, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 1);
    this.inventoryTexts.push(lvlText);

    // Name abbreviation (first 3 chars)
    const label = this.add.text(x + SLOT_SIZE / 2, y - 2, name.slice(0, 3).toUpperCase(), {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#aaaacc',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5, 1);
    this.inventoryTexts.push(label);
  }
}
