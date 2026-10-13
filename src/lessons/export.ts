import type { Lesson } from './model';
import { isExercise } from './model';
import { exerciseKey, type Progress } from './progress';
import { parseLessonSource } from './source';

const HEADER = `// El teu Pong, fet a Bit Arcade 🕹️
// És C de veritat: per jugar-hi fora del navegador, instal·la raylib (https://www.raylib.com)
// i compila'l, per exemple: gcc main.c -o pong -lraylib
`;

/** The machine the kid fixed, as a real C file: their code for the last exercise (or the reference solution). */
export function mainC(progress: Progress, lessons: Lesson[]): string {
  const final = lessons[lessons.length - 1];
  const steps = final.steps.filter(isExercise);
  const last = steps[steps.length - 1];
  const saved = progress.exercises[exerciseKey(final, last.id)];
  const code = saved?.done ? saved.code : parseLessonSource(last.solution).code;
  return HEADER + '\n' + code;
}

/** Saves a text file through the browser's download. */
export function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/x-csrc' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
