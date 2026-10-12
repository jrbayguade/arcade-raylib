import { describe, expect, it } from 'vitest';
import { SOUNDS, SoundBoard, type AudioLike } from '../src/ui/sound';

function fakeAudio() {
  const started: { type: string; freq: number; at: number }[] = [];
  const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const ctx: AudioLike = {
    currentTime: 10,
    destination: {},
    state: 'running',
    resume: async () => {},
    createOscillator() {
      const osc = {
        type: 'square' as OscillatorType,
        frequency: { ...param(), value: 0, setValueAtTime(v: number) { osc.frequency.value = v; } },
        connect() { return undefined; },
        start(at: number) { started.push({ type: osc.type, freq: osc.frequency.value, at }); },
        stop() {},
      };
      return osc;
    },
    createGain() {
      return { gain: param(), connect() { return undefined; } };
    },
  };
  return { ctx, started };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; }, data };
}

describe('SoundBoard', () => {
  it('stays silent until the first user interaction unlocks it', () => {
    const { ctx, started } = fakeAudio();
    const board = new SoundBoard(() => ctx, memoryStorage());
    expect(board.play('click')).toBe(false);
    board.unlock();
    expect(board.play('click')).toBe(true);
    expect(started).toHaveLength(1);
  });

  it('plays every note of a sound, in order', () => {
    const { ctx, started } = fakeAudio();
    const board = new SoundBoard(() => ctx, memoryStorage());
    board.unlock();
    board.play('success');
    expect(started).toHaveLength(SOUNDS.success.length);
    expect(started.map((s) => s.at)).toEqual([...started.map((s) => s.at)].sort((a, b) => a - b));
    expect(started[0].at).toBeGreaterThanOrEqual(10);
  });

  it('can shift the pitch (stars go up one by one)', () => {
    const { ctx, started } = fakeAudio();
    const board = new SoundBoard(() => ctx, memoryStorage());
    board.unlock();
    board.play('star', { pitch: 1 });
    board.play('star', { pitch: 1.5 });
    expect(started[1].freq).toBeCloseTo(started[0].freq * 1.5);
  });

  it('remembers being muted and plays nothing while muted', () => {
    const { ctx, started } = fakeAudio();
    const storage = memoryStorage();
    const board = new SoundBoard(() => ctx, storage);
    board.unlock();
    board.setMuted(true);
    expect(board.play('click')).toBe(false);
    expect(started).toHaveLength(0);
    expect(new SoundBoard(() => ctx, storage).muted).toBe(true);
    board.toggle();
    expect(board.muted).toBe(false);
    expect(storage.data['bitarcade:muted']).toBe('0');
  });

  it('works without audio support', () => {
    const board = new SoundBoard(() => null, null);
    board.unlock();
    expect(board.play('click')).toBe(false);
  });

  it('tells a listener what was played (used by the browser test)', () => {
    const { ctx } = fakeAudio();
    const heard: string[] = [];
    const board = new SoundBoard(() => ctx, memoryStorage());
    board.onPlay = (name) => heard.push(name);
    board.unlock();
    board.play('run');
    board.play('error');
    expect(heard).toEqual(['run', 'error']);
  });
});
