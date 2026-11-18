# Code map and API

Read before editing the starter files, instead of the engine source. The four starter files hold only story data plus a one-take demo (lane hold, through a door, room to room) marked `EXAMPLE`: replace those parts. The engine (`src/shared/`) is never edited for one video; open an engine file only for something not listed here.

## Per-video files (`src/videos/<name>/`)
| File | Holds |
|---|---|
| `story.ts` | `TOTAL`, set origins, story physics, `Crowd` names, `SHOTS`, `XFADE`, `FLASH_AT`, `CAMS`, `KICKS`, `DOF_V2` |
| `world.ts` | 3D cast (`CAST`, `loadActors`), extra models, rooms and their light sources, sets, `pose()` for people and moving props |
| `cast.ts` | `stage()`: 2D overlays and effects only; usually left as is |
| `<Name>.tsx` | composition name, `poolShots` |

## story.ts (engine: `shared/camkit.ts`)
- `sh(id, a, b, light, crowd, tau?, near?)`: frames a..b, `light` = `"day" | "golden" | "night"`, `tau` maps time to story time (replays, slow motion), `near` 0.03-0.05 for macro shots.
- Time-lapse inside one shot: `{ ...sh(...), tod: (t) => v }`, t = seconds, v 0 day / 1 golden / 2 night, fractions blend light, sky, grade and sun direction; windows glow from dusk. Example: baseball-mud `story.ts`.
- One take per area (the default): `const T = chain(start, end, v0, stops, sets?)`. A `View` is `{ C: V3 camera, L: V3 look target, fov }`; `stops` = `[[a, b, View, via?], ...]`, eased moves a..b to each story view; `via = { C: [V3, V3], L: [V3, V3] }` are inner bezier points for a path through a door. `chain` inserts the fill-in pans in quiet gaps (`SETUPS`; `SETUPS_MACRO` for small-object close-ups) and returns `{ s, look }`. Then `CAMS = { 1: [{ f: 0, s: T.s }] }`, `DOF_V2 = [{ f: 0, cInf, focus: T.look }]`. A later area's chain starts with `{ f: start, cut: true, s: T2.s }`.
- Lower level: `longTake(moves, rate, fov, start)` with `Move = { a, b, C: [4 x V3], L: [4 x V3], fov?: [start, end] }`; `orbit(view, deg)`, `setup(view, k, sets)`.
- Camera key: `{ f, dur?, cut?, s: (f) => Shot }`. `cut: true` = hard cut, else a glide of `dur` frames (default 24, use 18-40).
- `at(SET, x, y, z)` = set-local coordinates. `KICKS`: `[time s, strength 0.25-0.5]`. Also exported: `smooth`, `easeOut`, `clamp01`, `FPS`.
- `DOF_V2`: `{ f, cInf, focus: () => V3 }`, one per camera key. `cInf` = background blur in px at 1080: wides 3-5, mid shots 8-14, close-ups 18-24, macro 24-28.
- Pauses cut after the shots were authored (`voice_gaps.py` writes `timemap.json` next to `story.ts`): keep the authored frames and wrap the timeline: `export const { TOTAL, SHOTS, shotAt, layersAt, kickAt, camAt, dofAt, OLDs, NEWs } = retime(KNOTS, TOTAL_OLD, SHOTS_OLD, makeTimeline({...}))`; `world.ts` `pose()` does `t = OLDs(t)`.
- `bridge_shots.py` parses this file by regex: keep the `sh(n, a, b` form (b may be `TOTAL` or a `TOTAL_OLD`-style constant), `XFADE = { id: frames }`, `FLASH_AT = n`, `const KICKS ... = [...]` (seconds, a CONST or `frame / FPS`), `{ f: n | CONST, cut: true`. Numeric literals only; it exits 1 on a shot or kick it cannot read and applies `timemap.json` itself.

