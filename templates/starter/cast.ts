// STARTER cast: the people are 3D actors (world.ts CAST, shared/actors3d.ts). stage() returns 2D overlays and effects
// (rings, X marks, diagrams with dropShadow(); splashes, sparks); most shorts leave it as is.
import { beginStage, CamInfo, Stage } from "../../shared/castkit";
import { SHOTS } from "./story";

export const stage = (id: number, t: number, tau: number, cam: CamInfo): Stage => {
  void t; void tau; // t = shot time, tau = story time
  return beginStage(SHOTS[id - 1].light, cam);
};
