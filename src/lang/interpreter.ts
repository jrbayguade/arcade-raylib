import type * as A from './ast';
import { error, type Diagnostic } from './diagnostics';
import { NativeError, type HostEnv, type Value } from './host';

export const OPS_PER_FRAME = 100_000;

export type Yielded = { kind: 'step'; line: number } | { kind: 'frame' };
export type ExecEvent =
  | { type: 'line'; line: number }
  | { type: 'var'; name: string; value: Value }
  | { type: 'branch'; id: number; line: number; taken: boolean }
  | { type: 'loop'; id: number; line: number; iteration: number }
  | { type: 'warning'; diagnostic: Diagnostic };
export interface VariableView { name: string; type: A.DeclType; value: Value }

interface Slot { type: A.DeclType; value: Value }
type Signal = 'return' | undefined;
type Exec = Generator<Yielded, Signal, void>;
type ArithOp = '+' | '-' | '*' | '/' | '%';

export function toInt(v: Value): number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return Math.trunc(v as number) | 0;
}
export function toFloat(v: Value): number {
  return Math.fround(typeof v === 'boolean' ? (v ? 1 : 0) : (v as number));
}
export function truthy(v: Value): boolean {
  return typeof v === 'boolean' ? v : (v as number) !== 0;
}
export function convert(v: Value, to: A.ValueType): Value {
  switch (to) {
    case 'int': return toInt(v);
    case 'float': return toFloat(v);
    case 'bool': return truthy(v);
    default: return v;
  }
}

export class Interpreter {
  private scopes: Map<string, Slot>[] = [];
  private ops = 0;
  private loopLines: number[] = [];
  private warned = new Set<number>();

  constructor(
    private readonly program: A.Program,
    private readonly host: HostEnv,
    private readonly onEvent: (e: ExecEvent) => void = () => {},
  ) {}

  *run(): Generator<Yielded, void, void> {
    yield* this.block(this.program.main);
  }

  variables(): VariableView[] {
    const visible = new Map<string, VariableView>();
    for (const scope of this.scopes) {
      for (const [name, slot] of scope) {
        visible.delete(name);
        visible.set(name, { name, type: slot.type, value: slot.value });
      }
    }
    return [...visible.values()];
  }

  private count(line: number): void {
    if (++this.ops > OPS_PER_FRAME) {
      throw error('LOOP_TOO_LONG', this.loopLines[this.loopLines.length - 1] ?? line, 1);
    }
  }

  private *block(b: A.Block): Exec {
    this.scopes.push(new Map());
    try {
      for (const s of b.body) {
        const signal = yield* this.stmt(s);
        if (signal) return signal;
      }
      return undefined;
    } finally {
      this.scopes.pop();
    }
  }

  private *stmt(s: A.Stmt): Exec {
    if (s.kind === 'Block') return yield* this.block(s);
    this.count(s.line);
    this.onEvent({ type: 'line', line: s.line });
    yield { kind: 'step', line: s.line };

    switch (s.kind) {
      case 'VarDecl': {
        const value = convert(this.eval(s.init), s.varType);
        this.scopes[this.scopes.length - 1].set(s.name, { type: s.varType, value });
        this.onEvent({ type: 'var', name: s.name, value });
        return undefined;
      }
      case 'Assign': {
        const slot = this.slot(s.target);
        const rhs = this.eval(s.value);
        if (s.op === '=') {
          slot.value = convert(rhs, slot.type);
        } else {
          const kind = slot.type === 'float' || s.value.type === 'float' ? 'float' : 'int';
          slot.value = convert(this.arith(s.op[0] as ArithOp, slot.value, rhs, kind, s), slot.type);
        }
        this.onEvent({ type: 'var', name: s.target, value: slot.value });
        return undefined;
      }
      case 'IncDec': {
        const slot = this.slot(s.target);
        const kind = slot.type === 'float' ? 'float' : 'int';
        slot.value = convert(this.arith(s.op === '++' ? '+' : '-', slot.value, 1, kind, s), slot.type);
        this.onEvent({ type: 'var', name: s.target, value: slot.value });
        return undefined;
      }
      case 'ExprStmt':
        this.evalCall(s.expr);
        if (this.host.takeFrameYield()) {
          this.ops = 0;
          yield { kind: 'frame' };
        }
        return undefined;
      case 'If': {
        const taken = truthy(this.eval(s.cond));
        this.onEvent({ type: 'branch', id: s.id, line: s.line, taken });
        if (taken) return yield* this.block(s.then);
        if (s.otherwise) return yield* this.stmt(s.otherwise);
        return undefined;
      }
      case 'While':
        return yield* this.loop(s, s.cond, null, s.body);
      case 'For': {
        this.scopes.push(new Map());
        try {
          if (s.init) yield* this.stmt(s.init);
          return yield* this.loop(s, s.cond, s.update, s.body);
        } finally {
          this.scopes.pop();
        }
      }
      case 'Return':
        if (s.value) this.eval(s.value);
        return 'return';
    }
  }

