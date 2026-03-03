import Phaser from 'phaser';

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export function monoStyle(fontSize: string, color: string, extra?: Partial<TextStyle>): TextStyle {
  return {
    fontSize,
    fontFamily: 'monospace',
    color,
    ...extra,
  };
}
