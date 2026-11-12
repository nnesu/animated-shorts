# Claude Animated Shorts

The free Claude skill from the video **"How to Make Viral Animated Shorts Using Claude (Full Workflow)"**.

It makes vertical animated story shorts (length follows the story, about 40-90 s): 2D characters in a colourful 3D world, with ink outlines, a painted town, lens blur, gliding cameras and free CC0 sound effects and a quiet background music bed ducked under the voice. Everything is rendered with three.js inside Remotion on your own PC, with no AI video generator.

Used for five shorts so far (bridge, microwave, molasses, slinky, marathon).

## What's inside
| Path | What it is |
|---|---|
| `SKILL.md` | The skill: the rules and the 12-step pipeline; details live in `references/` |
| `MAINTAINING.md` | For whoever changes the skill: map, fixed rules, safe-change procedures |
| `templates/starter/` | Four small per-video files (story, world, cast, composition) holding only story data, with a 2-shot demo |
| `templates/shared/` | The engine: camera, world, character cards, post chain, look code |
| `templates/audio/` | `build_mix.py`: the ffmpeg mix of voice + free CC0 samples + optional scene-based music cues (`music_cues.py`, template `music_example.py`, numpy only; never a continuous track) to -15 LUFS |
| `templates/scripts/` | Stills, side-by-side sheets, shot merge, word timings (faster-whisper), voice pause trimming, resumable chunked render, frame-by-frame + pass/fail QA, scene-geometry QA, skill/live sync check, stills diff for patch renders, frame-accurate review player |
| `references/STYLE_BIBLE.md` | The script and visual formula measured from 20 reference shorts |
| `references/reports/` | Seven measured reports: motion, depth, textures, characters, lighting, outlines, grade |
| `references/API.md`, `LOOK.md`, `QA.md`, `SOUND.md`, `RENDER.md`, `GOTCHAS.md` | One file per topic, read on demand: code map, house look, checks, sound, rendering, known traps |
| `references/LOOK_MATCH.md` | The original reference look and the look-match loop (rarely needed) |
| `references/house/GRADER_PROMPT.md` | The pairwise before/after grader prompt (look-change loops only; no absolute scores) |

## Install
1. Copy this folder to `~/.claude/skills/cartoon-3d-short/` (clone it there, or download the ZIP).
2. You need [Remotion](https://www.remotion.dev/) with `@remotion/three`, plus Node, Python 3 and ffmpeg.
3. In Claude Code, say: *"Use the cartoon short skill and make a short about …"*.

Claude then follows `SKILL.md`: topic and facts, then script, then voice, then the shot plan in `story.ts`, then stills, then renders. An agent checks mid-shot stills against a defect checklist, and you get the final 1080x1920 render and sound mix.

## Notes
- Set `REMOTION_TMP` to `C:/remotion-tmp`. Every Remotion bundle copies `public/` (~1.3 GB) into the temp folder.
- Story, characters and voice should always be your own. Use the references for the look, not the content.

## License
The code and docs are MIT (see `LICENSE`). The reference frames are included for style study only.
