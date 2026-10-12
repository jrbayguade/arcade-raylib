<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { formatDiagnostic, t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
  import BitFace from './BitFace.svelte';
  import type { BitMessage } from './message';
  import { prefersReducedMotion, rotateRequired } from './motion';
  import RichText from './RichText.svelte';
  import { sounds } from './sound';
  import TypedText from './TypedText.svelte';
  import { BIT_SPEED, Typewriter } from './typewriter';

  let { pages, mission, message, checkTexts, success, mood, celebrating }: {
    /** Explanation typed page after page (may be empty). */
    pages: string[];
    /** What to do now: always visible, never typed (null on explanation steps). */
    mission: string | null;
    message: BitMessage;
    checkTexts: Record<string, string>;
    success?: string;
    mood: 'normal' | 'happy' | 'thinking';
    celebrating: boolean;
  } = $props();

  // The bubble is re-keyed per step, so the pages it was created with are the ones it types.
  // On a landscape phone Bit covers the machine while he talks, so he talks faster and steps aside sooner.
  const phone = typeof matchMedia === 'function' && matchMedia('(max-height: 560px)').matches;
  const speed = phone ? { ...BIT_SPEED, charsPerSecond: BIT_SPEED.charsPerSecond * 1.5, pausePerCharMs: BIT_SPEED.pausePerCharMs * 0.7 } : BIT_SPEED;
  const tw = untrack(() => new Typewriter(pages, prefersReducedMotion() ? { ...BIT_SPEED, charsPerSecond: Infinity } : speed));
  let text = $state('');
  let page = $state(0);
  let typing = $state(untrack(() => pages.length > 0));
  /** On a small landscape phone the bubble folds into a one-line ticket; tapping it opens the bubble. */
  // Open while Bit narrates (on phones the folded ticket would hide it), folded again once he has finished.
  let open = $state(untrack(() => pages.length > 0));
  let folded = false;

  function sync(): void {
    text = tw.text;
    page = tw.page;
    typing = !tw.pageComplete;
  }

  onMount(() => {
    let last = performance.now();
    let lastTick = 0;
    let raf = 0;
    const frame = (now: number) => {
      const before = tw.text.length;
      tw.tick(rotateRequired() ? 0 : Math.min(now - last, 100)); // paused under the rotate overlay
      last = now;
      if (tw.text.length > before && now - lastTick > 55) {
        sounds.play('type', { pitch: 0.9 + Math.random() * 0.2 });
        lastTick = now;
      }
      sync();
      if (tw.finished && !folded) {
        folded = true;
        setTimeout(() => { if (!message) open = false; }, phone ? 1500 : 2500);
      }
      raf = requestAnimationFrame(frame);
    };
    if (pages.length > 0) raf = requestAnimationFrame(frame);
    // Touching the code folds the bubble away so it never covers what the kid is editing.
    const onDown = (e: PointerEvent) => { if ((e.target as Element | null)?.closest?.('.work')) open = false; };
    addEventListener('pointerdown', onDown, { capture: true });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointerdown', onDown, { capture: true });
    };
  });

  // A new answer from Bit opens the folded bubble on phones.
  $effect(() => {
    if (message) open = true;
  });

  const skip = () => { sounds.play('page'); tw.skip(); sync(); };
  const goTo = (i: number) => { tw.goTo(i); sync(); };
  const replay = () => { tw.restart(); sync(); };

  function diagnosticText(intro: string, d: Diagnostic): string {
    return `${intro} ${formatDiagnostic(d)}`;
  }
</script>

<div class="talk" class:open>
  <button class="ticket" data-sound="page" onclick={() => (open = !open)} aria-expanded={open}>
    <BitFace {mood} size={26} />
    <span class="ticket-text"><RichText text={mission ?? pages[pages.length - 1] ?? ''} /></span>
    <span class="ticket-more" aria-hidden="true">{open ? '▴' : '▾'}</span>
  </button>
  <BitFace {mood} size={70} jump={celebrating} />
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="bubble" onclick={(e) => { if (e.target === e.currentTarget) open = false; }}>
    {#if pages.length > 0}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
      <p class="say" onclick={skip} title={t('skipHint')}>
        <!-- Every page laid out invisibly in the same cell: the bubble keeps the size of the longest one while typing. -->
        <span class="sizer" aria-hidden="true">
          {#each pages as p, i (i)}<span><RichText text={p} />▌</span>{/each}
        </span>
        <span class="typed"><RichText {text} /><span class="caret" class:hidden={!typing}>▌</span></span>
      </p>
      {#if pages.length > 1}
        <div class="pager">
          {#each pages as _, i (i)}
            <button class="dot" data-sound="page" class:on={i === page} aria-label={t('pageLabel', { n: i + 1 })} onclick={() => goTo(i)}></button>
          {/each}
          <button class="replay" data-sound="page" onclick={replay} aria-label={t('replay')} title={t('replay')}>↺</button>
        </div>
      {/if}
    {/if}
    {#if mission}
      <div class="mission"><small>{t('missionLabel')}</small><RichText text={mission} /></div>
    {/if}
    {#if message}
      {#key message}
        <div class="answer">
          {#if message.kind === 'note'}
            <p class="almost"><TypedText text={message.text} /></p>
          {:else if message.kind === 'hint'}
            <p class="hint"><strong>{t('hintLabel', { n: message.n })}</strong> <TypedText text={message.text} cps={80} /></p>
          {:else if message.kind === 'live'}
            <p class="error"><TypedText text={diagnosticText(t('runtimeErrorIntro', { line: message.diagnostic.line }), message.diagnostic)} /></p>
          {:else if message.feedback?.kind === 'success'}
            <p class="success"><TypedText text={success ?? t('success')} /></p>
            <p class="stars" aria-label={t('starsEarned', { n: message.stars, max: message.maxStars })}>
              {#each Array.from({ length: message.maxStars }) as _, i (i)}<span class="star" class:earned={i < message.stars} style="animation-delay: {i * 300}ms">⭐</span>{/each}
            </p>
          {:else if message.feedback?.kind === 'almost'}
            <p class="almost"><TypedText text={`${t('almost')} ${checkTexts[message.feedback.key] ?? message.feedback.key}`} /></p>
          {:else if message.feedback?.kind === 'compile-error'}
            <p class="error"><TypedText text={diagnosticText(t('compileErrorIntro', { line: message.feedback.diagnostic.line }), message.feedback.diagnostic)} /></p>
          {:else if message.feedback?.kind === 'runtime-error'}
            <p class="error"><TypedText text={diagnosticText(t('runtimeErrorIntro', { line: message.feedback.diagnostic.line }), message.feedback.diagnostic)} /></p>
          {/if}
        </div>
      {/key}
    {/if}
  </div>
</div>
