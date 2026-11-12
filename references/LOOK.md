# Look (house look, the default)

The starter template already produces this look. Read this when judging stills or adding materials, lights or cameras. The original reference look and the look-match loop: `LOOK_MATCH.md`.

## Switches
Built into `shared/short.tsx`; nothing to set. Which things are sharp in a still: `PROPS='{"post":{"dofDebug":true}}'` logs `DOFDBG` lines. Post stages can be switched off for one test still: `PROPS='{"post":{"ink":false}}'` (also `lens`, `bloom`, `grade`).

## Values (px at 1080x1920; set in `shared/short.tsx`)
| Item | Value |
|---|---|
| World ink | `#2a1a2e`, 7.0 px at 6 m to 4.6 px at 90 m, creases x0.8 from 35 degrees; own pass before the blur |
| Character ink | plum `#241726`, drawn on the card; cards on the `NOINK` layer |
| DOF v2 | one focus point per camera key (`DOF_V2`), focus on the eyes of the front row; cInf by shot size in `API.md`; `LensBlur({ maxCoC: 32, nearScale: 1.2, nearMax: 6 })` caps foreground blur at 6 px |
| Bloom | threshold 1.0 (HDR emissives only), intensity 0.5, 6 levels, radius 0.6 |
| Vignette | radial, clear to 60 %, black 0.18 at the edge |
| Warm tint | `#ffd9a0` at opacity 0.06, screen blend |
| Light pool | close-ups listed in `poolShots` (`<Name>.tsx`): warm rgba(255,240,200,.14) circle 432 px behind the head, darkening to .15 over 1100 px |
| Tone map, AA | NEUTRAL, MSAA 4, no film grain |
| Target luma | frame mean about .54 (range .29-.63), 10th percentile about .34: no crushed blacks |

## Light presets (`shared/lights.ts`, per shot via `sh(..., "day" | "golden")`)
- day: sun az 75 / el 48 relative to the camera and frozen per shot, cool tint only in the shade, sky `#3e7fd2` to `#b8d0ec`, fog = horizon colour 25 to 300 m.
- golden: low backlit sun (az 6 / el 7), warm key, violet-blue shade (never brown), peach fog only past 50 m, real card shadows.
- Interiors: override in `SUN_SHOT` to az 150 / el 50 (sun behind the camera).

## Colour
- One saturated hero colour against the blue sky; everything else muted: brick, cream, ochre, terracotta houses, warm grey stone, dark desaturated iron. Never lemon, never lavender on lit faces.
- Hero object that must read as round or heavy: an unlit material with a baked key light from camera-left (hard terminator about 60 % across, plum-tinted shadow side at 55 %, pale rim, warm lip highlight, 1.5 m contact darkening). Worked example: `keyTankMat` in `src/videos/molasses/world.ts`.

## Camera (every shot)
- Hard cut on big reframes. Everything else is a glide of 18-40 frames.
- Every hold creeps in 0.15-0.35 % per frame, 0.6 % on punch words. No static hold of 4 frames or more.
- Rolls of 4-5 degrees. No hand-held float. Impact kicks flip sign every frame and decay over 7 frames.
- A foreground prop near the frame edge in about a third of shots (`prop(..., keep = true)`), recognisable or absent.
- Establishing and wide shots stay nearly sharp.

## Characters (built into `shared/toon.ts`; check, do not redraw)
Bean head (h/w about .93), adults 3.5 head-heights, stick limbs, ink-dot hands, no blush or eye highlights. Walk bob 3-7 %, lean 1-7 degrees, planted feet. Blinks every 0.5-2.3 s for 4 frames. Tight contact shadow under the feet, plus a sun-direction tail by day.
