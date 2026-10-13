<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/i18n';
  import BitFace from './BitFace.svelte';
  import LanguagePicker from './LanguagePicker.svelte';
  import { INTRO_BEATS, IntroPlayer } from './intro';
  import { rotateRequired } from './motion';
  import { sounds } from './sound';
  import TypedText from './TypedText.svelte';

  /** First-visit intro: an abandoned arcade, Bit, and the promise. Calls onDone when finished or skipped. */
  let { onDone }: { onDone: () => void } = $props();

  const player = new IntroPlayer();
  let beat = $state(player.id);
  let lit = $state(false);
  let leaving = $state(false);
  const SIGN = 'BIT ARCADE';
  const MACHINES = ['PONG', 'BRICK', 'SNAKE', '???'];

  function sync(): void {
    if (player.id !== beat) sounds.play('page');
    beat = player.id;
    lit = player.lightsOn;
  }

  function press(): void {
    if (leaving) return;
    const wasLit = player.lightsOn;
    if (player.atEnd) return;
    player.press();
    if (!wasLit) sounds.play('success');
    sync();
  }

  function finish(): void {
    if (leaving) return;
    leaving = true;
    sounds.play('next');
    setTimeout(onDone, 700);
  }

  onMount(() => {
    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      if (!rotateRequired()) player.tick(Math.min(now - last, 100));
      last = now;
      sync();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'Enter' && player.atEnd) finish();
      else press();
    };
    addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('keydown', onKey);
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="intro" class:lit onclick={press} data-beat={beat} role="presentation">
  <LanguagePicker />
  <button class="skip" data-sound="none" onclick={(e) => { e.stopPropagation(); finish(); }}>{t('introSkip')}</button>

  {#key beat}
    <div class="beat" class:zoomer={leaving}>
      {#if beat === 'dark' || beat === 'bit'}
        <div class="sign">{#each SIGN as ch, i (i)}<span>{ch}</span>{/each}</div>
      {/if}

      {#if beat === 'dark'}
        <div class="row">
          {#each MACHINES as m (m)}
            <div class="cab"><div class="roof">{m}</div><div class="body"></div><div class="scr"><div class="noise dim"></div></div></div>
          {/each}
        </div>
        {#if !lit}<div class="press">{t('introPress')}</div>{/if}
      {:else if beat === 'bit'}
        <div class="row ghost">
          {#each MACHINES as m (m)}
            <div class="cab"><div class="roof">{m}</div><div class="body"></div><div class="scr"><div class="noise dim"></div></div></div>
          {/each}
        </div>
        <div class="say-line" style="top: 34vh">
          <div class="roll"><BitFace size={130} /></div>
          <div class="bubble"><TypedText text={t('introBit')} cps={45} /></div>
        </div>
      {:else if beat === 'broken'}
        <div class="row" style="bottom: 38vh">
          {#each MACHINES as m (m)}
            <div class="cab"><div class="roof">{m}</div><div class="body"></div><div class="scr"><div class="noise"></div></div><div class="broken">{t('introBrokenLabel')}</div></div>
          {/each}
        </div>
        <div class="say-line" style="bottom: 8vh">
          <BitFace mood="thinking" size={80} />
          <div class="bubble"><TypedText text={t('introBroken')} cps={45} /></div>
        </div>
      {:else if beat === 'demo'}
        <div class="demo">
          <div class="line"><span class="zone"><span class="fn">DrawRectangle</span>(<span class="num">20</span>, <span class="swap"><span class="num a">185</span><span class="num b">50</span></span>, <span class="num">10</span>, <span class="num">80</span>, <span class="k">WHITE</span>);</span></div>
          <button class="run-glow" data-sound="none" tabindex="-1">{t('run')}</button>
          <div class="mini"><i class="p l up"></i><i class="p r"></i></div>
        </div>
        <div class="say-line" style="bottom: 8vh">
          <BitFace size={80} />
          <div class="bubble"><TypedText text={t('introDemo')} cps={45} /></div>
        </div>
      {:else if beat === 'promise'}
        <div class="promise-row">
          <div class="big-cab cabinet">
            <div class="marquee">PONG</div>
            <div class="mini"><i class="p l play-l"></i><i class="p r play-r"></i><i class="b bounce"></i></div>
            <div style="text-align:center; font-size: 30px">⭐⭐⭐</div>
          </div>
          <div class="say-line">
            <BitFace mood="happy" size={80} />
            <div class="bubble"><TypedText text={t('introPromise')} cps={45} /></div>
          </div>
        </div>
      {:else if beat === 'go'}
        <div class="row go-row">
          <div class="cab">
            <div class="roof">PONG</div><div class="body"></div>
            <div class="scr"><div class="mini" style="border: none; box-shadow: none; height: 100%"><i class="p l play-l"></i><i class="p r play-r"></i><i class="b bounce"></i></div></div>
          </div>
        </div>
        <div class="say-line go-say">
          <BitFace mood="happy" size={70} />
          <div class="bubble"><TypedText text={t('introGoText')} cps={45} /></div>
        </div>
        <div class="go"><button class="primary" data-sound="none" onclick={(e) => { e.stopPropagation(); finish(); }}>{t('introGo')}</button></div>
      {/if}
      {#if lit && beat !== 'go' && INTRO_BEATS.length}<div class="press soft">{t('introNext')}</div>{/if}
    </div>
  {/key}
</div>
