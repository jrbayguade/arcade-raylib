export type TokenKind = 'ident' | 'keyword' | 'int' | 'float' | 'string' | 'sym' | 'eof';

export interface Token {
  kind: TokenKind;
  text: string;
  value?: number | string;
  line: number;
  col: number;
}

export const KEYWORDS = new Set([
  'int', 'float', 'bool', 'void', 'if', 'else', 'while', 'for', 'return', 'true', 'false',
  // C keywords we recognise only to give a friendly "not supported" error
  'double', 'char', 'long', 'short', 'unsigned', 'signed', 'const', 'switch', 'case', 'default',
  'do', 'break', 'continue', 'goto', 'struct', 'typedef', 'static', 'enum', 'sizeof',
]);
