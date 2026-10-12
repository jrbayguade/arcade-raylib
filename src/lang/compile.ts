import type { Program } from './ast';
import { check } from './checker';
import { LangError, type Diagnostic } from './diagnostics';
import type { HostSignature } from './host';
import { lex } from './lexer';
import { parse } from './parser';

export type CompileResult = { ok: true; program: Program } | { ok: false; diagnostic: Diagnostic };

export function compile(source: string, host: HostSignature): CompileResult {
  try {
    const program = parse(lex(source));
    check(program, host);
    return { ok: true, program };
  } catch (e) {
    if (e instanceof LangError) return { ok: false, diagnostic: e.diagnostic };
    throw e;
  }
}
