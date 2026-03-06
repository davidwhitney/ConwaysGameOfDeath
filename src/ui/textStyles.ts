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

/** Monospace text with black stroke — for HUD / in-game overlays */
export function hudStyle(fontSize: string, color: string, extra?: Partial<TextStyle>): TextStyle {
  return {
    fontSize,
    fontFamily: 'monospace',
    color,
    stroke: '#000000',
    strokeThickness: 2,
    ...extra,
  };
}

/** Reusable button color themes for MenuNav items */
export const BTN_PRIMARY  = { textColor: '#ffffff', fillColor: 0x333366, hoverColor: 0x444488 } as const;
export const BTN_SECONDARY = { textColor: '#ffcc00', fillColor: 0x333344, hoverColor: 0x444466 } as const;
export const BTN_MUTED     = { textColor: '#aaaaaa', fillColor: 0x333344, hoverColor: 0x444466 } as const;
export const BTN_WARNING   = { textColor: '#ff8888', fillColor: 0x443333, hoverColor: 0x664444 } as const;
export const BTN_SUCCESS   = { textColor: '#ffffff', fillColor: 0x336633, hoverColor: 0x448844 } as const;

export const DOM_INPUT_STYLE: Partial<CSSStyleDeclaration> = {
  fontFamily: 'monospace', fontSize: '12px', color: '#666688',
  backgroundColor: 'transparent', border: '1px solid #333355',
  borderRadius: '4px', padding: '4px 8px', outline: 'none', zIndex: '10',
};

export const DOM_LABEL_STYLE: Partial<CSSStyleDeclaration> = {
  fontFamily: 'monospace', fontSize: '12px', color: '#666688',
};
