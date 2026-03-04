const STORAGE_KEY = 'cgod-save';

export interface Settings {
  crtEnabled: boolean;
  gameZoom: number;
  endlessMode: boolean;
}

export interface ScoreEntry {
  kills: number;
  level: number;
  time: number;
  victory: boolean;
  date: number;
  seed?: number;
}

export interface SaveData {
  settings: Settings;
  highScores: ScoreEntry[];
}

const DEFAULT_SETTINGS: Settings = { crtEnabled: true, gameZoom: 1.0, endlessMode: false };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        highScores: Array.isArray(parsed.highScores) ? parsed.highScores : [],
      };
    }
    return migrate();
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, highScores: [] };
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Migrate legacy per-key storage into the unified blob. */
function migrate(): SaveData {
  const data: SaveData = { settings: { ...DEFAULT_SETTINGS }, highScores: [] };
  try {
    const raw = localStorage.getItem('cgod-settings');
    if (raw) data.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem('cgod-highscores');
    if (raw) data.highScores = JSON.parse(raw);
  } catch { /* ignore */ }

  const hadOldData = localStorage.getItem('cgod-settings') !== null
    || localStorage.getItem('cgod-highscores') !== null;
  if (hadOldData) {
    writeSave(data);
    localStorage.removeItem('cgod-settings');
    localStorage.removeItem('cgod-highscores');
  }
  return data;
}
