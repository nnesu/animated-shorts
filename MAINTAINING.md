# Maintaining this skill

Read before changing the skill itself (docs, starter, engine, scripts). Not needed to make a short.

## What the skill optimises for
1. The finished short looks right (house style) and passes QA.
2. Few tokens per short: every byte a model reads on each run costs the user money, many times over.

A change that adds reading without removing more, or trades away quality, makes the skill worse. When unsure, do not add.

## Where things live
| Thing | Live (edit here) | Copy / notes |
|---|---|---|
| Engine | project `src/shared/` | `templates/shared/` (exact copy, never edit) |
| Scripts | project `scripts/` | `templates/scripts/` (exact copy, never edit) |
| Audio tools | `templates/audio/` | only here, run in place |
| Starter | `templates/starter/` | test it as `src/videos/_starter/` (procedure below) |
| Models | project `public/models/` (`INDEX.txt`, `SOURCES.md`, `chars3d/` baked by `scripts/bake_cast.mjs`) | the only model folder |
| Sound | project `sfx/` (`LICENSES.md`), voice takes `voiceover/<name>/` | |
| Finished shorts | `src/videos/<name>/` (current engine), `src/archive/<name>/` (old engine, excluded from tsc and `Root.tsx`) | never edited |
| Backups | `out/skill_backup/<date>/` | the project is not a git repo; the skill folder is |

## Docs: who reads what
| File | Read when | Rule |
|---|---|---|
| `SKILL.md` | every run | "Where to look" map, rules, the 12 steps. Keep under about 7 KB. |
| `references/API.md` | before coding | Replaces reading engine source. Must match the code exactly. |
| `references/LOOK.md`, `SCRIPT.md`, `QA.md`, `SOUND.md`, `RENDER.md`, `GOTCHAS.md` | per step | One topic each; each opens with one "Read when" line. No history, no dates. |
| `references/LOOK_MATCH.md`, `house/GRADER_PROMPT.md` | look changes only | |
| `references/STYLE_BIBLE.md`, `reports/` | almost never | Study material. Never trim without the user. |

A rule lives in exactly one file: the one that owns its topic. The others point to it.

## Decided by the user: do not change without asking
- Final export 1080x1920 only; drafts (`--draft`) for revisions, 1080p once after approval; fixes re-render changed chunks only.
- World: compact enclosed areas, horizon always covered, rich dressed sets, no flat surfaces, physically plausible, 90 % library models (Quaternius first), coded models copy the library style, motivated light only.
- Characters: baked Quaternius templates (`chars3d`), face painted into the skin, one ink weight 2.2 px, skin outline only, subject centred, props held with two-hand IK, overlays with a drop shadow.
- Camera: one take per area, cuts only for place or time, no creep, fill-in pans after 3 quiet seconds.
- No 0-10 score is ever a gate. No anchor images. Look changes are judged pairwise, before against after.
- Stills QA: agent on the first full set, self-checks after fixes, one agent check before the render, then the user approves the stills. After the final render the review player's Submit is the go-ahead for fixes (stills first only when `TOTAL` changes). Never an open "repeat until the agent is clean" loop.
- Sound effects from free libraries first; music is short cues per scene, generation allowed; narration pauses about 0.2 s; -15 LUFS.
- Finished shorts are never edited; molasses and microwave are reference only.
- `out/<name>/comments.json` holds the user's review notes: resolve with `review.mjs --resolve`, never delete or reword. Submit writes `out/<name>/submit.json`, consumed by `review.mjs --wait-submit`.
- `REMOTION_TMP=C:/remotion-tmp` on this PC.
- Look tweaks: one still first, then wait. No clip render unless asked. No rules for rare edge cases.

## Where a change goes
- Applies to every short and can be code: put it in the engine (`src/shared/`), not a doc. A rule the engine enforces cannot be forgotten.
- Applies to every short and is a judgment: one line in the reference file that owns the topic.
- Story-specific: not in the skill.
- A lesson from one short: only if it will recur, as one line in `GOTCHAS.md` under the right heading, with the fix and without the story.
- Never add engine code to the starter. A new ability goes in a kit, its signature in `API.md`.

## Procedures

### Engine or starter change
1. Back up: copy the skill, `src/shared/`, `scripts/` to `out/skill_backup/<date>/`.
2. Baseline: copy `templates/starter/*` to `src/videos/_starter/` and `templates/sandbox_index_example.tsx` to `src/sandboxes/_starter/index.tsx`, then
   `REMOTION_TMP=C:/remotion-tmp BRIDGE_ENTRY=src/sandboxes/_starter/index.tsx COMP=StarterShort node scripts/bridge-stills.mjs out/_base/s_ 60,118,150,215 0.5`
   (plus `COMP=BaseballMudShort ... out/_base/bm_ 517,1450,2112 0.5` for a finished short on the current engine).
3. Make the change.
4. `npx tsc --noEmit`. Six `TS2322` lines in `src/shared/short.tsx` are known and harmless; anything else is yours.
5. Render the same frames to `out/_new/` and compare. A refactor must be pixel-identical; a look change must differ only where intended. View the stills yourself.
6. Starter changed: copy `src/videos/_starter/*` back to `templates/starter/`; run `python scripts/bridge_shots.py` on its `story.ts` (regex parser).
7. `node scripts/skill_sync.mjs`, run the `cp` lines it prints, until it reports a match.
8. Update `API.md` for every signature or name that changed.
9. Delete `src/videos/_starter`, `src/sandboxes/_starter`, `out/_base`, `out/_new`.

An engine change that breaks a finished short's compile: move that short to `src/archive/` and drop it from `src/Root.tsx` (one failing short blocks every bundle).

### Script change
Edit in `scripts/`, run it once on a real file, then `skill_sync.mjs`. Update the command wherever a doc quotes it (grep the script name in the skill).

### Doc change
- After any rename or deletion: grep the old name across the skill and the project. No doc may point at a missing file, function or step.
- Refer to steps by name, not number, outside `SKILL.md`.
- Prompts given to agents (`QA.md`, `GRADER_PROMPT.md`) were tuned by test. Changing their wording needs a re-test on stills with known answers; the result line under the prompt in `QA.md` records the last one.

## Known traps
- `templates/shared/` looks like the place to edit. It is a copy; `skill_sync.mjs` flags the difference.
- Script names starting with `bridge` are history only; they serve every short. Do not rename them: every doc quotes them.
- Not installed on this PC: scipy, Pillow. Do not add code that needs them.
- `houseLook: false` in `makeShort()` compiles but has not been rendered on the current engine.
- Quaternius textures: a still takes 30-40 s, full renders several times longer than the old Kenney town.
- A new reference file is rarely the answer. First try one line in an existing one.

## Check before you finish
- [ ] `SKILL.md` did not grow, or something else shrank by more.
- [ ] Nothing in the "decided by the user" list changed without the user saying so.
- [ ] Starter and baseball-mud stills render and were compared with the baseline.
- [ ] `skill_sync.mjs` reports a match.
- [ ] No dangling names: grep every file, function and constant you renamed or removed.
- [ ] Told the user what is still untested.
