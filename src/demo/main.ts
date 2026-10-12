import './style.css';
import pongSource from '../../content/demo/pong.c?raw';
import { formatDiagnostic, t } from '../i18n/i18n';
import type { Diagnostic } from '../lang/diagnostics';
import { renderFrame } from '../render/canvas';
import { KeyboardInput } from '../runtime/keyboard';
import { Runner } from './runner';

const STORAGE_KEY = 'bitarcade:demo:code';
const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const code = byId<HTMLTextAreaElement>('code');
const canvas = byId<HTMLCanvasElement>('screen');
const status = byId<HTMLParagraphElement>('status');
const ctx = canvas.getContext('2d')!;

byId('title').textContent = t('title');
byId('run').textContent = t('run');
byId('stop').textContent = t('stop');
byId('restore').textContent = t('restore');

code.value = localStorage.getItem(STORAGE_KEY) ?? pongSource;
code.addEventListener('input', () => localStorage.setItem(STORAGE_KEY, code.value));
code.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  code.setRangeText('    ', code.selectionStart, code.selectionEnd, 'end');
  code.dispatchEvent(new Event('input'));
});

function show(kind: 'info' | 'error' | 'warning', text: string): void {
  status.className = kind;
  status.textContent = text;
}

function selectLine(line: number): void {
  const lines = code.value.split('\n');
  const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
  code.focus();
  code.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
}

function showDiagnostic(d: Diagnostic): void {
  const prefix = d.severity === 'warning' ? t('warningLabel') : '';
  show(d.severity, prefix + t('lineLabel', { line: d.line }) + formatDiagnostic(d));
  if (d.severity === 'error') selectLine(d.line);
}

const keyboard = new KeyboardInput();
keyboard.attach(canvas);

const runner = new Runner({
  scheduler: { request: (cb) => requestAnimationFrame(cb), cancel: (id) => cancelAnimationFrame(id) },
  input: keyboard,
  onFrame: (drawList, host) => {
    if (canvas.width !== host.width || canvas.height !== host.height) {
      canvas.width = host.width;
      canvas.height = host.height;
    }
    renderFrame(ctx, drawList);
  },
  onStatus: (s) => {
    switch (s.kind) {
      case 'running': show('info', t('running')); canvas.focus(); break;
      case 'stopped': show('info', t('stopped')); break;
      case 'finished': show('info', t('finished')); break;
      case 'error': showDiagnostic(s.diagnostic); break;
    }
  },
  onEvent: (e) => {
    if (e.type === 'warning') showDiagnostic(e.diagnostic);
  },
});

byId('run').addEventListener('click', () => runner.start(code.value));
byId('stop').addEventListener('click', () => runner.stop());
byId('restore').addEventListener('click', () => {
  runner.stop();
  code.value = pongSource;
  localStorage.removeItem(STORAGE_KEY);
});
