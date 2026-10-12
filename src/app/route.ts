export interface Route { lesson: number; step: number }

export function parseRoute(hash: string, lessonCount: number): Route {
  const m = /^#\/pong\/(\d+)(?:\/(\d+))?$/.exec(hash);
  if (!m) return { lesson: 0, step: 0 };
  return { lesson: Math.min(Number(m[1]), lessonCount - 1), step: Number(m[2] ?? 0) };
}

export function routeHash(route: Route): string {
  return `#/pong/${route.lesson}/${route.step}`;
}
