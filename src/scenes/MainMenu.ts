import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { monoStyle, DOM_INPUT_STYLE, DOM_LABEL_STYLE } from '../ui/textStyles';
import { BackgroundGameOfLife } from '../ui/BackgroundGameOfLife';
import { applyCRT } from '../ui/crtEffect';
import { BloodDripEffect } from '../ui/BloodDripEffect';
import { MenuNav } from '../ui/MenuNav';
import { loadSettings, saveSettings } from '../ui/saveData';
import { onResizeRestart } from '../ui/resizeHandler';
import { LofiMusicSystem } from '../systems/audio/LofiMusicSystem';
import { SfxSystem } from '../systems/audio/SfxSystem';
import { createOverlayInput, createOverlayContainer, positionAtLayout, removeElements } from '../ui/htmlElements';

export class MainMenuScene extends Phaser.Scene {
  private menuNav!: MenuNav;
  private seedInput!: HTMLInputElement;
  private endlessContainer!: HTMLDivElement;
  private endlessCheckbox!: HTMLInputElement;
  private debugLevelInput!: HTMLInputElement | null;
  private debugTimeInput!: HTMLInputElement | null;
  private debugContainer!: HTMLDivElement | null;
  private bloodDrips!: BloodDripEffect;
  private gol!: BackgroundGameOfLife;
  private layoutFracs = { seed: 0.52, play: 0.58, endless: 0.63, debugLevel: 0.68, debugTime: 0.73, scores: 0.72, achievements: 0.78, settings: 0.84, hint: 0.92 };
  private currentSeed = '';
  private readonly isDebug = import.meta.env.VITE_DEBUG === 'true';

  constructor() {
    super({ key: 'MainMenu' });
  }

