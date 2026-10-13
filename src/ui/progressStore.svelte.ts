import { emptyProgress, loadProgress, saveProgress, type Progress } from '../lessons/progress';

const storage = () => { try { return localStorage; } catch { return null; } };

/** The kid's progress for the whole app, loaded once; screens change it and call persist(). */
export const progress: Progress = $state(loadProgress(storage()));

export function persist(): void {
  pending = false;
  saveProgress(storage(), $state.snapshot(progress) as Progress);
}

let timer: ReturnType<typeof setTimeout> | undefined;
let pending = false;
/** For typing: saves a moment after the last keystroke (and before the page goes away). */
export function persistSoon(): void {
  clearTimeout(timer);
  pending = true;
  timer = setTimeout(flush, 300);
}
function flush(): void {
  clearTimeout(timer);
  if (!pending) return;
  pending = false;
  persist();
}
// Only what is still waiting: everything else is already stored.
if (typeof addEventListener === 'function') addEventListener('pagehide', flush);

export function clearProgress(): void {
  clearTimeout(timer);
  Object.assign(progress, emptyProgress());
  persist();
}
