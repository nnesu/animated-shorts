---
name: cartoon-3d-short
description: Make a vertical cartoon story short (about 40-90 s) in the "2D cartoon characters in a painted 3D world" style, with voice narration, free CC0 sound effects and scene-based music, rendered with three.js inside Remotion at 1080x1920. Use when the user asks for a video "like the bridge video", "in that cartoon 3D style", a history/science story short with cartoon characters in 3D, or says "use the cartoon short skill".
---

# Cartoon 3D story short (three.js + Remotion)

Commands run from the project root, in Bash (not PowerShell). `references/` and `templates/` are relative to this skill; `SK` = `.claude/skills/cartoon-3d-short`.

Finished shorts in `src/videos/` are never edited. Do not read them to learn the code: `references/API.md` is the map.

`references/STYLE_BIBLE.md` and `references/reports/` are study material from another channel. Never copy that channel's scripts, characters or shots, never name it in a voice-over or description.

## Rules
- No captions or labels. English only. One steady voice tone. Jokes are researched real facts.
- Every shot hides the horizon behind buildings, trees with 2-3 m bushes in the trunk gaps, or a far hill. Fill only what the camera sees. Sets are rich: packed crowds, ornaments, textures, flags.
- Final export is 1080x1920 at 30 fps, never `--scale`.
- Mix: voice, free CC0 SFX about 6 dB under it, scene-based music cues (never one continuous track) ducked under the voice, whole mix at -15 LUFS.
- Standing approval for free, no-copyright SFX and 3D models: check the licence on the file's page, skip attribution / non-commercial / share-alike, log it in `_sfx/LICENSES.md`, say what you fetched and how big. Ask before logins, payments, other downloads, or running a package that is not installed.
- Stills checklist (`references/QA.md`, order in step 8): Opus-medium agent. No absolute score is a gate.
- Fixes re-render only the changed chunks (`--redo`), never the whole video.
- Save after every step. Two stops for the user: script approval, and approval of the final stills before the final render. Then the review player's Submit approves fixes (a `TOTAL` change shows stills first). Otherwise work through to delivery without asking.

## Pipeline
1. **Topic and facts.** One surprising true story with a visual, physical cause and effect, plus an everyday analogy. Facts with sources go at the top of `src/videos/<name>/SCRIPT.md`.
2. **Script.** Length follows the story. Word count = seconds x words/s, measured from a one-sentence sample of the chosen voice (no sample: assume 3 and check after the take). Beats: hook (absurd fact, one line), setting (year, place, pride), action (3-4 escalating beats), snap, deadpan ("Luckily ... / Unluckily ..."), explanation (one idea, everyday analogy), consequence, callback twist. Never describe what the viewer already sees. Layout only: `templates/SCRIPT_example.md`. **Stop here until the user approves the script.**
3. **Voice.** The user generates the take into `_voiceover/<name>/voice_raw.wav`. Then `python scripts/voice_trim.py _voiceover/<name>/voice_raw.wav _voiceover/<name>/voice.wav` and `python scripts/words_whisper.py _voiceover/<name>/voice.wav _voiceover/<name>/words.json`. Everything is timed to `words.json`: never read it, print it as `word@frame` and fix wrong words with a short script.
4. **Video folder.** Copy the four files in `templates/starter/` into `src/videos/<name>/`, rename `Short.tsx` to `<Name>.tsx` and `StarterShort` / `STARTER_FRAMES` inside it, register the composition in `src/Root.tsx`. They hold story data plus a 2-shot demo marked `EXAMPLE`. Read `references/API.md` before editing. If `src/shared/` or `scripts/` is missing or lacks a file, copy it from `templates/shared/` or `templates/scripts/`.
5. **Prop sweep.** For each beat, grep `public/kenney/INDEX.txt` and table the picks in `src/videos/<name>/PROPS.md`. Missing prop: fetch a free CC0 pack (`references/GOTCHAS.md`) into `public/kenney/<pack>/`, append it to `INDEX.txt`, add `<pack>/<model>` to `KENNEY` in `world.ts`.
6. **Shot plan** in `story.ts`: `TOTAL` = ceil(voice seconds x 30), then `SHOTS`, `XFADE`, `FLASH_AT`, `CAMS`, `KICKS`, `DOF_V2`. Visual reactions land 0-3 frames before their word. Every hold creeps in. Every looping motion gets an explicit switch time.
7. **Build the shots** by replacing the `EXAMPLE` parts. The house look is built into the engine (`references/LOOK.md`); never edit `src/shared/` for one video.
   - World (`world.ts`): sets, props, materials, moving props in `pose()`. Sky, lights, town and sight-line culling come from the engine. Pass `keep = true` to `prop()` for hero props.
   - Characters (`cast.ts`): outfits and one `stage()` case per staging. Cards, blinks and shadows come from the engine.
   - Composition (`<Name>.tsx`): name and `poolShots` only. The post chain is in the engine.
8. **Stills check, before any long render** (`references/QA.md`): mid-frame still of every shot, scripted checks, agent check, fix and self-check, second agent check, fix and self-check. **Stop here until the user approves the stills.**
9. **Sound prep** (`references/SOUND.md`): SFX events in `_sfx/<name>_events.json`, music cues in `_sfx/<name>_music_cues.json`.
10. **Final render** (`references/RENDER.md`): `REMOTION_TMP=C:/remotion-tmp node scripts/render_chunks.mjs <Comp> out/<name>/video.mp4 <TOTAL>`.
11. **Mix and QA.** Assemble the music (`music_cues.py`, see `references/SOUND.md`), then `python SK/templates/audio/build_mix.py _voiceover/<name>/voice.wav out/<name>/video.mp4 out/<name> _sfx/<name>_events.json [_sfx/<name>_music.wav]` writes `video_final.mp4`. Then `python scripts/bridge_shots.py src/videos/<name>/story.ts out/<name>/shots.json` and `python scripts/short_qa.py out/<name>/video_final.mp4 out/<name>/qa out/<name>/shots.json --voice _voiceover/<name>/voice.wav`, which must exit 0. Fix with `render_chunks.mjs ... --redo A-B,C-D`, then mix and QA again. Then the review player: `references/QA.md` "User review".
12. **Deliver** (on `submit: approved`). Send `video_final.mp4` (over 30 MB: a preview plus the path). Write `src/videos/<name>/POSTMORTEM.md` (errors, fixes, user notes, rules; AI reader). Then keep only `video_final.mp4`, `comments.json` and `shots.json` in `out/<name>/`, delete this short's bundle folders in `C:/remotion-tmp`, update memory.

## Reference files
| File | Read when |
|---|---|
| `references/QA.md` | stills check, checklist prompt, `short_qa` |
| `references/SOUND.md` | SFX libraries, music cues, mix |
| `references/RENDER.md` | render settings, patch loop, resuming |
| `references/API.md` | before editing the starter files: what goes where, function signatures |
| `references/GOTCHAS.md` | voice, props and sets, framing traps, this PC |
| `references/LOOK.md` | house look values, camera and character rules |
| `references/LOOK_MATCH.md` | only for the original reference look or a look-match pass |
| `references/house/GRADER_PROMPT.md` | pairwise A/B, only when changing the look |

Changing the skill itself (docs, starter, engine, scripts): read `MAINTAINING.md` first.
