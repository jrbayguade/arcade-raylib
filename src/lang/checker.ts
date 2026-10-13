import type * as A from './ast';
import { error, type LangError } from './diagnostics';
import { parseFormat, type FormatSpec } from './format';
import type { HostSignature } from './host';
import { suggest } from './suggest';

/** Macros and types from raylib.h (5.5) that a variable must not be named after, or gcc would reject the program. */
const RAYLIB_RESERVED = new Set([
  'PI', 'DEG2RAD', 'RAD2DEG', 'RLAPI', 'RAYLIB_VERSION', 'RAYLIB_VERSION_MAJOR', 'RAYLIB_VERSION_MINOR',
  'RAYLIB_VERSION_PATCH', 'MAROON', 'DARKGREEN', 'DARKBLUE', 'VIOLET', 'DARKPURPLE', 'BEIGE', 'BROWN',
  'DARKBROWN', 'BLANK', 'MAGENTA', 'Color',
]);

const NUMERIC = new Set<A.ValueType>(['int', 'float', 'bool']);
const isNumeric = (t: A.ValueType) => NUMERIC.has(t);

interface VarInfo { type: A.DeclType; line: number }

export function check(program: A.Program, host: HostSignature): void {
  new Checker(host).block(program.main);
}

class Checker {
  private scopes: Map<string, VarInfo>[] = [];

  constructor(private readonly host: HostSignature) {}

  block(b: A.Block): void {
    this.scopes.push(new Map());
    try {
      for (const s of b.body) this.stmt(s);
    } finally {
      this.scopes.pop();
    }
  }

