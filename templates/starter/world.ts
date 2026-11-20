// STARTER world. The engine (sky, sun, wall lanterns, the compact lane at the origin, rooms, local lights) is
// shared/worldkit.ts; 3D actors are shared/actors3d.ts. Here: this video's people, furniture, light sources and moving
// props. Everything marked EXAMPLE is the demo: replace it. Light: references/LOOK.md "Light".
import * as THREE from "three";
import { WorldBase, makeKitLoader, TOWN_KIT } from "../../shared/worldkit";
import { Kit, prop } from "../../shared/build";
import { loadActors, spawnActor, poseActor, Actor3, Actor3D } from "../../shared/actors3d";
import { stage } from "./cast";
import { SHOTS, camAt } from "./story";

// extra models: Fantasy Props kit (quaternius-props/<Name>.gltf; public/models/INDEX.txt); kit key = the model name
const FURN = ["Table_Large", "Bookcase_2", "CandleStick_Triple", "Cabinet", "Workbench", "Shelf_Small_Bottles",
  "Cauldron", "Potion_1", "Chandelier"]; // EXAMPLE
// characters (templates in public/models/chars3d; missing: node scripts/bake_cast.mjs <Name>)
const CH = ["OldClassy_Male", "Worker_Male", "Suit_Male", "Chef_Female", "Doctor_Male_Old"]; // EXAMPLE
const baseKit = makeKitLoader([...TOWN_KIT, ...FURN.map((n) => `quaternius-props/${n}.gltf`)]);
export const loadKit = async () => { const [k] = await Promise.all([baseKit(), loadActors(CH)]); return k; };

const at = (x: number, z: number, yaw: number) => (): [number, number, number] => [x, z, yaw]; // standing still
const E = Math.PI / 2, S = Math.PI; // yaw facing +x / facing -z
/** people: template, height, where over story time, clip, expression over time, blinks (s; swap expressions on one) */
const CAST: Actor3[] = [ // EXAMPLE
  { n: "OldClassy_Male", clip: "Idle_Talking_Loop", h: 1.8, at: at(-2.2, 18.6, E - 0.5), expr: (t) => (t < 1.2 ? "neutral" : "grin"), blink: [0.6, 1.2],
    point: (t) => Math.min(1, Math.max(0, (t - 1.4) / 0.3)) },
  { n: "Worker_Male", clip: "Yes", h: 1.82, at: at(-0.7, 19.2, 2.4), expr: () => "smile", blink: [1.4], skin: 2 },
  { n: "Suit_Male", clip: "Idle_Talking_Loop", h: 1.85, at: at(-8.4, 21.0, E), expr: (t) => (t < 5.6 ? "neutral" : "shock"), blink: [5.3, 5.6], indoor: true },
  { n: "Chef_Female", clip: "Idle_Loop", h: 1.72, at: at(-8.3, 20.2, E + 0.5), expr: () => "smile", blink: [5.8], indoor: true },
  { n: "Doctor_Male_Old", clip: "Idle_Talking_Loop", h: 1.8, at: at(-7.5, 27.9, S + 0.3), expr: (t) => (t < 10.5 ? "neutral" : "grin"), blink: [9.6, 10.5], indoor: true },
];

export class World extends WorldBase {
  private people: Actor3D[] = [];
  constructor(kit: Kit, id: number) {
    // laneRoom: -x row houses at z 21 and 27 are enterable rooms, joined by an inner doorway at (-7.7, 24).
    // House 21: door (-4.4, 21), room x -4.7..-10.7, z 18.1..23.9. House 27: z 24.1..29.9.
    super(kit, id, { SHOTS, camAt, stage, town: "lane", laneRoom: [21, 27] });
    const r = this.room;
    // ---- EXAMPLE room 21: furniture + its light sources (window light comes with the room) ----
    for (const [n, x, y, z, h, yaw] of [["Table_Large", -9.9, 0, 21, 0.8, E], ["Bookcase_2", -10.4, 0, 19.0, 2.2, E], ["Cabinet", -10.4, 0, 23.0, 1.4, E],
      ["CandleStick_Triple", -9.9, 0.8, 21.3, 0.45, 0], ["Lantern_Wall", -10.55, 2.0, 21.0, 0.5, E]] as [string, number, number, number, number, number][]) prop(r, kit, n, x, y, z, h, yaw);
    this.light(-9.9, 1.3, 21.3, "candle"); this.light(-10.3, 2.25, 21.0, "candle", 1.4);
    // ---- EXAMPLE room 27, the lab: workbench on the far wall (z 29.9), seen from the inner doorway ----
    for (const [n, x, y, z, h] of [["Workbench", -7.7, 0, 29.4, 1.0], ["Shelf_Small_Bottles", -5.4, 0, 29.7, 1.9], ["Cauldron", -9.8, 0, 27.0, 0.8],
      ["Potion_1", -8.0, 1.0, 29.3, 0.3], ["Chandelier", -7.7, 2.3, 27.1, 0.8]] as [string, number, number, number, number][]) prop(r, kit, n, x, y, z, h, S);
    this.light(-7.7, 2.35, 27.1, "candle", 1.3);
    CAST.forEach((c, i) => { const p = spawnActor(this.root, c, i); if (p) this.people.push(p); });
    this.finish(); // always last
  }

  /** pose people and moving story props for shot id at time t (s) / story time tau: pure functions, no stored state */
  protected pose(id: number, t: number, tau: number) {
    const cp = camAt(id, Math.round(t * 30)).pos, cam = new THREE.Vector3(cp[0], cp[1], cp[2]);
    for (const p of this.people) poseActor(p, t, tau, cam);
  }
}
