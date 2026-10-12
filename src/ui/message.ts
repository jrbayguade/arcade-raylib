import type { Diagnostic } from '../lang/diagnostics';
import type { Feedback } from '../lessons/feedback';

/** What Bit says after the kid acts: only the latest thing, never a pile. */
export type BitMessage =
  | null
  | { kind: 'hint'; n: number; text: string }
  | { kind: 'result'; feedback: Feedback; stars: number; maxStars: number }
  | { kind: 'live'; diagnostic: Diagnostic };
