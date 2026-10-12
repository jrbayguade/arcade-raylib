<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
  import type { VariableView } from '../lang/interpreter';
  import { renderFrame } from '../render/canvas';
  import { KeyboardInput } from '../runtime/keyboard';
  import { Runner } from '../runtime/runner';

  let { broken, onVariables, onError }: {
    /** No working program on screen: show TV static instead of a black screen. */
    broken: boolean;
    onVariables: (variables: VariableView[]) => void;
    onError: (diagnostic: Diagnostic) => void;
  } = $props();

  let frame: HTMLDivElement;
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

  /** Runs a program, with the old-TV "switching on" effect (restarted by toggling the class). */
  export function start(code: string): void {
    frame.classList.remove('power');
    void frame.offsetWidth;
    frame.classList.add('power');
    runner?.start(code);
    running = true;
  }

  export function stop(): void {
    runner?.stop();
    running = false;
  }

  let running = false;
  /** Whether a program has been started (and not stopped) on this machine. */
  export function isRunning(): boolean {
    return running;
  }

  function track(e: MouseEvent): void {
    const r = canvas.getBoundingClientRect();
    mouse = {
      x: Math.round(((e.clientX - r.left) * canvas.width) / r.width),
      y: Math.round(((e.clientY - r.top) * canvas.height) / r.height),
    };
  }
</script>

<div class="machine" bind:this={frame}>
  <!-- svelte-ignore a11y_mouse_events_have_key_events, a11y_no_noninteractive_tabindex -->
  <canvas bind:this={canvas} width="800" height="450" tabindex="0"
    onmousemove={track} onmouseleave={() => (mouse = null)}></canvas>
  {#if broken}<div class="tv-static" aria-hidden="true"></div>{/if}
  {#if mouse && !broken}<span class="coords">{t('mouseCoords', mouse)}</span>{/if}
</div>
