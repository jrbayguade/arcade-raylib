import { check, simulate, variable, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import angles from './angles.c?raw';
import anglesSolution from './angles.solution.c?raw';
import partial from './partial.c?raw';
import partialSolution from './partial.solution.c?raw';
import right from './right.c?raw';
import rightSolution from './right.solution.c?raw';

const v = (ctx: CheckContext | null, name: string) => (ctx ? variable(ctx, name) ?? NaN : NaN);
/** 120 frames: the ball (4 px per frame from x = 400) reaches a paddle at about frame 91. */
const RUN = { frames: 120 };
const holding = (ctx: CheckContext, key: string) => simulate(ctx, { ...RUN, hold: [key] });
const CONTROLS = ['KEY_W', 'KEY_S', 'KEY_UP', 'KEY_DOWN'];

export const lesson6: Lesson = {
  id: 'pong-6',
  number: 7,
  machine: 'PONG',
  texts,
  steps: [
    {
      kind: 'observe', id: 'partial', source: partial, solution: partialSolution, showVariables: true, run: RUN, controls: CONTROLS,
      checks: [
        check('bouncesOnPaddle', (ctx) => v(ctx, 'velX') > 0),
        check('missesAbove', (ctx) => v(holding(ctx, 'KEY_W'), 'pilotaX') < 0),
        check('missesBelow', (ctx) => v(holding(ctx, 'KEY_S'), 'pilotaX') < 0),
      ],
    },
    { kind: 'explain', id: 'andCard', card: 'and' },
    {
      kind: 'practice', id: 'right', source: right, solution: rightSolution, showVariables: true, run: RUN, controls: CONTROLS,
      checks: [
        check('bouncesOnRight', (ctx) => v(ctx, 'velX') < 0),
        check('rightMissesAbove', (ctx) => v(holding(ctx, 'KEY_UP'), 'pilotaX') > 800),
        check('rightMissesBelow', (ctx) => v(holding(ctx, 'KEY_DOWN'), 'pilotaX') > 800),
        check('leftStillWorks', (ctx) => { const x = v(simulate(ctx, { frames: 300 }), 'pilotaX'); return x >= 0 && x <= 800; }),
      ],
    },
    {
      kind: 'apply', id: 'angles', source: angles, solution: anglesSolution, showVariables: true, run: RUN, controls: CONTROLS,
      checks: [
        check('stillBounces', (ctx) => v(ctx, 'velX') > 0),
        check('topHalfUp', (ctx) => v(ctx, 'velY') < 0),
        check('bottomHalfDown', (ctx) => v(simulate(ctx, { ...RUN, hold: ['KEY_W'], holdFor: 3 }), 'velY') > 0),
      ],
    },
  ],
};
