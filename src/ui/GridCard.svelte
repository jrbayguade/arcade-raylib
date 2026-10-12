<script lang="ts">
  const points = [{ x: 100, y: 80 }, { x: 600, y: 80 }, { x: 600, y: 350 }, { x: 100, y: 350 }];
  let i = $state(0);
  $effect(() => {
    const timer = setInterval(() => (i = (i + 1) % points.length), 1500);
    return () => clearInterval(timer);
  });
  const p = $derived(points[i]);
</script>

<svg viewBox="-40 -30 880 510" class="grid-card" role="img" aria-label="x, y">
  {#each Array.from({ length: 17 }, (_, k) => k * 50) as x}<line x1={x} y1="0" x2={x} y2="450" class="grid" />{/each}
  {#each Array.from({ length: 10 }, (_, k) => k * 50) as y}<line x1="0" y1={y} x2="800" y2={y} class="grid" />{/each}
  <rect x="0" y="0" width="800" height="450" class="frame" />
  <line x1="0" y1="-15" x2="780" y2="-15" class="axis" marker-end="url(#arrow)" />
  <text x="790" y="-10" class="axis-label">x</text>
  <line x1="-15" y1="0" x2="-15" y2="430" class="axis" marker-end="url(#arrow)" />
  <text x="-25" y="455" class="axis-label">y</text>
  <text x="4" y="16" class="origin">(0, 0)</text>
  <line x1={p.x} y1="0" x2={p.x} y2={p.y} class="grid-guide" />
  <line x1="0" y1={p.y} x2={p.x} y2={p.y} class="grid-guide" />
  <circle cx={p.x} cy={p.y} r="10" class="dot" />
  <text x={p.x + 16} y={p.y - 12} class="coord">({p.x}, {p.y})</text>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="arrowhead" />
    </marker>
  </defs>
</svg>
