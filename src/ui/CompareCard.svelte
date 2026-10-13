<script lang="ts">
  import { t } from '../i18n/i18n';
  import { prefersReducedMotion } from './motion';

  // The paddle goes up and down; while palaY < 20 the question lights up "sí" and the paddle is put back on the line.
  const still = prefersReducedMotion();
  const path = [120, 80, 40, 10, 40, 80, 120, 160];
  let i = $state(still ? 3 : 0);
  $effect(() => {
    if (still) return;
    const timer = setInterval(() => (i = (i + 1) % path.length), 900);
    return () => clearInterval(timer);
  });
  const y = $derived(path[i]);
  const yes = $derived(y < 20);
  const OPS: [string, string][] = [['<', 'cmpLess'], ['>', 'cmpMore'], ['<=', 'cmpLessEq'], ['>=', 'cmpMoreEq'], ['==', 'cmpEqual'], ['!=', 'cmpNotEqual']];
</script>

<svg viewBox="0 0 800 450" class="compare-card" role="img" aria-label="palaY < 20">
  <rect x="40" y="30" width="200" height="370" class="screen" />
  <line x1="40" y1="70" x2="240" y2="70" class="limit" />
  <text x="250" y="76" class="limit-label">y = 20</text>
  <rect x="60" y={30 + (yes ? 20 : y) * 1.6} width="14" height="80" class="paddle" />
  <text x="90" y={30 + y * 1.6 + 46} class="y-label">palaY = {y}{yes ? ' → 20' : ''}</text>
  <text x="330" y="90" class="question">palaY &lt; 20 ?</text>
  <text x="330" y="140" class="answer" class:yes>{yes ? t('cmpYesFix') : t('cmpNo')}</text>
  {#each OPS as [op, key], n (op)}
    <text x="330" y={220 + n * 34} class="op">{op}</text>
    <text x="400" y={220 + n * 34} class="op-text">{t(key)}</text>
  {/each}
</svg>
