import Phaser from 'phaser';
import { monoStyle, BTN_PRIMARY } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { setupMenuScene } from '../ui/sceneSetup';
import { getAchievements, loadStats } from '../ui/saveData';
import { ACHIEVEMENTS } from '../achievements';
import { ScrollableList } from '../ui/ScrollableList';
import { formatNumber, formatDuration } from '../ui/format';

const ROW_H = 36;

export class AchievementsScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private scrollList!: ScrollableList;

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
    const statItems: [string, string][] = [
      ['KILLS', formatNumber(stats.totalKills)],
      ['DEATH KILLS', formatNumber(stats.deathKills)],
      ['PLAY TIME', formatDuration(stats.totalPlayTimeMs)],
      ['VICTORIES', formatNumber(stats.victories)],
      ['EXTRACTIONS', formatNumber(stats.extractions ?? 0)],
    ];
    const statsGap = width / (statItems.length + 1);
    const statsStartX = width / 2 - statsGap * ((statItems.length - 1) / 2);
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
    const listTop = height * 0.21;
    const listBottom = height * 0.82;
    this.scrollList = new ScrollableList(this, listTop, listBottom, ACHIEVEMENTS.length * ROW_H, ROW_H);

    // Build rows
    const rowX = width * 0.15;
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const def = ACHIEVEMENTS[i];
      const y = i * ROW_H + ROW_H / 2;
      const isUnlocked = unlocked.has(def.id);

      const box = this.add.rectangle(rowX, y, 20, 20, isUnlocked ? 0x44ff44 : 0x444466);
      this.scrollList.container.add(box);

      const nameText = isUnlocked ? def.name : '?????';
      const nameColor = isUnlocked ? '#aaaacc' : '#555566';
      const label = this.add.text(rowX + 20, y, nameText, monoStyle('14px', nameColor)).setOrigin(0, 0.5);
      this.scrollList.container.add(label);

      if (isUnlocked) {
        const desc = this.add.text(rowX + 20, y + 14, def.description, monoStyle('10px', '#666688')).setOrigin(0, 0.5);
        this.scrollList.container.add(desc);
      }
    }

    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * 0.9, width: 200, height: 45, label: 'BACK', fontSize: '18px', ...BTN_PRIMARY, action: () => this.goBack() },
    ], () => this.goBack());
  }

  update(): void {
    this.menuNav.update();
    this.scrollList.updateScroll();
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
