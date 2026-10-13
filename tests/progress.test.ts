import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/pong';
import {
  emptyProgress, lessonDone, lessonStars, loadProgress, PROGRESS_KEY, recordExercise, recordStep, resumeStep, saveProgress, unlockedCount,
} from '../src/lessons/progress';
import { isExercise } from '../src/lessons/model';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
const [l1, l2] = LESSONS;
const exercises = (l: typeof l1) => l.steps.filter(isExercise);
const solveAll = (p = emptyProgress(), l = l1) => {
  for (const s of exercises(l)) recordExercise(p, l, s.id, { code: 'x', stars: 2, hintsShown: 0, done: true });
  return p;
};

describe('progress', () => {
  it('starts empty when nothing, garbage or another version is stored', () => {
    const s = new MemoryStorage();
    expect(loadProgress(s)).toEqual(emptyProgress());
    s.setItem(PROGRESS_KEY, '{not json');
    expect(loadProgress(s)).toEqual(emptyProgress());
    s.setItem(PROGRESS_KEY, JSON.stringify({ v: 99, exercises: {} }));
    expect(loadProgress(s)).toEqual(emptyProgress());
    expect(loadProgress(null)).toEqual(emptyProgress());
  });

  it('saves and loads back', () => {
    const s = new MemoryStorage();
    const p = emptyProgress();
    recordExercise(p, l1, exercises(l1)[0].id, { code: 'abc', stars: 1, hintsShown: 2, done: true });
    recordStep(p, 0, l1, 3);
    saveProgress(s, p);
    expect(loadProgress(s)).toEqual(p);
  });

  it('never throws when storage fails', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
    expect(loadProgress(broken)).toEqual(emptyProgress());
    expect(() => saveProgress(broken, emptyProgress())).not.toThrow();
  });

  it('keeps the best stars', () => {
    const p = emptyProgress();
    const id = exercises(l1)[0].id;
    recordExercise(p, l1, id, { code: 'a', stars: 2, hintsShown: 0, done: true });
    recordExercise(p, l1, id, { code: 'b', stars: 1, hintsShown: 1, done: true });
    expect(p.exercises[`${l1.id}/${id}`]).toMatchObject({ code: 'b', stars: 2 });
  });

  it('counts stars and completion per lesson', () => {
    const p = emptyProgress();
    expect(lessonStars(p, l1)).toEqual({ earned: 0, max: exercises(l1).length * 2 });
    expect(lessonDone(p, l1)).toBe(false);
    solveAll(p);
    expect(lessonStars(p, l1).earned).toBe(exercises(l1).length * 2);
    expect(lessonDone(p, l1)).toBe(true);
  });

  it('unlocks one lesson after each finished one', () => {
    const p = emptyProgress();
    expect(unlockedCount(p, LESSONS)).toBe(1);
    solveAll(p);
    expect(unlockedCount(p, LESSONS)).toBe(2);
    solveAll(p, l2);
    expect(unlockedCount(p, LESSONS)).toBe(3);
  });

  it('resumes at the furthest step reached, and remembers the last place', () => {
    const p = emptyProgress();
    expect(resumeStep(p, l1)).toBe(0);
    recordStep(p, 0, l1, 3);
    recordStep(p, 0, l1, 1);
    expect(resumeStep(p, l1)).toBe(3);
    expect(p.last).toEqual({ lesson: 0, step: 1 });
  });
});
