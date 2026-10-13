# Bit Arcade — full roadmap (autonomous run from 2026-10-13)

The user asked for every phase to be done in a row, each checked by an independent agent (no manual checks on their side).

Each phase works the same way:
- a short design and plan in `docs/superpowers/specs/`;
- implementation with TDD;
- vitest, e2e run twice, and build;
- push to `main` and a green CI;
- an independent reviewer agent (code + UI), iterating until "ship as is".

| Phase | Content | Status |
|---|---|---|
| 1 | Lesson 3 "La pilota es mou" + 🐢 slow motion | ✅ done (UI review "ship as is") |
| 2 | Progress saved in `localStorage` + arcade hall (lesson map, continue, reset progress) | ✅ done (UI review "ship as is") |
| 3 | Lessons 4–8 (if, comparisons, bounce, &&, counters) + final challenge (opponent) | ✅ done (teacher review for each lesson + UI review "ship as is") |
| 4 | Touch controls for playing (▲▼) + download `main.c` | ✅ done |
| 5 | Minor items: empty last line, Continua fade-in, Bit stops narrating after Run, frames card at 1920, done text at 1366 | ✅ done |
| 6 | Spanish and English (UI + lessons) with a language selector | ⏳ |

Out of scope for this run: a second playable machine. The original spec warns against adding machines before Pong has been validated with real kids.

## Autonomous decisions (summary for the user)
Each phase adds its rulings here.
- Direct links to locked lessons still work (a teacher may send one); the hall only shows the lock.
- Code is saved on every change (typing is debounced by 300 ms); saved code that no longer fits a changed lesson is discarded, but the stars are kept.
- New lessons keep the paddles 20 px from the top and the bottom (y between 20 and 350), as the teacher review suggested.
- Lesson 7 writes long `&&` conditions with one question per line; the aiming step gives the top-half `if` and asks only for the bottom half.
- The final rival moves at 4 px per frame; hitting the edge of your paddle sends the ball off steeper (±5), which is how you beat it.
- `'` is no longer auto-paired in the editor (Catalan apostrophes; the course has no char literals).
- Keys go to the game automatically after ▶ on steps that use keys; touch screens get see-through on-screen buttons.
