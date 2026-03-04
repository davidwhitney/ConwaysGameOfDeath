import { loadSave, writeSave, clearSave } from './saveData';
export type { Settings } from './saveData';
import type { Settings } from './saveData';

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
