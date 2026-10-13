import { compile } from '../lang/compile';
import type { Diagnostic } from '../lang/diagnostics';
import type { ExecEvent, VariableView } from '../lang/interpreter';
import type { DrawCommand } from './drawList';
import { FrameClock, SLOW_FPS } from './frameClock';
import type { InputState } from './input';
import { Machine } from './machine';
import { RaylibHost } from './raylib';

export interface Scheduler {
  request(cb: (now: number) => void): number;
  cancel(id: number): void;
}

export type RunnerStatus =
  | { kind: 'running' }
  | { kind: 'stopped' }
  | { kind: 'finished' }
  | { kind: 'error'; diagnostic: Diagnostic };

export interface RunnerDeps {
  scheduler: Scheduler;
  input: { snapshot(): InputState };
  onFrame(drawList: DrawCommand[], host: RaylibHost): void;
  onStatus(status: RunnerStatus): void;
  onEvent?(e: ExecEvent): void;
  seed?: number;
}

/** Compiles a program and drives it at 60 logic frames per second. */
export class Runner {
  private machine: Machine | null = null;
  private pending: number | null = null;
  private clock = new FrameClock();
  private slow = false;
  private frames = 0;

  constructor(private readonly deps: RunnerDeps) {}

  get running(): boolean {
    return this.machine !== null;
  }

  /** Variables visible right now in the running program (empty when nothing runs). */
  variables(): VariableView[] {
    return this.machine?.variables() ?? [];
  }

  /** Logic frames run since the last start (the "fotograma N" shown in slow motion). */
  get frameCount(): number {
    return this.frames;
  }

  setSlow(on: boolean): void {
    this.slow = on;
    this.clock.setFps(on ? SLOW_FPS : 60);
  }

  start(source: string): void {
    this.halt();
    const host = new RaylibHost({ seed: this.deps.seed });
    const compiled = compile(source, host);
    if (!compiled.ok) {
      this.deps.onStatus({ kind: 'error', diagnostic: compiled.diagnostic });
      return;
    }
    this.machine = new Machine(compiled.program, host, this.deps.onEvent);
    this.clock = new FrameClock();
    if (this.slow) this.clock.setFps(SLOW_FPS);
    this.frames = 0;
    this.deps.onStatus({ kind: 'running' });
    this.schedule();
  }

  stop(): void {
    const wasRunning = this.running;
    this.halt();
    if (wasRunning) this.deps.onStatus({ kind: 'stopped' });
  }

  private halt(): void {
    if (this.pending !== null) this.deps.scheduler.cancel(this.pending);
    this.pending = null;
    this.machine = null;
  }

  private schedule(): void {
    this.pending = this.deps.scheduler.request((now) => this.tick(now));
  }

  private tick(now: number): void {
    this.pending = null;
    const machine = this.machine;
    if (!machine) return;
    const due = this.clock.tick(now);
    let last: DrawCommand[] | null = null;
    for (let i = 0; i < due; i++) {
      const r = machine.runFrame(this.deps.input.snapshot());
      if (r.status === 'frame') { this.frames++; last = r.drawList; continue; }
      if (last) this.deps.onFrame(last, machine.host);
      this.machine = null;
      this.deps.onStatus(r.status === 'error' ? { kind: 'error', diagnostic: r.diagnostic } : { kind: 'finished' });
      return;
    }
    if (last) this.deps.onFrame(last, machine.host);
    this.schedule();
  }
}
