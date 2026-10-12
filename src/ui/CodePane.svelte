<script lang="ts">
  import { onMount } from 'svelte';
  import { createLessonEditor, type LessonEditor } from '../editor/editor';
  import { t } from '../i18n/i18n';
  import type { LessonSource } from '../lessons/source';

  let { source, foldLabels, errorLine, onChange, onRun, onBlocked }: {
    source: LessonSource;
    foldLabels: Record<string, string>;
    errorLine: number | null;
    onChange: (code: string) => void;
    onRun: () => void;
    /** The kid tried to type outside the yellow zone. */
    onBlocked: () => void;
  } = $props();

  let parent: HTMLDivElement;
  let editor: LessonEditor | null = null;
  let flash = $state(false);
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    editor = createLessonEditor({
      parent,
      source,
      foldLabel: (key, lines) => t('foldLines', { lines, label: foldLabels[key] ?? key }),
      onChange,
      onRun,
      onBlocked: () => {
        // Make the yellow zone blink so the kid sees where typing works.
        flash = false;
        clearTimeout(flashTimer);
        requestAnimationFrame(() => {
          flash = true;
          flashTimer = setTimeout(() => (flash = false), 700);
        });
        onBlocked();
      },
    });
    return () => {
      clearTimeout(flashTimer);
      editor?.destroy();
    };
  });

  $effect(() => {
    editor?.setErrorLine(errorLine);
  });

  export function replaceZone(text: string): void {
    editor?.replaceZone(text);
  }

  export function insert(text: string): void {
    editor?.insert(text);
  }

  export function code(): string {
    return editor?.code() ?? '';
  }
</script>

<div class="code-pane" class:blocked={flash} bind:this={parent}></div>
