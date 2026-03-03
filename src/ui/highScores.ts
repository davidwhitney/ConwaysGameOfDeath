const STORAGE_KEY = 'cgod-highscores';
const MAX_ENTRIES = 10;

export interface ScoreEntry {
  kills: number;
  level: number;
  time: number; // ms
  victory: boolean;
  date: number; // timestamp
  seed?: number;
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScoreEntry[];
  } catch {
    return [];
  }
}

function saveScores(scores: ScoreEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

/** Save a score and return the 1-based rank (or 0 if it didn't make top 10). */
export function addScore(entry: ScoreEntry): number {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.kills - a.kills || b.level - a.level || b.time - a.time);
  const rank = scores.indexOf(entry) + 1;
  const trimmed = scores.slice(0, MAX_ENTRIES);
  saveScores(trimmed);
  return rank <= MAX_ENTRIES ? rank : 0;
}

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
