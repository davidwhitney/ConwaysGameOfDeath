import Phaser from 'phaser';
import { applyUIZoom } from '../ui/uiScale';
import { monoStyle } from '../ui/textStyles';
import { BackgroundGameOfLife } from '../ui/BackgroundGameOfLife';
import { applyCRT } from '../ui/crtEffect';
import { BloodDripEffect } from '../ui/BloodDripEffect';
import { MenuNav } from '../ui/MenuNav';
import { loadSettings, saveSettings } from '../ui/saveData';
import { onResizeRestart } from '../ui/resizeHandler';
import { LofiMusicSystem } from '../systems/audio/LofiMusicSystem';
import { SfxSystem } from '../systems/audio/SfxSystem';

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
    this.events.once('shutdown', () => this.removeSeedInput());
  }

  private createSeedInput(): void {
    const canvas = this.game.canvas;

    this.seedInput = document.createElement('input');
    this.seedInput.type = 'text';
    if (!this.currentSeed) this.currentSeed = String(Date.now());
    this.seedInput.value = this.currentSeed;
    this.seedInput.maxLength = 20;
    this.seedInput.setAttribute('aria-label', 'Game seed');
    Object.assign(this.seedInput.style, {
      position: 'absolute',
      width: '160px',
      textAlign: 'center',
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666688',
      backgroundColor: 'transparent',
      border: '1px solid #333355',
      borderRadius: '4px',
      padding: '4px 8px',
      outline: 'none',
      zIndex: '10',
    });

    // Focus styling
    this.seedInput.addEventListener('focus', () => {
      this.seedInput.style.color = '#aaaacc';
      this.seedInput.style.borderColor = '#555577';
      this.input.keyboard!.enabled = false;
    });
    this.seedInput.addEventListener('blur', () => {
      this.seedInput.style.color = '#666688';
      this.seedInput.style.borderColor = '#333355';
      this.input.keyboard!.enabled = true;
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

    canvas.parentElement!.appendChild(this.seedInput);
    this.positionSeedInput();
  }

  private createEndlessCheckbox(): void {
    const canvas = this.game.canvas;
    const settings = loadSettings();

    this.endlessContainer = document.createElement('div');
    Object.assign(this.endlessContainer.style, {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      zIndex: '10',
      cursor: 'pointer',
    });

    this.endlessCheckbox = document.createElement('input');
    this.endlessCheckbox.type = 'checkbox';
    this.endlessCheckbox.checked = settings.endlessMode;
    Object.assign(this.endlessCheckbox.style, {
      cursor: 'pointer',
      accentColor: '#666688',
    });

    const label = document.createElement('label');
    label.textContent = 'Endless Mode';
    Object.assign(label.style, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666688',
      cursor: 'pointer',
    });
    label.addEventListener('click', () => {
      this.endlessCheckbox.checked = !this.endlessCheckbox.checked;
      this.endlessCheckbox.dispatchEvent(new Event('change'));
    });

    this.endlessCheckbox.addEventListener('change', () => {
      const s = loadSettings();
      s.endlessMode = this.endlessCheckbox.checked;
      saveSettings(s);
    });

    this.endlessContainer.appendChild(this.endlessCheckbox);
    this.endlessContainer.appendChild(label);
    canvas.parentElement!.appendChild(this.endlessContainer);
    this.positionEndlessCheckbox();
  }

  private createDebugInputs(): void {
    const canvas = this.game.canvas;
    const inputStyle = {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666688',
      backgroundColor: 'transparent',
      border: '1px solid #333355',
      borderRadius: '4px',
      padding: '4px 8px',
      outline: 'none',
      width: '50px',
      textAlign: 'center',
    };
    const labelStyle = {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#666688',
    };

    this.debugContainer = document.createElement('div');
    Object.assign(this.debugContainer.style, {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      zIndex: '10',
    });

    // Level row
    const levelRow = document.createElement('div');
    Object.assign(levelRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
    const levelLabel = document.createElement('span');
    levelLabel.textContent = 'Level';
    Object.assign(levelLabel.style, labelStyle);
    this.debugLevelInput = document.createElement('input');
    this.debugLevelInput.type = 'number';
    this.debugLevelInput.min = '1';
    this.debugLevelInput.max = '100';
    this.debugLevelInput.value = '1';
    Object.assign(this.debugLevelInput.style, inputStyle);
    levelRow.appendChild(levelLabel);
    levelRow.appendChild(this.debugLevelInput);

    // Time row
    const timeRow = document.createElement('div');
    Object.assign(timeRow.style, { display: 'flex', alignItems: 'center', gap: '6px' });
    const timeLabel = document.createElement('span');
    timeLabel.textContent = 'Time (min)';
    Object.assign(timeLabel.style, labelStyle);
    this.debugTimeInput = document.createElement('input');
    this.debugTimeInput.type = 'number';
    this.debugTimeInput.min = '0';
    this.debugTimeInput.max = '35';
    this.debugTimeInput.value = '0';
    Object.assign(this.debugTimeInput.style, inputStyle);
    timeRow.appendChild(timeLabel);
    timeRow.appendChild(this.debugTimeInput);

    this.debugContainer.appendChild(levelRow);
    this.debugContainer.appendChild(timeRow);

    // Disable keyboard nav while focused
    for (const input of [this.debugLevelInput, this.debugTimeInput]) {
      input.addEventListener('focus', () => { this.input.keyboard!.enabled = false; });
      input.addEventListener('blur', () => { this.input.keyboard!.enabled = true; });
    }

    canvas.parentElement!.appendChild(this.debugContainer);
    this.positionDebugInputs();
  }

  private positionDebugInputs(): void {
    if (!this.debugContainer) return;
    const rect = this.game.canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 70;
    const y = rect.top + rect.height * this.layoutFracs.debugLevel;
    this.debugContainer.style.left = `${x}px`;
    this.debugContainer.style.top = `${y}px`;
  }

  private positionEndlessCheckbox(): void {
    const rect = this.game.canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 60;
    const y = rect.top + rect.height * this.layoutFracs.endless;
    this.endlessContainer.style.left = `${x}px`;
    this.endlessContainer.style.top = `${y}px`;
  }

  private positionSeedInput(): void {
    const rect = this.game.canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 80;
    const y = rect.top + rect.height * this.layoutFracs.seed;
    this.seedInput.style.left = `${x}px`;
    this.seedInput.style.top = `${y}px`;
  }

  private computeLayout(height: number, contentTop: number): void {
    const startY = contentTop;
    const endY = height - 6;
    const avail = endY - startY;

    const keys: (keyof typeof this.layoutFracs)[] = this.isDebug
      ? ['seed', 'play', 'endless', 'debugLevel', 'debugTime', 'scores', 'achievements', 'settings', 'hint']
      : ['seed', 'play', 'endless', 'scores', 'achievements', 'settings', 'hint'];

    const compact = height < 520;
    const btnH = compact ? 32 : 40;
    const playH = compact ? 38 : 46;
    const heights = this.isDebug
      ? [20, playH, 18, 18, 18, btnH, btnH, btnH, 12]
      : [20, playH, 18, btnH, btnH, btnH, 12];

    const totalItemH = heights.reduce((s, h) => s + h, 0);
    const minGap = 2;
    const totalMinGap = minGap * (keys.length - 1);
    const extra = Math.max(0, avail - totalItemH - totalMinGap);
    const gap = minGap + extra / (keys.length - 1);

    let y = startY + heights[0] / 2;
    for (let i = 0; i < keys.length; i++) {
      this.layoutFracs[keys[i]] = y / height;
      if (i < keys.length - 1) {
        y += heights[i] / 2 + gap + heights[i + 1] / 2;
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
    this.removeSeedInput();
    this.scene.start('Game', { seed, endless: settings.endlessMode, debugLevel, debugTimeMinutes });
  }

  private removeSeedInput(): void {
    this.seedInput?.remove();
    this.endlessContainer?.remove();
    this.debugContainer?.remove();
  }

  shutdown(): void {
    this.removeSeedInput();
  }
}
