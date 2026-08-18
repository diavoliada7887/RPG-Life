import { STATE_KEY, type RpgState } from './model';

export function loadState(): RpgState | null {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RpgState;
  } catch {
    return null;
  }
}

export function saveState(state: RpgState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function exportState(state: RpgState): Blob {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
}
