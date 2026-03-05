import Phaser from 'phaser';
import type { UpdateContext } from './UpdateContext';
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
  private fgGfx: Phaser.GameObjects.Graphics;
  private bgDots: ParallaxDot[];
  private fgDots: ParallaxDot[];

  private static readonly BG_SCROLL = 0.5;
  private static readonly FG_SCROLL = 1.3;
  private static readonly BG_REGION = 2000;
  private static readonly FG_REGION = 1200;

  constructor(scene: Phaser.Scene) {
    this.bgGfx = scene.add.graphics();
    this.bgGfx.setDepth(-5); // above opaque floor tiles (-10), below entities
    this.bgGfx.setScrollFactor(ParallaxSystem.BG_SCROLL);

    this.fgGfx = scene.add.graphics();
    this.fgGfx.setDepth(20);
    this.fgGfx.setScrollFactor(ParallaxSystem.FG_SCROLL);

    this.bgDots = this.generateDots(200, ParallaxSystem.BG_REGION, true);
    this.fgDots = this.generateDots(60, ParallaxSystem.FG_REGION, false);
  }

  private generateDots(count: number, region: number, isBackground: boolean): ParallaxDot[] {
    const dots: ParallaxDot[] = [];
    for (let i = 0; i < count; i++) {
      const bright = Math.random() < 0.15;
      dots.push({
        x: Math.random() * region,
        y: Math.random() * region,
        size: isBackground
          ? (bright ? 2.5 + Math.random() * 2.5 : 1.0 + Math.random() * 1.5)
          : (bright ? 2.0 + Math.random() * 1.5 : 1.0 + Math.random() * 1.0),
        alpha: isBackground
          ? (bright ? 0.35 + Math.random() * 0.25 : 0.1 + Math.random() * 0.15)
          : (bright ? 0.2 + Math.random() * 0.15 : 0.1 + Math.random() * 0.1),
        color: isBackground
          ? (bright ? Colors.parallax.bgStarBright : Colors.parallax.bgStar)
          : Colors.parallax.fgDust,
      });
    }
    return dots;
  }

  update(ctx: UpdateContext): void {
    const cam = ctx.player.sprite.scene.cameras.main;
    this.drawLayer(this.bgGfx, this.bgDots, cam, ParallaxSystem.BG_SCROLL, ParallaxSystem.BG_REGION);
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
    this.fgGfx.destroy();
  }
}
