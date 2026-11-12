// Scene-geometry QA log (debug only): per frame, for every tagged character card, where it lands on screen.
// Tag the cards in world.ts where they are posed:  a.mesh.userData.qa = { key: p.key }   ("S|..." = side-profile drawing)
// Call it from Bridge.tsx after world.update(), behind an input prop:  if (qa) qaDump({ id, f, cam, root: world.root, coc, crowdOk })
// It logs one line "QADUMP {json}" (console.warn); scripts/bridge-stills.mjs writes those lines to <prefix>qadump.jsonl,
// scripts/qa_geometry.py flags subject out of frame, edge-cut cards, cards on the lens, floating feet, side profiles, no clear subject.
// shortcut: the bbox is the whole card quad (transparent canvas margins included), so in-frame fractions are conservative;
// upgrade to the drawing's alpha bounds if edge-cut flags come up false.
import * as THREE from "three";

export type QaCard = { key: string; bbox: [number, number, number, number]; inFrame: number; hPx: number; dist: number; side: boolean; baseY: number; groundY: number | null; coc: number | null };
export type QaFrame = { id: number; f: number; crowdOk?: boolean; cards: QaCard[] };

const box = new THREE.Box3(), v = new THREE.Vector3(), c = new THREE.Vector3(), fwd = new THREE.Vector3();
const ray = new THREE.Raycaster(), foot = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
ray.layers.set(0); // world geometry only: cards live on their own (NOINK) layer

export function qaDump(o: { id: number; f: number; cam: THREE.PerspectiveCamera; root: THREE.Object3D; coc?: (distAlongView: number) => number; crowdOk?: boolean; H?: number }): QaFrame {
  const H = o.H ?? 1920, W = (H * 9) / 16;
  o.root.updateMatrixWorld(true); o.cam.updateMatrixWorld(); o.cam.getWorldDirection(fwd);
  const solids: THREE.Object3D[] = [];
  o.root.traverseVisible((m) => { if ((m as THREE.Mesh).isMesh && !m.userData.qa && m.layers.isEnabled(0)) solids.push(m); });
  const cards: QaCard[] = [];
  o.root.traverseVisible((m) => {
    const mesh = m as THREE.Mesh;
    if (!mesh.isMesh || !m.userData.qa) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    box.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
    box.getCenter(c);
    if (c.clone().sub(o.cam.position).dot(fwd) <= 0) return; // behind the lens
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(o.cam);
      const sx = ((v.x + 1) / 2) * W, sy = ((1 - v.y) / 2) * H;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const area = Math.max(1e-6, (x1 - x0) * (y1 - y0));
    const inside = Math.max(0, Math.min(x1, W) - Math.max(x0, 0)) * Math.max(0, Math.min(y1, H) - Math.max(y0, 0));
    mesh.getWorldPosition(foot); // card origin = soles (cast.ts BODY geometry)
    ray.set(v.set(foot.x, foot.y + 0.5, foot.z), down);
    const hit = ray.intersectObjects(solids, false)[0];
    const dist = c.distanceTo(o.cam.position);
    cards.push({
      key: String(m.userData.qa.key ?? m.name ?? m.uuid), bbox: [x0, y0, x1, y1].map((n) => Math.round(n)) as QaCard["bbox"],
      inFrame: +(inside / area).toFixed(3), hPx: Math.round(y1 - y0), dist: +dist.toFixed(2), side: String(m.userData.qa.key ?? "").startsWith("S|"),
      baseY: +foot.y.toFixed(3), groundY: hit ? +hit.point.y.toFixed(3) : null,
      coc: o.coc ? Math.round(o.coc(c.clone().sub(o.cam.position).dot(fwd))) : null,
    });
  });
  const fr: QaFrame = { id: o.id, f: o.f, crowdOk: o.crowdOk, cards };
  console.warn("QADUMP " + JSON.stringify(fr));
  return fr;
}
