import { check, circles, visibleRects, type CheckContext } from '../../../src/lessons/checks';
import type { Lesson } from '../../../src/lessons/model';
import texts from './ca.json';
import ball from './ball.c?raw';
import ballSolution from './ball.solution.c?raw';
import floor from './floor.c?raw';
import floorSolution from './floor.solution.c?raw';
import observe from './observe.c?raw';
import observeSolution from './observe.solution.c?raw';
import order from './order.c?raw';
import orderSolution from './order.solution.c?raw';
import tall from './tall.c?raw';
import tallSolution from './tall.solution.c?raw';

const leftPaddle = (ctx: CheckContext) => visibleRects(ctx).find((r) => r.x === 20);

export const lesson0: Lesson = {
  id: 'pong-0',
  number: 1,
  machine: 'PONG',
  texts,
  steps: [
    {
      kind: 'observe', id: 'observe', source: observe, solution: observeSolution,
      checks: [check('paddleMoved', (ctx) => (leftPaddle(ctx)?.y ?? 185) !== 185)],
    },
    { kind: 'explain', id: 'grid', card: 'grid' },
    {
      kind: 'practice', id: 'floor', source: floor, solution: floorSolution,
      checks: [
        check('paddleOnFloor', (ctx) => { const y = leftPaddle(ctx)?.y ?? -1; return y >= 365 && y <= 370; }),
        check('paddleHeight80', (ctx) => leftPaddle(ctx)?.h === 80),
      ],
    },
    {
      kind: 'practice', id: 'tall', source: tall, solution: tallSolution,
      checks: [check('paddleTall', (ctx) => leftPaddle(ctx)?.h === 160)],
    },
    {
      kind: 'practice', id: 'order', source: order, solution: orderSolution,
      checks: [check('paddleVisible', (ctx) => ctx.frame.some((c) => c.op === 'clear') && leftPaddle(ctx) !== undefined)],
    },
    {
      kind: 'apply', id: 'ball', source: ball, solution: ballSolution,
      checks: [
        check('ballExists', (ctx) => circles(ctx).some((c) => c.r >= 3 && (c.color.r + c.color.g + c.color.b) > 0)),
        check('ballCentered', (ctx) => circles(ctx).some((c) => Math.hypot(c.x - 400, c.y - 225) <= 10)),
      ],
    },
  ],
};
