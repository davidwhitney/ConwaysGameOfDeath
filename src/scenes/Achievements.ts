import Phaser from 'phaser';
import { monoStyle } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { setupMenuScene } from '../ui/sceneSetup';
import { getAchievements } from '../ui/saveData';
import { ACHIEVEMENTS } from '../achievements';

const ROW_H = 36;

export class AchievementsScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private scrollContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;

  constructor() {
    super({ key: 'Achievements' });
  }

  create(): void {
    const { width, height } = setupMenuScene(this);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, height * 0.08, 'ACHIEVEMENTS',
      monoStyle('36px', '#ffcc00', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    const unlocked = new Set(getAchievements());

    // Scrollable area
    const listTop = height * 0.17;
    const listBottom = height * 0.82;
    const listH = listBottom - listTop;

    this.scrollContainer = this.add.container(0, listTop);

    const contentH = ACHIEVEMENTS.length * ROW_H;
    this.maxScroll = Math.max(0, contentH - listH);
    this.scrollY = 0;

    // Build rows
    const rowX = width * 0.15;
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const def = ACHIEVEMENTS[i];
      const y = i * ROW_H + ROW_H / 2;
      const isUnlocked = unlocked.has(def.id);

      const box = this.add.rectangle(rowX, y, 20, 20, isUnlocked ? 0x44ff44 : 0x444466);
      this.scrollContainer.add(box);

      const nameText = isUnlocked ? def.name : '?????';
      const nameColor = isUnlocked ? '#aaaacc' : '#555566';
      const label = this.add.text(rowX + 20, y, nameText, monoStyle('14px', nameColor)).setOrigin(0, 0.5);
      this.scrollContainer.add(label);

      if (isUnlocked) {
        const desc = this.add.text(rowX + 20, y + 14, def.description, monoStyle('10px', '#666688')).setOrigin(0, 0.5);
        this.scrollContainer.add(desc);
      }
    }

    // Mask for clipping
    const maskShape = this.add.rectangle(width / 2, listTop + listH / 2, width, listH, 0x000000).setVisible(false);
    const mask = maskShape.createGeometryMask();
    this.scrollContainer.setMask(mask);

    // Mouse wheel scroll
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.scrollContainer.y = listTop - this.scrollY;
    });

    // Touch drag scroll
    let dragStartY = 0;
    let dragStartScroll = 0;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      dragStartScroll = this.scrollY;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const dy = dragStartY - pointer.y;
      this.scrollY = Phaser.Math.Clamp(dragStartScroll + dy, 0, this.maxScroll);
      this.scrollContainer.y = listTop - this.scrollY;
    });

    // Keyboard scroll
    this.input.keyboard!.on('keydown-DOWN', () => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + ROW_H, 0, this.maxScroll);
      this.scrollContainer.y = listTop - this.scrollY;
    });
    this.input.keyboard!.on('keydown-UP', () => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY - ROW_H, 0, this.maxScroll);
      this.scrollContainer.y = listTop - this.scrollY;
    });

    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * 0.9, width: 200, height: 45, label: 'BACK', fontSize: '18px', textColor: '#ffffff', fillColor: 0x333366, hoverColor: 0x444488, action: () => this.goBack() },
    ], () => this.goBack());

    this.input.keyboard!.on('keydown-ESC', () => this.goBack());
    this.input.keyboard!.on('keydown-ENTER', () => this.goBack());
  }

  update(_time: number): void {
    this.menuNav.update(_time);
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
