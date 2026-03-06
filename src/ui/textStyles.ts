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

export const DOM_INPUT_STYLE: Partial<CSSStyleDeclaration> = {
  fontFamily: 'monospace', fontSize: '12px', color: '#666688',
  backgroundColor: 'transparent', border: '1px solid #333355',
  borderRadius: '4px', padding: '4px 8px', outline: 'none', zIndex: '10',
};

export const DOM_LABEL_STYLE: Partial<CSSStyleDeclaration> = {
  fontFamily: 'monospace', fontSize: '12px', color: '#666688',
};
