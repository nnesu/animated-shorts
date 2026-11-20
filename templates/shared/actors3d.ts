// 3D actors: house-style character templates (public/models/chars3d/<Name>.glb, made by scripts/bake_cast.mjs from the
// Quaternius Ultimate Animated Character Pack + Universal Animation Library). Each template has its library clips baked on
// its own rig, the model's own eyes and brows removed, and a front-projected face UV on the skin. The face (eyes, brows,
// mouth) is drawn here into the skin's own texture per expression, so it is part of the skin: same light, cannot float.
// Skin is outline-only for the ink pass; clothes and hair keep inner lines. Everything is a pure function of t.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { staticFile } from "remotion";
import { twoTone, INDOOR_K } from "./shade";
import { capTextures } from "./worldkit";
/** skin tones (Actor3.skin indexes them) */
export const SKINS = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"];

export type Expr3 = "neutral" | "shock" | "grin" | "nervous" | "smile" | "stern";
/** standard clips every template carries (scripts/bake_cast.mjs CLIPS) */
export type Clip3 = "Idle_Loop" | "Idle_Talking_Loop" | "Walk_Formal_Loop" | "Walk_Loop" | "Jog_Fwd_Loop" | "Idle_FoldArms_Loop"
  | "Sitting_Idle_Loop" | "Sitting_Talking_Loop" | "Yes" | "Idle_No_Loop";
/** one actor: template name, height m, where (story time s) -> [x, z, yaw] (yaw 0 = faces +z), clip, expression over
 *  time, blink times (s; also hide expression swaps), right-arm point weight 0..1, skin tone index (SKINS) */
export type Actor3 = { n: string; h: number; at: (t: number) => [number, number, number]; clip?: Clip3;
  expr?: (t: number) => Expr3; blink?: number[]; point?: (t: number) => number; skin?: number;
  /** inside a room: indoor shading (dark shade side, like the room's materials) */
  indoor?: boolean; };

const T: Record<string, { scene: THREE.Group; clips: THREE.AnimationClip[] }> = {};
let loadP: Promise<void> | null = null;
/** load the templates a video uses (call from its loadKit) */
export const loadActors = (names: string[]) => loadP ??= Promise.all(names.map((n) => new GLTFLoader().loadAsync(staticFile(`models/chars3d/${n}.glb`))
  .then((g) => { capTextures(g.scene); T[n] = { scene: g.scene, clips: g.animations }; }))).then(() => undefined);

