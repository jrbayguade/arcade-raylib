<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDiagnostic, t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
  import type { Evaluation } from '../lessons/checks';
  import { prefersReducedMotion } from './motion';
  import RichText from './RichText.svelte';
  import TypedText from './TypedText.svelte';
  import { BIT_SPEED, Typewriter } from './typewriter';

  let { pages, hints, result, liveError, checkTexts, success, celebrating }: {
    pages: string[];
    hints: string[];
    result: Evaluation | null;
    liveError: Diagnostic | null;
    checkTexts: Record<string, string>;
    success?: string;
    celebrating: boolean;
  } = $props();

  // The bubble is re-keyed per step, so the pages it was created with are the ones it types.
  const tw = new Typewriter(pages, prefersReducedMotion() ? { ...BIT_SPEED, charsPerSecond: Infinity } : BIT_SPEED);
  let text = $state('');
  let page = $state(0);
  let typing = $state(true);

  function sync(): void {
    text = tw.text;
    page = tw.page;
    typing = !tw.pageComplete;
  }

  onMount(() => {
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      tw.tick(Math.min(now - last, 100));
      last = now;
      sync();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  const skip = () => { tw.skip(); sync(); };
  const goTo = (i: number) => { tw.goTo(i); sync(); };
  const replay = () => { tw.restart(); sync(); };
</script>

<div class="bit">
  <div class="avatar" class:jump={celebrating} aria-hidden="true">🤖</div>
  <div class="bubble">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <p class="say" onclick={skip} title={t('skipHint')}>
      <RichText {text} /><span class="caret" class:hidden={!typing}>▌</span>
    </p>
    {#if pages.length > 1}
      <div class="pager">
        {#each pages as _, i (i)}
          <button class="dot" class:on={i === page} aria-label={t('pageLabel', { n: i + 1 })} onclick={() => goTo(i)}></button>
        {/each}
        <button class="replay" onclick={replay}>{t('replay')}</button>
      </div>
    {/if}
    {#each hints as hint, i (hint)}
      <p class="hint"><strong>{t('hintLabel', { n: i + 1 })}</strong> <TypedText text={hint} cps={80} /></p>
    {/each}
    {#if result}
      {#key result}
        {#if result.kind === 'compile-error'}
          <p class="error"><TypedText text={`${t('compileErrorIntro', { line: result.diagnostic.line })} ${formatDiagnostic(result.diagnostic)}`} /></p>
        {:else if result.kind === 'runtime-error'}
          <p class="error"><TypedText text={`${t('runtimeErrorIntro', { line: result.diagnostic.line })} ${formatDiagnostic(result.diagnostic)}`} /></p>
        {:else if result.passed}
          <p class="success"><TypedText text={success ?? t('success')} /></p>
        {:else}
          <p>{t('checksTitle')}</p>
          <ul class="checks">
            {#each result.results as r, i (r.key)}
              <li class:ok={r.ok} style="animation-delay: {i * 150}ms">{r.ok ? '✔' : '✘'} <RichText text={checkTexts[r.key] ?? r.key} /></li>
            {/each}
          </ul>
        {/if}
      {/key}
    {/if}
    {#if liveError}
      {#key liveError}
        <p class="error"><TypedText text={`${t('runtimeErrorIntro', { line: liveError.line })} ${formatDiagnostic(liveError)}`} /></p>
      {/key}
    {/if}
  </div>
</div>
