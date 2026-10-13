import { describe, expect, it } from 'vitest';
import { parseLessonSource, replaceZone, withZone, zoneOf, zoneText } from '../src/lessons/source';

const RAW = [
  '#include "raylib.h"',
  '//@fold preparar',
  'int main(void)',
  '{',
  '//@endfold',
  '//@edit',
  '    int x = 5;',
  '    int y = 6;',
  '//@end',
  '    return 0;',
  '}',
  '',
].join('\n');

describe('parseLessonSource', () => {
  it('removes the markers and locates zone and folds', () => {
    const src = parseLessonSource(RAW);
    expect(src.code).toBe('#include "raylib.h"\nint main(void)\n{\n    int x = 5;\n    int y = 6;\n    return 0;\n}\n');
    expect(zoneText(src)).toBe('    int x = 5;\n    int y = 6;');
    expect(src.folds).toEqual([{ key: 'preparar', from: 20, to: 36, lines: 2 }]);
    expect(src.code.slice(20, 36)).toBe('int main(void)\n{');
  });

  it('accepts Windows line endings', () => {
    expect(parseLessonSource(RAW.replace(/\n/g, '\r\n'))).toEqual(parseLessonSource(RAW));
  });

  it('replaces the zone', () => {
    const src = parseLessonSource(RAW);
    expect(replaceZone(src, '    int z = 1;')).toBe('#include "raylib.h"\nint main(void)\n{\n    int z = 1;\n    return 0;\n}\n');
  });

  it('rejects malformed markers', () => {
    expect(() => parseLessonSource('int a;\n')).toThrow(/no \/\/@edit zone/);
    expect(() => parseLessonSource('//@edit\nint a;\n')).toThrow(/not closed/);
    expect(() => parseLessonSource('//@edit\n//@end\n')).toThrow(/empty/);
    expect(() => parseLessonSource('//@edit\na\n//@end\n//@edit\nb\n//@end\n')).toThrow(/only one/);
    expect(() => parseLessonSource('//@fold x\n//@edit\na\n//@end\n//@endfold\n')).toThrow(/inside a fold/);
    expect(() => parseLessonSource('//@edit\na\n//@end\n//@foo\n')).toThrow(/unknown marker/);
  });
});

describe('placeholders', () => {
  it('turns //@placeholder into an empty, indented line inside the zone with a ghost text', () => {
    const src = parseLessonSource('a\n//@edit\n    int x = 1;\n//@placeholder crea aquí la caixa\n//@end\nb\n');
    expect(src.code).toBe('a\n    int x = 1;\n    \nb\n');
    expect(src.placeholders).toEqual([{ pos: 21, text: 'crea aquí la caixa' }]);
    expect(src.code.slice(src.editable.from, src.editable.to)).toBe('    int x = 1;\n    ');
  });
  it('has no placeholders by default', () => {
    expect(parseLessonSource('//@edit\na\n//@end\n').placeholders).toEqual([]);
  });
  it('only allows placeholders inside the zone', () => {
    expect(() => parseLessonSource('//@placeholder x\n//@edit\na\n//@end\n')).toThrow(/inside the \/\/@edit zone/);
  });
});

describe('withZone', () => {
  const raw = 'top\n//@fold a\nf1\n//@endfold\n//@edit\n    x = 1;\n//@placeholder escriu\n//@end\n//@fold b\nf2\n//@endfold\nend\n';
  it('puts new zone text in and moves what comes after', () => {
    const src = parseLessonSource(raw);
    const out = withZone(src, '    x = 12345;\n    y = 2;');
    expect(zoneText(out)).toBe('    x = 12345;\n    y = 2;');
    expect(out.code.slice(out.editable.to)).toBe(src.code.slice(src.editable.to));
    const delta = out.code.length - src.code.length;
    expect(out.folds[0]).toEqual(src.folds[0]);
    expect(out.folds[1]).toEqual({ ...src.folds[1], from: src.folds[1].from + delta, to: src.folds[1].to + delta });
    expect(out.placeholders).toEqual([]);
  });
  it('keeps the placeholders when the zone is unchanged', () => {
    const src = parseLessonSource(raw);
    expect(withZone(src, zoneText(src))).toEqual(src);
  });
});

describe('zoneOf', () => {
  it('finds the zone of a saved program with the same text around it', () => {
    const src = parseLessonSource('a\n//@edit\n  x = 1;\n//@end\nb\n');
    expect(zoneOf(src, 'a\n  x = 99;\n  y = 2;\nb\n')).toBe('  x = 99;\n  y = 2;');
  });
  it('gives null when the text around the zone changed', () => {
    const src = parseLessonSource('a\n//@edit\n  x = 1;\n//@end\nb\n');
    expect(zoneOf(src, 'A\n  x = 99;\nb\n')).toBeNull();
    expect(zoneOf(src, 'a\n')).toBeNull();
  });
});

describe('placeholder indentation', () => {
  it('uses the marker line own indentation when it has one', () => {
    const src = parseLessonSource('a\n    {\n//@edit\n        //@placeholder escriu aquí\n//@end\n    }\n');
    expect(src.code.split('\n')[2]).toBe('        ');
    expect(src.placeholders[0].pos).toBe(src.code.indexOf('        ') + 8);
  });
});
