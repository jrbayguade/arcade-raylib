<script lang="ts">
  import { t } from '../i18n/i18n';
  import { prefersReducedMotion } from './motion';

  // Four moments of the ball near the paddle: only when all three questions say yes does it bounce.
  const SCENES = [
    { ballX: 200, ballY: 140, paddleY: 100 },
    { ballX: 44, ballY: 140, paddleY: 100 },
    { ballX: 44, ballY: 60, paddleY: 100 },
    { ballX: 44, ballY: 230, paddleY: 100 },
  ];
  const still = prefersReducedMotion();
  let i = $state(still ? 1 : 0);
  $effect(() => {
    if (still) return;
    const timer = setInterval(() => (i = (i + 1) % SCENES.length), 2200);
    return () => clearInterval(timer);
  });
  const s = $derived(SCENES[i]);
  const near = $derived(s.ballX < 60);
  const below = $derived(s.ballY > s.paddleY);
  const above = $derived(s.ballY < s.paddleY + 80);
  const all = $derived(near && below && above);
</script>

<svg viewBox="0 0 800 450" class="and-card" role="img" aria-label="&&">
  <rect x="20" y="20" width="280" height="280" class="screen" />
  <rect x="40" y={20 + s.paddleY} width="10" height="80" class="paddle" />
  <circle cx={20 + s.ballX} cy={20 + s.ballY} r="10" class="ball" />
  {#each [[near, 'pilotaX < 38'], [below, 'pilotaY > palaY'], [above, 'pilotaY < palaY + alcada']] as [on, text], n (n)}
    <circle cx="350" cy={70 + n * 80} r="18" class="lamp" class:on={on as boolean} />
    <text x="385" y={78 + n * 80} class="cond">{text}</text>
    {#if n < 2}<text x="385" y={115 + n * 80} class="amp">&amp;&amp;</text>{/if}
  {/each}
  <text x="350" y="345" class="result" class:on={all}>{all ? t('andBounce') : t('andNoBounce')}</text>
  <text x="350" y="395" class="rule">{t('andRule')}</text>
</svg>
