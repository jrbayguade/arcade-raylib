import { describe, expect, it } from 'vitest';
import { compile } from '../src/lang/compile';
import type { HostSignature } from '../src/lang/host';
import type { Binary, VarDecl } from '../src/lang/ast';

const host: HostSignature = {
  functions: {
    DrawRectangle: { params: ['int', 'int', 'int', 'int', 'Color'], returns: 'void' },
    DrawText: { params: ['string', 'int', 'int', 'int', 'Color'], returns: 'void' },
    IsKeyDown: { params: ['int'], returns: 'bool' },
    EndDrawing: { params: [], returns: 'void' },
    TextFormat: { params: ['string'], returns: 'string', variadic: true },
  },
  constants: { RED: { type: 'Color' }, KEY_W: { type: 'int' } },
};
const main = (body: string) => `int main(void) {\n${body}\n}`;
function ok(body: string) {
  const r = compile(main(body), host);
  if (!r.ok) throw new Error(JSON.stringify(r.diagnostic));
  return r.program;
}
function fails(body: string) {
  const r = compile(main(body), host);
  if (r.ok) throw new Error('expected an error');
  return r.diagnostic;
}

describe('check: valid code', () => {
  it('annotates expression types with C promotion rules', () => {
    const prog = ok('float f = 1 + 2.5;\nint i = 7 / 2;\nbool b = i > 3;');
    const [f, i, b] = prog.main.body as VarDecl[];
    expect(f.init.type).toBe('float');
    expect((i.init as Binary).type).toBe('int');
    expect(b.init.type).toBe('bool');
  });
  it('accepts constants, calls and TextFormat inside DrawText', () => {
    ok('int x = 0;\nif (IsKeyDown(KEY_W)) { x = x + 1; }\nDrawRectangle(x, 0, 10, 10, RED);\nDrawText(TextFormat("%d", x), 1, 2, 20, RED);');
  });
  it('allows implicit int/float conversions like C', () => {
    ok('int x = 2.7;\nfloat f = x;\nx += 1.5;\nbool b = x;');
  });
  it('allows shadowing in an inner block and scopes for-variables', () => {
    ok('int x = 1;\n{ int x = 2; }\nfor (int i = 0; i < 3; i++) { x += i; }\nint i = 9;');
  });
});

describe('check: errors', () => {
  it('suggests names for undeclared variables', () => {
    expect(fails('int pilotaX = 0;\npilotax = 3;')).toMatchObject({ code: 'UNDECLARED_VAR', line: 3, params: { name: 'pilotax', suggestion: 'pilotaX' } });
  });
  it('reports duplicate declarations with the first line', () => {
    expect(fails('int x = 0;\nint x = 1;')).toMatchObject({ code: 'ALREADY_DECLARED', line: 3, params: { name: 'x', prevLine: 2 } });
  });
  it('protects raylib names', () => {
    expect(fails('int RED = 1;')).toMatchObject({ code: 'RESERVED_NAME' });
    expect(fails('RED = 1;')).toMatchObject({ code: 'ASSIGN_TO_CONST', params: { name: 'RED' } });
    expect(fails('int x = IsKeyDown;')).toMatchObject({ code: 'NOT_A_VARIABLE' });
  });
  it('checks assignment and operator types', () => {
    expect(fails('int x = RED;')).toMatchObject({ code: 'ASSIGN_TYPE', params: { name: 'x', foundType: 'Color', expectedType: 'int' } });
    expect(fails('int x = RED + 1;')).toMatchObject({ code: 'TYPE_MISMATCH', params: { op: '+', leftType: 'Color', rightType: 'int' } });
    expect(fails('int x = -RED;')).toMatchObject({ code: 'UNARY_TYPE', params: { op: '-', foundType: 'Color' } });
    expect(fails('float f = 5.5 % 2;')).toMatchObject({ code: 'MOD_NEEDS_INT' });
    expect(fails('if (RED) { }')).toMatchObject({ code: 'CONDITION_TYPE', params: { foundType: 'Color' } });
  });
  it('checks calls', () => {
    expect(fails('DrawRectangel(1, 2, 3, 4, RED);')).toMatchObject({ code: 'UNKNOWN_FUNCTION', params: { name: 'DrawRectangel', suggestion: 'DrawRectangle' } });
    expect(fails('DrawRectangle(1, 2, 3, RED);')).toMatchObject({ code: 'WRONG_ARG_COUNT', params: { name: 'DrawRectangle', expected: 5, found: 4 } });
    expect(fails('DrawRectangle(1, 2, 3, 4, 5);')).toMatchObject({ code: 'ARG_TYPE', params: { index: 5, expectedType: 'Color', foundType: 'int' } });
    expect(fails('DrawText(5, 1, 2, 20, RED);')).toMatchObject({ code: 'ARG_TYPE', params: { index: 1, expectedType: 'string', foundType: 'int' } });
    expect(fails('int x = EndDrawing();')).toMatchObject({ code: 'VOID_VALUE', params: { name: 'EndDrawing' } });
  });
  it('restricts strings and TextFormat', () => {
    expect(fails('int x = "hola";')).toMatchObject({ code: 'STRING_NOT_ALLOWED' });
    expect(fails('int x = TextFormat("%d", 1);')).toMatchObject({ code: 'TEXTFORMAT_ONLY_IN_DRAWTEXT' });
    expect(fails('DrawText(TextFormat("%s", 1), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_FORMAT', params: { spec: '%s' } });
    expect(fails('DrawText(TextFormat("%d %d", 1), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_ARG_COUNT', params: { expected: 2, found: 1 } });
    expect(fails('DrawText(TextFormat("%d", 1.5), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_ARG_TYPE', params: { index: 1, spec: '%d', expectedType: 'int', foundType: 'float' } });
    expect(fails('int f = 1;\nDrawText(TextFormat(f), 1, 2, 20, RED);')).toMatchObject({ code: 'TEXTFORMAT_NEEDS_LITERAL' });
  });
  it('does not leak for-loop variables', () => {
    expect(fails('for (int i = 0; i < 3; i++) { }\ni = 2;')).toMatchObject({ code: 'UNDECLARED_VAR', params: { name: 'i' } });
  });
  it('passes through parse errors', () => {
    expect(fails('int x = 5')).toMatchObject({ code: 'MISSING_SEMICOLON' });
  });
});
