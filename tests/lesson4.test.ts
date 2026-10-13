import { describe, expect, it } from 'vitest';
import { lesson3 } from '../content/pong/03-if/lesson';
import { evaluate } from '../src/lessons/checks';
import type { ExerciseStep } from '../src/lessons/model';
import { parseLessonSource, replaceZone } from '../src/lessons/source';

const step = (id: string) => lesson3.steps.find((s) => s.id === id) as ExerciseStep;
const tryZone = (id: string, zone: string) => {
  const s = step(id);
  return evaluate(replaceZone(parseLessonSource(s.source), zone), s.checks, s.run);
};
const firstFailing = (r: ReturnType<typeof evaluate>) => (r.kind === 'checked' ? r.results.find((c) => !c.ok)?.key : r.kind);
const W = '        if (IsKeyDown(KEY_W)) { palaY = palaY - 6; }';
const S = '        if (IsKeyDown(KEY_S)) { palaY = palaY + 6; }';

describe('lesson 4: the paddle obeys', () => {
  it('is lesson 4 with an if card, and every exercise names its keys', () => {
    expect(lesson3.number).toBe(4);
    expect(lesson3.steps[1]).toMatchObject({ kind: 'explain', card: 'if' });
    for (const s of lesson3.steps) if (s.kind !== 'explain') expect(s.controls?.length).toBeGreaterThan(0);
  });
  it('keyW: a jump, a change outside the if, or a crawl are each explained', () => {
    expect(firstFailing(tryZone('keyW', '        if (IsKeyDown(KEY_W)) { palaY = 100; }'))).toBe('addsEveryFrame');
    expect(firstFailing(tryZone('keyW', '        palaY = palaY - 6;'))).toBe('stillWithoutKey');
    expect(firstFailing(tryZone('keyW', '        if (IsKeyDown(KEY_W)) { palaY = palaY - 1; }'))).toBe('faster');
    expect(tryZone('keyW', '        if (IsKeyDown(KEY_W)) { palaY -= 8; }')).toMatchObject({ passed: true });
  });
  it('keyW: forgetting the braces or the brackets is a compile error, not a silent failure', () => {
    expect(tryZone('keyW', '        if IsKeyDown(KEY_W) { palaY = palaY - 6; }').kind).toBe('compile-error');
    expect(tryZone('keyW', '        if (IsKeyDown(KEY_w)) { palaY = palaY - 6; }').kind).toBe('compile-error');
  });
  it('keyS: S must go down and W must keep going up', () => {
    expect(firstFailing(tryZone('keyS', W + '\n        if (IsKeyDown(KEY_S)) { palaY = palaY - 6; }'))).toBe('sMovesDown');
    expect(firstFailing(tryZone('keyS', '        if (IsKeyDown(KEY_W)) { palaY = palaY + 6; }\n' + S))).toBe('wStillUp');
  });
  it('right: mixing the paddles is explained', () => {
    const mixed = `${W}\n${S}\n        if (IsKeyDown(KEY_UP)) { palaDretaY = palaDretaY - 6; }\n        if (IsKeyDown(KEY_DOWN)) { palaDretaY = palaDretaY + 6; }\n        if (IsKeyDown(KEY_W)) { palaDretaY = palaDretaY - 6; }`;
    expect(firstFailing(tryZone('right', mixed))).toBe('keysStayApart');
  });
  it('space: the reset must sit inside the if', () => {
    expect(firstFailing(tryZone('space', '        pilotaX = 400;'))).toBe('ballStillMoves');
  });
});
