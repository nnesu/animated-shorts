---
name: cartoon-3d-short
description: Make a vertical cartoon story short (about 40-90 s) in the "cartoon characters in a painted 3D world" style, with voice narration, free CC0 sound effects and scene-based music, rendered with three.js inside Remotion at 1080x1920. Use when the user asks for a video "like the bridge video", "in that cartoon 3D style", a history/science story short with cartoon characters in 3D, or says "use the cartoon short skill".
---

# Cartoon 3D story short (three.js + Remotion)

Commands run from the project root, in Bash. `SK` = `.claude/skills/cartoon-3d-short`.

## Where to look
| Task | Read / use |
|---|---|
| Script, hook, zone map | `references/SCRIPT.md`; layout `templates/SCRIPT_example.md` |
| Writing `story.ts` / `world.ts` (signatures) | `references/API.md` (never the engine source, never old shorts) |
| How it must look: hook, sets, light, camera, characters | `references/LOOK.md` |
| Known traps (voice, props, framing, this PC) | `references/GOTCHAS.md` |
| Pacing pass, stills check, review player | `references/QA.md` |
| SFX, music, mix | `references/SOUND.md` |
| Final render, film finish, memory, patch renders | `references/RENDER.md` |
| Models | `public/models/INDEX.txt` (grep), sources `public/models/SOURCES.md`, cast `public/models/chars3d/` |
| Sound files | `sfx/` (licences `sfx/LICENSES.md`), voice takes `voiceover/<name>/` |
| Engine / scripts (live code) | `src/shared/`, `scripts/` (copies in `SK/templates/`: never edit those) |
| Changing the skill itself | `MAINTAINING.md` first |
| Changing the look itself | `references/LOOK_MATCH.md`, `references/house/GRADER_PROMPT.md` |

Finished shorts in `src/videos/` and `src/archive/` are never edited. Quality reference: `src/archive/gimli-glider/` (the user's best short; its `POSTMORTEM.md` lists every note). `references/STYLE_BIBLE.md` and `references/reports/` are study material from another channel: never copy its scripts, characters or shots, never name it.

## Rules
- No captions or labels. English only. One steady voice tone. Jokes are researched real facts. Length 40-90 s.
- Final export 1080x1920 at 30 fps, never `--scale`. Mix -15 LUFS.
- At least 90 % of on-screen content comes from model libraries (Quaternius first); code only what no pack has.
- Standing approval for free, no-copyright SFX and 3D models: check the licence on the file's page, skip attribution / non-commercial / share-alike, log it in `sfx/LICENSES.md` (models also in `public/models/SOURCES.md`), say what you fetched and how big. Ask before logins, payments, other downloads, or installing packages.
- Look tweaks: render one still, show it, wait. Never start a clip render unasked.
- Revisions render as drafts (`--draft`); 1080p once, after approval. Fixes re-render only changed chunks (`--redo`).
- No guards or rules for rare cases.
- Stills checklist: `references/QA.md`. No absolute score is ever a gate.
- Save after every step. Two stops for the user: script and zone map, then the final stills before the final render. After that the review player's Submit approves fixes (a `TOTAL` change shows stills first).

## Pipeline
1. **Topic and facts.** One surprising true story with a visual, physical cause and effect, plus an everyday analogy. Facts with sources go at the top of `src/videos/<name>/SCRIPT.md`.
2. **Script and zone map** (`references/SCRIPT.md`). Word count = seconds x words/s measured from a one-sentence sample of the voice (no sample: 3, check after the take). Write the self-check into `SCRIPT.md`, then the zone map. **Stop until the user approves both.**
3. **Video folder and cast** (while the user records). Copy `templates/starter/*` to `src/videos/<name>/`, rename `Short.tsx` to `<Name>.tsx` and `StarterShort` / `STARTER_FRAMES` inside it, register it in `src/Root.tsx`. Replace the parts marked `EXAMPLE`. Missing `src/shared/` or `scripts/` files: copy from `templates/`. Cast: `public/models/chars3d/`; bake missing ones with `node scripts/bake_cast.mjs <Name ...>`.
4. **Build the zones** (no timing needed). Grep `public/models/INDEX.txt`, table the picks in `src/videos/<name>/PROPS.md`. Missing model: fetch a free CC0 pack into `public/models/<pack>/`, append it to `INDEX.txt` and `SOURCES.md`. Sets, rooms, light sources, cast on their spots. Show one establishing still per zone and carry on unless the user objects.
5. **Voice.** The user drops the take in `voiceover/<name>/` (`voice_raw.wav`, or numbered parts joined in order with ffmpeg). `python scripts/voice_trim.py voiceover/<name>/voice_raw.wav voiceover/<name>/voice.wav`, then `python scripts/words_whisper.py voiceover/<name>/voice.wav voiceover/<name>/words.json`. Never read `words.json`: print it as `word@frame` (`references/GOTCHAS.md` "Voice").
6. **Shot plan** in `story.ts`: `TOTAL` = ceil(voice seconds x 30), `SHOTS`, `XFADE`, `FLASH_AT`, `CAMS` (one `chain()` per area), `WHIPS`, `KICKS`, `DOF_V2`. Plan the hook first (`references/LOOK.md` "Hook"), then a visual per line on its word; pans inside a zone, whip / fly-through between zones ("Camera").
7. **Animate.** `world.ts`: hero-object and prop animation in `pose()`, `CAST` actors (clip, expression, blinks, held props). `<Name>.tsx`: name and `poolShots`. The look is built into the engine; never edit `src/shared/` for one video.
8. **Pacing pass and stills check** (`references/QA.md`) before any long render. **Stop until the user approves the stills.**
9. **Sound prep** (`references/SOUND.md`): `sfx/<name>_events.json`, `sfx/<name>_music_cues.json`.
10. **Final render** (`references/RENDER.md`): `render_chunks.mjs` with `memguard.ps1` running, then `film_finish.py`.
11. **Mix and QA.** Music and mix (`references/SOUND.md`; voice-only shorts mux the voice), then `bridge_shots.py` and `short_qa.py` (`references/QA.md` "After the final render", must exit 0). Then the review player: `references/QA.md` "User review".
12. **Deliver** (on `submit: approved`). Send `video_final.mp4` (over 30 MB: a preview plus the path). Write `src/videos/<name>/POSTMORTEM.md` (AI reader; layout of `src/archive/gimli-glider/POSTMORTEM.md`: build-phase direction, every note and its fix, errors, checklist). Keep only `video_final.mp4`, `comments.json` and `shots.json` in `out/<name>/`, delete this short's bundles in `C:/remotion-tmp`, update memory.
