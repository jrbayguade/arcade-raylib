import { localizeTexts, type Language } from '../../src/i18n/language';
import type { Lesson, LessonTexts } from '../../src/lessons/model';
import { lesson0 } from './00-quadricula/lesson';
import { lesson1 } from './01-variables/lesson';
import { lesson2 } from './02-moviment/lesson';
import { lesson3 } from './03-if/lesson';
import { lesson4 } from './04-limits/lesson';
import { lesson5 } from './05-rebots/lesson';
import { lesson6 } from './06-xoc/lesson';
import { lesson7 } from './07-marcador/lesson';
import { lessonFinal } from './08-rival/lesson';

export const LESSONS: Lesson[] = [lesson0, lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson7, lessonFinal];

/** Every lesson folder's texts by language: `./03-if/es.json` → { '03-if': { es: … } }. */
const files = import.meta.glob<LessonTexts>('./*/*.json', { eager: true, import: 'default' });
const byFolder = new Map<string, Record<string, LessonTexts>>();
for (const [path, texts] of Object.entries(files)) {
  const [, folder, lang] = /^\.\/([^/]+)\/(\w+)\.json$/.exec(path) ?? [];
  if (!folder) continue;
  byFolder.set(folder, { ...byFolder.get(folder), [lang]: texts });
}
/** The Catalan texts each lesson was written with (a lesson finds its folder through them). */
const CATALAN = new Map(LESSONS.map((l) => [l, l.texts]));

/** Puts every lesson's texts in `lang` (Catalan wherever a translation is missing). */
export function useLessonLanguage(lang: Language): void {
  for (const lesson of LESSONS) {
    const ca = CATALAN.get(lesson)!;
    const folder = [...byFolder.values()].find((f) => f.ca === ca);
    lesson.texts = lang === 'ca' ? ca : localizeTexts(ca, folder?.[lang]);
  }
}
