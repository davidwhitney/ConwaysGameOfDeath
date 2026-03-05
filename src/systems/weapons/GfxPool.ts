import Phaser from 'phaser';

export class GfxPool {
  private pool: Phaser.GameObjects.Graphics[] = [];
  private depth: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
  }

  acquire(): Phaser.GameObjects.Graphics {
    const gfx = this.pool.pop() ?? this.scene.add.graphics();
    gfx.setVisible(true);
    gfx.setDepth(this.depth);
    return gfx;
  }

  release(gfx: Phaser.GameObjects.Graphics): void {
    gfx.clear();
    gfx.setVisible(false);
    this.pool.push(gfx);
  }

  destroy(): void {
    for (const gfx of this.pool) gfx.destroy();
    this.pool.length = 0;
  }
}
