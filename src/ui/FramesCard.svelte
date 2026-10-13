<script lang="ts">
  import { t } from '../i18n/i18n';
  import { prefersReducedMotion } from './motion';

  // Three frames of the loop; in each one the line runs in three beats: read the box, add 3, store it back.
  const START = 400, STEP = 3, FRAMES = 3;
  const still = prefersReducedMotion();
  let tick = $state(still ? 4 : 0); // reduced motion: frame 2, "add" beat
  $effect(() => {
    if (still) return;
    const timer = setInterval(() => (tick = (tick + 1) % (FRAMES * 3)), 400);
    return () => clearInterval(timer);
  });
  const frame = $derived(Math.floor(tick / 3));
  const beat = $derived(tick % 3);
  const before = $derived(START + frame * STEP);
  const inBox = $derived(beat === 2 ? before + STEP : before);
</script>

<svg viewBox="0 0 800 450" class="frames-card" role="img" aria-label="pilotaX = pilotaX + 3">
  {#each Array.from({ length: FRAMES }) as _, i (i)}
    <g transform="translate({40 + i * 250} 20)" class="film" class:now={i === frame}>
      <rect width="220" height="124" rx="8" class="film-frame" />
      <circle cx={60 + i * 40} cy="62" r="10" class="film-ball" />
      <text x="110" y="150" class="film-label">{t('framesLabel', { n: i + 1, x: START + (i + 1) * STEP })}</text>
    </g>
  {/each}
  <g transform="translate(60 230)">
    <rect width="200" height="130" rx="14" class="var-box" />
    <rect x="-10" y="-36" width="220" height="40" rx="8" class="lid" />
    <text x="100" y="-8" class="box-name">pilotaX</text>
    {#key inBox}<text x="100" y="88" class="box-value">{inBox}</text>{/key}
  </g>
  <text x="300" y="240" class="frames-code">pilotaX = pilotaX + 3;</text>
  <text x="320" y="300" class="beat" class:on={beat === 0}>{t('framesRead', { n: before })}</text>
  <text x="320" y="345" class="beat" class:on={beat === 1}>{t('framesAdd')}</text>
  <text x="320" y="390" class="beat" class:on={beat === 2}>{t('framesStore', { n: before + STEP })}</text>
</svg>
