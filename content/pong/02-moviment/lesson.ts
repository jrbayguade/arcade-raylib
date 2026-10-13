import { check, declares, variable, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import crawl from './crawl.c?raw';
import crawlSolution from './crawl.solution.c?raw';
import diagonal from './diagonal.c?raw';
import diagonalSolution from './diagonal.solution.c?raw';
import left from './left.c?raw';
import leftSolution from './left.solution.c?raw';
import speed from './speed.c?raw';
import speedSolution from './speed.solution.c?raw';

/** Checks run 30 frames; the ball starts at (400, 225). */
const FRAMES = 30;
const run = { frames: FRAMES };
const x = (ctx: CheckContext) => variable(ctx, 'pilotaX') ?? 400;
const y = (ctx: CheckContext) => variable(ctx, 'pilotaY') ?? 225;
const velX = (ctx: CheckContext) => variable(ctx, 'velX') ?? 0;
/** Adding the same amount every frame moves a whole number of pixels × 30; `pilotaX = 3;` jumps once and stays. */
const addsEveryFrame = (moved: number) => moved % FRAMES === 0;

export const lesson2: Lesson = {
  id: 'pong-2',
  number: 3,
  machine: 'PONG',
  slowMotion: true,
  texts,
  steps: [
    {
      kind: 'observe', id: 'crawl', source: crawl, solution: crawlSolution, showVariables: true, run,
      checks: [
        check('adds', (ctx) => addsEveryFrame(x(ctx) - 400)),
        check('faster', (ctx) => x(ctx) >= 400 + FRAMES * 2),
        check('notTooFast', (ctx) => x(ctx) <= 400 + FRAMES * 20),
      ],
    },
    { kind: 'explain', id: 'frames', card: 'frames' },
    {
      kind: 'practice', id: 'diagonal', source: diagonal, solution: diagonalSolution, showVariables: true, run,
      checks: [
        check('yMoves', (ctx) => y(ctx) > 225),
        check('addsY', (ctx) => addsEveryFrame(y(ctx) - 225)),
        check('xStillMoves', (ctx) => x(ctx) === 400 + FRAMES * 3),
      ],
    },
    {
      kind: 'practice', id: 'left', source: left, solution: leftSolution, showVariables: true, run,
      checks: [
        check('adds', (ctx) => addsEveryFrame(x(ctx) - 400)),
        check('goesLeft', (ctx) => x(ctx) <= 400 - FRAMES),
      ],
    },
    {
      kind: 'apply', id: 'speed', source: speed, solution: speedSolution, showVariables: true, run,
      checks: [
        check('declaresSpeed', (ctx) => declares(ctx.program, 'velX', 'int')),
        check('speedNotZero', (ctx) => velX(ctx) !== 0),
        check('speedNotTooFast', (ctx) => Math.abs(velX(ctx)) <= 20),
        check('usesSpeed', (ctx) => x(ctx) === 400 + FRAMES * velX(ctx)),
      ],
    },
  ],
};