// ---------------- face, drawn into the skin texture ----------------
const INK = "#241726", MOUTH = "#5a1e28", N = 1024;
/** brow raise and inner-end lift (in eye spans), eye shape and mouth shape per expression */
const FACE: Record<Expr3, { brow: [number, number]; eye: string; mouth: string }> = {
  neutral: { brow: [0, 0], eye: "dot", mouth: "dash" }, shock: { brow: [0.16, 0.05], eye: "wide", mouth: "O" },
  grin: { brow: [0.06, 0], eye: "happy", mouth: "D" }, nervous: { brow: [0.06, 0.12], eye: "dot", mouth: "wave" },
  smile: { brow: [0.04, 0], eye: "happy", mouth: "smile" }, stern: { brow: [-0.04, -0.1], eye: "dot", mouth: "frown" },
};
type FaceUV = [number, number, number, number, number]; // uL, vL, uR, vR, eye span (UV units), from the template
const drawFace = (skin: string, f: FaceUV, e: Expr3, shut: boolean) => {
  const cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d")!;
  g.fillStyle = skin; g.fillRect(0, 0, N, N);
  const s = f[4] * N, eyes = [[f[0] * N, (1 - f[1]) * N], [f[2] * N, (1 - f[3]) * N]], cx = (eyes[0][0] + eyes[1][0]) / 2, cy = (eyes[0][1] + eyes[1][1]) / 2;
  const F = FACE[e];
  g.lineCap = "round"; g.strokeStyle = g.fillStyle = INK;
  for (const [x, y] of eyes) {
    const inner = Math.sign(cx - x); // +1: the face centre is to the right of this eye on the canvas
    // brow: a rounded bar above the eye, raised and tilted (inner end up) per expression
    const by = y - (0.42 + F.brow[0]) * s, t = F.brow[1];
    g.lineWidth = 0.1 * s; g.beginPath(); g.moveTo(x - inner * 0.25 * s, by + t * s * 0.5); g.lineTo(x + inner * 0.25 * s, by - t * s * 0.5); g.stroke();
    const k = shut ? "shut" : F.eye;
    g.beginPath();
    if (k === "dot") { g.ellipse(x, y, 0.15 * s, 0.2 * s, 0, 0, 7); g.fill(); }
    else if (k === "wide") { g.fillStyle = "#f4efe6"; g.ellipse(x, y, 0.26 * s, 0.26 * s, 0, 0, 7); g.fill(); g.lineWidth = 0.04 * s; g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(x, y, 0.11 * s, 0, 7); g.fill(); }
    else if (k === "happy") { g.lineWidth = 0.08 * s; g.arc(x, y + 0.06 * s, 0.18 * s, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else { g.lineWidth = 0.07 * s; g.moveTo(x - 0.17 * s, y); g.lineTo(x + 0.17 * s, y); g.stroke(); }
  }
  const my = cy + 0.58 * s;
  g.beginPath(); g.lineWidth = 0.07 * s;
  switch (F.mouth) {
    case "dash": g.moveTo(cx - 0.22 * s, my); g.lineTo(cx + 0.22 * s, my); g.stroke(); break;
    case "smile": g.arc(cx, my - 0.18 * s, 0.3 * s, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); break;
    case "frown": g.arc(cx, my + 0.22 * s, 0.26 * s, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); break;
    case "wave": for (let i = 0; i <= 8; i++) { const x = cx - 0.24 * s + 0.06 * s * i, y = my + 0.04 * s * Math.sin(i * 1.4); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); break;
    case "O": g.fillStyle = MOUTH; g.ellipse(cx, my, 0.13 * s, 0.17 * s, 0, 0, 7); g.fill(); g.lineWidth = 0.04 * s; g.stroke(); break;
    case "D": g.fillStyle = MOUTH; g.moveTo(cx - 0.3 * s, my - 0.06 * s); g.lineTo(cx + 0.3 * s, my - 0.06 * s); g.arc(cx, my - 0.06 * s, 0.3 * s, 0, Math.PI); g.closePath(); g.fill(); g.lineWidth = 0.04 * s; g.stroke(); break;
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  tex.flipY = false; // glTF UVs: v grows downward (the exporter flips Blender's v)
  return tex;
};

// ---------------- actors ----------------
export type Actor3D = { o: THREE.Object3D; m: THREE.AnimationMixer; c: Actor3; B: Record<string, THREE.Object3D>; mats: THREE.MeshLambertMaterial[];
  skinMat: THREE.MeshLambertMaterial | null; faceUV: FaceUV | null; skin: string; faces: Map<string, THREE.Texture> };
export const spawnActor = (R: THREE.Object3D, c: Actor3, i: number): Actor3D | null => {
  const t = T[c.n];
  if (!t) return null;
  const o = skClone(t.scene), skin = SKINS[(c.skin ?? i) % 4];
  let skinMat: THREE.MeshLambertMaterial | null = null, faceUV: FaceUV | null = null;
  const mats: THREE.MeshLambertMaterial[] = [];
  o.traverse((x) => {
    if (Array.isArray(x.userData.faceUV)) faceUV = x.userData.faceUV as FaceUV; // on the "Body" group (multi-material mesh)
    const mesh = x as THREE.Mesh;
    if (!mesh.isMesh) return;
    const conv = (m: THREE.Material) => {
      const s = m as THREE.MeshStandardMaterial, part = s.name.split(".")[0];
      const l = twoTone(new THREE.MeshLambertMaterial({ color: part === "Skin" ? "#ffffff" : s.color }), 1, c.indoor ? INDOOR_K : 1);
      l.userData.part = part; mats.push(l);
      if (part === "Skin") { l.userData.inkNoCrease = true; skinMat = l; } // body and face: outline only
      return l;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(conv) : conv(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  });
  const box = new THREE.Box3().setFromObject(o);
  o.scale.multiplyScalar(c.h / (box.max.y - box.min.y));
  const m = new THREE.AnimationMixer(o);
  const clip = t.clips.find((a) => a.name === (c.clip ?? "Idle_Loop")) ?? t.clips[0];
  if (clip) m.clipAction(clip).play();
  const B: Record<string, THREE.Object3D> = {};
  o.traverse((x) => { if ((x as THREE.Bone).isBone) B[x.name] = x; });
  const a: Actor3D = { o, m, c, B, mats, skinMat, faceUV, skin, faces: new Map() };
  if (skinMat) (skinMat as THREE.MeshLambertMaterial).map = faceTex(a, "neutral", false);
  o.userData.qa = { key: c.n, actor: true }; // scene-geometry QA (qadump.ts)
  R.add(o);
  return a;
};
const faceTex = (a: Actor3D, e: Expr3, shut: boolean) => {
  const k = `${e}|${shut}`;
  let tx = a.faces.get(k);
  if (!tx) {
    if (!a.faceUV) { const cv = document.createElement("canvas"); cv.width = cv.height = 4; const g = cv.getContext("2d")!; g.fillStyle = a.skin; g.fillRect(0, 0, 4, 4); tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; }
    else tx = drawFace(a.skin, a.faceUV, e, shut);
    a.faces.set(k, tx);
  }
  return tx;
};
const shutAt = (t: number, at: number[] = []) => { const f = Math.round(t * 30); return at.some((s) => { const k = f - Math.round(s * 30) + 2; return k >= 1 && k < 3; }); };
/** turn a bone (world-space swing, slerped by w) so its child moves onto the line toward target */
const aim = (bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3, w: number) => {
  const p = bone.getWorldPosition(new THREE.Vector3()), d0 = child.getWorldPosition(new THREE.Vector3()).sub(p).normalize();
  const qW = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(d0, target.clone().sub(p).normalize()));
  bone.quaternion.slerp(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qW), w); bone.updateMatrixWorld(true);
};
/** pose an actor: t = clip time (s), lt = story time for `at` / expressions, cam = camera position (pointing aims up
 *  and out to the right side, a little toward the lens) */
export const poseActor = (a: Actor3D, t: number, lt: number, cam: THREE.Vector3) => {
  const [x, z, yaw] = a.c.at(lt);
  a.o.position.set(x, 0, z); a.o.rotation.y = yaw; a.m.setTime(t); a.o.updateMatrixWorld(true);
  const w = a.c.point ? a.c.point(lt) : 0, B = a.B;
  if (w > 0 && B.UpperArmR && B.LowerArmR && B.FistR && B.Hips) {
    const sh = B.UpperArmR.getWorldPosition(new THREE.Vector3()), hp = B.Hips.getWorldPosition(new THREE.Vector3());
    const side = new THREE.Vector3(sh.x - hp.x, 0, sh.z - hp.z).normalize(), toCam = cam.clone().sub(sh).setY(0).normalize();
    const target = sh.clone().addScaledVector(side, 1.4).addScaledVector(toCam, 0.6).add(new THREE.Vector3(0, 1.1, 0));
    aim(B.UpperArmR, B.LowerArmR, target, w); aim(B.LowerArmR, B.FistR, target, w);
  }
  if (a.skinMat) a.skinMat.map = faceTex(a, a.c.expr ? a.c.expr(lt) : "neutral", shutAt(lt, a.c.blink));
};

// ---------------- hands on props (call after poseActor) ----------------
/** turn a bone so its child moves onto the line toward target (full weight) */
const aimB = (bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) => {
  const p = bone.getWorldPosition(new THREE.Vector3()), d0 = child.getWorldPosition(new THREE.Vector3()).sub(p).normalize();
  const qW = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(d0, target.clone().sub(p).normalize()));
  bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qW)); bone.updateMatrixWorld(true);
};
/** two-bone arm IK: wrist toward target (blended from the clip pose by w), elbow down and out */
export const reach = (a: Actor3D, s: "L" | "R", target: THREE.Vector3, w: number) => {
  const U = a.B["UpperArm" + s], Lo = a.B["LowerArm" + s], F = a.B["Fist" + s], O = a.B["UpperArm" + (s === "L" ? "R" : "L")];
  if (!U || !Lo || !F || !O || w <= 0.001) return;
  const sh = U.getWorldPosition(new THREE.Vector3()), el = Lo.getWorldPosition(new THREE.Vector3()), fi = F.getWorldPosition(new THREE.Vector3());
  const l1 = sh.distanceTo(el), l2 = el.distanceTo(fi), T = fi.clone().lerp(target, w);
  const d = T.clone().sub(sh), dist = Math.min(d.length(), (l1 + l2) * 0.999); d.normalize();
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const out = sh.clone().sub(O.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
  const pole = new THREE.Vector3(0, -1, 0).addScaledVector(out, 0.6); pole.addScaledVector(d, -pole.dot(d)).normalize();
  aimB(U, Lo, sh.clone().addScaledVector(d, x).addScaledVector(pole, h)); aimB(Lo, F, sh.clone().addScaledVector(d, dist));
};
/** both hands on a prop of radius r at c: palms either side and slightly behind it, so the prop shows in front.
 *  w = blend from the clip pose (0..1), rub = scrubbing amplitude. Returns the prop centre. */
export const holdProp = (a: Actor3D | undefined, c: [number, number, number], r: number, w: number, rub = 0, t = 0) => {
  const C = new THREE.Vector3(...c);
  if (!a || w <= 0.001) return C;
  const rt = a.B.UpperArmR.getWorldPosition(new THREE.Vector3()).sub(a.B.UpperArmL.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
  const fwd = new THREE.Vector3(-rt.z, 0, rt.x); if (fwd.dot(C.clone().sub(a.o.position).setY(0)) < 0) fwd.negate();
  const off = new THREE.Vector3(0, 0.025 * Math.sin(t * 14), 0).addScaledVector(fwd, 0.02 * Math.cos(t * 14)).multiplyScalar(rub);
  // two passes: the IK aims the wrists, so the second shifts both by the palm centres' miss (palm = wrist..fingertip midpoint)
  const palm = (s: "L" | "R") => { const f = a.B["Fist" + s], e = a.B["Fist" + s + "_end"]; const p = f.getWorldPosition(new THREE.Vector3()); return e ? p.add(e.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5) : p; };
  let fix = new THREE.Vector3();
  for (let k = 0; k < 2; k++) {
    reach(a, "L", C.clone().addScaledVector(rt, -(r + 0.06)).addScaledVector(fwd, -0.06).add(off).sub(fix), w);
    reach(a, "R", C.clone().addScaledVector(rt, r + 0.06).addScaledVector(fwd, -0.06).sub(off).sub(fix), w);
    if (k === 0) fix = palm("L").add(palm("R")).multiplyScalar(0.5).sub(C.clone().addScaledVector(fwd, -0.06)).multiplyScalar(w);
  }
  return C;
};
