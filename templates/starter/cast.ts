// STARTER cast: who stands where in each shot. The engine (card pool, lighting, blinks, shadows, add()) is
// shared/castkit.ts; the drawings are shared/toon.ts. One case per Crowd name from story.ts. EXAMPLE parts: replace.
import { fxStars, Outfit, SKINS } from "../../shared/toon";
import { add, beginStage, hh, q, shopper, CamInfo, Stage } from "../../shared/castkit";
import { SHOTS, ROOM } from "./story";

// EXAMPLE outfits (period-correct clothes; hat: "hair" | "cap" | ...: see Outfit in shared/toon.ts)
const HERO: Outfit = { jacket: "#e8e2d2", pants: "#4a4f5c", boots: "#4a3426", hat: "hair", hair: "#3a2a1c", skin: SKINS[0] };
const FRIEND: Outfit = { jacket: "#c25a7a", dress: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#8a4a2a", skin: SKINS[1] };

export const stage = (id: number, t: number, tau: number, cam: CamInfo): Stage => {
  void tau; // story time: use it for motion that must follow the story physics
  const s = SHOTS[id - 1], out = beginStage(s.light, cam);
  switch (s.crowd) {
    case "street": { // EXAMPLE: strollers walking toward the camera
      for (let i = 0; i < 10; i++) add(cam, t, out, 20 + i, shopper(i), `s${i}`, -3 + 1.5 * (i % 5), 62 + 1.2 * Math.floor(i / 5) - 0.8 * t, [0, -1], { mode: "stroll", phase: (t * 0.9 + hh(i, 3)) % 1, expr: "neutral" });
      break;
    }
    case "room": { // EXAMPLE: one seated (y 0.24 = seat height), one standing, expressions switch on a word, a spark effect
      const said = t > 5.5;
      add(cam, t, out, 2, FRIEND, "friend", ROOM[0] - 0.6, ROOM[2] - 0.66, [0, 1], { mode: "sit", expr: said ? "grin" : "neutral", look: 1 }, {}, 0.24);
      if (t < 6.17) add(cam, t, out, 1, HERO, "hero", ROOM[0] + 0.55, ROOM[2] - 0.2, [0, 1], { mode: "stand", expr: said ? "laugh" : "grin", look: -1 });
      if (t > 5.5 && t < 6.1) { const u = q((t - 5.5) / 0.6, 30); out.fx.push({ key: `spark${u}`, cw: 400, ch: 400, draw: (p) => fxStars(p, u), x: ROOM[0] - 0.4, y: 1.25, z: ROOM[2] - 0.2, w: 0.5, h: 0.5 }); }
      break;
    }
    default: break;
  }
  return out;
};
