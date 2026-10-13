import { describe, expect, it } from 'vitest';
import { lesson6 } from '../content/pong/06-xoc/lesson';
import { evaluate } from '../src/lessons/checks';
import type { ExerciseStep } from '../src/lessons/model';
import { parseLessonSource, replaceZone } from '../src/lessons/source';

const step = (id: string) => lesson6.steps.find((s) => s.id === id) as ExerciseStep;
const tryZone = (id: string, zone: string) => {
  const s = step(id);
  return evaluate(replaceZone(parseLessonSource(s.source), zone), s.checks, s.run);
};
const firstFailing = (r: ReturnType<typeof evaluate>) => (r.kind === 'checked' ? r.results.find((c) => !c.ok)?.key : r.kind);
const LEFT = '        if (pilotaX < 38 && pilotaY > palaY && pilotaY < palaY + alcada) { velX = -velX; }';

describe('lesson 7: hitting the paddle', () => {
  it('is lesson 7 with an and card', () => {
    expect(lesson6.number).toBe(7);
    expect(lesson6.steps[1]).toMatchObject({ kind: 'explain', card: 'and' });
  });
  it('partial: || instead of && or a missing part are caught', () => {
    expect(firstFailing(tryZone('partial', '        if (pilotaX < 38) { velX = -velX; }'))).toBe('missesAbove');
    expect(tryZone('partial', '        if (pilotaX < 38 && pilotaY > palaY && pilotaY <= palaY + 80) { velX = -velX; }')).toMatchObject({ passed: true });
  });
  it('right: using the left paddle name is caught', () => {
    const wrong = `${LEFT}\n        if (pilotaX > 762 && pilotaY > palaY && pilotaY < palaY + alcada) { velX = -velX; }`;
    expect(firstFailing(tryZone('right', wrong))).toBe('rightMissesAbove');
  });
  it('angles: only one half is not enough', () => {
    const right = '        if (pilotaX > 762 && pilotaY > palaDretaY && pilotaY < palaDretaY + alcada) { velX = -velX; }';
    const top = '        if (pilotaX < 38 && pilotaY > palaY && pilotaY < palaY + 40) { velY = -3; }';
    expect(firstFailing(tryZone('angles', `${LEFT}\n${right}\n${top}`))).toBe('bottomHalfDown');
  });
});
