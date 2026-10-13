import { evaluate, type Evaluation } from './checks';
import { isExercise, type Lesson, type Step, type StepTexts } from './model';
import type { SavedExercise } from './progress';
import { parseLessonSource, withZone, zoneOf, type LessonSource } from './source';

/** Most stars an exercise can give: ⭐ it works, ⭐⭐ without hints. (The ⭐⭐⭐ extra challenge will raise this.) */
export const MAX_STARS = 2;

export interface ExerciseState {
  /** The exercise as written: ⟲ goes back to it. */
  source: LessonSource;
  /** What the editor opens: the saved code when there is some, else `source`. */
  shown: LessonSource;
  code: string;
  hintsShown: number;
  stars: 0 | 1 | 2;
  done: boolean;
  result: Evaluation | null;
}

/** State of one lesson in progress. Pure logic: the UI reads it and calls its methods. */
export class LessonEngine {
  private index: number;
  private readonly states = new Map<string, ExerciseState>();

  constructor(readonly lesson: Lesson, start = 0, private readonly saved_: Record<string, SavedExercise> = {}) {
    this.index = Math.min(Math.max(Math.trunc(start), 0), lesson.steps.length - 1);
  }

  get stepIndex(): number { return this.index; }
  get step(): Step { return this.lesson.steps[this.index]; }
  get isLastStep(): boolean { return this.index === this.lesson.steps.length - 1; }
  get texts(): StepTexts { return this.lesson.texts.steps[this.step.id] ?? { prompt: this.step.id }; }

  get exercise(): ExerciseState | null {
    const step = this.step;
    if (!isExercise(step)) return null;
    let state = this.states.get(step.id);
    if (!state) {
      const source = parseLessonSource(step.source);
      const saved = this.saved_[step.id];
      // Saved code only comes back if the exercise around the zone is still the same (lessons change between versions).
      const zone = saved ? zoneOf(source, saved.code) : null;
      const shown = zone === null ? source : withZone(source, zone);
      state = {
        source, shown, code: shown.code,
        hintsShown: Math.min(saved?.hintsShown ?? 0, this.texts.hints?.length ?? 0),
        stars: (Math.min(Math.max(saved?.stars ?? 0, 0), MAX_STARS) as 0 | 1 | 2),
        done: saved?.done ?? false, result: null,
      };
      this.states.set(step.id, state);
    }
    return state;
  }

  starsOf(stepId: string): number {
    return this.states.get(stepId)?.stars ?? 0;
  }

  setCode(code: string): void {
    const ex = this.exercise;
    if (ex) ex.code = code;
  }

  run(): Evaluation | null {
    const step = this.step;
    const ex = this.exercise;
    if (!ex || !isExercise(step)) return null;
    const result = evaluate(ex.code, step.checks, step.run);
    ex.result = result;
    if (result.kind === 'checked' && result.passed) {
      ex.done = true;
      const earned = ex.hintsShown > 0 ? 1 : 2;
      if (earned > ex.stars) ex.stars = earned;
    }
    return result;
  }

  private hints(): string[] { return this.texts.hints ?? []; }

  get hasMoreHints(): boolean {
    const ex = this.exercise;
    return ex !== null && ex.hintsShown < this.hints().length;
  }

  showHint(): string | null {
    const ex = this.exercise;
    if (!ex || !this.hasMoreHints) return null;
    return this.hints()[ex.hintsShown++];
  }

  shownHints(): string[] {
    const ex = this.exercise;
    return ex ? this.hints().slice(0, ex.hintsShown) : [];
  }

  /** What to store for a step (null for explanations and steps not visited). */
  saved(stepId: string): SavedExercise | null {
    const ex = this.states.get(stepId);
    return ex ? { code: ex.code, stars: ex.stars, hintsShown: ex.hintsShown, done: ex.done } : null;
  }

  reset(): void {
    const ex = this.exercise;
    if (!ex) return;
    ex.shown = ex.source;
    ex.code = ex.source.code;
    ex.result = null;
  }

  get canContinue(): boolean {
    const ex = this.exercise;
    return ex === null || ex.done;
  }

  next(): boolean {
    if (!this.canContinue || this.isLastStep) return false;
    this.index++;
    return true;
  }
}
