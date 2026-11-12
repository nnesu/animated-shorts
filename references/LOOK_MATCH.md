# Reference look and look-match loop (rarely needed)

Read only when the user asks for the original look ("like the bridge video", "reference style") or wants the look itself changed. `STYLE_BIBLE.md` and `reports/` are study material: never name the source in a video.

## Reference look (fallback)
Pass `houseLook: false` to `makeShort()` in `<Name>.tsx` (thin near-black ink, no vignette, tint or light pool) and use the lower cInf values below. Targets: `reports/`. Live example: `src/videos/bridge/`. It differs from the house look only in ink, colour and depth:
- World ink: near-black `#030303`, 5.1 px at 6 m to 3.3 px at 90 m (reference measures about 3 px, nearly constant). Silhouettes, depth jumps and creases only; no line on wall/floor joins or the horizon.
- Colour: day median luma about .57, non-ink 5th percentile about .23, lit chroma C* p90 about 55, day sky top about `#5e93d9` with the horizon 1.28x brighter. Golden: peach horizon `#ffd08a`, violet-blue shadows.
- Depth: DOF on about a third of screen time. cInf at 1080: hook and extreme close-ups 15-16, close-ups 12-14, mid shots 10-12, wides 0. Fog = horizon colour, 25 to 420 m day, 20 to 360 m golden.
- Camera and characters: same as `LOOK.md`.

## Before revising any house value
Read the matching report in `reports/` first (motion, depth, textures, characters, lighting, outlines, grade). Their camera, character, sky/fog and shot-grammar numbers apply to both looks. `reports/CONTEXT.md` is the historical brief of the bridge pass, not instructions.

## Look-match loop ("make it look like X")
1. **Measure first.** One analysis agent per topic, each writing numbers, not adjectives, to a report. Reports are the source of truth for every later agent.
2. **Sandboxes, one owner per file.** Copy `src/videos/<name>` to `src/videos/<name>_<box>` and `src/shared` to `src/shared_<box>` (rewrite `../../shared/` in the copy), with an entry `src/sandboxes/<box>/index.tsx` (`templates/sandbox_index_example.tsx`). Owners:
   - cam: `story.ts`, `camkit.ts`
   - world: `world.ts`, `worldkit.ts`, `lights.ts`, `shade.ts`, `grade.ts`
   - mat: `paint.ts`, `build.ts`
   - char: `toon.ts`, `cast.ts`, `castkit.ts`, `cardshade.ts`
   - post: `ink.ts`, `<Name>.tsx`, `short.tsx`, `lensblur.ts`
   Each agent edits only its own files and renders with `BRIDGE_ENTRY=src/sandboxes/<box>/index.tsx COMP=<Comp> node scripts/bridge-stills.mjs out/<name>/<box>/x_ <frames> 0.5`.
3. **Merge** with `python scripts/bridge_merge.py <name> [cam,world,mat,char,post]` (backs up to `backup/<name>_<time>/`, copies owned files only). Then `npx tsc --noEmit`, then re-sync every sandbox from main.
4. **Grade** each change pairwise: `house/GRADER_PROMPT.md`. Map each work order to its owner and resume that agent with SendMessage.
5. Contracts between owners are exported constants (`NOINK`, `dofAt`, `LIGHTS`, `LOOK`). Changing one means telling every owner that reads it.

History of what worked and failed, with scores: `src/videos/molasses/LOOKLOG.md`, `DEPTH.md`.
