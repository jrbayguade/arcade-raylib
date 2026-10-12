import type { Diagnostic } from '../lang/diagnostics';
import type { Evaluation } from './checks';

/** The one thing Bit says after a run: a whole list of ✘ reads like an exam, so only the first failing check. */
export type Feedback =
  | { kind: 'success' }
  | { kind: 'almost'; key: string }
  | { kind: 'compile-error' | 'runtime-error'; diagnostic: Diagnostic }
  | null;

export function feedbackFor(result: Evaluation | null): Feedback {
  if (!result) return null;
  if (result.kind !== 'checked') return { kind: result.kind, diagnostic: result.diagnostic };
  if (result.passed) return { kind: 'success' };
  const failed = result.results.find((r) => !r.ok);
  return failed ? { kind: 'almost', key: failed.key } : { kind: 'success' };
}
