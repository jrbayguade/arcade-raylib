import { describe, expect, it } from 'vitest';
import { CODES, FEATURES, type Diagnostic } from '../src/lang/diagnostics';
import { formatDiagnostic, t } from '../src/i18n/i18n';
import ca from '../src/i18n/ca.json';

const d = (code: Diagnostic['code'], params: Diagnostic['params'] = {}, line = 1): Diagnostic => ({
  code, params, line, col: 1, severity: 'error',
});

describe('formatDiagnostic', () => {
  it('uses the diagnostic line', () => {
    expect(formatDiagnostic(d('MISSING_SEMICOLON', {}, 3))).toBe('Falta un ; al final de la línia 3.');
  });
  it('appends a suggestion', () => {
    expect(formatDiagnostic(d('UNDECLARED_VAR', { name: 'pilotax', suggestion: 'pilotaX' })))
      .toBe('La variable «pilotax» no existeix. Volies dir «pilotaX»?');
  });
  it('translates type parameters', () => {
    expect(formatDiagnostic(d('ARG_TYPE', { name: 'DrawRectangle', index: 5, expectedType: 'Color', foundType: 'int' })))
      .toBe('El valor número 5 de «DrawRectangle» hauria de ser un Color, però és un enter (int).');
  });
  it('translates unsupported features', () => {
    expect(formatDiagnostic(d('UNSUPPORTED', { feature: 'switch' })))
      .toBe('switch encara no l\'hem après. Fes servir if / else if.');
  });
  it('falls back to the code when there is no message', () => {
    expect(formatDiagnostic({ ...d('NO_MAIN'), code: 'NOPE' as Diagnostic['code'] })).toBe('NOPE');
  });
});

describe('catalog completeness', () => {
  it('has a Catalan message for every code', () => {
    for (const code of CODES) expect(ca.errors, code).toHaveProperty(code);
  });
  it('has a Catalan message for every unsupported feature', () => {
    for (const f of FEATURES) expect(ca.features, f).toHaveProperty(f);
  });
});

describe('t', () => {
  it('returns UI strings', () => {
    expect(t('run')).toBe('▶ Executa');
    expect(t('lineLabel', { line: 7 })).toBe('Línia 7: ');
  });
});

import { paramNames } from '../src/i18n/i18n';
import { RaylibHost } from '../src/runtime/raylib';

describe('paramNames', () => {
  it('names the parameters in Catalan', () => {
    expect(paramNames('DrawRectangle')).toEqual(['x', 'y', 'amplada', 'alçada', 'color']);
    expect(paramNames('NoExisteix')).toBeUndefined();
  });
  it('covers every non-variadic raylib function with the right count', () => {
    const host = new RaylibHost({ seed: 1 });
    for (const [name, fn] of Object.entries(host.functions)) {
      if (fn.variadic) continue;
      expect(paramNames(name), name).toHaveLength(fn.params.length);
    }
  });
});

describe('lesson UI strings', () => {
  it('has the strings the lesson screen uses', () => {
    for (const key of ['lessonTitle', 'stepOf', 'hint', 'hintTitle', 'hintLabel', 'reset', 'continue', 'nextLesson',
      'lessonDone', 'allDone', 'checksTitle', 'success', 'compileErrorIntro', 'runtimeErrorIntro',
      'mouseCoords', 'variablesTitle', 'foldLines', 'starsLabel']) {
      expect(t(key), key).not.toBe(key);
    }
  });
});
