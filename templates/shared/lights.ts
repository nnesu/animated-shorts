// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
import { Color } from "three";
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
  glow: number;                                                                      // window / lamp glow (0 = off, 1 = night)
};
export const LIGHTS: Record<"day" | "golden" | "night", LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015, glow: 0,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03, glow: 0.15,
  },
  night: {
    // moonlight from high behind the lens: deep blue shade, cool lit side, lit windows (glow) carry the warmth
    az: 60, el: 35,
    lit: [0.24, 0.3, 0.52], shade: [0.07, 0.08, 0.17], lift: [0.02, 0.03, 0.08], lambert: 0.35, sideK: 0.84, term: 0.15,
    top: "#0b1430", hor: "#2a3a66", skyCurve: [0.0, 0.5, 0.6], fog: "#1c2848", fogNear: 30, fogFar: 260, sunDisc: "#000000",
    sunCol: "#a8bce8", sunI: 0.8, sky: "#2a3a66", ground: "#1a1a2a", hemiI: 0.2,
    bias: -0.0004, normalBias: 0.02, glow: 1,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<"day" | "golden" | "night", WorldLook> = {
  day: {
    // depth.md 2.2: horizon #9fb6e6 just above the skyline, upper sky #5e93d9 at ~20 deg (grade: frame top #5997e2)
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  night: {
    sky: { c: ["#2e3c68", "#24335c", "#1a274c", "#121d3c", "#0a1228"], e: [0, 3, 8, 16, 40] },
    water: { near: "#0e2240", mid: "#0c1c38", far: "#1a2a50", crest: "#3a5a8a", trough: "#08142a", glint: "#c8d8ff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#5a6a94", mid: "#3e4c74", shade: "#2a3456" },
    bounce: [0, 0, 0.01],
    sat: 1.0,
  },
};

/** time of day for ShotDef.tod values: 0 day, 1 golden, 2 night (fractions blend the two neighbours) */
export const TOD = ["day", "golden", "night"] as const;
const mixV = (a: unknown, b: unknown, w: number): unknown => {
  if (typeof a === "number") return a + ((b as number) - a) * w;
  if (typeof a === "string") return "#" + new Color(a).lerp(new Color(b as string), w).getHexString();
  if (typeof a === "boolean") return w < 0.5 ? a : b;
  if (Array.isArray(a)) return a.map((v, i) => mixV(v, (b as unknown[])[i], w));
  return Object.fromEntries(Object.entries(a as object).map(([k, v]) => [k, mixV(v, (b as Record<string, unknown>)[k], w)]));
};
/** light and world look at time-of-day value v (0..2), plus the nearest preset name (for per-preset assets) */
export const lightAt = (v: number) => {
  const i = Math.min(1, Math.floor(Math.max(0, v))), w = Math.min(1, Math.max(0, v - i)), a = TOD[i], b = TOD[i + 1];
  return { L: mixV(LIGHTS[a], LIGHTS[b], w) as LightPreset, K: mixV(LOOK[a], LOOK[b], w) as WorldLook, a, b, w, name: w < 0.5 ? a : b };
};
// self-check: the ends land exactly on the presets
console.assert(lightAt(0).L.sunI === LIGHTS.day.sunI && lightAt(2).L.glow === 1 && lightAt(1.5).name === "night", "lightAt");
