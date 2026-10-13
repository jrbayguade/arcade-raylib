import { describe, expect, it } from 'vitest';
import { lesson2 } from '../content/pong/02-moviment/lesson';
import { evaluate } from '../src/lessons/checks';
import { isExercise, type ExerciseStep } from '../src/lessons/model';
import { parseLessonSource, replaceZone } from '../src/lessons/source';

const step = (id: string) => lesson2.steps.find((s) => s.id === id) as ExerciseStep;
/** Runs the start file of a step with its zone replaced by `zone`. */
function tryZone(id: string, zone: string) {
  const s = step(id);
  return evaluate(replaceZone(parseLessonSource(s.source), zone), s.checks, s.run);
}
const firstFailing = (r: ReturnType<typeof evaluate>) => (r.kind === 'checked' ? r.results.find((c) => !c.ok)?.key : r.kind);

describe('lesson 3: the ball moves', () => {
  it('is lesson number 3, with a frames card', () => {
    expect(lesson2.number).toBe(3);
    expect(lesson2.steps.map((s) => s.id)).toEqual(['crawl', 'frames', 'diagonal', 'left', 'speed']);
    expect(lesson2.steps[1]).toMatchObject({ kind: 'explain', card: 'frames' });
    for (const s of lesson2.steps.filter(isExercise)) expect(s.run).toEqual({ frames: 30 });
  });

  it('crawl: storing a number instead of adding it is caught', () => {
    expect(firstFailing(tryZone('crawl', '        pilotaX = 3;'))).toBe('adds');
    expect(firstFailing(tryZone('crawl', '        pilotaX =+ 3;'))).toBe('adds');
  });

  it('crawl: ++ is too slow, += works', () => {
    expect(firstFailing(tryZone('crawl', '        pilotaX++;'))).toBe('faster');
    expect(tryZone('crawl', '        pilotaX += 5;')).toMatchObject({ passed: true });
  });

  it('crawl: too fast to see is not accepted', () => {
    expect(firstFailing(tryZone('crawl', '        pilotaX = pilotaX + 50;'))).toBe('notTooFast');
  });

  it('crawl: a calculation that is not stored is explained', () => {
    expect(tryZone('crawl', '        pilotaX + 3;')).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'VALUE_NOT_STORED' } });
  });

  it('crawl: a new box inside the loop is explained', () => {
    expect(tryZone('crawl', '        int pilotaX = pilotaX + 3;')).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'ALREADY_DECLARED' } });
  });

  it('crawl: a missing semicolon points at the yellow line', () => {
    const src = parseLessonSource(step('crawl').source);
    const zoneLine = src.code.slice(0, src.editable.from).split('\n').length;
    expect(tryZone('crawl', '        pilotaX = pilotaX + 3')).toMatchObject({ kind: 'compile-error', diagnostic: { code: 'MISSING_SEMICOLON', line: zoneLine } });
  });

  it('diagonal: the ball must also keep going right', () => {
    expect(firstFailing(tryZone('diagonal', '        pilotaY = pilotaY + 2;'))).toBe('xStillMoves');
    expect(tryZone('diagonal', '        pilotaX = pilotaX + 3;\n        pilotaY = pilotaY + 5;')).toMatchObject({ passed: true });
    expect(tryZone('diagonal', '        pilotaX = pilotaX + 3;\n        pilotaY++;')).toMatchObject({ passed: true });
    expect(firstFailing(tryZone('diagonal', '        pilotaX = pilotaX + 3;\n        pilotaY = 300;'))).toBe('addsY');
  });

  it('left: any leftward speed works, a jump does not', () => {
    expect(tryZone('left', '        pilotaX = pilotaX - 1;')).toMatchObject({ passed: true });
    expect(tryZone('left', '        pilotaX -= 3;')).toMatchObject({ passed: true });
    expect(firstFailing(tryZone('left', '        pilotaX = pilotaX + 0;'))).toBe('goesLeft');
    expect(firstFailing(tryZone('left', '        pilotaX = 3;'))).toBe('adds');
  });

  it('speed: velX must exist, be non-zero, not too big, and move the ball', () => {
    expect(firstFailing(tryZone('speed', '    int velX = 0;'))).toBe('speedNotZero');
    expect(firstFailing(tryZone('speed', '    int velX = 1000;'))).toBe('speedNotTooFast');
    expect(firstFailing(tryZone('speed', '    int velX = 100000000;'))).toBe('speedNotTooFast');
    expect(tryZone('speed', '    int velX = -4;')).toMatchObject({ passed: true });
  });
});
