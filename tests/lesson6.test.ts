import { describe, expect, it } from 'vitest';
import { lesson5 } from '../content/pong/05-rebots/lesson';
import { evaluate } from '../src/lessons/checks';
import type { ExerciseStep } from '../src/lessons/model';
import { parseLessonSource, replaceZone } from '../src/lessons/source';

const step = (id: string) => lesson5.steps.find((s) => s.id === id) as ExerciseStep;
const tryZone = (id: string, zone: string) => {
  const s = step(id);
  return evaluate(replaceZone(parseLessonSource(s.source), zone), s.checks, s.run);
};
const firstFailing = (r: ReturnType<typeof evaluate>) => (r.kind === 'checked' ? r.results.find((c) => !c.ok)?.key : r.kind);
const R = '        if (pilotaX > 792) { velX = -velX; }';
const L = '        if (pilotaX < 8) { velX = -velX; }';

describe('lesson 6: bounces', () => {
  it('is lesson 6 with a bounce card', () => {
    expect(lesson5.number).toBe(6);
    expect(lesson5.steps[1]).toMatchObject({ kind: 'explain', card: 'bounce' });
  });
  it('edge: >= also works, a stop instead of a flip does not', () => {
    expect(tryZone('edge', '        if (pilotaX >= 792) { velX = -velX; }')).toMatchObject({ passed: true });
    expect(firstFailing(tryZone('edge', '        if (pilotaX > 792) { velX = 0; }'))).toBe('bounces');
  });
  it('left: the wrong comparison lets the ball escape', () => {
    expect(firstFailing(tryZone('left', `${R}\n        if (pilotaX > 8) { velX = -velX; }`))).not.toBeUndefined();
  });
  it('updown: one wall is not enough', () => {
    expect(firstFailing(tryZone('updown', `${R}\n${L}\n        if (pilotaY > 442) { velY = -velY; }`))).toBe('allWalls');
  });
  it('faster: + 1 slows the ball instead, - 2 is fine', () => {
    const rest = `\n${L}\n        if (pilotaY < 8) { velY = -velY; }\n        if (pilotaY > 442) { velY = -velY; }`;
    expect(tryZone('faster', '        if (pilotaX > 792) { velX = -velX - 2; }' + rest)).toMatchObject({ passed: true });
    expect(firstFailing(tryZone('faster', '        if (pilotaX > 792) { velX = -velX + 1; }' + rest))).toBe('speedsUp');
  });
});
