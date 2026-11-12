// STARTER timeline: data only. The camera engine is shared/camkit.ts. Shots are timed to the voice (word@frame listing of
// _voiceover/<name>/words.json). Everything marked EXAMPLE is a 2-shot demo (street wide, interior two-shot + close-up): replace it.
// Sets live far apart in one world: the town + harbour at the origin, every other set 100+ m away.
import { at, dolly, zoom, pushK, sh, makeTimeline, V3, Key, Dof, ShotDef } from "../../shared/camkit";

export const TOTAL = 240; // EXAMPLE. = ceil(voice seconds x 30): short_qa wants video = voice within 1 frame

// ---------------- sets ----------------
export const ROOM: V3 = [300, 0, 40]; // EXAMPLE interior

// ---------------- story physics: prop motion as pure functions of tau (story time, s) goes here ----------------

// ---------------- shots: sh(id, firstFrame, endFrame, light, crowd, tau?, near?) ----------------
export type Crowd = "none" | "street" | "room"; // one name per staging in cast.ts stage()
export const SHOTS: ShotDef<Crowd>[] = [
  sh(1, 0, 120, "day", "street"),                 // EXAMPLE hook: the street
  sh(2, 120, TOTAL, "golden", "room", undefined, 0.05), // EXAMPLE interior two-shot (near plane 0.05 for close work)
];
export const XFADE: Record<number, number> = { 2: 8 }; // shot id -> crossfade frames INTO it (place changes); others hard-cut
export const FLASH_AT = 120; // the hook ends on a 4-frame white flash (no flash: a frame past TOTAL)

// ---------------- camera: every hold creeps (pushK); cut: true = hard cut, else a glide of dur frames ----------------
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: (f) => zoom([3, 2.2, 40], [0, 1.6, 60], 46, pushK(f, 0, 0.002)) }], // EXAMPLE wide: zoom creep
  2: [
    { f: 120, s: (f) => dolly(at(ROOM, 0.2, 1.4, 3.9), at(ROOM, 0.0, 1.0, -0.45), pushK(f, 120, 0.0025), { fov: 47 }) }, // EXAMPLE two-shot: dolly creep
    { f: 185, cut: true, s: (f) => dolly(at(ROOM, -0.3, 1.75, 1.7), at(ROOM, -0.6, 1.3, -0.5), pushK(f, 185, 0.003, 0.007, 30), { fov: 38, roll: 0.03 }) }, // EXAMPLE cut to a close-up with a punch-in
  ],
};
const KICKS: [number, number][] = []; // impact kicks: [time s, strength 0.25-0.5]

// ---------------- lens: one entry per camera key ----------------
export const DOF_V2: Dof[] = [
  { f: 0, cInf: 4, focus: () => [0, 1.5, 60] },                    // EXAMPLE 1 wide: nearly sharp
  { f: 120, cInf: 14, focus: () => at(ROOM, 0.05, 1.1, -0.4) },    // EXAMPLE 2a two-shot
  { f: 185, cInf: 24, focus: () => at(ROOM, -0.6, 1.0, -0.45) },   // EXAMPLE 2b close-up
];

export const { shotAt, layersAt, kickAt, camAt, dofAt } = makeTimeline({ SHOTS, XFADE, CAMS, KICKS, DOF: DOF_V2 });
