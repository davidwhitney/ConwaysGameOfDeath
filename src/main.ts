import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { MainMenuScene } from './scenes/MainMenu';
import { GameScene } from './scenes/Game';
import { HUDScene } from './scenes/HUD';
import { LevelUpScene } from './scenes/LevelUp';
import { PauseScene } from './scenes/Pause';
import { GameOverScene } from './scenes/GameOver';
import { HighScoresScene } from './scenes/HighScores';
import { SettingsScene } from './scenes/Settings';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
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
  scene: [BootScene, MainMenuScene, SettingsScene, GameScene, HUDScene, LevelUpScene, PauseScene, GameOverScene, HighScoresScene],
  render: {
    pixelArt: true,
    autoMobilePipeline: true,
  },
  input: {
    activePointers: 2, // support multi-touch
    gamepad: true,
  },
};

new Phaser.Game(config);