  private *loop(node: A.While | A.For, cond: A.Expr | null, update: A.Stmt | null, body: A.Block): Exec {
    this.loopLines.push(node.line);
    try {
      let iteration = 0;
      while (cond === null || truthy(this.eval(cond))) {
        this.count(node.line);
        this.onEvent({ type: 'loop', id: node.id, line: node.line, iteration: ++iteration });
        const signal = yield* this.block(body);
        if (signal) return signal;
        if (update) yield* this.stmt(update);
      }
      return undefined;
    } finally {
      this.loopLines.pop();
    }
  }

  private find(name: string): Slot | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const slot = this.scopes[i].get(name);
      if (slot) return slot;
    }
    return undefined;
  }

  private slot(name: string): Slot {
    const slot = this.find(name);
    if (!slot) throw new Error(`internal: variable ${name} not found`);
    return slot;
  }

  private eval(e: A.Expr): Value {
    switch (e.kind) {
      case 'IntLit': case 'BoolLit': case 'StringLit':
        return e.value;
      case 'FloatLit':
        return Math.fround(e.value);
      case 'Var':
        return this.find(e.name)?.value ?? this.host.constants[e.name].value;
      case 'Unary': {
        const v = this.eval(e.operand);
        if (e.op === '!') return !truthy(v);
        return e.type === 'float' ? Math.fround(-toFloat(v)) : (-toInt(v)) | 0;
      }
      case 'Binary':
        return this.binary(e);
      case 'Call': {
        const v = this.evalCall(e);
        if (v === undefined) throw new Error(`internal: ${e.callee} returned no value`);
        return v;
      }
    }
  }

  private binary(e: A.Binary): Value {
    if (e.op === '&&') return truthy(this.eval(e.left)) && truthy(this.eval(e.right));
    if (e.op === '||') return truthy(this.eval(e.left)) || truthy(this.eval(e.right));
    const l = this.eval(e.left);
    const r = this.eval(e.right);
    switch (e.op) {
      case '+': case '-': case '*': case '/': case '%':
        return this.arith(e.op, l, r, e.type === 'float' ? 'float' : 'int', e);
    }
    const asFloat = e.left.type === 'float' || e.right.type === 'float';
    const a = asFloat ? toFloat(l) : toInt(l);
    const b = asFloat ? toFloat(r) : toInt(r);
    switch (e.op) {
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      case '==': return a === b;
      case '!=': return a !== b;
    }
    throw new Error(`internal: unknown operator ${e.op}`);
  }

  private arith(op: ArithOp, l: Value, r: Value, kind: 'int' | 'float', at: A.Node): number {
    if (kind === 'float') {
      const a = toFloat(l), b = toFloat(r);
      switch (op) {
        case '+': return Math.fround(a + b);
        case '-': return Math.fround(a - b);
        case '*': return Math.fround(a * b);
        case '/': return Math.fround(a / b);
        case '%': throw new Error('internal: % on floats');
      }
    }
    const a = toInt(l), b = toInt(r);
    switch (op) {
      case '+': return (a + b) | 0;
      case '-': return (a - b) | 0;
      case '*': return Math.imul(a, b);
      case '/':
      case '%': {
        if (b === 0) throw error('DIVISION_BY_ZERO', at.line, at.col);
        if (op === '%') return (a % b) | 0;
        const q = Math.trunc(a / b) | 0;
        if (a % b !== 0 && !this.warned.has(at.id)) {
          this.warned.add(at.id);
          this.onEvent({
            type: 'warning',
            diagnostic: {
              code: 'INT_DIVISION_TRUNCATES', severity: 'warning', line: at.line, col: at.col,
              params: { a, b, result: q, exact: Number((a / b).toFixed(2)) },
            },
          });
        }
        return q;
      }
    }
  }

  private evalCall(c: A.Call): Value | undefined {
    const fn = this.host.functions[c.callee];
    const args = c.args.map((arg, i) => {
      const v = this.eval(arg);
      const param = fn.params[i];
      return param === undefined ? v : convert(v, param);
    });
    try {
      const result = fn.call(args);
      return result === undefined ? undefined : convert(result, fn.returns);
    } catch (err) {
      if (err instanceof NativeError) throw error(err.code, c.line, c.col, err.params);
      throw err;
    }
  }
}
