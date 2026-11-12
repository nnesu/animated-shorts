# Gotchas

## Starter
- Always pass `COMP=<Comp>` for stills (the default renders the bridge short).
- Place every prop with centre coordinates: `prop()` in `shared/build.ts` centres models. Coordinates in older shorts assume corner origins, so never copy their offsets.

## Voice
- `words_whisper.py <wav> <json> [model=small]` writes `[{word, start, end}]` (faster-whisper, CPU). It decodes with ffmpeg and passes a numpy array, because faster-whisper's own decoder breaks with PyAV 19. Keep it that way.
- Trim pauses by measured silence, never by Whisper timings (word ends drift into the pause). `voice_trim.py` cuts pauses over 0.5 s to 0.35 s and writes `voice_trim.json` with an offset table. Keep the raw take, run `words_whisper.py` on the trimmed file, listen once.
- Timings as `word@frame`: `python -c "import json;print(' '.join(f\"{w['word'].strip()}@{round(w['start']*30)}\" for w in json.load(open('_voiceover/<name>/words.json'))))"`.
- `voice_trim.py` refuses to overwrite an existing take (`--force` to re-trim) and prints `kept pauses`: uncut gaps of 0.3 s or more (silence or breath) as raw-take seconds. `words.json` is in trimmed time: a gap's trimmed time is raw minus the `shift` of the last `offsets` row in `voice_trim.json` whose `from` is at or before it; look up the words there. One inside a phrase: re-run with `--tight <raw seconds> --force` (cuts it to 0.1 s), then `words_whisper.py` again.

## Props and sets
- Kenney pack without a download button: in the browser pane on kenney.nl run `fetch("https://kenney.nl/download-link/" + hex("assets/<slug>"))` (hex = each character as 2 hex digits). It returns a signed `.url`; curl that with a browser User-Agent.
- Kenney model origins are often a corner. `prop()` and `kitClone()` in the template centre by bounding box.
- Kenney nature-kit materials are teal: recolour by material name in `build.ts`.
- The sight-line culler removes anything blocking a camera ray, per shot (`new World(kit, id)`, `sightLines(id)`). Keep cameras out of the middle of house rows anyway. A hero prop it drops: `prop(..., yaw, true)` or `kitClone`. A sight line through a building leaves the subject standing in a hole.
- Dense thin meshes (springs, wires, coils) go solid black under the world ink: put them on the `NOINK` layer.
- Horizon fill, only in each camera's view cone: rows of trees with 2-3 m bushes in the trunk gaps, or a far hill mesh (r 30-38, y-scale 0.42). Harbours: far-shore hills plus a house row.
- Interiors: walls about 6 m and up to the ceiling (or sky shows), the room set far from the street (or the street shows over the walls), sun behind the camera (`SUN_SHOT` az 150, el 50).
- Place every set inside its zone: check x/z against water and other sets. Stair boxes span only their own tread.
- A box that crosses another feature (stand tiers through a balcony): split it into runs that stop at the feature.
- A box seen from below (ceiling, roof, canopy, bridge) has no underside and shows what is above it: `bx(..., tile, true)`. If its shadow is already approved, keep the box and add a downward plane with `receiveShadow` only (a closed box casts a larger shadow).
- Floor quads reach every wall of an enclosed space, or the ground outside shows through the gap.
- A street or corridor end open to the horizon: close it with a `house()` across it.
- Empty stands: `crowdBand()` on every tier.
- Thin decor built from boxes (throne backs, drapes) does not read: paint it on a cut-out plane with `unlit(map, true)`.
- No large flat-colour surface. A texture alone still reads as a plain wall: break it with trim, openings, wear and colour variation.

## Framing and readability
- Check every shot: subject fully in frame, nothing blocking the lens, close-up scale right (a person, not a giant).
- Anything closer than about 2 m to a lens becomes a cut-off blob at the frame edge. Re-check nearby props whenever a camera moves.
- A foreground prop must be recognisable or gone (a bush cut by the edge reads as a green ball).
- Rails at chest height cut through characters: put the lens about 2.5 m up so rails cross legs.
- A swing drawn with one rope reads as a hanging: two ropes to a wide plank (`swingKid` in `toon.ts`) and an A-frame whose legs clear the arc.
- Flags: use the period-correct one (red with a yellow star reads as Vietnam's).
- Painted planes (signs, banners, wall panels, drapes) go grey or purple in shade: `unlit(map)`.
- Thin radial line effects (burst rays) read as sticks on a busy background: leave them out there.
- A hand prop: place it at hand height, offset from the card, and check a still.
- Nobody appears mid-shot. A character is on screen from the shot's first frame, or walks in from off-frame or from cover; walk maths starts at the shot's first frame.
- Golden rim light: inner rim only, head and torso only (an offset outer copy frames every hat).
- Busy brick texture reads as confetti: one warm base colour, cream mortar, low contrast.
- Small candy drawn as blocks reads as bricks. Grey hair reads as bald: use white.

## Post and render
- Ink must be its own pass before the lens blur (in a merged pass the blur overwrites it).
- Pixel-sized post parameters scale with resolution. R3F clamps dpr to 1 or more, so 0.5 stills still render a 1080x1920 buffer.
- No film grain: the reference has none and it quadrupled the file size.
- Stills at 0.5 take 3-8 s each after a 40 s bundle.

## This PC and harness
- Disk: every Remotion bundle copies `public/` (about 1.3 GB) into the temp folder and never deletes it. Always render with `REMOTION_TMP=C:/remotion-tmp` (no D: drive). When a short is finished and nothing is rendering, delete `remotion-webpack-bundle-*` and `puppeteer_dev_chrome_profile-*` there. Ask the user before deleting anything in the system temp folder.
- In JS strings write `"C:/remotion-tmp"`, never backslashes (`\r` becomes a carriage return).
- Not installed: Pillow (so no `sbs_sheet.py`; contact sheets with ffmpeg `xstack`, pad the grid with a repeated last tile, no `drawtext`: it segfaults) and scipy.
- ffmpeg 9 uses `-/filter_complex file`, not `-filter_complex_script`.
- Bash heredocs with quotes fail: write the file with the Write tool.
- Scratch `.ts` files inside `out/` break `tsc`: name them `.txt`.
- Sub-agents cannot write report files: ask for a final message of 150 words or fewer and save it yourself.
