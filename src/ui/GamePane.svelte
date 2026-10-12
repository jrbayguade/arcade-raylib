<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
  import type { VariableView } from '../lang/interpreter';
  import { renderFrame } from '../render/canvas';
  import { KeyboardInput } from '../runtime/keyboard';
  import { Runner } from '../runtime/runner';

  let { onVariables, onError }: {
    onVariables: (variables: VariableView[]) => void;
    onError: (diagnostic: Diagnostic) => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let runner: Runner | null = null;
  let mouse = $state<{ x: number; y: number } | null>(null);

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const keyboard = new KeyboardInput();
    const detach = keyboard.attach(canvas);
    runner = new Runner({
      scheduler: { request: (cb) => requestAnimationFrame(cb), cancel: (id) => cancelAnimationFrame(id) },
      input: keyboard,
      onFrame: (drawList, host) => {
        if (canvas.width !== host.width || canvas.height !== host.height) {
          canvas.width = host.width;
          canvas.height = host.height;
        }
        renderFrame(ctx, drawList);
        onVariables(runner?.variables() ?? []);
      },
      // The checks only run 2 frames: a later runtime error in the live game must still reach Bit.
      onStatus: (s) => { if (s.kind === 'error') onError(s.diagnostic); },
    });
    return () => {
      runner?.stop();
      detach();
    };
  });

  export function start(code: string): void {
    runner?.start(code);
  }

  export function stop(): void {
    runner?.stop();
  }

  function track(e: MouseEvent): void {
    const r = canvas.getBoundingClientRect();
    mouse = {
      x: Math.round(((e.clientX - r.left) * canvas.width) / r.width),
      y: Math.round(((e.clientY - r.top) * canvas.height) / r.height),
    };
  }
</script>

<div class="machine">
  <!-- svelte-ignore a11y_mouse_events_have_key_events, a11y_no_noninteractive_tabindex -->
  <canvas bind:this={canvas} width="800" height="450" tabindex="0"
    onmousemove={track} onmouseleave={() => (mouse = null)}></canvas>
  {#if mouse}<span class="coords">{t('mouseCoords', mouse)}</span>{/if}
</div>
