<script lang="ts">
  import { formatDiagnostic, t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
  import type { Evaluation } from '../lessons/checks';
  import RichText from './RichText.svelte';

  let { prompt, hints, result, liveError, checkTexts, success }: {
    prompt: string;
    hints: string[];
    result: Evaluation | null;
    liveError: Diagnostic | null;
    checkTexts: Record<string, string>;
    success?: string;
  } = $props();
</script>

<div class="bit">
  <div class="avatar" aria-hidden="true">🤖</div>
  <div class="bubble">
    <p><RichText text={prompt} /></p>
    {#each hints as hint, i}
      <p class="hint"><strong>{t('hintLabel', { n: i + 1 })}</strong> <RichText text={hint} /></p>
    {/each}
    {#if result}
      {#if result.kind === 'compile-error'}
        <p class="error">{t('compileErrorIntro', { line: result.diagnostic.line })} {formatDiagnostic(result.diagnostic)}</p>
      {:else if result.kind === 'runtime-error'}
        <p class="error">{t('runtimeErrorIntro', { line: result.diagnostic.line })} {formatDiagnostic(result.diagnostic)}</p>
      {:else if result.passed}
        <p class="success"><RichText text={success ?? t('success')} /></p>
      {:else}
        <p>{t('checksTitle')}</p>
        <ul class="checks">
          {#each result.results as r (r.key)}
            <li class:ok={r.ok}>{r.ok ? '✔' : '✘'} <RichText text={checkTexts[r.key] ?? r.key} /></li>
          {/each}
        </ul>
      {/if}
    {/if}
    {#if liveError}
      <p class="error">{t('runtimeErrorIntro', { line: liveError.line })} {formatDiagnostic(liveError)}</p>
    {/if}
  </div>
</div>
