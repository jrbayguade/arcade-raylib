<script lang="ts">
  import { t } from '../i18n/i18n';
  import { prefersReducedMotion } from './motion';

  // The W key goes down and up; the if takes the "yes" road only while it is down, and the paddle climbs.
  const still = prefersReducedMotion();
  let pressed = $state(true);
  let paddleY = $state(260);
  $effect(() => {
    if (still) return;
    const toggle = setInterval(() => (pressed = !pressed), 1800);
    const move = setInterval(() => { if (pressed) paddleY = paddleY <= 60 ? 260 : paddleY - 6; }, 100);
    return () => { clearInterval(toggle); clearInterval(move); };
  });
</script>

<svg viewBox="0 0 800 450" class="if-card" role="img" aria-label="if (IsKeyDown(KEY_W))">
  <g transform="translate(40 170)" class="key" class:down={pressed}>
    <rect width="90" height="90" rx="14" class="key-cap" />
    <text x="45" y="62" class="key-label">W</text>
  </g>
  <text x="85" y="300" class="caption">{pressed ? t('ifPressed') : t('ifReleased')}</text>
  <g transform="translate(330 215)">
    <polygon points="-130,0 0,-70 130,0 0,70" class="diamond" />
    <text x="0" y="-6" class="question">IsKeyDown(KEY_W)</text>
    <text x="0" y="24" class="question">?</text>
  </g>
  <path d="M 330 145 L 330 80 L 470 80" class="road" class:on={pressed} />
  <text x="340" y="70" class="road-label" class:on={pressed}>{t('ifYes')}</text>
  <rect x="470" y="50" width="200" height="60" rx="10" class="action" class:on={pressed} />
  <text x="570" y="88" class="action-text">palaY = palaY - 6;</text>
  <path d="M 330 285 L 330 360 L 470 360" class="road" class:on={!pressed} />
  <text x="340" y="400" class="road-label" class:on={!pressed}>{t('ifNo')}</text>
  <rect x="470" y="330" width="200" height="60" rx="10" class="action" class:on={!pressed} />
  <text x="570" y="368" class="action-text">{t('ifNothing')}</text>
  <rect x="740" y={paddleY} width="12" height="80" class="paddle" />
</svg>
