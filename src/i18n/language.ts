import type { LessonTexts, StepTexts } from '../lessons/model';

export const LANGUAGES = ['ca', 'es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
/** The language the kid picked in the hall (kept across visits). */
export const LANGUAGE_KEY = 'bitarcade:lang';

const isLanguage = (x: unknown): x is Language => (LANGUAGES as readonly unknown[]).includes(x);

/**
 * The kid's own choice, else Catalan: the course is written in Catalan first, and many Catalan kids
 * use a browser set to Spanish. (`browser` is kept for a later "follow the browser" option.)
 */
export function chooseLanguage(stored: string | null, _browser: readonly string[]): Language {
  return isLanguage(stored) ? stored : 'ca';
}

type Translation = { title?: string; folds?: Record<string, string>; steps?: Record<string, Partial<StepTexts>>; checks?: Record<string, string> };

/** A lesson's texts in another language: every missing text falls back to Catalan, and so does a prompt with a different page count. */
export function localizeTexts(ca: LessonTexts, tr: Translation | undefined): LessonTexts {
  if (!tr) return ca;
  const steps: Record<string, StepTexts> = {};
  for (const [id, base] of Object.entries(ca.steps)) {
    const own = tr.steps?.[id] ?? {};
    const pages = (p: StepTexts['prompt'] | undefined) => (Array.isArray(p) ? p.length : p === undefined ? -1 : 1);
    const step: StepTexts = { ...base };
    if (own.prompt !== undefined && pages(own.prompt) === pages(base.prompt)) step.prompt = own.prompt;
    if (own.hints && base.hints && own.hints.length === base.hints.length) step.hints = own.hints;
    if (own.success !== undefined && base.success !== undefined) step.success = own.success;
    steps[id] = step;
  }
  return {
    title: tr.title ?? ca.title,
    folds: { ...ca.folds, ...pick(tr.folds, ca.folds) },
    steps,
    checks: { ...ca.checks, ...pick(tr.checks, ca.checks) },
  };
}

/** Only the keys Catalan has (a stray key in a translation is ignored). */
function pick(tr: Record<string, string> | undefined, keys: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(keys)) if (tr && typeof tr[k] === 'string') out[k] = tr[k];
  return out;
}
