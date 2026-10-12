import type { Program } from '../lang/ast';
import { compile } from '../lang/compile';
import { LangError, type Diagnostic } from '../lang/diagnostics';
import { Interpreter, type ExecEvent, type VariableView, type Yielded } from '../lang/interpreter';
import type { DrawCommand } from './drawList';
import { NO_INPUT, type InputState } from './input';
import { RaylibHost } from './raylib';

export type FrameResult =
  | { status: 'frame'; drawList: DrawCommand[] }
  | { status: 'finished' }
  | { status: 'error'; diagnostic: Diagnostic };

export class Machine {
  private readonly interpreter: Interpreter;
  private readonly steps: Generator<Yielded, void, void>;
  private finished = false;

  constructor(program: Program, readonly host: RaylibHost, onEvent?: (e: ExecEvent) => void) {
    this.interpreter = new Interpreter(program, host, onEvent);
    this.steps = this.interpreter.run();
  }

  get done(): boolean {
    return this.finished;
  }

  /** Runs the program until the next EndDrawing() (or until it ends or fails). */
  runFrame(input: InputState = NO_INPUT): FrameResult {
    if (this.finished) return { status: 'finished' };
    this.host.setInput(input);
    try {
      for (;;) {
        const r = this.steps.next();
        if (r.done) {
          this.finished = true;
          return { status: 'finished' };
        }
        if (r.value.kind === 'frame') return { status: 'frame', drawList: this.host.lastFrame };
      }
    } catch (e) {
      this.finished = true;
      if (e instanceof LangError) return { status: 'error', diagnostic: e.diagnostic };
      console.error(e);
      const line = this.interpreter.currentLine;
      return { status: 'error', diagnostic: { code: 'INTERNAL_ERROR', params: {}, line, col: 1, severity: 'error' } };
    }
  }

  /** Makes WindowShouldClose() return true from now on. */
  requestClose(): void {
    this.host.closeRequested = true;
  }

  variables(): VariableView[] {
    return this.interpreter.variables();
  }
}

export interface HeadlessOptions {
  frames: number;
  input?: (frame: number) => InputState;
  seed?: number;
}

export interface HeadlessResult {
  frames: DrawCommand[][];
  status: 'running' | 'finished' | 'error';
  diagnostic?: Diagnostic;
  machine?: Machine;
}

export function runHeadless(source: string, opts: HeadlessOptions): HeadlessResult {
  const host = new RaylibHost({ seed: opts.seed ?? 1 });
  const compiled = compile(source, host);
  if (!compiled.ok) return { frames: [], status: 'error', diagnostic: compiled.diagnostic };
  const machine = new Machine(compiled.program, host);
  const frames: DrawCommand[][] = [];
  for (let i = 0; i < opts.frames; i++) {
    const r = machine.runFrame(opts.input?.(i) ?? NO_INPUT);
    if (r.status === 'frame') { frames.push(r.drawList); continue; }
    if (r.status === 'error') return { frames, status: 'error', diagnostic: r.diagnostic, machine };
    return { frames, status: 'finished', machine };
  }
  return { frames, status: 'running', machine };
}
