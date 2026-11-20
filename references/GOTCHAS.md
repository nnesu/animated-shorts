# Gotchas

Read when a step goes wrong or before building sets and framing shots: known traps with their fixes, by topic.

## Starter
- Always pass `COMP=<Comp>` for stills (the default composition no longer exists).
- `prop()` and `kitClone()` centre models by bounding box: place every prop with centre coordinates.

## Voice
- `words_whisper.py <wav> <json> [model=small]` writes `[{word, start, end}]` (faster-whisper, CPU). It decodes with ffmpeg and passes a numpy array, because faster-whisper's own decoder breaks with PyAV 19. Keep it that way.
- Trim pauses by measured silence, never by Whisper timings. `voice_trim.py` cuts every pause over 0.2 s, and inner breath gaps of 0.3 s or more, to 0.2 s and writes `voice_trim.json` with an offset table. Keep the raw take, run `words_whisper.py` on the trimmed file, listen once.
- Timings as `word@frame`: `python -c "import json;print(' '.join(f\"{w['word'].strip()}@{round(w['start']*30)}\" for w in json.load(open('voiceover/<name>/words.json'))))"`.
- Pauses still too long after shots are authored: `python scripts/voice_gaps.py` lists pauses, `--set 0.2 <out.wav> <timemap.json>` cuts them and writes knots `[old_s, new_s]` (put `timemap.json` next to `story.ts`). Keep the authored frames and wrap the timeline with `retime()` (`API.md`); remap SFX and cues with `sfx/retime.py`. `bridge_shots.py` applies the map itself.
- `voice_trim.py` refuses to overwrite an existing take (`--force` to re-trim). `words.json` is in trimmed time: a raw time maps to raw minus the `shift` of the last `offsets` row in `voice_trim.json` whose `from` is at or before it. A shorter gap inside a phrase: re-run with `--tight <raw seconds> --force` (cuts it to 0.1 s), then `words_whisper.py` again.

## Props and sets
- A model's name can lie (`Pot_1_Lid` is a whole lidded pot): render it in a still before building on it. Tools and other flat props lying on the ground go at y -0.02, or they float.
- The sight-line culler removes anything blocking a camera ray, per shot (`new World(kit, id)`, `sightLines(id)`). Keep cameras out of the middle of house rows anyway. A hero prop it drops: `prop(..., yaw, true)` or `kitClone`. A sight line through a building leaves the subject standing in a hole.
- Dense thin meshes (springs, wires, coils) go solid black under the ink: put them on the `NOINK` layer.
- Horizon fill: rows of trees with 2-3 m bushes in the trunk gaps, or a far hill mesh (r 30-38, y-scale 0.42). Harbours: far-shore hills plus a house row.
- People at a table stand at least 0.4 m clear of its edge (Table_Large at h 0.8 is about 1.6 x 0.9 m): idle clips sway hands and hips into it. Check a still from the side.
- A house next to an enterable room has no back block (the engine leaves it off); a hand-placed house block touching a room wall shows through it.
- Lights within 9 m of the lens cast point shadows (6 extra scene renders each): at most 3-4 sources near any camera hold.
- Place every set inside its zone: check x/z against water and other sets. Stair boxes span only their own tread.
- A box that crosses another feature (stand tiers through a balcony): split it into runs that stop at the feature.
- A box seen from below (ceiling, roof, canopy, bridge) has no underside: `bx(..., tile, true)`. If its shadow is already approved, keep the box and add a downward plane with `receiveShadow` only.
- Floor quads reach every wall of an enclosed space, or the ground outside shows through the gap.
- Empty stands: `crowdBand()` on every tier.
- Thin decor built from boxes (throne backs, drapes) does not read: paint it on a cut-out plane with `unlit(map, true)`.
- A hung or wall-mounted prop needs a visible mount (bracket, plank, rope).
- A `lamp` light near a wall throws a round pool on it; a face-fill spot reaches past the face onto the wall behind. Face fills: narrow spot, distance about 1.2 m, aimed at the head; check the wall behind in a still.
- Livery / decals placed by rays (`scripts/blender/jet_livery.py`): rays that miss the body hit wings, engines or the tapered nose underside. Filter hits by position (fuselage only, upper nose only) and check a close still of the nose and the wing roots.

## Framing and readability
- Check every shot: subject fully in frame, nothing blocking the lens, close-up scale right (a person, not a giant).
- Anything closer than about 2 m to a lens becomes a cut-off blob at the frame edge. Re-check nearby props whenever a camera moves.
- Cameras end up inside geometry (an engine, a head, a seat, a pole) on new keys and on the straight path between keys: render the keys and one frame mid-path.
- Over-the-shoulder on a cartoon character: heads are about 0.8 m wide. Lens about 1 m to the side and 0.5 m back at head height, the prop raised beside the head, its screen end pointing away from the holder.
- 9:16 frame: horizontal half-width = distance x tan(vfov/2) x 0.5625 (about 0.23 m per metre at fov 44). Budget side-by-side subjects and held props against it.
- A prop the narration names is in frame with the character; a shot introducing a prop shows where it sits (prop centred, surroundings visible).
- A foreground prop must be recognisable or gone (a bush cut by the edge reads as a green ball).
- Rails at chest height cut through characters: put the lens about 2.5 m up so rails cross legs.
- Flags: use the period-correct one (red with a yellow star reads as Vietnam's).
- Painted planes (signs, banners, wall panels, drapes) go grey or purple in shade: `unlit(map)`.
- Thin radial line effects (burst rays) read as sticks on a busy background: leave them out there.
- Nobody appears mid-shot. A character is on screen from the shot's first frame, or walks in from off-frame or from cover; walk maths starts at the shot's first frame.
- Busy brick texture reads as confetti: one warm base colour, cream mortar, low contrast.

## Post and render
- Ink must be its own pass before the lens blur (in a merged pass the blur overwrites it).
- Pixel-sized post parameters scale with resolution. R3F clamps dpr to 1 or more, so 0.5 stills still render a 1080x1920 buffer.
- No film grain: it quadrupled the file size.
- Stills at 0.5 take 30-40 s each after a 40 s bundle (Quaternius textures).

## This PC and harness
- Disk: every Remotion bundle copies `public/` into the temp folder and never deletes it. Always render with `REMOTION_TMP=C:/remotion-tmp` (no D: drive). When a short is finished and nothing is rendering, delete `remotion-webpack-bundle-*` and `puppeteer_dev_chrome_profile-*` there. Ask the user before deleting anything in the system temp folder.
- In JS strings write `"C:/remotion-tmp"`, never backslashes (`\r` becomes a carriage return).
- Not installed: Pillow (so no `sbs_sheet.py`; contact sheets with ffmpeg `xstack`, pad the grid with a repeated last tile, no `drawtext`: it segfaults) and scipy.
- ffmpeg 9 uses `-/filter_complex file`, not `-filter_complex_script`.
- Bash heredocs with quotes fail: write the file with the Write tool.
- A `//` comment pasted into the middle of a line hides the rest of that line (it still compiles): comments go at the end of a statement.
- Scripted edits that insert opening and closing braces at several places: compute every position on the original text first (closer before opener at a shared spot), then check the nesting; mis-nested blocks still compile.
- Memory: 7.4 GB RAM with an iGPU (`RENDER.md` "Memory"). A freeze leaves orphan render Chrome processes: kill every process whose command line contains `remotion-tmp` before rendering again.
- `bridge-stills.mjs` runs from the project root only.
- Scratch `.ts` files inside `out/` break `tsc`: name them `.txt`.
- Sub-agents cannot write report files: ask for a final message of 150 words or fewer and save it yourself.
