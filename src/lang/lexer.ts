import { error } from './diagnostics';
import { KEYWORDS, type Token } from './tokens';

const SYMBOLS = [
  '<<=', '>>=', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
  '->', '<<', '>>', '+', '-', '*', '/', '%', '<', '>', '=', '!', '&', '|', '^', '~', '?', ':',
  '.', '(', ')', '{', '}', '[', ']', ';', ',',
];
const LETTER = /\p{L}/u;

export function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let atLineStart = true;
  const peek = (o = 0) => source[i + o] ?? '';
  const advance = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (source[i] === '\n') { line++; col = 1; } else { col++; }
      i++;
    }
  };

  while (i < source.length) {
    const c = peek();
    if (c === '\n') { advance(); atLineStart = true; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { advance(); continue; }
    if (c === '/' && peek(1) === '/') { while (i < source.length && peek() !== '\n') advance(); continue; }
    if (c === '/' && peek(1) === '*') {
      const sl = line, sc = col;
      advance(2);
      while (i < source.length && !(peek() === '*' && peek(1) === '/')) advance();
      if (i >= source.length) throw error('UNTERMINATED_COMMENT', sl, sc);
      advance(2);
      continue;
    }

    const startLine = line, startCol = col;
    if (c === '#') {
      if (!atLineStart) throw error('UNKNOWN_CHAR', line, col, { char: '#' });
      let text = '';
      while (i < source.length && peek() !== '\n') { text += peek(); advance(); }
      handleDirective(text.replace(/\/\/.*$/, '').trim(), startLine, startCol);
      continue;
    }
    atLineStart = false;

    if (/[0-9]/.test(c)) {
      let text = '';
      while (/[0-9]/.test(peek())) { text += peek(); advance(); }
      let isFloat = false;
      if (peek() === '.') {
        isFloat = true;
        text += '.'; advance();
        while (/[0-9]/.test(peek())) { text += peek(); advance(); }
      }
      if (!isFloat && text.length > 1 && text[0] === '0') {
        throw error('LEADING_ZERO', startLine, startCol, { fixed: String(parseInt(text, 10)) });
      }
      let full = text;
      if (isFloat && (peek() === 'f' || peek() === 'F')) { full += peek(); advance(); }
      tokens.push({
        kind: isFloat ? 'float' : 'int', text: full,
        value: isFloat ? parseFloat(text) : parseInt(text, 10), line: startLine, col: startCol,
      });
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let text = '';
      while (/[A-Za-z0-9_]/.test(peek())) { text += peek(); advance(); }
      if (LETTER.test(peek())) throw error('ACCENT_IN_NAME', line, col, { char: peek() });
      tokens.push({ kind: KEYWORDS.has(text) ? 'keyword' : 'ident', text, line: startLine, col: startCol });
      continue;
    }

    if (c === '"') {
      let raw = '"';
      let value = '';
      advance();
      for (;;) {
        const ch = peek();
        if (ch === '' || ch === '\n') throw error('UNTERMINATED_STRING', startLine, startCol);
        if (ch === '"') { raw += ch; advance(); break; }
        if (ch === '\\') {
          const next = peek(1);
          raw += ch + next;
          value += next === 'n' ? '\n' : next === 't' ? '\t' : next;
          advance(2);
          continue;
        }
        raw += ch; value += ch; advance();
      }
      tokens.push({ kind: 'string', text: raw, value, line: startLine, col: startCol });
      continue;
    }

    if (c === "'") throw error('UNSUPPORTED', line, col, { feature: 'char_literal' });

    const sym = SYMBOLS.find((s) => source.startsWith(s, i));
    if (sym) {
      tokens.push({ kind: 'sym', text: sym, line: startLine, col: startCol });
      advance(sym.length);
      continue;
    }

    if (LETTER.test(c)) throw error('ACCENT_IN_NAME', line, col, { char: c });
    throw error('UNKNOWN_CHAR', line, col, { char: c });
  }

  tokens.push({ kind: 'eof', text: '', line, col });
  return tokens;
}

function handleDirective(text: string, line: number, col: number): void {
  const inc = /^#\s*include\s*[<"]([^>"]*)[>"]\s*$/.exec(text);
  if (inc) {
    if (inc[1].trim() === 'raylib.h') return;
    throw error('UNSUPPORTED_INCLUDE', line, col, { file: inc[1].trim() });
  }
  if (/^#\s*include\b/.test(text)) {
    throw error('UNSUPPORTED_INCLUDE', line, col, { file: text.replace(/^#\s*include\s*/, '') });
  }
  throw error('UNSUPPORTED_DIRECTIVE', line, col, { directive: text.split(/\s+/)[0] });
}
