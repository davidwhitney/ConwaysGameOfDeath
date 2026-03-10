import Phaser from 'phaser';
import type { GameState } from './GameState';
import type { GameSystem } from './GameSystem';
import { Colors } from '../colors';

interface ParallaxDot {
  x: number;
  y: number;
  size: number;
  alpha: number;
  color: number;
}

/**
 * Adds parallax depth layers — a background star field that scrolls slower
 * than the camera and foreground dust motes that scroll faster.
 */
export class ParallaxSystem implements GameSystem {
  private bgGfx: Phaser.GameObjects.Graphics;
  private midGfx: Phaser.GameObjects.Graphics;
  private fgGfx: Phaser.GameObjects.Graphics;
  private bgDots: ParallaxDot[];
  private midDots: ParallaxDot[];
  private fgDots: ParallaxDot[];
  private lastScrollX = -Infinity;
  private lastScrollY = -Infinity;

  private static readonly BG_SCROLL = 0.5;
  private static readonly MID_SCROLL = 0.8;
  private static readonly FG_SCROLL = 1.3;
  private static readonly BG_REGION = 2000;
  private static readonly MID_REGION = 1600;
  private static readonly FG_REGION = 1200;

  constructor(scene: Phaser.Scene) {
    this.bgGfx = scene.add.graphics();
    this.bgGfx.setDepth(-5); // above opaque floor tiles (-10), below entities
    this.bgGfx.setScrollFactor(ParallaxSystem.BG_SCROLL);

    this.midGfx = scene.add.graphics();
    this.midGfx.setDepth(-3);
    this.midGfx.setScrollFactor(ParallaxSystem.MID_SCROLL);

    this.fgGfx = scene.add.graphics();
    this.fgGfx.setDepth(20);
    this.fgGfx.setScrollFactor(ParallaxSystem.FG_SCROLL);

    this.bgDots = this.generateDots(400, ParallaxSystem.BG_REGION, 'bg');
    this.midDots = this.generateDots(150, ParallaxSystem.MID_REGION, 'mid');
    this.fgDots = this.generateDots(100, ParallaxSystem.FG_REGION, 'fg');
  }

  private generateDots(count: number, region: number, layer: 'bg' | 'mid' | 'fg'): ParallaxDot[] {
    const dots: ParallaxDot[] = [];
    for (let i = 0; i < count; i++) {
      const bright = Math.random() < 0.15;
      let size: number, alpha: number, color: number;
      if (layer === 'bg') {
        size = bright ? 2.5 + Math.random() * 2.5 : 1.0 + Math.random() * 1.5;
        alpha = bright ? 0.35 + Math.random() * 0.25 : 0.1 + Math.random() * 0.15;
        color = bright ? Colors.parallax.bgStarBright : Colors.parallax.bgStar;
      } else if (layer === 'mid') {
        size = bright ? 1.5 + Math.random() * 1.5 : 0.8 + Math.random() * 1.0;
        alpha = bright ? 0.25 + Math.random() * 0.2 : 0.08 + Math.random() * 0.12;
        color = bright ? Colors.parallax.midStarBright : Colors.parallax.midStar;
      } else {
        size = bright ? 2.0 + Math.random() * 1.5 : 1.0 + Math.random() * 1.0;
        alpha = bright ? 0.2 + Math.random() * 0.15 : 0.1 + Math.random() * 0.1;
        color = Colors.parallax.fgDust;
      }
      dots.push({ x: Math.random() * region, y: Math.random() * region, size, alpha, color });
    }
    return dots;
  }

  update(ctx: GameState): void {
    const cam = ctx.player.sprite.scene.cameras.main;
    // Skip redraw when camera hasn't moved
    if (cam.scrollX === this.lastScrollX && cam.scrollY === this.lastScrollY) return;
    this.lastScrollX = cam.scrollX;
    this.lastScrollY = cam.scrollY;
    this.drawLayer(this.bgGfx, this.bgDots, cam, ParallaxSystem.BG_SCROLL, ParallaxSystem.BG_REGION);
    this.drawLayer(this.midGfx, this.midDots, cam, ParallaxSystem.MID_SCROLL, ParallaxSystem.MID_REGION);
    this.drawLayer(this.fgGfx, this.fgDots, cam, ParallaxSystem.FG_SCROLL, ParallaxSystem.FG_REGION);
  }

  private drawLayer(
    gfx: Phaser.GameObjects.Graphics,
    dots: ParallaxDot[],
    cam: Phaser.Cameras.Scene2D.Camera,
    scrollFactor: number,
    region: number,
  ): void {
    gfx.clear();

    // With scrollFactor S, a point drawn at (gx, gy) appears on screen at
    // (gx - cam.scrollX * S, gy - cam.scrollY * S). So the center of the
    // visible area in draw-coords is:
    const centerX = cam.scrollX * scrollFactor + cam.width / (2 * cam.zoom);
    const centerY = cam.scrollY * scrollFactor + cam.height / (2 * cam.zoom);
    const halfW = cam.width / (2 * cam.zoom) + 100;
    const halfH = cam.height / (2 * cam.zoom) + 100;

    for (const dot of dots) {
      // Wrap dot positions into a repeating region centered on camera
      const dx = ((dot.x - centerX) % region + region + region / 2) % region - region / 2;
      const dy = ((dot.y - centerY) % region + region + region / 2) % region - region / 2;

      if (Math.abs(dx) > halfW || Math.abs(dy) > halfH) continue;

      gfx.fillStyle(dot.color, dot.alpha);
      gfx.fillCircle(centerX + dx, centerY + dy, dot.size);
    }
  }

  destroy(): void {
    this.bgGfx.destroy();
    this.midGfx.destroy();
    this.fgGfx.destroy();
  }
}
