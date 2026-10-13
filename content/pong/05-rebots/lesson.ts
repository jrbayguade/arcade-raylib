import { check, simulate, variable, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import edge from './edge.c?raw';
import edgeSolution from './edge.solution.c?raw';
import faster from './faster.c?raw';
import fasterSolution from './faster.solution.c?raw';
import left from './left.c?raw';
import leftSolution from './left.solution.c?raw';
import updown from './updown.c?raw';
import updownSolution from './updown.solution.c?raw';

const v = (ctx: CheckContext | null, name: string) => (ctx ? variable(ctx, name) ?? NaN : NaN);
const at = (ctx: CheckContext, frames: number) => simulate(ctx, { frames });
const CONTROLS = ['KEY_W', 'KEY_S', 'KEY_UP', 'KEY_DOWN'];
/** The ball stays on screen at many moments of a long game. */
const staysInside = (ctx: CheckContext, slack = 0) => [50, 100, 150, 200, 250, 300, 350, 400].every((f) => {
  const s = at(ctx, f);
  return v(s, 'pilotaX') >= -slack && v(s, 'pilotaX') <= 800 + slack && (Number.isNaN(v(s, 'pilotaY')) || (v(s, 'pilotaY') >= 0 && v(s, 'pilotaY') <= 450));
});

export const lesson5: Lesson = {
  id: 'pong-5',
  number: 6,
  machine: 'PONG',
  texts,
  steps: [
    {
      kind: 'observe', id: 'edge', source: edge, solution: edgeSolution, showVariables: true, run: { frames: 120 }, controls: CONTROLS,
      checks: [
        check('bounces', (ctx) => v(ctx, 'velX') < 0),
        check('bouncesAtEdge', (ctx) => v(at(ctx, 101), 'pilotaX') <= 796),
      ],
    },
    { kind: 'explain', id: 'bounceCard', card: 'bounce' },
    {
      kind: 'practice', id: 'left', source: left, solution: leftSolution, showVariables: true, run: { frames: 120 }, controls: CONTROLS,
      checks: [
        check('bouncesLeft', (ctx) => v(ctx, 'velX') > 0 && v(ctx, 'pilotaX') >= 0),
        check('bothWalls', (ctx) => staysInside(ctx)),
      ],
    },
    {
      kind: 'practice', id: 'updown', source: updown, solution: updownSolution, showVariables: true, run: { frames: 100 }, controls: CONTROLS,
      checks: [
        check('bouncesBottom', (ctx) => v(ctx, 'velY') < 0 && v(ctx, 'pilotaY') <= 450),
        check('allWalls', (ctx) => staysInside(ctx)),
      ],
    },
    {
      kind: 'apply', id: 'faster', source: faster, solution: fasterSolution, showVariables: true, run: { frames: 300 }, controls: CONTROLS,
      checks: [
        check('speedsUp', (ctx) => Math.abs(v(ctx, 'velX')) > 4),
        check('notCrazy', (ctx) => Math.abs(v(ctx, 'velX')) <= 12),
        check('stillInside', (ctx) => staysInside(ctx, 20)),
      ],
    },
  ],
};
