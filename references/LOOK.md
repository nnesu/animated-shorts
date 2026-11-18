# Look (house style, the default)

Read when building sets, placing the camera or cast, or judging stills. The engine and starter already produce this look; these are the rules it cannot enforce. Changing the look itself: `LOOK_MATCH.md`.

## World
- One compact enclosed area per group of scenes: the engine's `town: "lane"` (a 6 m lane, about 50 m long, closed at both ends by a bend with houses across). No street, road or house row runs out of frame; close every view with a bend, a building or a wall. Other areas sit 100+ m away and are enclosed the same way.
- Every shot hides the horizon: buildings, rows of trees with 2-3 m bushes in the trunk gaps, or a far hill. Fill only each camera's view cone.
- Sets are rich and dressed: ornaments, textures, flags, packed crowds. Interiors get posters or pictures, patrons, tables, shelves.
- No flat surfaces. A texture alone still reads flat: break walls with trim, openings, wear and colour variation. Grass is textured (`M.grass`).
- Physically plausible: nothing floats, signs and lamps hang from a visible mount, no empty lots (the culler removes engine houses: build your own), nothing pops in or out mid-shot.
- At least 90 % library models, Quaternius first; no flat-colour low-poly packs. Models built in code copy the library models in the same frame: proportions, bevel and roundness, polygon density, detail size, palette. Open a few before building. Kit materials are tinted into the house palette in `build.ts` (`QTINT`); a new Quaternius material that renders grey needs an entry there.

## Light (every light has a visible or plausible source)
- Outdoors by day and golden hour: the sun is the key and the only shadow caster; the sky fills the shade.
- Dusk and night: a dim cool moon; the real light comes from the lane's wall lanterns and lit windows. People stand near a source so they read: add or move a source, never brighten a person.
- Indoors: rooms are dark by default. Window light (cool, fades at dusk) plus era-appropriate sources on props with `this.light(..., "candle")`: candles, oil lamps, lanterns, chandeliers up to the 1800s; electric lamps after 1900. At least one source near the people.
- Time-lapse (`tod`) plays inside a camera move or a wide hold, not a push; people leave and come back while it runs.

## Colour
- One saturated hero colour against the blue sky; everything else muted: brick, cream, ochre, terracotta, warm grey stone, dark iron. Never lemon, never lavender on lit faces.
- Hero object that must read round or heavy: an unlit material with a baked key from camera-left (example `keyTankMat` in `src/archive/molasses/world.ts`).

## Characters (3D, `shared/actors3d.ts`)
- House templates from `public/models/chars3d/` (baked Quaternius characters). The face (eyes, brows, mouth per expression) is painted into the skin texture, so it shares the skin's light and cannot float; expressions swap on a blink.
- One ink weight everywhere: 2.2 px for characters and world. Skin gets its outline only (`userData.inkNoCrease = true`); clothes and hair keep inner lines.
- The subject sits in the middle of the frame (head at 40-60 % of the height): aim at the subject, never over it.
- Held props are visibly in the hands: `holdProp()` (two-hand IK, palms either side and behind, so the prop shows in front). Small props are oversized to read (a ball at 1.5x true size).
- 2D overlays (rings, X marks, diagrams) get a drop shadow (`dropShadow()` in `castkit.ts`).

## Camera
- Pan first: one continuous take per area (`chain()`), along the lane, through doors, room to room. Hard cuts only for a change of place or time.
- No creeping zooms. Holds are still; motion comes from story moves and fill-in pans.
- Fill-in pan: a 12-frame pan to a new setup only after 3 s with no story move or cut, skipped if one comes within 1 s. Each changes side angle (12-20 degrees, sideways at most 2 m), height (-0.2 to +0.35 m) and zoom (fov x 0.85-1.12). `chain()` inserts them.
- Close-ups of small objects: horizontal pans with zoom changes, height lift about 20 % (enough to show the tops), some setups show the person behind (`SETUPS_MACRO`).
- Show a quantity by pulling back, never by pushing in. Avoid over-tight framing. Important people stay in frame: slow their walk or widen.
- Pushing toward a far focus shrinks the sun shadow box: cut instead of pushing across a big distance.
- Rolls of 4-5 degrees. No hand-held float. Impact kicks flip sign every frame and decay over 7 frames.
- A foreground prop near the frame edge in about a third of shots (`prop(..., keep = true)`), recognisable or absent. Wides stay nearly sharp.

## Hero objects (an object is the subject of a line)
- It gets the frame: a close hold (object at 40-60 % of the height, fov 30-40, focus on it), reached by a move from the wide.
- It moves on its word: something visibly happens to it (turns, rolls, gets rubbed, changes colour, fills), landing 0-3 frames before the word. A static object held for a full line reads as a frozen frame.
- One hero object carries through the story; its changes are cumulative and obvious (each stage adds to the last).

## Values (px at 1080x1920; set in `shared/short.tsx`)
| Item | Value |
|---|---|
| Ink | `#2a1a2e`, 2.2 px, own pass before the blur |
| DOF v2 | one focus per camera key (`DOF_V2`), focus on the subject's eyes; cInf by shot size in `API.md`; foreground blur capped at 6 px |
| Bloom | threshold 1.0 (HDR emissives only), intensity 0.5 |
| Vignette | clear to 60 %, black 0.18 at the edge |
| Warm tint | `#ffd9a0` at 0.06, screen |
| Light pool | `poolShots` close-ups: warm circle 432 px behind the head |
| Tone map, AA | NEUTRAL, MSAA 4, no film grain |
| Target luma | frame mean about .54 (.29-.63), 10th percentile about .34 |

Light presets (`shared/lights.ts`): day (sun az 75 / el 48 relative to the camera, frozen per shot), golden (low backlit sun, violet-blue shade, never brown), night (moonlight, lit windows, lanterns carry the light). Debug: `PROPS='{"post":{"dofDebug":true}}'`; switch a post stage off for one still with `PROPS='{"post":{"ink":false}}'` (also `lens`, `bloom`, `grade`).