  private lookup(name: string): VarInfo | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const v = this.scopes[i].get(name);
      if (v) return v;
    }
    return undefined;
  }
  private isConstant(name: string) { return Object.hasOwn(this.host.constants, name); }
  private isFunction(name: string) { return Object.hasOwn(this.host.functions, name); }

  private undeclared(name: string, at: A.Node): LangError {
    const names = [...new Set(this.scopes.flatMap((s) => [...s.keys()]))];
    const s = suggest(name, [...names, ...Object.keys(this.host.constants)]);
    return error('UNDECLARED_VAR', at.line, at.col, s ? { name, suggestion: s } : { name });
  }

  private targetVar(name: string, at: A.Node): VarInfo {
    const v = this.lookup(name);
    if (v) return v;
    if (this.isConstant(name)) throw error('ASSIGN_TO_CONST', at.line, at.col, { name });
    if (this.isFunction(name)) throw error('NOT_A_VARIABLE', at.line, at.col, { name });
    throw this.undeclared(name, at);
  }

  private requireAssignable(from: A.ValueType, to: A.ValueType, name: string, at: A.Node): void {
    if (from === to || (isNumeric(from) && isNumeric(to))) return;
    throw error('ASSIGN_TYPE', at.line, at.col, { name, foundType: from, expectedType: to });
  }

  private cond(e: A.Expr): void {
    const t = this.expr(e);
    if (!isNumeric(t)) throw error('CONDITION_TYPE', e.line, e.col, { foundType: t });
  }

  private stmt(s: A.Stmt): void {
    switch (s.kind) {
      case 'Block':
        return this.block(s);
      case 'VarDecl': {
        if (this.isConstant(s.name) || this.isFunction(s.name) || RAYLIB_RESERVED.has(s.name)) throw error('RESERVED_NAME', s.line, s.col, { name: s.name });
        const scope = this.scopes[this.scopes.length - 1];
        // An outer variable counts too: `int x = x + 3;` inside the loop would make a new box every frame.
        const prev = this.lookup(s.name);
        if (prev) throw error('ALREADY_DECLARED', s.line, s.col, { name: s.name, prevLine: prev.line });
        this.requireAssignable(this.expr(s.init), s.varType, s.name, s.init);
        scope.set(s.name, { type: s.varType, line: s.line });
        return;
      }
      case 'Assign': {
        const target = this.targetVar(s.target, s);
        const valueType = this.expr(s.value);
        if (s.op === '=') this.requireAssignable(valueType, target.type, s.target, s.value);
        else if (!isNumeric(target.type) || !isNumeric(valueType)) {
          throw error('TYPE_MISMATCH', s.line, s.col, { op: s.op, leftType: target.type, rightType: valueType });
        }
        s.targetType = target.type;
        return;
      }
      case 'IncDec': {
        const target = this.targetVar(s.target, s);
        if (!isNumeric(target.type)) throw error('UNARY_TYPE', s.line, s.col, { op: s.op, foundType: target.type });
        s.targetType = target.type;
        return;
      }
      case 'ExprStmt':
        this.call(s.expr, false);
        return;
      case 'If':
        this.cond(s.cond);
        this.block(s.then);
        if (s.otherwise) this.stmt(s.otherwise);
        return;
      case 'While':
        this.cond(s.cond);
        this.block(s.body);
        return;
      case 'For':
        this.scopes.push(new Map());
        try {
          if (s.init) this.stmt(s.init);
          if (s.cond) this.cond(s.cond);
          if (s.update) this.stmt(s.update);
          this.block(s.body);
        } finally {
          this.scopes.pop();
        }
        return;
      case 'Return':
        if (s.value) this.requireAssignable(this.expr(s.value), 'int', 'main', s.value);
        return;
    }
  }

  private expr(e: A.Expr): A.ValueType {
    const t = this.exprType(e);
    e.type = t;
    return t;
  }

  private exprType(e: A.Expr): A.ValueType {
    switch (e.kind) {
      case 'IntLit': return 'int';
      case 'FloatLit': return 'float';
      case 'BoolLit': return 'bool';
      case 'StringLit': throw error('STRING_NOT_ALLOWED', e.line, e.col);
      case 'Var': {
        const v = this.lookup(e.name);
        if (v) return v.type;
        if (this.isConstant(e.name)) return this.host.constants[e.name].type;
        if (this.isFunction(e.name)) throw error('NOT_A_VARIABLE', e.line, e.col, { name: e.name });
        throw this.undeclared(e.name, e);
      }
      case 'Unary': {
        const t = this.expr(e.operand);
        if (!isNumeric(t)) throw error('UNARY_TYPE', e.line, e.col, { op: e.op, foundType: t });
        if (e.op === '!') return 'bool';
        return t === 'float' ? 'float' : 'int';
      }
      case 'Binary': {
        const l = this.expr(e.left);
        const r = this.expr(e.right);
        if (!isNumeric(l) || !isNumeric(r)) throw error('TYPE_MISMATCH', e.line, e.col, { op: e.op, leftType: l, rightType: r });
        switch (e.op) {
          case '+': case '-': case '*': case '/':
            return l === 'float' || r === 'float' ? 'float' : 'int';
          case '%':
            if (l === 'float' || r === 'float') throw error('MOD_NEEDS_INT', e.line, e.col);
            return 'int';
          default:
            return 'bool';
        }
      }
      case 'Call':
        return this.call(e, true);
    }
  }

  private call(c: A.Call, asValue: boolean): A.ValueType {
    if (c.callee === 'TextFormat') throw error('TEXTFORMAT_ONLY_IN_DRAWTEXT', c.line, c.col);
    if (!this.isFunction(c.callee)) {
      const s = suggest(c.callee, Object.keys(this.host.functions));
      throw error('UNKNOWN_FUNCTION', c.line, c.col, s ? { name: c.callee, suggestion: s } : { name: c.callee });
    }
    const fn = this.host.functions[c.callee];
    if (c.args.length !== fn.params.length) {
      throw error('WRONG_ARG_COUNT', c.line, c.col, { name: c.callee, expected: fn.params.length, found: c.args.length });
    }
    c.args.forEach((arg, i) => {
      const expected = fn.params[i];
      let found: A.ValueType;
      if (arg.kind === 'StringLit') { arg.type = 'string'; found = 'string'; }
      else if (expected === 'string' && arg.kind === 'Call' && arg.callee === 'TextFormat') found = this.textFormat(arg);
      else found = this.expr(arg);
      if (!(found === expected || (isNumeric(found) && isNumeric(expected)))) {
        throw error('ARG_TYPE', arg.line, arg.col, { name: c.callee, index: i + 1, expectedType: expected, foundType: found });
      }
    });
    if (asValue && fn.returns === 'void') throw error('VOID_VALUE', c.line, c.col, { name: c.callee });
    c.type = fn.returns;
    return fn.returns;
  }

  private textFormat(c: A.Call): A.ValueType {
    const [fmt, ...rest] = c.args;
    if (!fmt || fmt.kind !== 'StringLit') throw error('TEXTFORMAT_NEEDS_LITERAL', c.line, c.col);
    fmt.type = 'string';
    const parts = parseFormat(fmt.value);
    if (!Array.isArray(parts)) throw error('TEXTFORMAT_FORMAT', fmt.line, fmt.col, { spec: parts.bad });
    const holes = parts.filter((p): p is FormatSpec => typeof p !== 'string');
    if (holes.length !== rest.length) throw error('TEXTFORMAT_ARG_COUNT', c.line, c.col, { expected: holes.length, found: rest.length });
    rest.forEach((arg, i) => {
      const t = this.expr(arg);
      const want = holes[i].kind;
      const fits = want === 'int' ? t === 'int' || t === 'bool' : t === 'float';
      if (!fits) {
        throw error('TEXTFORMAT_ARG_TYPE', arg.line, arg.col, { index: i + 1, spec: holes[i].text, expectedType: want, foundType: t });
      }
    });
    c.type = 'string';
    return 'string';
  }
}
