import Phaser from 'phaser';
import { monoStyle, BTN_PRIMARY, BTN_SECONDARY, BTN_WARNING } from '../ui/textStyles';
import { MenuNav } from '../ui/MenuNav';
import { setupMenuScene } from '../ui/sceneSetup';
import { getAchievements, loadPerks, savePerks } from '../ui/saveData';
import { PERK_DEFS, totalPointsSpent, type PerkAllocation } from '../perks';
import { InputSystem } from '../systems/InputSystem';

const ROW_H = 48;
const DOT_SIZE = 8;
const DOT_GAP = 4;

export class PerksScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private alloc!: PerkAllocation;
  private totalPoints = 0;
  private spentPoints = 0;
  private scrollContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private listTop = 0;
  private pointsText!: Phaser.GameObjects.Text;
  private perkRows: PerkRow[] = [];
  private selectedRow = 0;

  constructor() {
    super({ key: 'Perks' });
  }

  create(): void {
    const { width, height } = setupMenuScene(this);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, height * 0.05, 'PERKS',
      monoStyle('36px', '#ffcc00', { fontStyle: 'bold' }),
    ).setOrigin(0.5);

    this.totalPoints = getAchievements().length;
    this.alloc = { ...loadPerks() };
    this.spentPoints = totalPointsSpent(this.alloc);

    this.pointsText = this.add.text(width / 2, height * 0.12,
      this.pointsLabel(),
      monoStyle('14px', '#aaaacc'),
    ).setOrigin(0.5);

    // Scrollable perk list
    this.listTop = height * 0.18;
    const listBottom = height * 0.80;
    const listH = listBottom - this.listTop;

    this.scrollContainer = this.add.container(0, this.listTop);

    const contentH = PERK_DEFS.length * ROW_H;
    this.maxScroll = Math.max(0, contentH - listH);
    this.scrollY = 0;
    this.perkRows = [];
    this.selectedRow = 0;

    for (let i = 0; i < PERK_DEFS.length; i++) {
      const def = PERK_DEFS[i];
      const y = i * ROW_H + ROW_H / 2;
      const currentLevel = this.alloc[def.id] ?? 0;

      const row = this.buildPerkRow(width, y, def.id, def.name, def.description, def.maxLevel, currentLevel, def.levelDesc);
      this.perkRows.push(row);
    }

    // Clip mask
    const maskShape = this.add.rectangle(width / 2, this.listTop + listH / 2, width, listH, 0x000000).setVisible(false);
    this.scrollContainer.setMask(maskShape.createGeometryMask());

    // Mouse wheel scroll
    this.input.on('wheel', (_p: unknown, _go: unknown[], _dx: number, dy: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.scrollContainer.y = this.listTop - this.scrollY;
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
      this.scrollContainer.y = this.listTop - this.scrollY;
    });

    // Bottom buttons
    const btnY = height * 0.86;
    const btnH = height < 520 ? 32 : 40;
    const btnFont = height < 520 ? '13px' : '15px';
    this.menuNav = new MenuNav(this, [
      { x: width / 2 - 100, y: btnY, width: 160, height: btnH, label: 'REFUND ALL', fontSize: btnFont, ...BTN_WARNING, action: () => this.refundAll() },
      { x: width / 2 + 100, y: btnY, width: 160, height: btnH, label: 'BACK', fontSize: btnFont, ...BTN_PRIMARY, action: () => this.goBack() },
    ], () => this.goBack());

    // Hint
    this.add.text(width / 2, height * 0.94,
      'LEFT/RIGHT or click dots to allocate  |  Perks apply next run',
      monoStyle('10px', '#555577'),
    ).setOrigin(0.5);
  }

  update(): void {
    this.menuNav.update();

    const input = InputSystem.current;

    // Keyboard/gamepad scroll
    if (input.scrollY !== 0) {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + input.scrollY * ROW_H, 0, this.maxScroll);
      this.scrollContainer.y = this.listTop - this.scrollY;
    }

    // Keyboard/gamepad nav for perk rows
    if (input.nav.y !== 0) {
      this.selectedRow = Phaser.Math.Clamp(this.selectedRow + input.nav.y, 0, PERK_DEFS.length - 1);
      this.updateHighlight();
      // Auto-scroll to keep selected visible
      const rowTop = this.selectedRow * ROW_H;
      const listH = (this.cameras.main.height * 0.80) - (this.cameras.main.height * 0.18);
      if (rowTop < this.scrollY) {
        this.scrollY = rowTop;
      } else if (rowTop + ROW_H > this.scrollY + listH) {
        this.scrollY = rowTop + ROW_H - listH;
      }
      this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
      this.scrollContainer.y = this.listTop - this.scrollY;
    }

    // Left/right to adjust selected perk
    if (input.nav.x !== 0 && !input.htmlInputFocused) {
      const def = PERK_DEFS[this.selectedRow];
      const current = this.alloc[def.id] ?? 0;
      if (input.nav.x > 0 && current < def.maxLevel && this.spentPoints < this.totalPoints) {
        this.setPerkLevel(def.id, current + 1);
      } else if (input.nav.x < 0 && current > 0) {
        this.setPerkLevel(def.id, current - 1);
      }
    }
  }

  private buildPerkRow(
    width: number, y: number,
    id: string, name: string, description: string,
    maxLevel: number, currentLevel: number,
    levelDesc: string[],
  ): PerkRow {
    const nameX = width * 0.05;
    const dotsX = width * 0.55;

    // Highlight bg (for keyboard nav)
    const highlightBg = this.add.rectangle(width / 2, y, width - 20, ROW_H - 4, 0x333366, 0)
      .setOrigin(0.5);
    this.scrollContainer.add(highlightBg);

    // Name
    const nameText = this.add.text(nameX, y - 8, name,
      monoStyle('14px', '#ccccee'),
    ).setOrigin(0, 0.5);
    this.scrollContainer.add(nameText);

    // Description
    const descText = this.add.text(nameX, y + 10, description,
      monoStyle('10px', '#666688'),
    ).setOrigin(0, 0.5);
    this.scrollContainer.add(descText);

    // Level dots
    const dots: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < maxLevel; i++) {
      const dx = dotsX + i * (DOT_SIZE + DOT_GAP);
      const filled = i < currentLevel;
      const dot = this.add.rectangle(dx, y - 4, DOT_SIZE, DOT_SIZE,
        filled ? 0x44ff44 : 0x444466,
      ).setInteractive({ useHandCursor: true });
      dot.on('pointerdown', () => {
        const cur = this.alloc[id] ?? 0;
        const targetLevel = i + 1;
        if (targetLevel === cur) {
          // Click same level = remove it
          this.setPerkLevel(id, targetLevel - 1);
        } else if (targetLevel > cur && this.spentPoints + (targetLevel - cur) <= this.totalPoints) {
          this.setPerkLevel(id, targetLevel);
        } else if (targetLevel < cur) {
          this.setPerkLevel(id, targetLevel);
        }
      });
      this.scrollContainer.add(dot);
      dots.push(dot);
    }

    // Level description text
    const lvlDescText = this.add.text(
      dotsX, y + 10,
      currentLevel > 0 ? levelDesc[currentLevel - 1] : '',
      monoStyle('10px', '#44ff44'),
    ).setOrigin(0, 0.5);
    this.scrollContainer.add(lvlDescText);

    // Minus/plus buttons
    const minusBtnX = dotsX - 28;
    const plusBtnX = dotsX + maxLevel * (DOT_SIZE + DOT_GAP) + 16;

    const minusBtn = this.add.text(minusBtnX, y - 4, '-',
      monoStyle('18px', '#ff8888', { fontStyle: 'bold' }),
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    minusBtn.on('pointerdown', () => {
      const cur = this.alloc[id] ?? 0;
      if (cur > 0) this.setPerkLevel(id, cur - 1);
    });
    this.scrollContainer.add(minusBtn);

    const plusBtn = this.add.text(plusBtnX, y - 4, '+',
      monoStyle('18px', '#44ff44', { fontStyle: 'bold' }),
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    plusBtn.on('pointerdown', () => {
      const cur = this.alloc[id] ?? 0;
      if (cur < maxLevel && this.spentPoints < this.totalPoints) {
        this.setPerkLevel(id, cur + 1);
      }
    });
    this.scrollContainer.add(plusBtn);

    return { id, dots, lvlDescText, highlightBg, maxLevel };
  }

  private setPerkLevel(id: string, level: number): void {
    const old = this.alloc[id] ?? 0;
    this.alloc[id] = level;
    this.spentPoints += level - old;
    this.pointsText.setText(this.pointsLabel());
    savePerks(this.alloc);
    this.refreshRow(id);
  }

  private refreshRow(id: string): void {
    const row = this.perkRows.find(r => r.id === id);
    if (!row) return;
    const level = this.alloc[id] ?? 0;
    const def = PERK_DEFS.find(p => p.id === id)!;

    for (let i = 0; i < row.dots.length; i++) {
      row.dots[i].setFillStyle(i < level ? 0x44ff44 : 0x444466);
    }
    row.lvlDescText.setText(level > 0 ? def.levelDesc[level - 1] : '');
  }

  private updateHighlight(): void {
    for (let i = 0; i < this.perkRows.length; i++) {
      this.perkRows[i].highlightBg.setFillStyle(
        i === this.selectedRow ? 0x333366 : 0x000000,
        i === this.selectedRow ? 0.5 : 0,
      );
    }
  }

  private refundAll(): void {
    for (const key of Object.keys(this.alloc)) {
      this.alloc[key] = 0;
    }
    this.spentPoints = 0;
    this.pointsText.setText(this.pointsLabel());
    savePerks(this.alloc);
    for (const row of this.perkRows) {
      this.refreshRow(row.id);
    }
  }

  private pointsLabel(): string {
    const remaining = this.totalPoints - this.spentPoints;
    return `${remaining} / ${this.totalPoints} POINTS AVAILABLE`;
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}

interface PerkRow {
  id: string;
  dots: Phaser.GameObjects.Rectangle[];
  lvlDescText: Phaser.GameObjects.Text;
  highlightBg: Phaser.GameObjects.Rectangle;
  maxLevel: number;
}
