import Phaser from 'phaser';
import { GameEvents } from '../systems/GameEvents';

export interface ButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  fontSize: string;
  textColor: string;
  fillColor: number;
  hoverColor: number;
  onClick: () => void;
}

export interface ButtonResult {
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
}

export function createButton(scene: Phaser.Scene, config: ButtonConfig): ButtonResult {
  const { x, y, width, height, label, fontSize, textColor, fillColor, hoverColor, onClick } = config;

  const bg = scene.add.rectangle(x, y, width, height, fillColor)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(hoverColor))
    .on('pointerout', () => bg.setFillStyle(fillColor))
    .on('pointerdown', () => { GameEvents.sfx('menu-click'); onClick(); });

  const text = scene.add.text(x, y, label, {
    fontSize,
    fontFamily: 'monospace',
    color: textColor,
  }).setOrigin(0.5);

  return { bg, text };
}
