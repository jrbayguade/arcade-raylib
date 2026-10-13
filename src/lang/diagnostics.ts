export const CODES = [
  // lexer
  'UNKNOWN_CHAR', 'ACCENT_IN_NAME', 'UNTERMINATED_STRING', 'UNTERMINATED_COMMENT',
  'UNSUPPORTED_INCLUDE', 'UNSUPPORTED_DIRECTIVE', 'LEADING_ZERO',
  // parser
  'MISSING_SEMICOLON', 'EXPECTED_TOKEN', 'EXPECTED_NAME', 'UNEXPECTED_TOKEN', 'UNEXPECTED_EOF',
  'MISSING_BRACES', 'ASSIGN_IN_CONDITION', 'EXPECTED_ASSIGNMENT', 'VALUE_NOT_STORED', 'EXPECTED_EXPRESSION',
  'INCDEC_IN_EXPRESSION', 'UNSUPPORTED', 'UNSUPPORTED_TYPE', 'DECL_NEEDS_INIT', 'NO_MAIN',
  'UNSUPPORTED_GLOBAL',
  // checker
  'ALREADY_DECLARED', 'RESERVED_NAME', 'UNDECLARED_VAR', 'NOT_A_VARIABLE', 'UNKNOWN_FUNCTION',
  'WRONG_ARG_COUNT', 'ARG_TYPE', 'TYPE_MISMATCH', 'UNARY_TYPE', 'ASSIGN_TYPE', 'ASSIGN_TO_CONST',
  'CONDITION_TYPE', 'MOD_NEEDS_INT', 'VOID_VALUE', 'STRING_NOT_ALLOWED',
  'TEXTFORMAT_ONLY_IN_DRAWTEXT', 'TEXTFORMAT_NEEDS_LITERAL', 'TEXTFORMAT_FORMAT',
  'TEXTFORMAT_ARG_COUNT', 'TEXTFORMAT_ARG_TYPE',
  // runtime
  'DIVISION_BY_ZERO', 'LOOP_TOO_LONG', 'NO_WINDOW', 'INTERNAL_ERROR',
  // warnings
  'INT_DIVISION_TRUNCATES',
] as const;
export type Code = (typeof CODES)[number];

export const FEATURES = [
  'char_literal', 'pointer', 'array', 'struct', 'function_def', 'switch', 'do', 'break',
  'continue', 'goto', 'typedef', 'enum', 'sizeof', 'static', 'const', 'ternary', 'bitwise',
  'cast', 'multi_decl',
] as const;
export type Feature = (typeof FEATURES)[number];

export type DiagParams = Record<string, string | number>;

export interface Diagnostic {
  code: Code;
  params: DiagParams;
  line: number;
  col: number;
  severity: 'error' | 'warning';
}

export class LangError extends Error {
  constructor(readonly diagnostic: Diagnostic) {
    super(`${diagnostic.code} at ${diagnostic.line}:${diagnostic.col}`);
  }
}

export function error(code: Code, line: number, col: number, params: DiagParams = {}): LangError {
  return new LangError({ code, params, line, col, severity: 'error' });
}
