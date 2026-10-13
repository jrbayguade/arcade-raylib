import type { Lesson } from '../../src/lessons/model';
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
