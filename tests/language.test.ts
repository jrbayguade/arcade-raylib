import { describe, expect, it } from 'vitest';
import { chooseLanguage, localizeTexts } from '../src/i18n/language';
import type { LessonTexts } from '../src/lessons/model';

describe('choosing the language', () => {
  it('keeps the one the kid picked', () => {
    expect(chooseLanguage('en', ['es-ES'])).toBe('en');
  });
  it('else Catalan, whatever the browser says (many Catalan kids have a Spanish browser)', () => {
    expect(chooseLanguage(null, ['es-ES', 'en'])).toBe('ca');
    expect(chooseLanguage('xx', ['en-GB'])).toBe('ca');
  });
});

describe('lesson texts in another language', () => {
  const ca: LessonTexts = {
    title: 'Títol',
    folds: { a: 'plec' },
    steps: { s1: { prompt: ['u', 'dos'], hints: ['h1', 'h2', 'h3'], success: 'bé' }, s2: { prompt: 'sol' } },
    checks: { c1: 'falta', c2: 'també' },
  };
  it('uses the translation where there is one and Catalan for the rest', () => {
    const es = localizeTexts(ca, { title: 'Título', steps: { s1: { prompt: ['uno', 'dos'], hints: ['h1', 'h2', 'h3'] } }, checks: { c1: 'falta (es)' } });
    expect(es.title).toBe('Título');
    expect(es.steps.s1).toEqual({ prompt: ['uno', 'dos'], hints: ['h1', 'h2', 'h3'], success: 'bé' });
    expect(es.steps.s2).toEqual({ prompt: 'sol' });
    expect(es.checks).toEqual({ c1: 'falta (es)', c2: 'també' });
    expect(es.folds).toEqual({ a: 'plec' });
  });
  it('ignores a translated prompt with a different number of pages (the last page is the mission)', () => {
    const es = localizeTexts(ca, { steps: { s1: { prompt: ['solo una'] } } });
    expect(es.steps.s1.prompt).toEqual(['u', 'dos']);
  });
  it('is Catalan itself without a translation', () => {
    expect(localizeTexts(ca, undefined)).toEqual(ca);
  });
});
