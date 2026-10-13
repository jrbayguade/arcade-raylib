import type { Check, RunSpec } from './checks';

export type ExerciseKind = 'warmup' | 'observe' | 'practice' | 'apply';

export interface ExerciseStep {
  kind: ExerciseKind;
  id: string;
  /** Exercise file contents, with //@edit and //@fold markers. */
  source: string;
  /** Reference solution, same markers; only the zone may differ from `source`. */
  solution: string;
  checks: Check[];
  run?: RunSpec;
  showVariables?: boolean;
}

export interface ExplainStep { kind: 'explain'; id: string; card: 'grid' | 'variable-box' | 'frames' }

export type Step = ExerciseStep | ExplainStep;

/** `prompt` can be split into short pages that Bit types one after another; the last one stays on screen. */
export interface StepTexts { prompt: string | string[]; hints?: string[]; success?: string }

export function promptPages(texts: StepTexts): string[] {
  return Array.isArray(texts.prompt) ? texts.prompt : [texts.prompt];
}

export interface LessonTexts {
  title: string;
  steps: Record<string, StepTexts>;
  checks: Record<string, string>;
  folds: Record<string, string>;
}

export interface Lesson {
  id: string;
  number: number;
  /** Name on the arcade cabinet's sign, e.g. PONG. */
  machine?: string;
  steps: Step[];
  texts: LessonTexts;
}

export function isExercise(step: Step): step is ExerciseStep {
  return step.kind !== 'explain';
}
