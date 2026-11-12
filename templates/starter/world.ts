// STARTER world. The engine (sky, lights, town street + harbour at the origin, water, card loop) is shared/worldkit.ts.
// Here: this video's models, sets and moving props. Put sets far apart (100+ m) so no shot sees another set.
// Everything marked EXAMPLE is the 2-shot demo: replace it.
import * as THREE from "three";
import { WorldBase, makeKitLoader, TOWN_KIT, bx, quadUp } from "../../shared/worldkit";
import { Kit, lam, prop, kitClone, house, boxGeo, V } from "../../shared/build";
import { ctex } from "../../shared/paint";
import { NOINK } from "../../shared/ink";
import { stage } from "./cast";
import { SHOTS, camAt, ROOM } from "./story";

// every extra Kenney model used below, as <pack>/<model> (public/kenney/INDEX.txt); kit key = the model name
export const loadKit = makeKitLoader([...TOWN_KIT, "furniture-kit/loungeChair", "furniture-kit/lampRoundFloor", "furniture-kit/rugRectangle", "furniture-kit/sideTable"]); // EXAMPLE
/** per-shot sun overrides. Interiors: sun from behind the camera so walls behind the subject never shade it */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 2: { az: 150, el: 50 } }; // EXAMPLE

export class World extends WorldBase {
  constructor(kit: Kit, id: number) {
    super(kit, id, { SHOTS, camAt, stage, sunShot: SUN_SHOT });
    const { b, M, root: R } = this;
    void [R, THREE, NOINK, kitClone, house, boxGeo, V]; // toolbox for your sets (see references/API.md)
    M.paperHome = lam("wallpaperHome", () => ({ map: ctex("wallpaperHome", 256, 256, (g) => { g.fillStyle = "#f0d9b5"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#e3c79c"; for (let y = 0; y < 256; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < 256; x += 64) { g.beginPath(); g.arc(x + 16, y + 16, 8, 0, 7); g.fill(); } }) }));
    // ---- EXAMPLE interior set ROOM: floor, back + left wall (walls reach above the frame), centred props ----
    const h0 = ROOM[0], hz = ROOM[2];
    b.add(quadUp(h0 - 2, h0 + 3, hz - 1.6, hz + 4, 3, 3, 0.002), M.floor);
    bx(b, M.paperHome, h0 - 2, 0, hz - 1.75, h0 + 3, 6, hz - 1.6, 2); bx(b, M.paperHome, h0 - 2.15, 0, hz - 1.75, h0 - 2, 6, hz + 4, 2);
    prop(b, kit, "rugRectangle", h0 + 0.4, 0.004, hz + 0.2, 0.02, 0);
    prop(b, kit, "loungeChair", h0 - 0.6, 0, hz - 0.66, 0.95, 0);
    prop(b, kit, "lampRoundFloor", h0 - 1.4, 0, hz - 1.2, 1.7, 0);
    prop(b, kit, "sideTable", h0 + 0.3, 0, hz - 0.9, 0.55, 0);
    this.finish(); // always last
  }

  /** pose moving story props for shot id at time t (s) / story time tau: a pure function of both, no stored state */
  protected pose(_id: number, _t: number, _tau: number) {}
}
