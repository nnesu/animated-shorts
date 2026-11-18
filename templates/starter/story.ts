// STARTER timeline: data only. The camera engine is shared/camkit.ts. Shots are timed to the voice (word@frame listing of
// voiceover/<name>/words.json). Everything marked EXAMPLE is a demo: replace it.
// Pan first: one take per area (chain: still holds joined by story moves, fill-in pans in quiet gaps): along the lane,
// through a door, from room to room. Hard cut only for another place or time. EXAMPLE: one take: lane hold, through the
// door of house 21, hold at the table, through the inner doorway into house 27 (the lab), hold. Rules: references/LOOK.md.
import { sh, makeTimeline, chain, View, Key, Dof, ShotDef } from "../../shared/camkit";

export const TOTAL = 360; // EXAMPLE. = ceil(voice seconds x 30): short_qa wants video = voice within 1 frame

// ---------------- shots: sh(id, firstFrame, endFrame, light, crowd, tau?, near?) ----------------
// numeric literals for id / first / end frame (end may be TOTAL), FLASH_AT and cut keys: bridge_shots.py reads them by regex
// time-lapse inside a long take: { ...sh(...), tod: (t) => 0 day .. 1 golden .. 2 night }
export type Crowd = "lane";
export const SHOTS: ShotDef<Crowd>[] = [
  sh(1, 0, TOTAL, "day", "lane"), // EXAMPLE: the whole demo is one long take
];
export const XFADE: Record<number, number> = {}; // shot id -> crossfade frames INTO it; others hard-cut
export const FLASH_AT = 361; // a 4-frame white flash at this frame (none: a frame past TOTAL)

// ---------------- camera ----------------
// chain(start, end, first view, stops): each stop = [move start, move end, view, via?]; via = inner bezier points for a
// path through a door. View = { C: camera, L: look target, fov }.
// Doors: lane door of house 21 at (-4.4, 21); inner doorway between houses 21 and 27 at (-7.7, 24).
const LANE: View = { C: [2.0, 1.6, 13.4], L: [-2.0, 1.3, 20.2], fov: 50 };   // EXAMPLE
const TABLE: View = { C: [-5.0, 1.6, 21], L: [-8.6, 1.15, 21], fov: 56 };
const LAB: View = { C: [-7.7, 1.55, 24.6], L: [-7.7, 1.2, 28.5], fov: 56 };
const TAKE = chain(0, TOTAL, LANE, [
  [70, 150, TABLE, { C: [[1.2, 1.6, 21], [-2.6, 1.55, 21]], L: [[-4.4, 1.4, 21], [-8, 1.3, 21]] }],
  [200, 270, LAB, { C: [[-6.4, 1.6, 21.9], [-7.7, 1.55, 22.6]], L: [[-8.4, 1.4, 23.6], [-7.7, 1.3, 26.5]] }],
]);
const CAMS: Record<number, Key[]> = { 1: [{ f: 0, s: TAKE.s }] };
const KICKS: [number, number][] = []; // impact kicks: [time s, strength 0.25-0.5]

// ---------------- lens: one entry per camera key ----------------
export const DOF_V2: Dof[] = [{ f: 0, cInf: 10, focus: TAKE.look }]; // focus follows the look target

export const { shotAt, layersAt, kickAt, camAt, dofAt } = makeTimeline({ SHOTS, XFADE, CAMS, KICKS, DOF: DOF_V2 });
