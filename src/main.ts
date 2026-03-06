import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { IntroScene } from './scenes/Intro';
import { MainMenuScene } from './scenes/MainMenu';
import { GameScene } from './scenes/Game';
import { HUDScene } from './scenes/HUD';
import { LevelUpScene } from './scenes/LevelUp';
import { PauseScene } from './scenes/Pause';
import { ReviveScene } from './scenes/Revive';
import { GameOverScene } from './scenes/GameOver';
import { HighScoresScene } from './scenes/HighScores';
import { SettingsScene } from './scenes/Settings';
import { AchievementsScene } from './scenes/Achievements';
import { PerksScene } from './scenes/Perks';
import { InputSystem } from './systems/InputSystem';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, IntroScene, MainMenuScene, SettingsScene, AchievementsScene, PerksScene, GameScene, HUDScene, LevelUpScene, PauseScene, ReviveScene, GameOverScene, HighScoresScene],
  render: {
    pixelArt: false,
    antialias: true,
    autoMobilePipeline: true,
  },
  input: {
    activePointers: 2, // support multi-touch
    gamepad: true,
  },
};

const game = new Phaser.Game(config);
new InputSystem(game);
