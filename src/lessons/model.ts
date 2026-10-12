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

export interface ExplainStep { kind: 'explain'; id: string; card: 'grid' | 'variable-box' }

export type Step = ExerciseStep | ExplainStep;

export interface StepTexts { prompt: string; hints?: string[]; success?: string }

export interface LessonTexts {
  title: string;
  steps: Record<string, StepTexts>;
  checks: Record<string, string>;
  folds: Record<string, string>;
}

export interface Lesson { id: string; number: number; steps: Step[]; texts: LessonTexts }

export function isExercise(step: Step): step is ExerciseStep {
  return step.kind !== 'explain';
}
