import type * as A from './ast';
import { error, type Code, type DiagParams, type Feature } from './diagnostics';
import type { Token } from './tokens';

const DECL_TYPES = new Set(['int', 'float', 'bool', 'Color']);
const OTHER_C_TYPES: Record<string, string> = {
  double: 'float', char: 'int', long: 'int', short: 'int', unsigned: 'int', signed: 'int',
};
const UNSUPPORTED_KEYWORDS: Record<string, Feature> = {
  switch: 'switch', case: 'switch', default: 'switch', do: 'do', break: 'break', continue: 'continue',
  goto: 'goto', struct: 'struct', typedef: 'typedef', enum: 'enum', sizeof: 'sizeof', static: 'static',
  const: 'const',
};
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=']);
const ARITHMETIC = new Set(['+', '-', '*', '/', '%']);
const BITWISE = new Set(['&', '|', '^', '~', '<<', '>>', '<<=', '>>=', '%=']);

export function parse(tokens: Token[]): A.Program {
  return new Parser(tokens).parseProgram();
}

class Parser {
  private pos = 0;
  private nextId = 1;

  constructor(private readonly tokens: Token[]) {}

  private get tok(): Token { return this.tokens[this.pos]; }
  private peekTok(offset: number): Token { return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]; }
  private prev(): Token { return this.tokens[Math.max(this.pos - 1, 0)]; }
  private is(text: string): boolean {
    const t = this.tok;
    return (t.kind === 'sym' || t.kind === 'keyword') && t.text === text;
  }
  private advance(): Token {
    const t = this.tok;
    if (t.kind !== 'eof') this.pos++;
    return t;
  }
  private node(t: Token): A.Node { return { id: this.nextId++, line: t.line, col: t.col }; }
  private fail(t: Token, code: Code, params: DiagParams = {}): never {
    if (t.kind === 'eof') throw error('UNEXPECTED_EOF', t.line, t.col);
    throw error(code, t.line, t.col, params);
  }
  private expect(text: string): Token {
    if (this.is(text)) return this.advance();
    return this.fail(this.tok, 'EXPECTED_TOKEN', { expected: text, found: this.tok.text });
  }
  private expectSemicolon(): void {
    if (this.is(';')) { this.advance(); return; }
    const p = this.prev();
    throw error('MISSING_SEMICOLON', p.line, p.col + p.text.length);
  }
  private isTypeStart(): boolean {
    const t = this.tok;
    if (t.kind === 'keyword') return DECL_TYPES.has(t.text) || Object.hasOwn(OTHER_C_TYPES, t.text);
    return t.kind === 'ident' && t.text === 'Color' && this.peekTok(1).kind === 'ident';
  }

  parseProgram(): A.Program {
    const t = this.tok;
    if (t.kind === 'eof') throw error('NO_MAIN', t.line, t.col);
    if (!this.isTypeStart() && !this.is('void')) this.fail(t, 'NO_MAIN');
    const name = this.peekTok(1);
    if (name.kind === 'ident' && name.text !== 'main') {
      if (this.peekTok(2).text === '(') this.fail(t, 'UNSUPPORTED', { feature: 'function_def' });
      this.fail(t, 'UNSUPPORTED_GLOBAL');
    }
    this.expect('int');
    if (!(this.tok.kind === 'ident' && this.tok.text === 'main')) this.fail(this.tok, 'NO_MAIN');
    this.advance();
    this.expect('(');
    if (this.is('void')) this.advance();
    this.expect(')');
    const main = this.parseBlock();
    const rest: Token = this.tok; // fresh reference: TS keeps the narrowing of this.tok.kind across advance()
    if (rest.kind !== 'eof') {
      if (this.isTypeStart() && this.peekTok(2).text === '(') this.fail(rest, 'UNSUPPORTED', { feature: 'function_def' });
      this.fail(rest, 'UNEXPECTED_TOKEN', { found: rest.text });
    }
    return { kind: 'Program', main };
  }

  private parseBlock(): A.Block {
    const open = this.expect('{');
    const body: A.Stmt[] = [];
    while (!this.is('}')) {
      if (this.tok.kind === 'eof') throw error('UNEXPECTED_EOF', this.tok.line, this.tok.col);
      const s = this.parseStatement();
      if (s) body.push(s);
    }
    this.advance();
    return { kind: 'Block', body, ...this.node(open) };
  }

  private parseBody(keyword: string): A.Block {
    if (!this.is('{')) this.fail(this.tok, 'MISSING_BRACES', { keyword });
    return this.parseBlock();
  }

  private parseStatement(): A.Stmt | null {
    const t = this.tok;
    if (this.is(';')) { this.advance(); return null; }
    if (this.is('{')) return this.parseBlock();
    if (t.kind === 'keyword') {
      if (t.text === 'if') return this.parseIf();
      if (t.text === 'while') return this.parseWhile();
      if (t.text === 'for') return this.parseFor();
      if (t.text === 'return') {
        this.advance();
        const value = this.is(';') ? null : this.parseExpression();
        this.expectSemicolon();
        return { kind: 'Return', value, ...this.node(t) };
      }
      if (Object.hasOwn(UNSUPPORTED_KEYWORDS, t.text)) this.fail(t, 'UNSUPPORTED', { feature: UNSUPPORTED_KEYWORDS[t.text] });
    }
    if (this.isTypeStart()) {
      const decl = this.parseVarDecl();
      this.expectSemicolon();
      return decl;
    }
    const simple = this.parseSimple();
    this.expectSemicolon();
    return simple;
  }

  private parseVarDecl(): A.VarDecl {
    const t = this.advance();
    if (Object.hasOwn(OTHER_C_TYPES, t.text)) this.fail(t, 'UNSUPPORTED_TYPE', { type: t.text, use: OTHER_C_TYPES[t.text] });
    if (this.is('*')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'pointer' });
    const name = this.tok;
    if (name.kind !== 'ident') this.fail(name, 'EXPECTED_NAME', { found: name.text });
    this.advance();
    if (this.is('(')) this.fail(name, 'UNSUPPORTED', { feature: 'function_def' });
    if (this.is('[')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'array' });
    if (this.is(',')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'multi_decl' });
    if (this.is(';')) this.fail(name, 'DECL_NEEDS_INIT', { name: name.text, decl: t.text });
    this.expect('=');
    const init = this.parseExpression();
    if (this.is(',')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'multi_decl' });
    return { kind: 'VarDecl', varType: t.text as A.DeclType, name: name.text, init, ...this.node(t) };
  }

  /** Assignment, ++/-- or a function call (without the trailing semicolon). */
  private parseSimple(): A.Assign | A.IncDec | A.ExprStmt {
    const t = this.tok;
    const start = this.pos;
    if (this.is('++') || this.is('--')) {
      this.advance();
      const name = this.tok;
      if (name.kind !== 'ident') this.fail(name, 'EXPECTED_NAME', { found: name.text });
      this.advance();
      return { kind: 'IncDec', target: name.text, op: t.text as '++' | '--', ...this.node(t) };
    }
    if (this.is('*') || this.is('&')) this.fail(t, 'UNSUPPORTED', { feature: 'pointer' });
    if (t.kind !== 'ident') this.fail(t, 'UNEXPECTED_TOKEN', { found: t.text });
    if (this.peekTok(1).kind === 'sym' && this.peekTok(1).text === '(') {
      const call = this.parseCall();
      return { kind: 'ExprStmt', expr: call, ...this.node(t) };
    }
    this.advance();
    if (this.is('++') || this.is('--')) {
      const op = this.advance().text as '++' | '--';
      return { kind: 'IncDec', target: t.text, op, ...this.node(t) };
    }
    if (this.tok.kind === 'sym' && ASSIGN_OPS.has(this.tok.text)) {
      const op = this.advance().text as A.AssignOp;
      const value = this.parseExpression();
      return { kind: 'Assign', target: t.text, op, value, ...this.node(t) };
    }
    if (this.is('[')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'array' });
    if (this.is('.') || this.is('->')) this.fail(this.tok, 'UNSUPPORTED', { feature: 'struct' });
    if (this.tok.kind === 'sym' && BITWISE.has(this.tok.text)) this.fail(this.tok, 'UNSUPPORTED', { feature: 'bitwise' });
    if (this.tok.kind === 'sym' && ARITHMETIC.has(this.tok.text)) {
      // `pilotaX + 3;` computes a value and throws it away: say so, and show how to keep it.
      this.pos = start;
      this.parseExpression();
      const expr = this.tokens.slice(start, this.pos).map((k) => k.text).join(' ');
      return this.fail(t, 'VALUE_NOT_STORED', { name: t.text, expr });
    }
    return this.fail(t, 'EXPECTED_ASSIGNMENT', { name: t.text });
  }

  private parseIf(): A.If {
    const t = this.advance();
    this.expect('(');
    const cond = this.parseExpression();
    this.expect(')');
    const then = this.parseBody('if');
    let otherwise: A.Block | A.If | null = null;
    if (this.is('else')) {
      this.advance();
      otherwise = this.is('if') ? this.parseIf() : this.parseBody('else');
    }
    return { kind: 'If', cond, then, otherwise, ...this.node(t) };
  }

  private parseWhile(): A.While {
    const t = this.advance();
    this.expect('(');
    const cond = this.parseExpression();
    this.expect(')');
    const body = this.parseBody('while');
    return { kind: 'While', cond, body, ...this.node(t) };
  }

  private parseFor(): A.For {
    const t = this.advance();
    this.expect('(');
    let init: A.For['init'] = null;
    if (!this.is(';')) {
      const s = this.isTypeStart() ? this.parseVarDecl() : this.parseSimple();
      if (s.kind === 'ExprStmt') this.fail(t, 'EXPECTED_ASSIGNMENT', { name: s.expr.callee });
      init = s;
    }
    this.expect(';');
    const cond = this.is(';') ? null : this.parseExpression();
    this.expect(';');
    let update: A.For['update'] = null;
    if (!this.is(')')) {
      const s = this.parseSimple();
      if (s.kind === 'ExprStmt') this.fail(t, 'EXPECTED_ASSIGNMENT', { name: s.expr.callee });
      update = s;
    }
    this.expect(')');
    const body = this.parseBody('for');
    return { kind: 'For', init, cond, update, body, ...this.node(t) };
  }

  parseExpression(): A.Expr {
    const e = this.parseOr();
    const t = this.tok;
    if (t.kind === 'sym') {
      if (ASSIGN_OPS.has(t.text)) this.fail(t, 'ASSIGN_IN_CONDITION');
      if (t.text === '?') this.fail(t, 'UNSUPPORTED', { feature: 'ternary' });
    }
    return e;
  }

  private binaryLevel(ops: string[], next: () => A.Expr): A.Expr {
    let left = next();
    while (this.tok.kind === 'sym' && ops.includes(this.tok.text)) {
      const opTok = this.advance();
      const right = next();
      left = { kind: 'Binary', op: opTok.text as A.BinaryOp, left, right, ...this.node(opTok) };
    }
    return left;
  }
  private parseOr = (): A.Expr => this.binaryLevel(['||'], this.parseAnd);
  private parseAnd = (): A.Expr => this.binaryLevel(['&&'], this.parseEquality);
  private parseEquality = (): A.Expr => this.binaryLevel(['==', '!='], this.parseRelational);
  private parseRelational = (): A.Expr => this.binaryLevel(['<', '>', '<=', '>='], this.parseAdditive);
  private parseAdditive = (): A.Expr => this.binaryLevel(['+', '-'], this.parseMultiplicative);
  private parseMultiplicative = (): A.Expr => this.binaryLevel(['*', '/', '%'], this.parseUnary);

  private parseUnary = (): A.Expr => {
    const t = this.tok;
    if (this.is('-') || this.is('!')) {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'Unary', op: t.text as '-' | '!', operand, ...this.node(t) };
    }
    if (this.is('+')) { this.advance(); return this.parseUnary(); }
    if (this.is('++') || this.is('--')) this.fail(t, 'INCDEC_IN_EXPRESSION');
    if (this.is('&') || this.is('*')) this.fail(t, 'UNSUPPORTED', { feature: 'pointer' });
    if (this.is('~')) this.fail(t, 'UNSUPPORTED', { feature: 'bitwise' });
    return this.parsePostfix();
  };

  private parsePostfix(): A.Expr {
    const e = this.parsePrimary();
    const t = this.tok;
    if (t.kind === 'sym') {
      if (t.text === '++' || t.text === '--') this.fail(t, 'INCDEC_IN_EXPRESSION');
      if (t.text === '[') this.fail(t, 'UNSUPPORTED', { feature: 'array' });
      if (t.text === '.' || t.text === '->') this.fail(t, 'UNSUPPORTED', { feature: 'struct' });
      if (BITWISE.has(t.text)) this.fail(t, 'UNSUPPORTED', { feature: 'bitwise' });
    }
    return e;
  }

  private parsePrimary(): A.Expr {
    const t = this.tok;
    switch (t.kind) {
      case 'int':
        this.advance();
        return { kind: 'IntLit', value: t.value as number, ...this.node(t) };
      case 'float':
        this.advance();
        return { kind: 'FloatLit', value: t.value as number, ...this.node(t) };
      case 'string':
        this.advance();
        return { kind: 'StringLit', value: t.value as string, ...this.node(t) };
      case 'keyword':
        if (t.text === 'true' || t.text === 'false') {
          this.advance();
          return { kind: 'BoolLit', value: t.text === 'true', ...this.node(t) };
        }
        if (t.text === 'sizeof') this.fail(t, 'UNSUPPORTED', { feature: 'sizeof' });
        break;
      case 'ident':
        if (this.peekTok(1).kind === 'sym' && this.peekTok(1).text === '(') return this.parseCall();
        this.advance();
        return { kind: 'Var', name: t.text, ...this.node(t) };
      case 'sym':
        if (t.text === '(') {
          const next = this.peekTok(1);
          const isCast = (next.kind === 'keyword' && (DECL_TYPES.has(next.text) || Object.hasOwn(OTHER_C_TYPES, next.text)))
            || (next.kind === 'ident' && next.text === 'Color' && this.peekTok(2).text === ')');
          if (isCast) this.fail(t, 'UNSUPPORTED', { feature: 'cast' });
          this.advance();
          const e = this.parseExpression();
          this.expect(')');
          return e;
        }
        break;
      case 'eof':
        break;
    }
    return this.fail(t, 'EXPECTED_EXPRESSION', { found: t.text });
  }

  private parseCall(): A.Call {
    const name = this.advance();
    this.expect('(');
    const args: A.Expr[] = [];
    if (!this.is(')')) {
      args.push(this.parseExpression());
      while (this.is(',')) {
        this.advance();
        args.push(this.parseExpression());
      }
    }
    this.expect(')');
    return { kind: 'Call', callee: name.text, args, ...this.node(name) };
  }
}