## world.ts (engine: `shared/worldkit.ts`, `shared/build.ts`)
- The class extends `WorldBase`. In the constructor, after `super(...)`: add sets to `b` (the static batch) or `R` (own objects), then `this.finish()` last. Given for free: sky, lights, clouds, the lane, harbour and water, per-shot sun, sight-line cull, the character loop.
- `loadKit = makeKitLoader([...TOWN_KIT, "<pack>/<model>.gltf", ...])`: list every extra model (paths under `public/models/`, `.glb` packs without the extension). The kit key is the model name without pack or extension.
- `prop(b, kit, name, x, y, z, h, yaw = 0, keep = false)`: model into the batch, centred on x/z, base on y, scaled to height h. Dropped when it blocks a sight line unless `keep`.
- `kitClone(kit, name, h)`: the same model as its own object, for things that move or hide. Position it, `R.add(o)`, keep a field, move it in `pose(id, t, tau)`.
- `bx(b, mat, x0, y0, z0, x1, y1, z1, tile?, bottom?)` box; `bottom = true` for any box seen from below. `quadUp(x0, x1, z0, z1, uRepeat, vRepeat, dy?)` ground quad: `b.add(quadUp(...), mat)`.
- Materials: `M.grass` (textured), `M.cobble`, `M.wall`, `M.cope`, `M.wood`, `M.floor`. New: `lam(key, () => ({ color | map }))` (cached two-tone); `twoTone(new THREE.MeshPhongMaterial(...))` from `shared/shade` for shiny ones. `unlit(map, cut?)` (worldkit): unlit material for painted planes; `cut = true` for cut-out shapes.
- `crowdBand(R, tex, x0, z0, x1, z1, y, h = 1.05, tile = 10)` (worldkit): painted crowd strip, one per stand tier.
- Textures (`shared/paint`): `cobbleHD()`, `stoneHD(key, [4 colours], mortar)`, `planksHD()`, `beam()`, `beamHD()`, `grassHD()`, `roofHD(col)`, `brick()`, `facadeHD(...)`, and `ctex(key, w, h, (g, rand) => draw)` for a custom canvas (cumulative hero textures: draw each stage on top of the last).
- Own meshes: `castShadow = receiveShadow = true`; thin dense ones `layers.set(NOINK)`.
- `town: "lane"` in `super(...)`: a 6 m lane along +z, road x -3..3, pavements to |x| 4.4, house fronts at |x| = 4.4 from z 0 to 42; at z 42 the road bends +x (stub to x 14.4), at z 0 it bends -x (stub to x -14.4); house rows across z 48.4 and z -6.4 close both ends. Wall lanterns on every second house front (lit from dusk), benches, barrels, pots. Other areas: `qHouseAt` rows around a small cobbled yard.
- `qHouseAt(b, this.small, kit, x, z, yaw, seed, block = false)` (build): 6 m Quaternius gable-front house, wall plane centred at (x, z), facing +z turned by yaw (0 = +z, PI = -z, -PI/2 = -x, PI/2 = +x); `block = true` adds the sides and back. `this.small` = batch drawn without ink (small kit parts).
- Light sources: `this.light(x, y, z, "lamp" | "candle", i?)`. Lights within 9 m of the lens cast shadows.
- Going inside: `laneRoom: [z, ...]` in `super(...)` (-x row houses centred at z = 3, 9, ... 45) makes those houses enterable, door at (-4.4, z), room x -4.7..-10.7, z +-2.9. Neighbouring rooms (6 m apart) are joined by an inner doorway at (-7.7, between them). Elsewhere `this.roomAt(x, z, yaw, seed, doors?)`: the same front with an open doorway plus a 6 x 6 m room (plaster walls, plank floor and ceiling), `doors` = `"+x" | "-x"` inner doorways; furnish with `prop(this.room, ...)`. A second indoor scene goes in the next room (pan through the doorway). Example: the starter.

