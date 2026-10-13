import { describe, expect, it } from 'vitest';
import pong from '../content/demo/pong.c?raw';
import { Runner, type RunnerStatus, type Scheduler } from '../src/runtime/runner';
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

  it('exposes the variables of the running program', () => {
    const { runner, scheduler } = setup();
    expect(runner.variables()).toEqual([]);
    runner.start(pong);
    scheduler.fire(0);
    expect(runner.variables().map((v) => v.name)).toContain('palaEsquerraY');
    runner.stop();
    expect(runner.variables()).toEqual([]);
  });
  it('counts frames from each start', () => {
    const { runner, scheduler } = setup();
    runner.start(pong);
    for (let i = 0; i <= 30; i++) scheduler.fire((i * 1000) / 60);
    expect(runner.frameCount).toBeGreaterThanOrEqual(29);
    runner.start(pong);
    expect(runner.frameCount).toBe(0);
  });

  it('does not count the call that finishes the program', () => {
    const { runner, scheduler } = setup();
    runner.start('int main(void) { return 0; }');
    scheduler.fire(0);
    expect(runner.frameCount).toBe(0);
  });

  it('runs slowly when asked, also after a restart', () => {
    const { runner, scheduler, frames } = setup();
    runner.setSlow(true);
    runner.start(pong);
    for (let i = 0; i <= 60; i++) scheduler.fire((i * 1000) / 60);
    expect(frames.length).toBeLessThanOrEqual(4);
    runner.setSlow(false);
    const before = frames.length;
    for (let i = 61; i <= 121; i++) scheduler.fire((i * 1000) / 60);
    expect(frames.length - before).toBeGreaterThanOrEqual(55);
  });

  it('can switch speed while nothing runs', () => {
    const { runner } = setup();
    expect(() => runner.setSlow(true)).not.toThrow();
  });
});
