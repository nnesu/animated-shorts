# Maintaining this skill

Read this before changing the skill itself (docs, starter, engine, scripts). It is not needed to make a short.

## What the skill optimises for
1. The finished short looks right (house look) and passes QA.
2. Few tokens per short. Every byte a model must read on each run costs the user money, dozens of times over.

A change that adds reading without removing more, or that trades away quality, makes the skill worse. When unsure, do not add.

## Map
| Part | Read when | Rule |
|---|---|---|
| `SKILL.md` | every run | Rules and the 12 steps only. Keep under about 7 KB. Details go to `references/`. |
| `references/API.md` | every run, before coding | Replaces reading engine source. Must match the code exactly. |
| `references/QA.md`, `SOUND.md`, `RENDER.md`, `GOTCHAS.md`, `LOOK.md` | on demand, per step | One topic each. No history, no dates, no "moved from". |
| `references/LOOK_MATCH.md`, `house/GRADER_PROMPT.md` | rarely (look changes) | |
| `references/STYLE_BIBLE.md`, `reports/` | almost never | Study material. Never trim without the user. |
| `templates/starter/` | copied per short | Story data only, 4 files, about 8 KB. A 2-shot demo marked `EXAMPLE`. |
| `templates/shared/`, `templates/scripts/` | copies | Exact copies of the project's `src/shared/` and `scripts/`. Never edit these copies. |
| `templates/audio/` | run in place | Only lives here. |

Live code is in the project: `src/shared/` (engine) and `scripts/`. Edit there, then sync (below).

## Decided by the user: do not change without asking
- Final export 1080x1920 only. Fixes re-render changed chunks only.
- Every shot hides the horizon.
- No 0-10 score is ever a gate. No anchor images. Look changes are judged pairwise, before against after.
- Stills QA order: agent on the first full set, self-checks after fixes, one agent check before the render, then the user approves the stills. After the final render the review player's Submit is the go-ahead for fixes (stills first only when `TOTAL` changes). Never an open "repeat until the agent is clean" loop.
- Sound effects from free libraries first; music is one short cue per scene, generation allowed.
- Finished shorts in `src/videos/` are never edited. Bridge, microwave, molasses and slinky keep their own older code; marathon uses the kits, so an engine change alters it on re-render.
- Sets are rich by default: packed crowds, ornaments, textures, flags. No flat-colour or plain-texture walls.
- `out/<name>/comments.json` holds the user's review notes. Resolve them with `review.mjs --resolve`; never delete or reword them. Submit writes `out/<name>/submit.json`, consumed by `review.mjs --wait-submit`.
- `REMOTION_TMP=C:/remotion-tmp` on this PC.

## Where a change goes
- Applies to every short and can be code: put it in the engine (`src/shared/`), not in a doc. A rule the engine enforces cannot be forgotten.
- Applies to every short and is a judgment: one line in `SKILL.md` rules or the matching reference file. Say it once, in one file.
- Story-specific: it does not belong in the skill.
- A lesson from one short: add it only if it will recur, as one line in `GOTCHAS.md` under the right heading, with the fix and without the story of how it was found.
- Never add engine code to the starter. If the starter needs a new ability, add it to a kit and document the signature in `API.md`.

## Procedures

### Engine or starter change
1. Baseline first. Copy `templates/starter/*` to `src/videos/_starter/` and `templates/sandbox_index_example.tsx` to `src/sandboxes/_starter/index.tsx`, then:
   `REMOTION_TMP=C:/remotion-tmp BRIDGE_ENTRY=src/sandboxes/_starter/index.tsx COMP=StarterShort node scripts/bridge-stills.mjs out/_base/s_ 60,118,150,215 0.5`
2. Make the change.
3. `npx tsc --noEmit`. Six `TS2322` lines in `src/shared/short.tsx` (and the same in older shorts) are known and harmless; anything else is yours.
4. Render the same 4 frames to `out/_new/s_` and compare. A refactor must be pixel-identical; a look change must differ only where intended. View the stills yourself.
5. Starter changed: copy `src/videos/_starter/*` back to `templates/starter/`. Run `python scripts/bridge_shots.py` on its `story.ts`: it parses that file by regex.
6. `node scripts/skill_sync.mjs` and run the `cp` lines it prints, until it reports a match.
7. Update `API.md` for every signature or name that changed.
8. Delete `src/videos/_starter`, `src/sandboxes/_starter`, `out/_base`, `out/_new`.

### Script change
Edit in `scripts/`, run it once on a real file, then `skill_sync.mjs`. Update the command wherever a doc quotes it (grep the script name in the skill).

### Doc change
- After any rename or deletion: grep the old name across the skill. No doc may point at a missing file, function or step.
- Refer to steps by name, not number, outside `SKILL.md`.
- Prompts given to agents (`QA.md`, `GRADER_PROMPT.md`) were tuned by test. Changing their wording needs a re-test on stills with known answers; the result line under the prompt in `QA.md` records the last one.

### Deleting anything
Copy it to `out/_skill_backup/<date>/` first. The project is not a git repository, so there is no other undo.

## Known traps
- `templates/shared/` looks like the place to edit. It is a copy; `skill_sync.mjs` will flag the difference.
- The script names start with `bridge` for history only. They serve every short. Do not rename them: every doc quotes them.
- Not installed on this PC: scipy, Pillow. Do not add code that needs them.
- `houseLook: false` in `makeShort()` compiles but has never been rendered.
- A new reference file is rarely the answer. First try one line in an existing one.

## Check before you finish
- [ ] `SKILL.md` did not grow, or something else shrank by more.
- [ ] Nothing in the "decided by the user" list changed without the user saying so.
- [ ] Starter stills render and were compared with the baseline.
- [ ] `skill_sync.mjs` reports a match.
- [ ] No dangling names: grep for every file, function and constant you renamed or removed.
- [ ] Told the user what is still untested.