## 3D actors (engine: `shared/actors3d.ts`)
- Templates: `public/models/chars3d/<Name>.glb`, one per Quaternius character (`OldClassy_Male`, `Suit_Female`, `Worker_Male`, `Chef_Female`, `Doctor_Male_Old`, `Casual2_Male`, ...: the names in `public/models/quaternius-chars/`). Missing one: `node scripts/bake_cast.mjs <Name ...>` (headless Blender, ~15 s each, skips existing; `--force` rebuilds; `all` = every character). Never edit a template by hand.
- In `world.ts`: `loadKit = async () => { const [k] = await Promise.all([baseKit(), loadActors([...names])]); return k; }`; in the constructor `spawnActor(this.root, actor, i)` per actor; in `pose(id, t)` `poseActor(a, t, storyTime, camPos)`.
- `Actor3`: `{ n, h (m), at: (t) => [x, z, yaw] (yaw 0 faces +z), clip?, expr?: (t) => Expr3, blink?: [s...], point?: (t) => 0..1, skin?: 0-3 (SKINS), indoor? }`. `indoor: true` inside a room.
- `clip`: `Idle_Loop` (default), `Idle_Talking_Loop`, `Walk_Formal_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Idle_FoldArms_Loop`, `Sitting_Idle_Loop`, `Sitting_Talking_Loop`, `Yes`, `Idle_No_Loop`. More: add to `CLIPS` in `scripts/bake_cast.mjs`, re-bake with `--force`.
- `Expr3`: neutral, shock, grin, nervous, smile, stern. Swap on a blink time.
- Held props: after `poseActor`, `holdProp(a, [x, y, z], r, w, rub, t)` puts both palms either side of the prop (radius r) and slightly behind it, blended from the clip by w (0..1); `rub` = scrubbing amplitude. One hand: `reach(a, "L" | "R", target, w)`. Move the prop to the returned centre.
- Walkers: `at` moves them; use a walk clip, about 1.0-1.2 m/s for `Walk_Formal_Loop`.

## cast.ts (engine: `shared/castkit.ts`)
- `stage(id, t, tau, cam)` returns `beginStage(light, cam)` plus overlays: `out.fx.push({ key, cw, ch, draw: (p) => ..., x, y, z, w, h, flat?, rot?, soft? })`. `cw`/`ch` = canvas px, `w`/`h` = metres, `flat` lies on the ground. The key must change whenever the drawing changes (quantise with `q(u, 30)`). `hh(i, seed)` = stable random 0..1.
- Ready effects (`t` 0..1): `fxBurst(p, t, col, rays, r0, r1)`, `fxStars`, `fxSplash`, `fxPuff`, `fxRing` (water rings, flat), `fxCreak`, `fxNote(p, kind)`. Overlays drawn by hand go through `dropShadow(p, (g) => path, dx?, dy?)` first.
- `Pen`: `poly(pts, fill, outlinePx)`, `ell(cx, cy, rx, ry, fill, outlinePx)`, `line(pts, colour, w)`, `stroke(pts, w, colour?)`, `arc(...)`, `dot(cx, cy, r)`. Ink colour `INK`. No text.

## `<Name>.tsx` (engine: `shared/short.tsx`)
`makeShort({ World, loadKit, story, poolShots: [ids] })`. `poolShots` = close-up shots with the soft light pool behind the head.

## Engine files (`src/shared/`)
`camkit` camera, timeline, `chain`, `retime`; `worldkit` world base and lane; `build` geometry, Quaternius houses and rooms; `actors3d` 3D characters, faces, `holdProp`; `castkit` 2D overlays (`Pen`, `fx*`, `dropShadow`); `short` composition and post chain; `ink` outline pass and `NOINK`; `lensblur` DOF; `grade` colour grade; `lights` presets and the `tod` blend; `shade` two-tone shading (`INDOOR_K` for rooms); `paint` textures; `qadump` QA geometry log.
