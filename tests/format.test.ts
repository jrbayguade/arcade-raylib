import { describe, expect, it } from 'vitest';
import { formatText, parseFormat } from '../src/lang/format';

describe('TextFormat formatting', () => {
  it('parses %d and %.Nf', () => {
    const parts = parseFormat('Punts: %d (%.1f%%)');
    expect(parts).toEqual(['Punts: ', { text: '%d', kind: 'int', precision: 0 }, ' (',
      { text: '%.1f', kind: 'float', precision: 1 }, '%)']);
  });
  it('rejects unknown specifiers', () => {
    expect(parseFormat('%s')).toEqual({ bad: '%s' });
    expect(parseFormat('100%')).toEqual({ bad: '%' });
  });
  it('formats values', () => {
    const parts = parseFormat('%d - %.2f');
    if (!Array.isArray(parts)) throw new Error('bad format');
    expect(formatText(parts, [7, 3.14159])).toBe('7 - 3.14');
    expect(formatText(parts, [true, 1])).toBe('1 - 1.00');
  });
});
