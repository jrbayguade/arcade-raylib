import { emptyProgress, loadProgress, saveProgress, type Progress } from '../lessons/progress';

const storage = () => { try { return localStorage; } catch { return null; } };

/** The kid's progress for the whole app, loaded once; screens change it and call persist(). */
export const progress: Progress = $state(loadProgress(storage()));

export function persist(): void {
  saveProgress(storage(), $state.snapshot(progress) as Progress);
}

export function clearProgress(): void {
  Object.assign(progress, emptyProgress());
  persist();
}
