import type { Value } from './host';

const MAX_PRECISION = 20;

export interface FormatSpec { text: string; kind: 'int' | 'float'; precision: number }
export type FormatPart = string | FormatSpec;

export function parseFormat(fmt: string): FormatPart[] | { bad: string } {
  const parts: FormatPart[] = [];
  let literal = '';
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] !== '%') { literal += fmt[i]; continue; }
    const m = /^%(?:\.(\d+))?([a-zA-Z%])/.exec(fmt.slice(i));
    if (!m) return { bad: fmt.slice(i, i + 2) };
    i += m[0].length - 1;
    if (m[2] === '%' && m[1] === undefined) { literal += '%'; continue; }
    if (literal) { parts.push(literal); literal = ''; }
    if ((m[2] === 'd' || m[2] === 'i') && m[1] === undefined) parts.push({ text: m[0], kind: 'int', precision: 0 });
    else if (m[2] === 'f' && Number(m[1] ?? 6) <= MAX_PRECISION) parts.push({ text: m[0], kind: 'float', precision: m[1] === undefined ? 6 : Number(m[1]) });
    else return { bad: m[0] };
  }
  if (literal) parts.push(literal);
  return parts;
}

export function formatText(parts: FormatPart[], values: Value[]): string {
  let next = 0;
  return parts.map((p) => {
    if (typeof p === 'string') return p;
    const v = Number(values[next++]);
    return p.kind === 'int' ? String(Math.trunc(v)) : v.toFixed(p.precision);
  }).join('');
}
