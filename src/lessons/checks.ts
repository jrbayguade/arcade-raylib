import type { Block, Call, DeclType, Expr, Program, Stmt } from '../lang/ast';
import { compile } from '../lang/compile';
import type { Diagnostic } from '../lang/diagnostics';
import type { VariableView } from '../lang/interpreter';
import type { DrawCommand } from '../runtime/drawList';
import { holding, NO_INPUT } from '../runtime/input';
import { KEYS } from '../runtime/keys';
import { Machine } from '../runtime/machine';
import { RaylibHost } from '../runtime/raylib';

export interface CheckContext { program: Program; frame: DrawCommand[]; variables: VariableView[] }
export interface Check { key: string; test(ctx: CheckContext): boolean }
/** How to run a program headless: for some frames, holding keys (all the time, or only for the first `holdFor` frames). */
export interface RunSpec { frames: number; hold?: string[]; holdFor?: number }
export interface CheckResult { key: string; ok: boolean }
export type Evaluation =
  | { kind: 'compile-error'; diagnostic: Diagnostic }
  | { kind: 'runtime-error'; diagnostic: Diagnostic }
  | { kind: 'checked'; passed: boolean; results: CheckResult[] };

export const DEFAULT_RUN: RunSpec = { frames: 2 };

export function check(key: string, test: (ctx: CheckContext) => boolean): Check {
  return { key, test };
}

/** Compiles and runs the program without a screen (seed 1, fixed input), then runs the checks on the last frame. */
export function evaluate(source: string, checks: Check[], run: RunSpec = DEFAULT_RUN): Evaluation {
  const host = new RaylibHost({ seed: 1 });
  const compiled = compile(source, host);
  if (!compiled.ok) return { kind: 'compile-error', diagnostic: compiled.diagnostic };
  const ran = runProgram(compiled.program, host, run);
  if ('diagnostic' in ran) return { kind: 'runtime-error', diagnostic: ran.diagnostic };
  const ctx: CheckContext = ran;
  const results = checks.map((c) => ({ key: c.key, ok: safely(() => c.test(ctx)) }));
  return { kind: 'checked', passed: results.every((r) => r.ok), results };
}

/** Runs a compiled program for some frames with keys held, headless. */
function runProgram(program: Program, host: RaylibHost, run: RunSpec, onFrame?: (variables: VariableView[]) => void): CheckContext | { diagnostic: Diagnostic } {
  const machine = new Machine(program, host);
  const input = run.hold?.length ? holding(...run.hold.map((k) => KEYS[k])) : NO_INPUT;
  let frame: DrawCommand[] = [];
  let variables = machine.variables();
  for (let i = 0; i < run.frames; i++) {
    const r = machine.runFrame(run.holdFor !== undefined && i >= run.holdFor ? NO_INPUT : input);
    if (r.status === 'error') return { diagnostic: r.diagnostic };
    if (r.status === 'finished') break;
    frame = r.drawList;
    variables = machine.variables();
    onFrame?.(variables);
  }
  return { program, frame, variables };
}

/** The checked program again, from the start, in another situation (other keys held, more frames): null if it fails. */
export function simulate(ctx: CheckContext, run: RunSpec): CheckContext | null {
  const ran = runProgram(ctx.program, new RaylibHost({ seed: 1 }), run);
  return 'diagnostic' in ran ? null : ran;
}

/** One variable after every frame of a fresh run (empty if the program fails): to catch what a single snapshot misses. */
export function history(ctx: CheckContext, run: RunSpec, name: string): number[] {
  const values: number[] = [];
  const ran = runProgram(ctx.program, new RaylibHost({ seed: 1 }), run, (vars) => {
    const v = vars.find((x) => x.name === name)?.value;
    if (typeof v === 'number') values.push(v);
  });
  return 'diagnostic' in ran ? [] : values;
}

function safely(test: () => boolean): boolean {
  try {
    return test() === true;
  } catch {
    return false;
  }
}

type Rect = Extract<DrawCommand, { op: 'rect' }>;
type Circle = Extract<DrawCommand, { op: 'circle' }>;

function afterLastClear(frame: DrawCommand[]): DrawCommand[] {
  for (let i = frame.length - 1; i >= 0; i--) if (frame[i].op === 'clear') return frame.slice(i + 1);
  return frame;
}

export function visibleRects(ctx: CheckContext): Rect[] {
  return afterLastClear(ctx.frame).filter((c): c is Rect => c.op === 'rect');
}

export function circles(ctx: CheckContext): Circle[] {
  return afterLastClear(ctx.frame).filter((c): c is Circle => c.op === 'circle');
}

export function variable(ctx: CheckContext, name: string): number | undefined {
  const v = ctx.variables.find((x) => x.name === name)?.value;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return undefined;
}

function* statements(block: Block): Generator<Stmt> {
  for (const s of block.body) {
    yield s;
    switch (s.kind) {
      case 'Block': yield* statements(s); break;
      case 'If':
        yield* statements(s.then);
        if (s.otherwise) yield* (s.otherwise.kind === 'Block' ? statements(s.otherwise) : statements({ ...s.otherwise.then, body: [s.otherwise] }));
        break;
      case 'While': yield* statements(s.body); break;
      case 'For':
        if (s.init) yield s.init;
        if (s.update) yield s.update;
        yield* statements(s.body);
        break;
    }
  }
}

function* rootExprs(s: Stmt): Generator<Expr> {
  switch (s.kind) {
    case 'VarDecl': yield s.init; break;
    case 'Assign': yield s.value; break;
    case 'ExprStmt': yield s.expr; break;
    case 'If': case 'While': yield s.cond; break;
    case 'For': if (s.cond) yield s.cond; break;
    case 'Return': if (s.value) yield s.value; break;
  }
}

function* subExprs(e: Expr): Generator<Expr> {
  yield e;
  switch (e.kind) {
    case 'Unary': yield* subExprs(e.operand); break;
    case 'Binary': yield* subExprs(e.left); yield* subExprs(e.right); break;
    case 'Call': for (const a of e.args) yield* subExprs(a); break;
  }
}

export function declares(program: Program, name: string, type: DeclType): boolean {
  for (const s of statements(program.main)) if (s.kind === 'VarDecl' && s.name === name && s.varType === type) return true;
  return false;
}

export function callsOf(program: Program, fn: string): Call[] {
  const calls: Call[] = [];
  for (const s of statements(program.main)) {
    for (const root of rootExprs(s)) for (const e of subExprs(root)) if (e.kind === 'Call' && e.callee === fn) calls.push(e);
  }
  return calls;
}

export function argIsVar(call: Call | undefined, index: number, name: string): boolean {
  const arg = call?.args[index];
  return arg?.kind === 'Var' && arg.name === name;
}
