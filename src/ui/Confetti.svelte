<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from './motion';
  import { burst, stepParticles, type Particle } from './particles';

  /** Every time `trigger` grows, a burst of neon confetti shoots up from `origin()` (screen coordinates). */
  let { trigger, origin }: { trigger: number; origin: () => { x: number; y: number } } = $props();

  let canvas: HTMLCanvasElement;
  let particles: Particle[] = [];
  let raf = 0;
  let last = 0;
  let active = $state(false);

  function frame(now: number): void {
    const ctx = canvas.getContext('2d')!;
    particles = stepParticles(particles, Math.min(now - last, 50));
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    if (particles.length > 0) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = 0;
      active = false;
    }
  }

  $effect(() => {
    if (trigger === 0 || prefersReducedMotion()) return;
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    particles = [...particles, ...burst(140, origin())];
    active = true;
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });

  onMount(() => () => cancelAnimationFrame(raf));
</script>

<canvas bind:this={canvas} class="confetti" data-active={active} aria-hidden="true"></canvas>
