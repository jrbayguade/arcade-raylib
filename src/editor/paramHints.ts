import { LangError } from '../lang/diagnostics';
import { lex } from '../lang/lexer';
import type { Token } from '../lang/tokens';

export interface ParamHint { pos: number; label: string }
interface Frame { params?: string[]; arg: number }

/** Where to show "x:", "y:"... inside calls of known functions. Unfinished code is fine; unlexable code gives []. */
export function computeParamHints(code: string, names: (fn: string) => string[] | undefined): ParamHint[] {
  let tokens: Token[];
  try {
    tokens = lex(code);
  } catch (e) {
    if (e instanceof LangError) return [];
    throw e;
  }
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const offset = (t: Token) => lineStarts[t.line - 1] + t.col - 1;

  const hints: ParamHint[] = [];
  const stack: Frame[] = [];
  let awaiting: Frame | null = null;
  tokens.forEach((t, i) => {
    if (t.kind === 'eof') return;
    const isSym = (s: string) => t.kind === 'sym' && t.text === s;
    if (awaiting && !isSym(')')) {
      const label = awaiting.params?.[awaiting.arg];
      if (label !== undefined) hints.push({ pos: offset(t), label: `${label}:` });
    }
    awaiting = null;
    if (isSym('(')) {
      const prev = tokens[i - 1];
      const params = prev?.kind === 'ident' ? names(prev.text) : undefined;
      const frame: Frame = { params, arg: 0 };
      stack.push(frame);
      if (params) awaiting = frame;
    } else if (isSym(')')) {
      stack.pop();
    } else if (isSym(',')) {
      const top = stack[stack.length - 1];
      if (top?.params) { top.arg++; awaiting = top; }
    }
  });
  return hints;
}

/** Hints are only shown where the kid can write: everywhere else the code stays clean. */
export function hintsInRange(hints: ParamHint[], from: number, to: number): ParamHint[] {
  return hints.filter((h) => h.pos >= from && h.pos <= to);
}
