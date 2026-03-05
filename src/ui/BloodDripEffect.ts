import Phaser from 'phaser';

interface BloodDrip {
  x: number;
  y: number;
  startY: number;
  speed: number;
  length: number;
  alpha: number;
  delay: number;
  maxDist: number;
}

export interface BloodDripOptions {
  count?: number;
  delayRange?: number;
  fromLine1?: boolean;
}

export class BloodDripEffect {
  private drips: BloodDrip[] = [];
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, title: Phaser.GameObjects.Text, opts?: BloodDripOptions) {
    const count = opts?.count ?? 14;
    const delayRange = opts?.delayRange ?? 2;
    const fromLine1 = opts?.fromLine1 ?? false;

    this.gfx = scene.add.graphics().setDepth(title.depth);

    const bounds = title.getBounds();
    const line1Bottom = bounds.top + bounds.height * 0.48;

    for (let i = 0; i < count; i++) {
      const useLine1 = fromLine1 && Math.random() < 0.4;
      const startY = useLine1 ? line1Bottom : bounds.bottom;
      const x = bounds.left + Math.random() * bounds.width;
      this.drips.push({
        x,
        y: startY,
        startY,
        speed: 10 + Math.random() * 20,
        length: 4 + Math.random() * 14,
        alpha: 0.5 + Math.random() * 0.5,
        delay: Math.random() * delayRange,
        maxDist: 25 + Math.random() * 55,
      });
    }
  }

  update(dt: number): void {
    this.gfx.clear();

    for (const drip of this.drips) {
      if (drip.delay > 0) {
        drip.delay -= dt;
        continue;
      }

      drip.y += drip.speed * dt;
      const dist = drip.y - drip.startY;
      const progress = dist / drip.maxDist;
      const fadeAlpha = drip.alpha * Math.max(0, 1 - progress);

      const trailTop = Math.max(drip.startY, drip.y - drip.length);
      const w = 2;
      this.gfx.fillStyle(0xcc0000, fadeAlpha * 0.7);
      this.gfx.fillRect(drip.x - w / 2, trailTop, w, drip.y - trailTop);

      this.gfx.fillStyle(0xaa0000, fadeAlpha);
      this.gfx.fillCircle(drip.x, drip.y, 1.5);

      if (dist >= drip.maxDist) {
        drip.y = drip.startY;
        drip.delay = 1 + Math.random() * 3;
        drip.speed = 10 + Math.random() * 20;
        drip.length = 4 + Math.random() * 14;
        drip.alpha = 0.5 + Math.random() * 0.5;
        drip.maxDist = 25 + Math.random() * 55;
      }
    }
  }

  destroy(): void {
    this.gfx.destroy();
    this.drips.length = 0;
  }
}
