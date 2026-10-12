<script lang="ts">
  const values = [185, 50, 300, 120];
  let i = $state(0);
  $effect(() => {
    const timer = setInterval(() => (i = (i + 1) % values.length), 1800);
    return () => clearInterval(timer);
  });
  const value = $derived(values[i]);
</script>

<svg viewBox="0 0 800 450" class="box-card" role="img" aria-label="palaY">
  <g transform="translate(120 150)">
    <rect width="220" height="150" rx="14" class="var-box" />
    <rect x="-10" y="-40" width="240" height="44" rx="8" class="lid" />
    <text x="110" y="-10" class="box-name">palaY</text>
    {#key value}<text x="110" y="95" class="box-value">{value}</text>{/key}
  </g>
  <line x1="350" y1="225" x2="560" y2={value + 40} class="link" />
  <rect x="580" y={value} width="10" height="80" class="paddle" />
  <text x="600" y={value + 45} class="paddle-label">y = {value}</text>
</svg>
