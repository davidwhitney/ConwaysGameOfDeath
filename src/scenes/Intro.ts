import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { monoStyle } from '../ui/textStyles';
import { applyCRT } from '../ui/crtEffect';
import { INTRO_DURATION_MS } from '../shared';

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

interface SnakeSegment {
  x: number;
  y: number;
}

export class IntroScene extends Phaser.Scene {
  private drips: BloodDrip[] = [];
  private dripGfx!: Phaser.GameObjects.Graphics;
  private snakeGfx!: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  private done = false;

  // Snake state
  private path: { x: number; y: number }[] = [];
  private pathLength = 0;
  private pathSegLengths: number[] = [];
  private snakeSegments: SnakeSegment[] = [];
  private snakeHead = 0; // distance along path
  private snakeSpeed = 0;
  private readonly SNAKE_SEG_COUNT = 18;
  private readonly SNAKE_SEG_SIZE = 10;
  private readonly SNAKE_SEG_GAP = 12;

  constructor() {
    super({ key: 'Intro' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);
    applyCRT(this);

    this.elapsed = 0;
    this.done = false;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);

    // Title text
    const title = this.add.text(width / 2, height / 2, 'snakemode',
      monoStyle('52px', '#cc0000', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    // Blood drips (depth between background and title)
    this.dripGfx = this.add.graphics().setDepth(title.depth);
    this.initBloodDrips(title);

    // Snake setup
    this.snakeGfx = this.add.graphics().setDepth(title.depth + 1);
    this.buildSnakePath(title, width, height);
    // Speed so the entire snake (head + tail) clears the path within the intro duration
    const totalDist = this.pathLength + this.SNAKE_SEG_COUNT * this.SNAKE_SEG_GAP;
    this.snakeSpeed = totalDist / (INTRO_DURATION_MS / 1000);
    this.initSnake();

    // Skip on any input
    const skip = () => this.goToMenu();
    this.input.keyboard!.on('keydown', skip);
    this.input.on('pointerdown', skip);

    this.events.once('shutdown', () => {
      this.input.keyboard!.removeAllListeners();
    });
  }

  update(_time: number, delta: number): void {
    if (this.done) return;

    const dt = delta / 1000;
    this.elapsed += delta;

    // Check for any held keys (catches keys pressed before scene started)
    if (this.input.keyboard!.keys.some(k => k?.isDown)) {
      this.goToMenu();
      return;
    }

    // Check gamepad for skip
    if (this.input.gamepad?.total) {
      for (const pad of this.input.gamepad.gamepads) {
        if (pad && pad.buttons.some(b => b.pressed)) {
          this.goToMenu();
          return;
        }
      }
    }

    this.updateBloodDrips(dt);
    this.updateSnake(dt);

    if (this.elapsed >= INTRO_DURATION_MS) {
      this.goToMenu();
    }
  }

  private goToMenu(): void {
    if (this.done) return;
    this.done = true;
    this.scene.start('MainMenu');
  }

  // ── Snake path ──

  private buildSnakePath(title: Phaser.GameObjects.Text, width: number, height: number): void {
    const bounds = title.getBounds();
    const cx = width / 2;
    const pad = 30;

    this.path = [
      { x: cx, y: -20 },
      { x: cx, y: bounds.top - pad },
      { x: bounds.left - pad, y: bounds.top - pad },
      { x: bounds.left - pad, y: bounds.bottom + pad },
      { x: cx, y: bounds.bottom + pad },
      { x: cx, y: height + 50 },
    ];

    // Precompute segment lengths
    this.pathSegLengths = [];
    this.pathLength = 0;
    for (let i = 1; i < this.path.length; i++) {
      const dx = this.path[i].x - this.path[i - 1].x;
      const dy = this.path[i].y - this.path[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      this.pathSegLengths.push(len);
      this.pathLength += len;
    }
  }

  private getPointOnPath(dist: number): { x: number; y: number } {
    let remaining = dist;
    for (let i = 0; i < this.pathSegLengths.length; i++) {
      if (remaining <= this.pathSegLengths[i]) {
        const t = remaining / this.pathSegLengths[i];
        return {
          x: this.path[i].x + (this.path[i + 1].x - this.path[i].x) * t,
          y: this.path[i].y + (this.path[i + 1].y - this.path[i].y) * t,
        };
      }
      remaining -= this.pathSegLengths[i];
    }
    // Past end
    return { ...this.path[this.path.length - 1] };
  }

  private initSnake(): void {
    // Start all segments stacked at the beginning
    this.snakeHead = 0;
    this.snakeSegments = [];
    for (let i = 0; i < this.SNAKE_SEG_COUNT; i++) {
      const d = Math.max(0, this.snakeHead - i * this.SNAKE_SEG_GAP);
      const p = this.getPointOnPath(d);
      this.snakeSegments.push({ x: p.x, y: p.y });
    }
  }

  private updateSnake(dt: number): void {
    this.snakeHead += this.snakeSpeed * dt;

    // Update segment positions along path
    for (let i = 0; i < this.snakeSegments.length; i++) {
      const d = Math.max(0, this.snakeHead - i * this.SNAKE_SEG_GAP);
      const p = this.getPointOnPath(d);
      this.snakeSegments[i].x = p.x;
      this.snakeSegments[i].y = p.y;
    }

    // Draw
    this.snakeGfx.clear();
    const s = this.SNAKE_SEG_SIZE;
    const half = s / 2;

    for (let i = this.snakeSegments.length - 1; i >= 0; i--) {
      const seg = this.snakeSegments[i];
      const isHead = i === 0;
      // Brighter green for head
      const color = isHead ? 0x44ff44 : 0x00cc00;
      this.snakeGfx.fillStyle(color, 1);
      this.snakeGfx.fillRect(seg.x - half, seg.y - half, s, s);
      // Darker border
      this.snakeGfx.lineStyle(1, 0x006600, 1);
      this.snakeGfx.strokeRect(seg.x - half, seg.y - half, s, s);
    }
  }

  // ── Blood drips (same pattern as MainMenu) ──

  private initBloodDrips(title: Phaser.GameObjects.Text): void {
    this.drips = [];
    const bounds = title.getBounds();
    const dripCount = 14;

    for (let i = 0; i < dripCount; i++) {
      const x = bounds.left + Math.random() * bounds.width;
      this.drips.push({
        x,
        y: bounds.bottom,
        startY: bounds.bottom,
        speed: 10 + Math.random() * 20,
        length: 4 + Math.random() * 14,
        alpha: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 2,
        maxDist: 25 + Math.random() * 55,
      });
    }
  }

  private updateBloodDrips(dt: number): void {
    this.dripGfx.clear();

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
      this.dripGfx.fillStyle(0xcc0000, fadeAlpha * 0.7);
      this.dripGfx.fillRect(drip.x - w / 2, trailTop, w, drip.y - trailTop);

      this.dripGfx.fillStyle(0xaa0000, fadeAlpha);
      this.dripGfx.fillCircle(drip.x, drip.y, 1.5);

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
}
