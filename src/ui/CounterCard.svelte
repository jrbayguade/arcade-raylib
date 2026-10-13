<script lang="ts">
  import { prefersReducedMotion } from './motion';

  // Every time the ball crosses the goal line, the counter box goes up by one.
  const still = prefersReducedMotion();
  let x = $state(still ? 600 : 120);
  let points = $state(still ? 2 : 0);
  $effect(() => {
    if (still) return;
    const timer = setInterval(() => {
      x += 14;
      if (x > 700) { x = 120; points = (points + 1) % 10; }
    }, 50);
    return () => clearInterval(timer);
  });
</script>

<svg viewBox="0 0 800 450" class="counter-card" role="img" aria-label="puntsEsquerra++">
  <rect x="60" y="30" width="640" height="190" class="card-screen" />
  <line x1="690" y1="30" x2="690" y2="220" class="goal" />
  <circle cx={x} cy="125" r="14" class="ball" />
  <g transform="translate(200 270)">
    <rect width="240" height="130" rx="14" class="var-box" />
    <text x="120" y="-10" class="box-name">puntsEsquerra</text>
    {#key points}<text x="120" y="90" class="box-value">{points}</text>{/key}
  </g>
  <text x="480" y="345" class="code">puntsEsquerra++;</text>
</svg>
