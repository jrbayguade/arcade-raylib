# Phase 2: saved progress and the arcade hall (design + plan)

*Autonomous run (the user asked for every phase in a row, each checked by an independent agent).*

## Goal
A kid who closes the tab and comes back finds everything as it was: code, stars, the step they were on. From the arcade hall they see where they are and pick up where they left off.

## Saved progress: `src/lessons/progress.ts` (pure, unit-tested)
- The `localStorage` key is `bitarcade:v1` (as in the original spec, §10).
- Data shape: `{ v: 1, exercises: { "<lessonId>/<stepId>": { code, stars, hintsShown, done } }, at: { "<lessonId>": furthestStepReached }, last: { lesson, step } | null }`.
- **Functions:**
  - `loadProgress(storage)` returns an empty progress when the stored data is missing, corrupt or of another version.
  - `saveProgress(storage, p)` never throws, so private mode keeps working.
  - `recordExercise`, `recordStep`, `lessonStars(p, lesson)`, `lessonDone(p, lesson)`, `unlockedCount(p, lessons)` and `resumeStep(p, lesson)`.
- **Unlocking:** lesson N+1 opens once lesson N is done (every exercise step done). Lesson 1 is always open. A direct link (`#/pong/i/j`) still works, so a teacher can send it; the hall only *shows* the locked lessons.
- **Restoring code safely:** saved code is only used if the text outside the zone is unchanged. If the lesson content changed in a new version, the code is discarded and the stars kept. `withZone(source, zoneText)` in `source.ts` builds the `LessonSource` of the restored code: the zone resized, folds after it shifted, and placeholders kept only if the zone is unchanged.

## Engine
- `new LessonEngine(lesson, start, saved?)`, where `saved` maps stepId to a `SavedExercise`.
- `ExerciseState` gains `shown: LessonSource`, which is what the editor opens.
- `reset()` brings back the original `source`.
- `saved(stepId)` returns what is stored.

## Lesson screen
After each change, the code, run, hint, reset and step change are saved.
- **New button:** "🏠" in the header goes to the hall (`#/sala`).
- **End of lesson:** "Següent lliçó →" stays, plus "🏠 Sala".
- **Stars:** the header stars count what is saved.

## Arcade hall `#/sala` (`src/ui/Hall.svelte`)
- **The room:** a dark room with the "BIT ARCADE" sign and Bit in a corner saying a short line. It is "Benvingut de nou!" if there is progress, "Comencem per la primera màquina!" if not.
- **The PONG cabinet:**
  - It is lit (neon) and holds the list of the 8 planned lessons plus 🏆.
  - Each existing lesson shows its number, title, stars `⭐ x/y` and a state: done ✓, current (pulsing) or locked 🔒.
  - Planned lessons that don't exist yet show "Properament".
- **Other machines:** BRICK, SNAKE and ??? show TV static and "Properament".
- **Buttons:**
  - "▶ Continua: lliçó N" (big) goes to `last`, or to the first incomplete lesson.
  - A click on an open lesson goes to its resume step.
- **Reset progress:** "Esborra el progrés" at the bottom, with a double click and "Segur?" for 3 s (the same pattern as ⟲).
- **Phones (landscape):** the cabinet on the left and the lesson list scrolling on the right. Buttons are at least 44 px.

## Routing
- A root URL with no hash: intro the first time; afterwards → `#/sala`.
- After the intro: lesson 1 (as now).
- `#/sala` shows the hall.
- `#/pong/i/j` works as today.

## Tests
- **Unit:**
  - progress: corrupt data, version, saving, unlocking, stars, resume;
  - `withZone`;
  - engine restore and reset;
  - route `#/sala`.
- **e2e:**
  - solve lesson 1 step 1, reload, and the code and stars are still there;
  - the hall lists lessons with stars and lock;
  - Continue goes to the right place;
  - reset progress needs two clicks;
  - 🏠 from a lesson goes to the hall;
  - phone layout of the hall.

## Rulings
- Direct links are not blocked by locking. A teacher may need to send any link.
  - Cost if wrong: a kid can skip lessons by editing the URL, which is acceptable.
- Code edits are saved on every change, with no debounce. `localStorage` is synchronous but tiny.
  - Cost: none measurable for 1–2 KB.
