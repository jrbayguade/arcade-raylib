export interface Route { lesson: number; step: number }

export function parseRoute(hash: string, lessonCount: number): Route {
  const m = /^#\/pong\/(\d+)(?:\/(\d+))?$/.exec(hash);
  if (!m) return { lesson: 0, step: 0 };
  return { lesson: Math.min(Number(m[1]), lessonCount - 1), step: Number(m[2] ?? 0) };
}

export function routeHash(route: Route): string {
  return `#/pong/${route.lesson}/${route.step}`;
}

export const HALL_HASH = '#/sala';

/** The arcade hall: its own hash, or the bare address (the intro, shown first on a first visit, takes precedence). */
export function isHall(hash: string): boolean {
  return hash === HALL_HASH || hash === '' || hash === '#' || hash === '#/';
}
