<script lang="ts">
  import { onMount } from 'svelte';
  import { prefersReducedMotion } from './motion';
  import RichText from './RichText.svelte';
  import { Typewriter } from './typewriter';

  /** Short text typed once (hints, results). Re-key the component to type a new text. */
  let { text, cps = 120 }: { text: string; cps?: number } = $props();

  let shown = $state('');

  onMount(() => {
    const tw = new Typewriter([text], {
      charsPerSecond: prefersReducedMotion() ? Infinity : cps,
      pauseBaseMs: 0,
      pausePerCharMs: 0,
    });
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      tw.tick(Math.min(now - last, 100));
      last = now;
      shown = tw.text;
      if (!tw.finished) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });
</script>

<RichText text={shown} />
