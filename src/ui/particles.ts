export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining life in ms. */
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const NEON = ['#39f3ff', '#ff3ea5', '#ffe14d', '#7dff9a', '#b18cff'];
const GRAVITY = 900; // px/s²

/** A fan of confetti shooting up from `origin`. */
export function burst(count: number, origin: { x: number; y: number }, random: () => number = Math.random): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (random() - 0.5) * Math.PI * 0.9;
    const speed = 300 + random() * 450;
    const life = 1100 + random() * 800;
    return {
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: 4 + random() * 5,
      color: NEON[Math.floor(random() * NEON.length)],
    };
  });
}

export function stepParticles(particles: Particle[], dtMs: number): Particle[] {
  const dt = dtMs / 1000;
  return particles
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + GRAVITY * dt, life: p.life - dtMs }))
    .filter((p) => p.life > 0);
}
