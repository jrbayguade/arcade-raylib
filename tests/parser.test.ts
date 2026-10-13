import { describe, expect, it } from 'vitest';
import { lex } from '../src/lang/lexer';
import { parse } from '../src/lang/parser';
import { LangError } from '../src/lang/diagnostics';
import type { Binary, If, VarDecl } from '../src/lang/ast';

const p = (src: string) => parse(lex(src));
const main = (body: string) => `int main(void) {\n${body}\n}`; // body starts on line 2
function parseError(src: string) {
  try { p(src); } catch (e) { if (e instanceof LangError) return e.diagnostic; throw e; }
  throw new Error('expected a LangError');
}

describe('parse: valid programs', () => {
  it('parses an empty main (with or without void)', () => {
    expect(p('int main(void) { }').main.body).toEqual([]);
    expect(p('int main() { return 0; }').main.body[0].kind).toBe('Return');
  });

  it('respects operator precedence', () => {
    const decl = p(main('int x = 1 + 2 * 3;')).main.body[0] as VarDecl;
    const plus = decl.init as Binary;
    expect(plus.op).toBe('+');
    expect((plus.right as Binary).op).toBe('*');
  });

  it('parses comparisons and logic', () => {
    const decl = p(main('bool b = a < 3 && !c || d == 2;')).main.body[0] as VarDecl;
    expect((decl.init as Binary).op).toBe('||');
    expect(((decl.init as Binary).left as Binary).op).toBe('&&');
  });

  it('parses else-if chains', () => {
    const s = p(main('if (x > 1) { x = 1; } else if (x > 0) { x = 2; } else { x = 3; }')).main.body[0] as If;
    expect(s.otherwise?.kind).toBe('If');
    expect((s.otherwise as If).otherwise?.kind).toBe('Block');
  });

  it('parses for, while, calls, compound assignment and ++', () => {
    const body = p(main([
      'for (int i = 0; i < 10; i++) { x += i; }',
      'while (!WindowShouldClose()) { DrawText("hola", 1, 2, 20, RED); }',
      'x--;',
      '++x;',
    ].join('\n'))).main.body;
    expect(body.map((s) => s.kind)).toEqual(['For', 'While', 'IncDec', 'IncDec']);
  });

  it('records positions', () => {
    const s = p(main('    int x = 5;')).main.body[0];
    expect([s.line, s.col]).toEqual([2, 5]);
  });

  it('gives every node a different id', () => {
    const prog = p(main('int x = 1 + 2;\nx = x * 3;'));
    const decl = prog.main.body[0] as VarDecl;
    const ids = [prog.main.id, decl.id, decl.init.id, (decl.init as Binary).left.id, prog.main.body[1].id];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('parse: errors', () => {
  it('reports a missing semicolon on the line where it is missing', () => {
    expect(parseError(main('int x = 5\nx = 6;'))).toMatchObject({ code: 'MISSING_SEMICOLON', line: 2 });
  });
  it('requires braces', () => {
    expect(parseError(main('if (x > 1) x = 2;'))).toMatchObject({ code: 'MISSING_BRACES', params: { keyword: 'if' } });
    expect(parseError(main('while (1) x = 2;'))).toMatchObject({ code: 'MISSING_BRACES', params: { keyword: 'while' } });
  });
  it('explains = inside a condition', () => {
    expect(parseError(main('if (x = 5) { }'))).toMatchObject({ code: 'ASSIGN_IN_CONDITION', line: 2, col: 7 });
  });
  it('requires an initial value', () => {
    expect(parseError(main('int x;'))).toMatchObject({ code: 'DECL_NEEDS_INIT', params: { name: 'x', decl: 'int' } });
  });
  it('rejects unsupported constructs with a feature name', () => {
    expect(parseError(main('switch (x) { }'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'switch' } });
    expect(parseError(main('int a[3] = 0;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'array' } });
    expect(parseError(main('x = (int)y;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'cast' } });
    expect(parseError(main('x = a & b;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'bitwise' } });
    expect(parseError(main('int a = 1, b = 2;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'multi_decl' } });
    expect(parseError(main('break;'))).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'break' } });
  });
  it('rejects ++ inside expressions', () => {
    expect(parseError(main('x = y++;'))).toMatchObject({ code: 'INCDEC_IN_EXPRESSION' });
  });
  it('suggests float instead of double', () => {
    expect(parseError(main('double d = 1.0;'))).toMatchObject({ code: 'UNSUPPORTED_TYPE', params: { type: 'double', use: 'float' } });
  });
  it('rejects statements that do nothing', () => {
    expect(parseError(main('x == 5;'))).toMatchObject({ code: 'EXPECTED_ASSIGNMENT', params: { name: 'x' } });
  });
  it('explains a calculation that is not stored', () => {
    expect(parseError(main('pilotaX + 3;'))).toMatchObject({ code: 'VALUE_NOT_STORED', params: { name: 'pilotaX', expr: 'pilotaX + 3' } });
  });
  it('checks the program structure', () => {
    expect(parseError('')).toMatchObject({ code: 'NO_MAIN' });
    expect(parseError('int x = 5;\nint main(void) { }')).toMatchObject({ code: 'UNSUPPORTED_GLOBAL' });
    expect(parseError('int f(void) { return 1; }')).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'function_def' } });
    expect(parseError('int main(void) {\nint x = 1;')).toMatchObject({ code: 'UNEXPECTED_EOF' });
  });
});
