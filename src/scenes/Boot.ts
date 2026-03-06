import Phaser from 'phaser';
import { loadSettings } from '../ui/saveData';
import { Colors } from '../colors';

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
    this.scene.start(loadSettings().skipIntro ? 'MainMenu' : 'Intro');
  }

  private generateTextures(): void {
    // Player - blazing electric blue
    this.createCircleTexture('player', 16, Colors.player.main, Colors.player.inner);

    // Enemies — full-brightness neon
    this.createCircleTexture('enemy-bat', 10, Colors.enemies.bat.main, Colors.enemies.bat.inner);
    this.createCircleTexture('enemy-skeleton', 12, Colors.enemies.skeleton.main, Colors.enemies.skeleton.inner);
    this.createCircleTexture('enemy-zombie', 14, Colors.enemies.zombie.main, Colors.enemies.zombie.inner);
    this.createCircleTexture('enemy-ghost', 12, Colors.enemies.ghost.main, Colors.enemies.ghost.inner);
    this.createCircleTexture('enemy-werewolf', 16, Colors.enemies.werewolf.main, Colors.enemies.werewolf.inner);
    this.createCircleTexture('enemy-mummy', 14, Colors.enemies.mummy.main, Colors.enemies.mummy.inner);
    this.createCircleTexture('enemy-vampire', 14, Colors.enemies.vampire.main, Colors.enemies.vampire.inner);
    this.createCircleTexture('enemy-lich', 16, Colors.enemies.lich.main, Colors.enemies.lich.inner);
    this.createCircleTexture('enemy-dragon', 24, Colors.enemies.dragon.main, Colors.enemies.dragon.inner);
    this.createCircleTexture('enemy-reaper', 18, Colors.enemies.reaper.main, Colors.enemies.reaper.inner);

    // Death boss - black hole with blazing accretion disk
    const deathR = 28;
    const deathPad = 8;
    const deathSize = (deathR + deathPad) * 2;
    const deathGfx = this.make.graphics({ x: 0, y: 0 });
    const cx = deathR + deathPad, cy = deathR + deathPad;
    // Wide outer glow halo
    const d = Colors.enemies.death;
    for (let r = deathR + deathPad; r > deathR * 0.4; r -= 2) {
      const t = (r - deathR * 0.4) / (deathR + deathPad - deathR * 0.4);
      deathGfx.fillStyle(d.halo, t * 0.3);
      deathGfx.fillCircle(cx, cy, r);
    }
    // Spiral arms — brighter, more visible
    for (let arm = 0; arm < 6; arm++) {
      const baseAngle = (arm / 6) * Math.PI * 2;
      for (let s = 0; s < 24; s++) {
        const t = s / 24;
        const angle = baseAngle + t * Math.PI * 1.5;
        const dist = deathR * 0.25 + t * deathR * 0.7;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const size = 2 + t * 4;
        const alpha = (1 - t) * 0.8;
        deathGfx.fillStyle(d.spiral, alpha);
        deathGfx.fillCircle(px, py, size);
      }
    }
    // Dark core
    deathGfx.fillStyle(d.core, 1);
    deathGfx.fillCircle(cx, cy, deathR * 0.3);
    // Blazing core edge
    deathGfx.lineStyle(3, d.coreEdge, 1);
    deathGfx.strokeCircle(cx, cy, deathR * 0.32);
    deathGfx.lineStyle(1, d.coreOutline, 0.5);
    deathGfx.strokeCircle(cx, cy, deathR * 0.38);
    deathGfx.generateTexture('enemy-death', deathSize, deathSize);
    deathGfx.destroy();

    // XP Gem - blazing green diamond
    this.createGemTexture('xp-gem', 10, Colors.gems.xp.main, Colors.gems.xp.bright);

    // Healing Gem - blazing red diamond (heal pickup)
    this.createGemTexture('healing-gem', 12, Colors.gems.heal.main, Colors.gems.heal.bright);

    // Gold Gem - blazing gold diamond (currency)
    this.createGemTexture('gold-gem', 11, Colors.gems.gold.main, Colors.gems.gold.bright);

    // Vortex Gem - blazing blue diamond
    this.createGemTexture('vortex-gem', 12, Colors.gems.vortex.main, Colors.gems.vortex.bright);

    // Death Mask Gem - large purple diamond
    this.createGemTexture('death-mask-gem', 14, Colors.gems.deathMask.main, Colors.gems.deathMask.bright);

    // Projectile - white hot
    this.createCircleTexture('projectile', 6, Colors.projectiles.base.main, Colors.projectiles.base.inner);

    // Weapon-specific projectile colors — max brightness neon
    this.createCircleTexture('proj-magic', 6, Colors.projectiles.magic.main, Colors.projectiles.magic.inner);
    this.createCircleTexture('proj-fire', 8, Colors.projectiles.fire.main, Colors.projectiles.fire.inner);
    this.createCircleTexture('proj-ice', 5, Colors.projectiles.ice.main, Colors.projectiles.ice.inner);
    this.createCircleTexture('proj-boomerang', 8, Colors.projectiles.boomerang.main, Colors.projectiles.boomerang.inner);
    this.createCircleTexture('proj-scythe', 8, Colors.projectiles.scythe.main, Colors.projectiles.scythe.inner);

    // Tile textures — neon wireframe grid
    this.createGridTileTexture('tile-floor', 32, 32);
    this.createNeonWallTexture('tile-wall', 32, 32);

    // UI elements
    this.createRectTexture('white', 4, 4, Colors.ui.white);
    this.createRectTexture('button', 200, 50, Colors.ui.button, Colors.ui.buttonBorder);

    // AoE circle indicators
    for (const size of [40, 50, 55, 60, 70, 80, 90, 100, 120]) {
      this.createRingTexture(`aoe-${size}`, size, 0xff660044);
    }
  }

  private createCircleTexture(key: string, radius: number, color: number, innerColor?: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    const pad = 2;
    const size = (radius + pad) * 2;
    const cx = radius + pad, cy = radius + pad;
    // Crisp main fill
    gfx.fillStyle(color, 1);
    gfx.fillCircle(cx, cy, radius);
    // Bright inner zone
    if (innerColor) {
      gfx.fillStyle(innerColor, 1);
      gfx.fillCircle(cx, cy, radius * 0.6);
      // White-hot core
      gfx.fillStyle(Colors.effects.hotCenter, 0.6);
      gfx.fillCircle(cx, cy, radius * 0.25);
    }
    // Bright neon edge — camera bloom turns this into glow
    gfx.lineStyle(2, innerColor ?? color, 1);
    gfx.strokeCircle(cx, cy, radius - 1);
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

  private createGemTexture(key: string, half: number, color: number, brightColor: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    const pad = 6;
    const size = (half + pad) * 2;
    const c = half + pad;
    // Wide soft glow layers
    gfx.fillStyle(color, 0.15);
    gfx.fillCircle(c, c, half + pad);
    gfx.fillStyle(color, 0.25);
    gfx.fillCircle(c, c, half + 3);
    gfx.fillStyle(color, 0.4);
    gfx.fillCircle(c, c, half);
    // Diamond shape
    gfx.fillStyle(color, 1);
    gfx.fillTriangle(c, c - half + 1, c + half - 1, c, c, c + half - 1);
    gfx.fillTriangle(c, c - half + 1, c - half + 1, c, c, c + half - 1);
    // Bright inner diamond
    const ih = half * 0.5;
    gfx.fillStyle(brightColor, 0.8);
    gfx.fillTriangle(c, c - ih, c + ih, c, c, c + ih);
    gfx.fillTriangle(c, c - ih, c - ih, c, c, c + ih);
    // White-hot center dot
    gfx.fillStyle(Colors.effects.hotCenter, 0.7);
    gfx.fillCircle(c, c, half * 0.2);
    // Neon outline
    gfx.lineStyle(1, brightColor, 1);
    gfx.strokeTriangle(c, c - half + 1, c + half - 1, c, c, c + half - 1);
    gfx.strokeTriangle(c, c - half + 1, c - half + 1, c, c, c + half - 1);
    gfx.generateTexture(key, size, size);
    gfx.destroy();
  }

  private createGridTileTexture(key: string, w: number, h: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    // Black background
    gfx.fillStyle(Colors.tiles.floorBg, 1);
    gfx.fillRect(0, 0, w, h);
    // Soft glow around grid lines
    gfx.lineStyle(3, Colors.tiles.gridGlow, 0.15);
    gfx.strokeRect(0, 0, w, h);
    // Neon cyan grid lines
    gfx.lineStyle(1, Colors.tiles.gridLine, 0.5);
    gfx.strokeRect(0, 0, w, h);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }

  private createNeonWallTexture(key: string, w: number, h: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    // Dark fill with slight blue tint
    gfx.fillStyle(Colors.tiles.wallFill, 1);
    gfx.fillRect(0, 0, w, h);
    // Outer glow
    gfx.lineStyle(3, Colors.tiles.wallGlow, 0.4);
    gfx.strokeRect(0, 0, w, h);
    // Bright neon outline
    gfx.lineStyle(2, Colors.tiles.wallOutline, 0.9);
    gfx.strokeRect(1, 1, w - 2, h - 2);
    // Inner bright highlight
    gfx.lineStyle(1, Colors.tiles.wallHighlight, 0.4);
    gfx.strokeRect(3, 3, w - 6, h - 6);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }

  private createRingTexture(key: string, radius: number, color: number): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    const pad = 4;
    const size = (radius + pad) * 2;
    const c = radius + pad;
    // Outer glow
    gfx.fillStyle(color, 0.12);
    gfx.fillCircle(c, c, radius + 3);
    // Main fill
    gfx.fillStyle(color, 0.35);
    gfx.fillCircle(c, c, radius);
    // Bright ring edge
    gfx.lineStyle(3, color, 0.8);
    gfx.strokeCircle(c, c, radius);
    gfx.generateTexture(key, size, size);
    gfx.destroy();
  }
}
