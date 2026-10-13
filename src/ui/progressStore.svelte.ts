import { emptyProgress, loadProgress, saveProgress, type Progress } from '../lessons/progress';

const storage = () => { try { return localStorage; } catch { return null; } };

/** The kid's progress for the whole app, loaded once; screens change it and call persist(). */
export const progress: Progress = $state(loadProgress(storage()));

export function persist(): void {
  saveProgress(storage(), $state.snapshot(progress) as Progress);
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** For typing: saves a moment after the last keystroke (and before the page goes away). */
export function persistSoon(): void {
  clearTimeout(timer);
  timer = setTimeout(persist, 300);
}
if (typeof addEventListener === 'function') addEventListener('pagehide', () => { clearTimeout(timer); persist(); });

export function clearProgress(): void {
  clearTimeout(timer);
  Object.assign(progress, emptyProgress());
  persist();
}
