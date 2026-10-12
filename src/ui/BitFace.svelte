<script lang="ts">
  /** Bit drawn with simple shapes: normal (blinks), happy (after a success) or thinking (after an error). */
  let { mood = 'normal', size = 64, jump = false }: {
    mood?: 'normal' | 'happy' | 'thinking';
    size?: number;
    jump?: boolean;
  } = $props();
</script>

<svg class="bit-face" class:jump width={size} height={Math.round((size * 64) / 60)} viewBox="0 0 60 64" aria-hidden="true">
  <line class="antenna" x1="30" y1="12" x2="30" y2="5" />
  <circle class="bulb" cx="30" cy="5" r="4" />
  <rect class="head" x="6" y="12" width="48" height="40" rx="12" />
  {#if mood === 'happy'}
    <path class="feature" d="M16 32 Q22 23 28 32" />
    <path class="feature" d="M32 32 Q38 23 44 32" />
    <path class="feature" d="M19 39 Q30 51 41 39" />
  {:else if mood === 'thinking'}
    <path class="feature" d="M17 30 H27" />
    <path class="feature" d="M33 28 H43" />
    <path class="feature" d="M24 43 Q30 40 36 43" />
  {:else}
    <circle class="eye" cx="22" cy="30" r="5" />
    <circle class="eye" cx="38" cy="30" r="5" />
    <path class="feature" d="M22 42 Q30 46 38 42" />
  {/if}
</svg>