  create(): void {
    const { width, height } = applyUIZoom(this);

    applyCRT(this);

    // Game of Life background
    this.gol = new BackgroundGameOfLife(this, width, height);

    // Title — scale font to fit screen
    const titleFontSize = height < 450 ? '32px' : height < 550 ? '40px' : '48px';
    const subFontSize = height < 450 ? '14px' : '18px';
    const titleY = Math.min(height * 0.20, 120);
    const title = this.add.text(width / 2, titleY, "CONWAY'S GAME\nOF DEATH",
      monoStyle(titleFontSize, '#ff4444', { fontStyle: 'bold', align: 'center', lineSpacing: 4 }),
    ).setOrigin(0.5);

    // Blood drip effect
    this.bloodDrips = new BloodDripEffect(this, title, { count: 18, delayRange: 5, fromLine1: true });

    const subtitleY = title.y + title.height / 2 + 12;
    const subtitle = this.add.text(width / 2, subtitleY, 'Survive the Automaton',
      monoStyle(subFontSize, '#aaaacc'),
    ).setOrigin(0.5);

    // Compute flow-based layout starting below actual title content
    const contentTop = subtitle.y + subtitle.height / 2 + 10;
    this.computeLayout(height, contentTop);
    const ly = this.layoutFracs;

    // Seed input (HTML element for editable text)
    this.createSeedInput();

    // Endless mode checkbox
    this.createEndlessCheckbox();

    // Debug inputs (only when VITE_DEBUG=true)
    if (this.isDebug) {
      this.createDebugInputs();
    }

    const compact = height < 520;
    const btnH = compact ? 32 : 40;
    const playH = compact ? 38 : 46;
    const btnFont = compact ? '13px' : '15px';
    this.menuNav = new MenuNav(this, [
      { x: width / 2, y: height * ly.play, width: 200, height: playH, label: 'PLAY', fontSize: compact ? '18px' : '22px', textColor: '#ffffff', fillColor: 0x333366, hoverColor: 0x444488, action: () => this.startGame() },
      { x: width / 2, y: height * ly.scores, width: 180, height: btnH, label: 'HIGH SCORES', fontSize: btnFont, textColor: '#ffcc00', fillColor: 0x333344, hoverColor: 0x444466, action: () => this.scene.start('HighScores') },
      { x: width / 2, y: height * ly.achievements, width: 180, height: btnH, label: 'ACHIEVEMENTS', fontSize: btnFont, textColor: '#ffcc00', fillColor: 0x333344, hoverColor: 0x444466, action: () => this.scene.start('Achievements') },
      { x: width / 2, y: height * ly.settings, width: 180, height: btnH, label: 'SETTINGS', fontSize: btnFont, textColor: '#ffcc00', fillColor: 0x333344, hoverColor: 0x444466, action: () => this.scene.start('Settings', { returnTo: 'MainMenu' }) },
    ]);

    // Controls hint
    this.add.text(width / 2, height * ly.hint, 'WASD / Arrows / Gamepad to move  |  ESC / Start to pause',
      monoStyle('12px', '#666688'),
    ).setOrigin(0.5);

    // Press Enter to start
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (document.activeElement !== this.seedInput) this.startGame();
    });
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (document.activeElement !== this.seedInput) this.startGame();
    });

    // Restart on resize so layout adapts
    onResizeRestart(this);

    // Start music (uses Phaser's AudioContext + unlock mechanism)
    // Menu always plays trip-hop regardless of the saved style setting
    const audioCtx = (this.sound as Phaser.Sound.WebAudioSoundManager).context;
    const music = LofiMusicSystem.instance;
    music.init(audioCtx);
    music.setStyle('triphop');
    music.start();
    SfxSystem.instance.init(audioCtx);

    // Ensure seed input is removed on any scene transition
    this.events.once('shutdown', () => this.removeInputs());
  }

  private createSeedInput(): void {
    this.seedInput = createOverlayInput(this, 'text', { width: '160px', textAlign: 'center' });
    if (!this.currentSeed) this.currentSeed = String(Date.now());
    this.seedInput.value = this.currentSeed;
    this.seedInput.maxLength = 20;
    this.seedInput.setAttribute('aria-label', 'Game seed');

    // Focus styling
    this.seedInput.addEventListener('focus', () => {
      this.seedInput.style.color = '#aaaacc';
      this.seedInput.style.borderColor = '#555577';
    });
    this.seedInput.addEventListener('blur', () => {
      this.seedInput.style.color = '#666688';
      this.seedInput.style.borderColor = '#333355';
    });
    // Track seed changes
    this.seedInput.addEventListener('input', () => {
      this.currentSeed = this.seedInput.value;
    });
    // Enter while focused → start game
    this.seedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.seedInput.blur();
        this.startGame();
      }
    });

    positionAtLayout(this.seedInput, this.game.canvas, 0.5, this.layoutFracs.seed, -80);
  }

  private createEndlessCheckbox(): void {
    const settings = loadSettings();

    this.endlessContainer = createOverlayContainer(this, {
      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
    });

    this.endlessCheckbox = document.createElement('input');
    this.endlessCheckbox.type = 'checkbox';
    this.endlessCheckbox.checked = settings.endlessMode;
    Object.assign(this.endlessCheckbox.style, { cursor: 'pointer', accentColor: '#666688' });

    const label = document.createElement('label');
    label.textContent = 'Endless Mode';
    Object.assign(label.style, { ...DOM_LABEL_STYLE, cursor: 'pointer' });
    label.addEventListener('click', () => {
      this.endlessCheckbox.checked = !this.endlessCheckbox.checked;
      this.endlessCheckbox.dispatchEvent(new Event('change'));
    });

    this.endlessCheckbox.addEventListener('change', () => {
      const s = loadSettings();
      s.endlessMode = this.endlessCheckbox.checked;
      saveSettings(s);
    });

    this.endlessContainer.append(this.endlessCheckbox, label);
    positionAtLayout(this.endlessContainer, this.game.canvas, 0.5, this.layoutFracs.endless, -60);
  }

  private createDebugInputs(): void {
    const inputStyle: Partial<CSSStyleDeclaration> = { ...DOM_INPUT_STYLE, width: '50px', textAlign: 'center' };

    this.debugContainer = createOverlayContainer(this, {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    });

    const makeInput = (min: string, max: string, value: string): HTMLInputElement => {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = min;
      input.max = max;
      input.value = value;
      Object.assign(input.style, inputStyle);
      input.addEventListener('focus', () => { this.input.keyboard!.enabled = false; });
      input.addEventListener('blur', () => { this.input.keyboard!.enabled = true; });
      return input;
    };

    // Level row
    const levelRow = document.createElement('div');
    Object.assign(levelRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
    const levelLabel = document.createElement('span');
    levelLabel.textContent = 'Level';
    Object.assign(levelLabel.style, DOM_LABEL_STYLE);
    this.debugLevelInput = makeInput('1', '100', '1');
    levelRow.append(levelLabel, this.debugLevelInput);

    // Time row
    const timeRow = document.createElement('div');
    Object.assign(timeRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
    const timeLabel = document.createElement('span');
    timeLabel.textContent = 'Time (min)';
    Object.assign(timeLabel.style, DOM_LABEL_STYLE);
    this.debugTimeInput = makeInput('0', '35', '0');
    timeRow.append(timeLabel, this.debugTimeInput);

    this.debugContainer.append(levelRow, timeRow);
    positionAtLayout(this.debugContainer, this.game.canvas, 0.5, this.layoutFracs.debugLevel, -70);
  }

  private computeLayout(height: number, contentTop: number): void {
    const endY = height - 6;
    const avail = endY - contentTop;

    const compact = height < 520;
    const btnH = compact ? 32 : 40;
    const playH = compact ? 38 : 46;

    // Top group: game config inputs
    const topKeys: (keyof typeof this.layoutFracs)[] = this.isDebug
      ? ['seed', 'play', 'endless', 'debugLevel', 'debugTime']
      : ['seed', 'play', 'endless'];
    const topHeights = this.isDebug
      ? [20, playH, 18, 18, 18]
      : [20, playH, 18];

    // Bottom group: nav buttons + hint (kept together)
    const bottomKeys: (keyof typeof this.layoutFracs)[] = ['scores', 'achievements', 'settings', 'hint'];
    const bottomHeights = [btnH, btnH, btnH, 12];

    // Fixed inner gaps — capped so groups stay tight on tall screens
    const maxTopGap = compact ? 10 : 16;
    const bottomGap = compact ? 6 : 10;

    const topItemH = topHeights.reduce((s, h) => s + h, 0);
    const bottomItemH = bottomHeights.reduce((s, h) => s + h, 0);
    const bottomFixedH = bottomItemH + bottomGap * (bottomKeys.length - 1);

    const topSlots = topKeys.length - 1;
    const spaceForTopGaps = avail - topItemH - bottomFixedH;
    const topGap = Math.max(2, Math.min(maxTopGap, spaceForTopGaps / (topSlots + 1)));
    const topFixedH = topItemH + topGap * topSlots;

    // Remaining space goes between the two groups
    const groupGap = Math.max(topGap, avail - topFixedH - bottomFixedH);

    // Position top group
    let y = contentTop + topHeights[0] / 2;
    for (let i = 0; i < topKeys.length; i++) {
      this.layoutFracs[topKeys[i]] = y / height;
      if (i < topKeys.length - 1) {
        y += topHeights[i] / 2 + topGap + topHeights[i + 1] / 2;
      }
    }

    // Bridge to bottom group
    y += topHeights[topKeys.length - 1] / 2 + groupGap + bottomHeights[0] / 2;

    // Position bottom group
    for (let i = 0; i < bottomKeys.length; i++) {
      this.layoutFracs[bottomKeys[i]] = y / height;
      if (i < bottomKeys.length - 1) {
        y += bottomHeights[i] / 2 + bottomGap + bottomHeights[i + 1] / 2;
      }
    }
  }

  update(_time: number, delta: number): void {
    this.menuNav.update(_time);
    this.bloodDrips.update(delta / 1000);
    this.gol.update(delta);
  }

  private getSeed(): number {
    const val = this.seedInput.value.trim();
    const num = parseInt(val, 10);
    return (val && !isNaN(num)) ? num : Date.now();
  }

  private startGame(): void {
    const seed = this.getSeed();
    const settings = loadSettings();
    const debugLevel = this.debugLevelInput ? parseInt(this.debugLevelInput.value, 10) || 1 : undefined;
    const debugTimeMinutes = this.debugTimeInput ? parseInt(this.debugTimeInput.value, 10) || 0 : undefined;
    this.removeInputs();
    this.scene.start('Game', { seed, endless: settings.endlessMode, debugLevel, debugTimeMinutes });
  }

  private removeInputs(): void {
    removeElements(this.seedInput, this.endlessContainer, this.debugContainer);
  }

  shutdown(): void {
    this.removeInputs();
  }
}
