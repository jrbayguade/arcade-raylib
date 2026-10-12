/** True when the user asked the system for less animation: text then appears at once and there is no confetti. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Same condition as the "rotate your phone" overlay in app.css: keep the two in sync. */
export const ROTATE_QUERY = '(orientation: portrait) and (pointer: coarse)';

/** While the rotate overlay covers the screen, Bit must not keep talking underneath it. */
export function rotateRequired(): boolean {
  return typeof matchMedia === 'function' && matchMedia(ROTATE_QUERY).matches;
}
