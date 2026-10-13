/** The little Pong match in the intro: two paddles that read where the ball will arrive and go there,
 *  so every bounce really happens on a paddle (the drawing lives in MiniPong.svelte). */

export const W = 160;
export const H = 90;
/** x is the paddle's inner face measured from its own side; y in the state is the paddle's centre. */
export const PAD = { x: 10, w: 4, h: 22, speed: 1.6 };
const SPEED_X = 1.5;

export interface MiniPong { x: number; y: number; vx: number; vy: number; r: number; left: number; right: number; aim: number; seed: number }

function random(s: MiniPong): number {
  s.seed = (s.seed * 1664525 + 1013904223) % 4294967296;
  return s.seed / 4294967296;
}

export function newMiniPong(seed = 1): MiniPong {
  const s: MiniPong = { x: W / 2, y: H / 3, vx: SPEED_X, vy: 0.7, r: 2.5, left: H / 2, right: H / 2, aim: 0, seed };
  s.aim = (random(s) - 0.5) * PAD.h * 0.7;
  return s;
}

/** Where the ball will cross the line x, bouncing off the top and bottom walls on the way. */
function arrival(s: MiniPong, x: number): number {
  const t = (x - s.x) / s.vx;
  const span = H - 2 * s.r;
  let y = (s.y - s.r + s.vy * t) % (2 * span);
  if (y < 0) y += 2 * span;
  return s.r + (y > span ? 2 * span - y : y);
}

const clampPad = (y: number) => Math.min(H - PAD.h / 2, Math.max(PAD.h / 2, y));
const toward = (from: number, to: number) => from + Math.max(-PAD.speed, Math.min(PAD.speed, to - from));

export function stepMiniPong(s: MiniPong): void {
  const leftFace = PAD.x + s.r;
  const rightFace = W - PAD.x - s.r;
  // The paddle the ball goes to chases its arrival point (a bit off-centre, so the bounces vary); the other one rests.
  if (s.vx < 0) {
    s.left = clampPad(toward(s.left, arrival(s, leftFace) + s.aim));
    s.right = toward(s.right, H / 2);
  } else {
    s.right = clampPad(toward(s.right, arrival(s, rightFace) + s.aim));
    s.left = toward(s.left, H / 2);
  }

  s.x += s.vx;
  s.y += s.vy;
  if (s.y < s.r) { s.y = 2 * s.r - s.y; s.vy = -s.vy; }
  if (s.y > H - s.r) { s.y = 2 * (H - s.r) - s.y; s.vy = -s.vy; }

  const hit = (pad: number) => {
    // Like the real game: the further from the paddle's centre, the steeper the ball leaves.
    const off = (s.y - pad) / (PAD.h / 2);
    const vy = Math.max(-1.2, Math.min(1.2, off * 1.2));
    s.vy = Math.abs(vy) < 0.3 ? (vy < 0 ? -0.3 : 0.3) : vy;
    s.vx = -s.vx;
    s.aim = (random(s) - 0.5) * PAD.h * 0.7;
  };
  if (s.vx < 0 && s.x <= leftFace) { s.x = 2 * leftFace - s.x; hit(s.left); }
  if (s.vx > 0 && s.x >= rightFace) { s.x = 2 * rightFace - s.x; hit(s.right); }
}
