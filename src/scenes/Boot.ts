import Phaser from 'phaser';

/**
 * BootScene - Generate all placeholder sprites using Graphics API.
 * No external assets needed.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    this.generateTextures();
    this.scene.start('MainMenu');
  }

  private generateTextures(): void {
    // Player - blue square with lighter center
    this.createCircleTexture('player', 16, 0x4488ff, 0x66aaff);

    // Enemies
    this.createCircleTexture('enemy-bat', 10, 0x8b4513, 0xa0522d);
    this.createCircleTexture('enemy-skeleton', 12, 0xd2b48c, 0xdeb887);
    this.createCircleTexture('enemy-zombie', 14, 0x556b2f, 0x6b8e23);
    this.createCircleTexture('enemy-ghost', 12, 0xc0c0ff, 0xd0d0ff);
    this.createCircleTexture('enemy-werewolf', 16, 0x808080, 0xa0a0a0);
    this.createCircleTexture('enemy-mummy', 14, 0xf5deb3, 0xfaebd7);
    this.createCircleTexture('enemy-vampire', 14, 0x8b0000, 0xb22222);
    this.createCircleTexture('enemy-lich', 16, 0x4b0082, 0x6a0dad);
    this.createCircleTexture('enemy-dragon', 24, 0xff4500, 0xff6347);
    this.createCircleTexture('enemy-reaper', 18, 0x1a1a2e, 0x3a3a5e);

    // Death boss - concentric red rings
    const deathR = 28;
    const deathSize = deathR * 2;
    const deathGfx = this.make.graphics({ x: 0, y: 0 });
    for (let r = deathR; r > 4; r -= 7) {
      const alpha = 0.9 - (deathR - r) * 0.15;
      deathGfx.lineStyle(2, 0xff0000, Math.max(0.2, alpha));
      deathGfx.strokeCircle(deathR, deathR, r);
    }
    deathGfx.generateTexture('enemy-death', deathSize, deathSize);
    deathGfx.destroy();

    // XP Gem - small green diamond
    const gemGfx = this.make.graphics({ x: 0, y: 0 });
    gemGfx.fillStyle(0x00ff88, 1);
    gemGfx.fillTriangle(6, 0, 12, 6, 6, 12);
    gemGfx.fillTriangle(6, 0, 0, 6, 6, 12);
    gemGfx.generateTexture('xp-gem', 12, 12);
    gemGfx.destroy();

    // Golden Gem - gold diamond (heal pickup)
    const goldGemGfx = this.make.graphics({ x: 0, y: 0 });
    goldGemGfx.fillStyle(0xff4444, 1);
    goldGemGfx.fillTriangle(8, 0, 16, 8, 8, 16);
    goldGemGfx.fillTriangle(8, 0, 0, 8, 8, 16);
    goldGemGfx.lineStyle(1, 0xff8888, 1);
    goldGemGfx.strokeTriangle(8, 0, 16, 8, 8, 16);
    goldGemGfx.strokeTriangle(8, 0, 0, 8, 8, 16);
    goldGemGfx.generateTexture('golden-gem', 16, 16);
    goldGemGfx.destroy();

    // Gold Gem - gold diamond (currency pickup)
    const coinGfx = this.make.graphics({ x: 0, y: 0 });
    coinGfx.fillStyle(0xffd700, 1);
    coinGfx.fillTriangle(7, 0, 14, 7, 7, 14);
    coinGfx.fillTriangle(7, 0, 0, 7, 7, 14);
    coinGfx.lineStyle(1, 0xffec80, 1);
    coinGfx.strokeTriangle(7, 0, 14, 7, 7, 14);
    coinGfx.strokeTriangle(7, 0, 0, 7, 7, 14);
    coinGfx.generateTexture('gold-gem', 14, 14);
    coinGfx.destroy();

    // Vortex Gem - blue diamond
    const vortexGfx = this.make.graphics({ x: 0, y: 0 });
    vortexGfx.fillStyle(0x4488ff, 1);
    vortexGfx.fillTriangle(8, 0, 16, 8, 8, 16);
    vortexGfx.fillTriangle(8, 0, 0, 8, 8, 16);
    vortexGfx.lineStyle(1, 0x66aaff, 1);
    vortexGfx.strokeTriangle(8, 0, 16, 8, 8, 16);
    vortexGfx.strokeTriangle(8, 0, 0, 8, 8, 16);
    vortexGfx.generateTexture('vortex-gem', 16, 16);
    vortexGfx.destroy();

    // Projectile - small white circle
    this.createCircleTexture('projectile', 6, 0xffffff, 0xcccccc);

    // Weapon-specific projectile colors
    this.createCircleTexture('proj-magic', 6, 0xcc66ff, 0xdd88ff);
    this.createCircleTexture('proj-fire', 8, 0xff4400, 0xff6633);
    this.createCircleTexture('proj-ice', 5, 0x00ccff, 0x44ddff);
    this.createCircleTexture('proj-boomerang', 8, 0xcc9933, 0xddaa44);
    this.createCircleTexture('proj-scythe', 8, 0x666666, 0x888888);

    // Tile textures
    this.createRectTexture('tile-floor', 32, 32, 0x2a2a3e, 0x252538);
    this.createRectTexture('tile-wall', 32, 32, 0x555577, 0x444466);

    // UI elements
    this.createRectTexture('white', 4, 4, 0xffffff);
    this.createRectTexture('button', 200, 50, 0x333366, 0x444477);

    // AoE circle indicators
    for (const size of [40, 50, 55, 60, 70, 80, 90, 100, 120]) {
      this.createRingTexture(`aoe-${size}`, size, 0xff660044);
    }
  }

  private createCircleTexture(key: string, radius: number, color: number, innerColor?: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    const size = radius * 2;
    gfx.fillStyle(color, 1);
    gfx.fillCircle(radius, radius, radius);
    if (innerColor) {
      gfx.fillStyle(innerColor, 1);
      gfx.fillCircle(radius, radius, radius * 0.5);
    }
    gfx.generateTexture(key, size, size);
    gfx.destroy();
  }

  private createRectTexture(key: string, w: number, h: number, color: number, borderColor?: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    if (borderColor) {
      gfx.fillStyle(borderColor, 1);
      gfx.fillRect(0, 0, w, h);
      gfx.fillStyle(color, 1);
      gfx.fillRect(1, 1, w - 2, h - 2);
    } else {
      gfx.fillStyle(color, 1);
      gfx.fillRect(0, 0, w, h);
    }
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }

  private createRingTexture(key: string, radius: number, color: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    const size = radius * 2;
    gfx.fillStyle(color, 0.25);
    gfx.fillCircle(radius, radius, radius);
    gfx.lineStyle(2, color, 0.6);
    gfx.strokeCircle(radius, radius, radius);
    gfx.generateTexture(key, size, size);
    gfx.destroy();
  }
}
