const STORAGE_KEY = 'cgod-settings';

export interface Settings {
  crtEnabled: boolean;
  gameZoom: number; // camera zoom multiplier (0.5 – 2.0, default 1.0)
}

const DEFAULTS: Settings = { crtEnabled: true, gameZoom: 1.0 };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
