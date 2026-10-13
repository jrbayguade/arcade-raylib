<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../i18n/i18n';
  import type { Diagnostic } from '../lang/diagnostics';
  import type { VariableView } from '../lang/interpreter';
  import { renderFrame } from '../render/canvas';
  import { allBallsOffScreen } from '../runtime/drawList';
  import { KeyboardInput } from '../runtime/keyboard';
  import { Runner } from '../runtime/runner';

  let { broken, slow = false, onVariables, onError }: {
    /** No working program on screen: show TV static instead of a black screen. */
    broken: boolean;
    /** 🐢 slow motion: a few frames per second, with the frame number on screen. */
    slow?: boolean;
    onVariables: (variables: VariableView[]) => void;
    onError: (diagnostic: Diagnostic) => void;
  } = $props();

  let frame: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let runner: Runner | null = null;
  let mouse = $state<{ x: number; y: number } | null>(null);
  let frameNo = $state(0);
  /** Every ball has left the screen: offer to launch it again instead of showing an empty machine. */
  let lost = $state(false);
  let lastCode: string | null = null;

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
        frameNo = runner?.frameCount ?? 0;
        lost = allBallsOffScreen(drawList, host.width, host.height);
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

  // Declared after onMount, so it first runs once the runner exists; applies now and to every later run.
  // Switching 🐢 on restarts the program, so the kid watches it from the first frame (not "fotograma 884" on an empty screen).
  let wasSlow = false;
  $effect(() => {
    runner?.setSlow(slow);
    if (slow && !wasSlow && lastCode && runner?.running) start(lastCode);
    wasSlow = slow;
  });

  /** Runs a program, with the old-TV "switching on" effect (restarted by toggling the class). */
  export function start(code: string): void {
    frame.classList.remove('power');
    void frame.offsetWidth;
    frame.classList.add('power');
    frameNo = 0;
    lost = false;
    lastCode = code;
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
  {#if lost && !broken}
    <button class="ball-lost" data-sound="page" onclick={() => lastCode && start(lastCode)}><span class="lost-what">{t('ballLost')}</span> <span class="lost-do">{t('ballLostAgain')}</span></button>
  {/if}
  {#if slow && !broken && frameNo > 0}<span class="frame-no">{t('frameNo', { n: frameNo })}</span>{/if}
  {#if mouse && !broken}<span class="coords">{t('mouseCoords', mouse)}</span>{/if}
</div>
