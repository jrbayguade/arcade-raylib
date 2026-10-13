<script lang="ts">
  import { prefersReducedMotion } from './motion';

  // The ball runs to the wall; when it touches it, velX flips its sign and the ball comes back.
  const still = prefersReducedMotion();
  let x = $state(still ? 560 : 180);
  let vel = $state(4);
  let flipped = $state(false);
  $effect(() => {
    if (still) return;
    const timer = setInterval(() => {
      x += vel * 4;
      if (x > 680) { vel = -vel; flipped = true; setTimeout(() => (flipped = false), 900); }
      if (x < 140) { vel = -vel; flipped = true; setTimeout(() => (flipped = false), 900); }
    }, 50);
    return () => clearInterval(timer);
  });
</script>

<svg viewBox="0 0 800 450" class="bounce-card" role="img" aria-label="velX = -velX">
  <rect x="100" y="40" width="620" height="200" class="card-screen" />
  <circle cx={x} cy="140" r="16" class="ball" />
  <text x={x} y={vel > 0 ? 100 : 100} class="arrow">{vel > 0 ? '→' : '←'}</text>
  <g transform="translate(180 280)">
    <rect width="220" height="120" rx="14" class="var-box" />
    <text x="110" y="-10" class="box-name">velX</text>
    {#key vel}<text x="110" y="82" class="box-value">{vel}</text>{/key}
  </g>
  <text x="450" y="350" class="code" class:on={flipped}>velX = -velX;</text>
</svg>
