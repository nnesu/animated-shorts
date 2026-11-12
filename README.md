# Claude Animated Shorts

A Claude Code skill that turns a short true story into a finished vertical video (1080x1920, about 40-90 s): flat 2D cartoon characters in a painted 3D world, narrated, with sound effects and scene music. Claude researches the facts, writes the script, plans and builds every shot in three.js inside Remotion, checks stills, renders on your PC and mixes the audio. You approve the script and the stills, then review the final in a frame-accurate player; no AI video generator is used.

## What's inside
| Path | What it is |
|---|---|
| `SKILL.md` | The skill: the rules and the 12-step pipeline; details live in `references/` |
| `MAINTAINING.md` | For whoever changes the skill: map, fixed rules, safe-change procedures |
| `IMPROVEMENT_PLAN.md` | The latest round of skill changes, written for an AI reader: what changed and why |
| `templates/starter/` | Four small per-video files (story, world, cast, composition) holding only story data, with a 2-shot demo |
| `templates/SCRIPT_example.md` | The narration script layout (format only; length follows the story) |
| `templates/sandbox_index_example.tsx` | Entry file for test renders when changing the engine |
| `templates/shared/` | The engine: camera, world, character cards, post chain, look code |
| `templates/audio/` | `build_mix.py`: the ffmpeg mix of voice + free CC0 samples + optional scene-based music cues (`music_cues.py`, template `music_example.py`, numpy only; never a continuous track) to -15 LUFS |
| `templates/scripts/` | Stills, side-by-side sheets, shot merge, word timings (faster-whisper), voice pause trimming, resumable chunked render, frame-by-frame + pass/fail QA, scene-geometry QA, skill/live sync check, stills diff for patch renders, frame-accurate review player (Submit wakes the agent) |
| `references/STYLE_BIBLE.md` | The script and visual formula measured from 20 reference shorts |
| `references/reports/` | Seven measured reports (motion, depth, textures, characters, lighting, outlines, grade) plus their context notes |
| `references/API.md`, `LOOK.md`, `QA.md`, `SOUND.md`, `RENDER.md`, `GOTCHAS.md` | One file per topic, read on demand: code map, house look, checks, sound, rendering, known traps |
| `references/LOOK_MATCH.md` | The original reference look and the look-match loop (rarely needed) |
| `references/house/GRADER_PROMPT.md` | The pairwise before/after grader prompt (look-change loops only; no absolute scores) |

## Install
1. Copy this folder to `~/.claude/skills/cartoon-3d-short/` (clone it there, or download the ZIP).
2. You need a [Remotion](https://www.remotion.dev/) project with `@remotion/three` and three.js, plus Node, ffmpeg, and Python 3 with `numpy` and `faster-whisper`. Claude copies the engine (`templates/shared/`) and scripts (`templates/scripts/`) into the project on the first short.
3. 3D props are free CC0 [Kenney](https://kenney.nl/) packs, unpacked into `public/kenney/<pack>/` with an `INDEX.txt`; Claude fetches any pack a story needs.
4. You record the narration yourself (any TTS or your own voice) when Claude asks for it.
5. In Claude Code, say: *"Use the cartoon short skill and make a short about …"*.

Claude then follows `SKILL.md`: topic and facts, script (you approve it), voice, shot plan in `story.ts`, build, stills (an agent checks them against a defect checklist; you approve them), sound, final 1080x1920 render and mix, then the review loop below.

## Review loop
After the final render passes QA, Claude opens a frame-accurate review player in the Claude desktop app's browser pane (elsewhere, open `http://127.0.0.1:5177` yourself). Leave notes on any frame (tag them look, audio, timing, horizon or other, and drag a box to point at a spot), then press **Submit**. Claude wakes up, fixes the notes, re-renders only the changed parts and opens the player again. With no open notes the button reads **Approve**: Claude then delivers, writes a postmortem for the next short and clears the short's working files. A fix that changes the video's length shows you stills before re-rendering. Without Submit, say "read comments" to have Claude read the notes.

## Notes
- Set `REMOTION_TMP` to a folder on a drive with space (this skill uses `C:/remotion-tmp`). Every Remotion bundle copies `public/` (~1.3 GB) into it; Claude deletes a short's bundles after delivery.
- Fixes re-render only the changed chunks of the video, not the whole render.
- Voice pauses are trimmed tight by default (pauses and breath gaps cut to 0.16 s).
- Story, characters and voice should always be your own. Use the references for the look, not the content.

## License
The code and docs are MIT (see `LICENSE`). `references/STYLE_BIBLE.md` and `references/reports/` are text notes measured from another channel's shorts, for style study only: no frames or video are included, and the skill never copies that channel's scripts, characters or shots.
