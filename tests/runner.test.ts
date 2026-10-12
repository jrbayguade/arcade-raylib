import { describe, expect, it } from 'vitest';
import pong from '../content/demo/pong.c?raw';
import { Runner, type RunnerStatus, type Scheduler } from '../src/demo/runner';
import { NO_INPUT } from '../src/runtime/input';
import type { DrawCommand } from '../src/runtime/drawList';

class FakeScheduler implements Scheduler {
  private callbacks = new Map<number, (now: number) => void>();
  private nextId = 1;
  request(cb: (now: number) => void): number {
    const id = this.nextId++;
    this.callbacks.set(id, cb);
    return id;
  }
  cancel(id: number): void {
    this.callbacks.delete(id);
  }
  get pending(): number {
    return this.callbacks.size;
  }
  fire(now: number): void {
    const cbs = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const cb of cbs) cb(now);
  }
}

function setup() {
  const scheduler = new FakeScheduler();
  const statuses: RunnerStatus[] = [];
  const frames: DrawCommand[][] = [];
  const runner = new Runner({
    scheduler,
    input: { snapshot: () => NO_INPUT },
    onFrame: (drawList) => frames.push(drawList),
    onStatus: (s) => statuses.push(s),
    seed: 1,
  });
  return { scheduler, statuses, frames, runner };
}

describe('Runner', () => {
  it('reports compile errors without starting a loop', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start('int main(void) { int x = 5 }');
    expect(statuses).toMatchObject([{ kind: 'error', diagnostic: { code: 'MISSING_SEMICOLON' } }]);
    expect(scheduler.pending).toBe(0);
    expect(runner.running).toBe(false);
  });

  it('draws about 60 frames per second', () => {
    const { runner, scheduler, frames, statuses } = setup();
    runner.start(pong);
    for (let i = 0; i <= 60; i++) scheduler.fire((i * 1000) / 60);
    expect(statuses).toEqual([{ kind: 'running' }]);
    expect(frames.length).toBeGreaterThanOrEqual(59);
    expect(frames.length).toBeLessThanOrEqual(61);
  });

  it('never runs two loops at once when started twice', () => {
    const { runner, scheduler } = setup();
    runner.start(pong);
    runner.start(pong);
    expect(scheduler.pending).toBe(1);
  });

  it('stops', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start(pong);
    runner.stop();
    expect(scheduler.pending).toBe(0);
    expect(runner.running).toBe(false);
    expect(statuses.at(-1)).toEqual({ kind: 'stopped' });
  });

  it('reports when the program ends', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start('int main(void) { return 0; }');
    scheduler.fire(0);
    expect(statuses).toEqual([{ kind: 'running' }, { kind: 'finished' }]);
    expect(scheduler.pending).toBe(0);
  });

  it('reports runtime errors', () => {
    const { runner, scheduler, statuses } = setup();
    runner.start('int main(void) {\nint z = 0;\nint x = 5 / z;\nreturn 0;\n}');
    scheduler.fire(0);
    expect(statuses.at(-1)).toMatchObject({ kind: 'error', diagnostic: { code: 'DIVISION_BY_ZERO', line: 3 } });
  });
});
