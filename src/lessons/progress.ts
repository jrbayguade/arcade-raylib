import { MAX_STARS } from './engine';
import { isExercise, type Lesson } from './model';

/** Versioned key: a new data shape gets a new key (or a migration in loadProgress). */
export const PROGRESS_KEY = 'bitarcade:v1';

export interface SavedExercise { code: string; stars: number; hintsShown: number; done: boolean }
export interface Progress {
  v: 1;
  /** By `<lessonId>/<stepId>`. */
  exercises: Record<string, SavedExercise>;
  /** Furthest step reached, by lesson id. */
  at: Record<string, number>;
  /** Where the kid was last: "Continua" goes back there. */
  last: { lesson: number; step: number } | null;
}

type Reader = { getItem(key: string): string | null };
type Writer = { setItem(key: string, value: string): void };

export function emptyProgress(): Progress {
  return { v: 1, exercises: {}, at: {}, last: null };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Never throws: missing, corrupt or unknown data (or a storage that refuses) gives an empty progress. */
export function loadProgress(storage: Reader | null): Progress {
  try {
    const raw = storage?.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const data: unknown = JSON.parse(raw);
    if (!isObject(data) || data.v !== 1 || !isObject(data.exercises) || !isObject(data.at)) return emptyProgress();
    const last = isObject(data.last) && typeof data.last.lesson === 'number' && typeof data.last.step === 'number'
      ? { lesson: data.last.lesson, step: data.last.step } : null;
    return { v: 1, exercises: data.exercises as Progress['exercises'], at: data.at as Progress['at'], last };
  } catch {
    return emptyProgress();
  }
}

/** Never throws (private mode, full storage): progress then only lasts until the tab closes. */
export function saveProgress(storage: Writer | null, progress: Progress): void {
  try {
    storage?.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* nothing to do */
  }
}

export const exerciseKey = (lesson: Lesson, stepId: string) => `${lesson.id}/${stepId}`;

/** Stores an exercise; stars never go down (trying again after a hint keeps the earlier ⭐⭐). */
export function recordExercise(p: Progress, lesson: Lesson, stepId: string, saved: SavedExercise): void {
  const key = exerciseKey(lesson, stepId);
  const before = p.exercises[key];
  p.exercises[key] = { ...saved, stars: Math.max(saved.stars, before?.stars ?? 0), done: saved.done || (before?.done ?? false) };
}

export function recordStep(p: Progress, lessonIndex: number, lesson: Lesson, step: number): void {
  p.at[lesson.id] = Math.max(p.at[lesson.id] ?? 0, step);
  p.last = { lesson: lessonIndex, step };
}

export function savedExercises(p: Progress, lesson: Lesson): Record<string, SavedExercise> {
  const out: Record<string, SavedExercise> = {};
  for (const s of lesson.steps) {
    const saved = p.exercises[exerciseKey(lesson, s.id)];
    if (saved) out[s.id] = saved;
  }
  return out;
}

export function lessonStars(p: Progress, lesson: Lesson): { earned: number; max: number } {
  let earned = 0;
  let max = 0;
  for (const s of lesson.steps.filter(isExercise)) {
    max += MAX_STARS;
    earned += p.exercises[exerciseKey(lesson, s.id)]?.stars ?? 0;
  }
  return { earned, max };
}

export function lessonDone(p: Progress, lesson: Lesson): boolean {
  return lesson.steps.filter(isExercise).every((s) => p.exercises[exerciseKey(lesson, s.id)]?.done);
}

/** How many lessons are open: the first one, plus one more after each finished lesson in order. */
export function unlockedCount(p: Progress, lessons: Lesson[]): number {
  let n = 1;
  while (n < lessons.length && lessonDone(p, lessons[n - 1])) n++;
  return n;
}

export function resumeStep(p: Progress, lesson: Lesson): number {
  return Math.min(p.at[lesson.id] ?? 0, lesson.steps.length - 1);
}
