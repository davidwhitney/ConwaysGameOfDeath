import Phaser from 'phaser';
import { GAME_DURATION_MS, MAX_LEVEL, WEAPON_DEFS, EFFECT_DEFS } from '../shared';
import type { PlayerState, WeaponInstance, EffectInstance } from '../shared';
import { applyUIZoom } from '../ui/uiScale';

const SLOT_SIZE = 32;
const SLOT_GAP = 4;

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

  constructor() {
    super({ key: 'HUD' });
  }

  init(data: { seed?: number }): void {
    this.seed = data.seed ?? 0;
  }

  create(): void {
    const { width } = applyUIZoom(this);

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

    this.seedText = this.add.text(width / 2, 32, `Seed: ${this.seed}`, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#444466',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5, 0);
  }

  updateHUD(player: PlayerState, gameTimeMs: number, kills: number, enemyCount: number): void {
    const { width, height } = applyUIZoom(this);

    // HP bar
    const hpPct = player.hp / player.maxHp;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(10, 24, 200, 8);
    const hpColor = hpPct > 0.5 ? 0x44ff44 : hpPct > 0.25 ? 0xffcc00 : 0xff4444;
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(10, 24, 200 * hpPct, 8);
    this.hpText.setText(`HP: ${Math.ceil(player.hp)}/${player.maxHp}`);

    // XP bar (full width above inventory bar)
    const xpPct = player.xpToNext > 0 ? player.xp / player.xpToNext : 0;
    this.xpBar.clear();
    const xpBarY = height - SLOT_SIZE - 16;
    this.xpBar.fillStyle(0x333333, 0.6);
    this.xpBar.fillRect(0, xpBarY, width, 4);
    this.xpBar.fillStyle(0x00ccff, 1);
    this.xpBar.fillRect(0, xpBarY, width * xpPct, 4);

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

    // Kills (reposition for resize)
    this.killText.setText(`Kills: ${kills}`);
    this.killText.setX(width - 10);
    this.enemyCountText.setText(`Enemies: ${enemyCount}`);
    this.enemyCountText.setX(width - 10);

    // Gold (only show once player has some)
    this.goldText.setText(player.gold > 0 ? `Gold: ${player.gold}` : '');

    // Inventory bar
    this.drawInventory(player.weapons, player.effects, width, height);
  }

  private drawInventory(weapons: WeaponInstance[], effects: EffectInstance[], screenW: number, screenH: number): void {
    this.inventoryGfx.clear();

    // Remove old labels
    for (const t of this.inventoryTexts) t.destroy();
    this.inventoryTexts = [];

    const totalSlots = weapons.length + effects.length;
    if (totalSlots === 0) return;

    const barWidth = totalSlots * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP;
    const startX = (screenW - barWidth) / 2;
    const y = screenH - SLOT_SIZE - 6;

    let idx = 0;

    // Draw weapon slots
    for (const w of weapons) {
      const def = WEAPON_DEFS[w.type];
      const x = startX + idx * (SLOT_SIZE + SLOT_GAP);
      this.drawSlot(x, y, def.color, def.name, w.level);
      idx++;
    }

    // Draw effect slots
    for (const e of effects) {
      const def = EFFECT_DEFS[e.type];
      const x = startX + idx * (SLOT_SIZE + SLOT_GAP);
      this.drawSlot(x, y, def.color, def.name, e.level);
      idx++;
    }
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
