import Phaser from 'phaser';
import { monoStyle } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { setupMenuScene } from '../ui/sceneSetup';
import { getAchievements, loadStats } from '../ui/saveData';
import { ACHIEVEMENTS } from '../achievements';
import { InputSystem } from '../systems/InputSystem';

const ROW_H = 36;

export class AchievementsScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private scrollContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private listTop = 0;

  constructor() {
    super({ key: 'Achievements' });
  }

  create(): void {
    const { width, height } = setupMenuScene(this);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, height * 0.05, 'ACHIEVEMENTS',
      monoStyle('36px', '#ffcc00', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    const unlocked = new Set(getAchievements());
    const stats = loadStats();

    // Stats section
    const statsY = height * 0.10;
    const statsGap = width / 5;
    const statsStartX = width / 2 - statsGap * 1.5;
    const statItems: [string, string][] = [
      ['KILLS', formatNumber(stats.totalKills)],
      ['DEATH KILLS', formatNumber(stats.deathKills)],
      ['PLAY TIME', formatTime(stats.totalPlayTimeMs)],
      ['VICTORIES', formatNumber(stats.victories)],
    ];
    for (let i = 0; i < statItems.length; i++) {
      const x = statsStartX + i * statsGap;
      this.add.text(x, statsY, statItems[i][0], monoStyle('10px', '#888899')).setOrigin(0.5, 0);
      this.add.text(x, statsY + 14, statItems[i][1], monoStyle('16px', '#ffffff', { fontStyle: 'bold' })).setOrigin(0.5, 0);
    }

    // Achievement count header
    const headerY = height * 0.17;
    this.add.text(width / 2, headerY,
      `${unlocked.size} / ${ACHIEVEMENTS.length} UNLOCKED`,
      monoStyle('14px', '#aaaacc'),
    ).setOrigin(0.5);

    // Scrollable area
    this.listTop = height * 0.21;
    const listTop = this.listTop;
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

    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * 0.9, width: 200, height: 45, label: 'BACK', fontSize: '18px', textColor: '#ffffff', fillColor: 0x333366, hoverColor: 0x444488, action: () => this.goBack() },
    ], () => this.goBack());
  }

  update(): void {
    this.menuNav.update();

    // Keyboard/gamepad scroll
    const input = InputSystem.current;
    if (input.scrollY !== 0) {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + input.scrollY * ROW_H, 0, this.maxScroll);
      this.scrollContainer.y = this.listTop - this.scrollY;
    }
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
