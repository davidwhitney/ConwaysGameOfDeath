const STORAGE_KEY = 'cgod-save';

export interface Settings {
  crtEnabled: boolean;
  gameZoom: number;
  endlessMode: boolean;
  skipIntro: boolean;
  musicEnabled: boolean;
  musicStyle: string;
  musicVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
}

export interface ScoreEntry {
  kills: number;
  level: number;
  time: number;
  victory: boolean;
  date: number;
  seed?: number;
}

export interface Stats {
  totalKills: number;
  killsByType: Record<number, number>;
  deathKills: number;
  totalPlayTimeMs: number;
  victories: number;
}

export const DEFAULT_STATS: Stats = {
  totalKills: 0,
  killsByType: {},
  deathKills: 0,
  totalPlayTimeMs: 0,
  victories: 0,
};

export interface SaveData {
  settings: Settings;
  highScores: ScoreEntry[];
  achievements?: string[];
  stats?: Stats;
  perks?: Record<string, number>;
}

const DEFAULT_SETTINGS: Settings = { crtEnabled: true, gameZoom: 1.0, endlessMode: false, skipIntro: false, musicEnabled: true, musicStyle: 'random', musicVolume: 0.5, sfxEnabled: true, sfxVolume: 0.5 };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        highScores: Array.isArray(parsed.highScores) ? parsed.highScores : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        stats: parsed.stats ? { ...DEFAULT_STATS, ...parsed.stats } : { ...DEFAULT_STATS },
        perks: parsed.perks && typeof parsed.perks === 'object' ? parsed.perks : {},
      };
    }
    return migrate();
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, highScores: [], achievements: [], stats: { ...DEFAULT_STATS } };
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadSettings(): Settings {
  return loadSave().settings;
}

export function saveSettings(s: Settings): void {
  const data = loadSave();
  data.settings = s;
  writeSave(data);
}

export function clearAllData(): void {
  clearSave();
}

/** Migrate legacy per-key storage into the unified blob. */
function migrate(): SaveData {
  const data: SaveData = { settings: { ...DEFAULT_SETTINGS }, highScores: [], achievements: [], stats: { ...DEFAULT_STATS } };
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

export function unlockAchievement(id: string): boolean {
  const data = loadSave();
  const list = data.achievements ?? [];
  if (list.includes(id)) return false;
  list.push(id);
  data.achievements = list;
  writeSave(data);
  return true;
}

export function hasAchievement(id: string): boolean {
  const data = loadSave();
  return (data.achievements ?? []).includes(id);
}

export function getAchievements(): string[] {
  return loadSave().achievements ?? [];
}

export function loadPerks(): Record<string, number> {
  return loadSave().perks ?? {};
}

export function savePerks(perks: Record<string, number>): void {
  const data = loadSave();
  data.perks = perks;
  writeSave(data);
}

export function loadStats(): Stats {
  return loadSave().stats ?? { ...DEFAULT_STATS };
}

export function mergeStats(session: Stats): void {
  const data = loadSave();
  const persisted = data.stats ?? { ...DEFAULT_STATS };
  persisted.totalKills += session.totalKills;
  persisted.deathKills += session.deathKills;
  persisted.totalPlayTimeMs += session.totalPlayTimeMs;
  persisted.victories += session.victories;
  for (const [key, val] of Object.entries(session.killsByType)) {
    const k = Number(key);
    persisted.killsByType[k] = (persisted.killsByType[k] ?? 0) + val;
  }
  data.stats = persisted;
  writeSave(data);
}
