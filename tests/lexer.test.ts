import { describe, expect, it } from 'vitest';
import { lex } from '../src/lang/lexer';
import { LangError } from '../src/lang/diagnostics';

function lexError(src: string) {
  try { lex(src); } catch (e) { if (e instanceof LangError) return e.diagnostic; throw e; }
  throw new Error('expected a LangError');
}

describe('lex', () => {
  it('tokenizes a declaration', () => {
    const toks = lex('int x = 5;');
    expect(toks.map((t) => [t.kind, t.text])).toEqual([
      ['keyword', 'int'], ['ident', 'x'], ['sym', '='], ['int', '5'], ['sym', ';'], ['eof', ''],
    ]);
    expect(toks[3].value).toBe(5);
  });

  it('reads floats with and without suffix', () => {
    const [a, b] = lex('2.5f 3.');
    expect([a.kind, a.value, a.text]).toEqual(['float', 2.5, '2.5f']);
    expect([b.kind, b.value]).toEqual(['float', 3]);
  });

  it('decodes strings', () => {
    expect(lex('"hola\\n\\"tu\\""')[0].value).toBe('hola\n"tu"');
  });

  it('prefers the longest symbol', () => {
    expect(lex('a += 1; b == c && d').filter((t) => t.kind === 'sym').map((t) => t.text))
      .toEqual(['+=', ';', '==', '&&']);
  });

  it('skips comments and tracks positions', () => {
    const toks = lex('// a\n/* b\n c */ x');
    expect(toks[0]).toMatchObject({ text: 'x', line: 3, col: 7 });
  });

  it('ignores #include "raylib.h"', () => {
    expect(lex('#include "raylib.h"\nint').map((t) => t.text)).toEqual(['int', '']);
    expect(lex('#include <raylib.h> // comentari\nint').map((t) => t.text)).toEqual(['int', '']);
  });

  it('rejects other includes and directives', () => {
    expect(lexError('#include <stdio.h>')).toMatchObject({ code: 'UNSUPPORTED_INCLUDE', params: { file: 'stdio.h' } });
    expect(lexError('#define X 3')).toMatchObject({ code: 'UNSUPPORTED_DIRECTIVE', params: { directive: '#define' } });
  });

  it('explains accents in names', () => {
    expect(lexError('int puntuació = 0;')).toMatchObject({ code: 'ACCENT_IN_NAME', params: { char: 'ó' }, line: 1, col: 13 });
    expect(lexError('int ç = 0;')).toMatchObject({ code: 'ACCENT_IN_NAME', params: { char: 'ç' } });
  });

  it('rejects integers with a leading zero (octal in C)', () => {
    expect(lexError('int x = 010;')).toMatchObject({ code: 'LEADING_ZERO', params: { fixed: '10' }, col: 9 });
    expect(lexError('int x = 09;')).toMatchObject({ code: 'LEADING_ZERO', params: { fixed: '9' } });
    expect(lex('0 0.5 00.5').map((t) => t.kind)).toEqual(['int', 'float', 'float', 'eof']);
  });

  it('treats C keywords outside the subset as keywords, not names', () => {
    expect(lex('auto register volatile extern inline restrict union').every((t) => t.kind !== 'ident')).toBe(true);
  });

  it('reports unterminated strings and comments', () => {
    expect(lexError('x = "hola\n";')).toMatchObject({ code: 'UNTERMINATED_STRING', line: 1, col: 5 });
    expect(lexError('/* x')).toMatchObject({ code: 'UNTERMINATED_COMMENT', line: 1, col: 1 });
  });

  it('reports unknown characters and char literals', () => {
    expect(lexError('x @ y')).toMatchObject({ code: 'UNKNOWN_CHAR', params: { char: '@' }, col: 3 });
    expect(lexError("c = 'a';")).toMatchObject({ code: 'UNSUPPORTED', params: { feature: 'char_literal' } });
  });
});
