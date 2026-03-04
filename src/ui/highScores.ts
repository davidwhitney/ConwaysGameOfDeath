import { loadSave, writeSave } from './saveData';
export type { ScoreEntry } from './saveData';
import type { ScoreEntry } from './saveData';

const MAX_ENTRIES = 10;

export function loadScores(): ScoreEntry[] {
  return loadSave().highScores;
}

/** Save a score and return the 1-based rank (or 0 if it didn't make top 10). */
export function addScore(entry: ScoreEntry): number {
  const data = loadSave();
  data.highScores.push(entry);
  data.highScores.sort((a, b) => b.kills - a.kills || b.level - a.level || b.time - a.time);
  const rank = data.highScores.indexOf(entry) + 1;
  data.highScores = data.highScores.slice(0, MAX_ENTRIES);
  writeSave(data);
  return rank <= MAX_ENTRIES ? rank : 0;
}

export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
