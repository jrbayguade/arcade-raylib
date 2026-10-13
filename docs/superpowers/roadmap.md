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
| 2 | Progress saved in `localStorage` + arcade hall (lesson map, continue, reset progress) | ⏳ |
| 3 | Lessons 4–8 (if, comparisons, bounce, &&, counters) + final challenge (opponent) | ⏳ |
| 4 | Touch controls for playing (▲▼) + download `main.c` | ⏳ |
| 5 | Minor items: empty last line, Continua fade-in, Bit stops narrating after Run, frames card at 1920, done text at 1366 | ⏳ |
| 6 | Spanish and English (UI + lessons) with a language selector | ⏳ |

Out of scope for this run: a second playable machine. The original spec warns against adding machines before Pong has been validated with real kids.

## Autonomous decisions (summary for the user)
Each phase adds its rulings here.
