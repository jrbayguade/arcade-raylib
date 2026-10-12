/** True when the user asked the system for less animation: text then appears at once and there is no confetti. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
