# Code map and API

Read this instead of the source. The four starter files hold only story data (about 8 KB together) with a 2-shot demo marked `EXAMPLE`: read them, replace the `EXAMPLE` parts. The engine lives in `src/shared/` and is never edited for one video; open an engine file only for something not listed here.

## Per-video files (`src/videos/<name>/`)
| File | Holds |
|---|---|
| `story.ts` | `TOTAL`, set origins, story physics, `Crowd` names, `SHOTS`, `XFADE`, `FLASH_AT`, `CAMS`, `KICKS`, `DOF_V2` |
| `world.ts` | extra Kenney models, `SUN_SHOT`, materials, sets, `pose()` for moving props |
| `cast.ts` | outfits, `stage()` with one case per `Crowd` name |
| `<Name>.tsx` | composition name, `poolShots` |

## story.ts (engine: `shared/camkit.ts`)
- `sh(id, a, b, light, crowd, tau?, near?)`: frames a..b, `light` = `"day" | "golden"`, `tau` maps time to story time (replays, slow motion), `near` 0.03-0.05 for macro shots.
- Camera key: `{ f, dur?, cut?, s: (f) => Shot }`. `cut: true` = hard cut, else a glide of `dur` frames (default 24, use 18-40).
- `dolly(pos, look, k, { fov, roll })` moves the camera toward `look`; `zoom(pos, look, fov, k)` narrows the lens (wides). `k = pushK(f, f0, rate, punch?, n?)`: creep per frame from frame `f0` (rate 0.0015-0.003; punch 0.006-0.007 over `n` frames on a punch word). Roll 0.03 rad.
- `at(SET, x, y, z)` = set-local coordinates. `KICKS`: `[time s, strength 0.25-0.5]`. Also exported: `smooth`, `easeOut`, `clamp01`, `FPS`.
- `DOF_V2`: `{ f, cInf, focus: () => V3 }`, one per camera key. `cInf` = background blur in px at 1080: wides 3-5, mid shots 8-14, close-ups 18-24, macro 24-28.
- `bridge_shots.py` parses this file by regex: keep the `sh(n, a, b,` form, `XFADE = { id: frames }`, `FLASH_AT = n`, `const KICKS ... = [...]`, `{ f: n, cut: true`.

## world.ts (engine: `shared/worldkit.ts`, `shared/build.ts`)
- The class extends `WorldBase`. In the constructor, after `super(...)`: add sets to `b` (the static batch) or `R` (own objects), then `this.finish()` last. Given for free: sky, lights, clouds, the town, harbour and water, per-shot sun, sight-line cull, the character loop.
- `loadKit = makeKitLoader([...TOWN_KIT, "<pack>/<model>", ...])`: list every extra model. The kit key is the model name without the pack.
- `prop(b, kit, name, x, y, z, h, yaw = 0, keep = false)`: model into the batch, centred on x/z, base on y, scaled to height h. Dropped when it blocks a sight line unless `keep`.
- `kitClone(kit, name, h)`: the same model as its own object, for things that move or hide. Position it, `R.add(o)`, keep a field, move it in `pose(id, t, tau)`.
- `house(b, x, z, yaw, w, d, h, style 0-7, y?)`. `bx(b, mat, x0, y0, z0, x1, y1, z1, tile?)` box. `quadUp(x0, x1, z0, z1, uRepeat, vRepeat, dy?)` ground quad: `b.add(quadUp(...), mat)`.
- Materials: `M.grass`, `M.cobble`, `M.wall`, `M.cope`, `M.wood`, `M.floor` exist. New: `lam(key, () => ({ color | map }))` (cached two-tone); `twoTone(new THREE.MeshPhongMaterial(...))` from `shared/shade` for shiny ones.
- Textures (`shared/paint`): `cobbleHD()`, `stoneHD(key, [4 colours], mortar)`, `planksHD()`, `beam()`, `beamHD()`, `grassHD()`, `roofHD(col)`, `brick()`, `facadeHD(...)`, and `ctex(key, w, h, (g, rand) => draw)` for a custom canvas.
- Own meshes: `castShadow = receiveShadow = true`; thin dense ones `layers.set(NOINK)`.
- `SUN_SHOT`: `{ shotId: { az, el } }`; interiors az 150, el 50.
- Town at the origin: street along +z from -3 to 150, houses both sides, harbour and pier beyond z 150, far shore at z 236-330.

## cast.ts (engine: `shared/castkit.ts`, drawings: `shared/toon.ts`)
- `add(cam, t, out, i, outfit, okey, x, z, [dx, dz], frontOpts, sideOpts = {}, y = 0, scale = 1)`: `i` = unique id (blink timing, head shape), `okey` = cache key per outfit, `[dx, dz]` = heading. Front or side drawing is picked from the camera angle. Seated: `mode: "sit"` and `y` = seat height.
- `FrontOpts`: `mode` `"stand" | "sit" | "stroll" | "march" | "fall"`, `expr`, `look` -1..1, `phase` 0..1 (walk cycle), `wave` (arm, animate with `Math.sin`), `prop` `"icecream" | "shako" | ["hammer", n]`, `tilt`, `headTilt`, `lift`.
- `Expr`: neutral, stern, grin, laugh, whistle, nervous, shock, relief, relief_open, dazed, pained, smile, smile_closed, lick.
- `Outfit`: `jacket`, `pants`, `boots` (required colours), `hat` (`"hair" | "cap" | "tophat" | "bonnet" | "shako" | "shako_tall" | null`), `hair`, `cap`, `dress`, `skin` (`SKINS[0-3]`), `build` (`"adult" | "stout" | "kid"`), `moustache`, `belt`, `buttons`, `sash`. Ready-made: `shopper(v)`, `KIDS[0-3]` (castkit), `KID`, `PARENT`, `townsfolk(v)`, `soldier(v)` (toon).
- Expression changes: switch on `t > wordTime`; the blink code hides the swap.
- Effects: `out.fx.push({ key, cw, ch, draw: (p) => ..., x, y, z, w, h, flat?, rot?, soft? })`. `cw`/`ch` = canvas px, `w`/`h` = metres, `flat` lies on the ground. The key must change whenever the drawing changes (quantise the phase with `q(u, 30)`). `hh(i, seed)` = stable random 0..1.
- Ready effects from `shared/toon` (`t` 0..1): `fxBurst(p, t, col, rays, r0, r1)`, `fxStars`, `fxSplash`, `fxRing`, `fxCreak`, `fxNote(p, kind)`.
- Custom drawing with `Pen`: `poly(pts, fill, outlinePx)`, `ell(cx, cy, rx, ry, fill, outlinePx)`, `line(pts, colour, w)`, `stroke(pts, w)`, `arc(...)`, `dot(cx, cy, r)`. Ink colour `#241726`. No text.

## `<Name>.tsx` (engine: `shared/short.tsx`)
`makeShort({ World, loadKit, story, poolShots: [ids] })`. `poolShots` = close-up shots that get the soft light pool behind the head. `houseLook: false` switches to the reference look.

## Engine files (`src/shared/`)
`camkit` camera and timeline, `worldkit` world base, `castkit` character cards, `short` composition and post chain, `build` geometry and Kenney helpers, `toon` character drawing, `cardshade` card lighting, `ink` outline pass and `NOINK` layer, `lensblur` DOF, `grade` colour grade, `lights` day/golden presets, `shade` two-tone shading, `paint` textures, `qadump` QA geometry log. The four older shorts keep their own copies of the camera, world and cast code and do not use the kits.
