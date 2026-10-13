<script lang="ts">
  import { onMount } from 'svelte';
  import { H, PAD, W, newMiniPong, stepMiniPong } from './miniPong';

  /** A real little Pong match for the intro: the paddles go where the ball arrives and it bounces off them. */
  const game = newMiniPong(Math.floor(Math.random() * 1000));
  let s = $state({ ...game });

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = performance.now();
    let pending = 0;
    let raf = 0;
    const frame = (now: number) => {
      pending = Math.min(pending + (now - last), 200);
      last = now;
      while (pending >= 1000 / 60) { stepMiniPong(game); pending -= 1000 / 60; }
      s = { ...game };
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });
</script>

<svg class="mini-pong" viewBox="0 0 {W} {H}" aria-hidden="true">
  <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="#333" stroke-width="1" stroke-dasharray="4 4" />
  <rect x={PAD.x - PAD.w} y={s.left - PAD.h / 2} width={PAD.w} height={PAD.h} fill="#fff" />
  <rect x={W - PAD.x} y={s.right - PAD.h / 2} width={PAD.w} height={PAD.h} fill="#fff" />
  <circle cx={s.x} cy={s.y} r={s.r} fill="#fdf900" />
</svg>
