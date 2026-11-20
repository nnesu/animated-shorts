// World engine shared by every short: sky, lights, clouds, the house town street + harbour at the origin, water, the
// per-shot sun and sight-line cull, and the actor / effect card loop. A video's world.ts extends WorldBase: it adds its
// sets to this.b / this.root in the constructor, calls this.finish(), and poses story props in pose().
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, lam, house, prop, kitClone, Kit, Ray, setSight, qHouse, qHouseAt, qRoomAt, QV_KIT, GLASS } from "./build";
import { ctex, cobbleHD, stoneHD, waterNear, waterFar, cloudHD, beam, rng, planksHD, grassBlades } from "./paint";
import { LIGHTS, LOOK, LightPreset, lightAt } from "./lights";
import { TONE, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Fx, CamInfo, Stage } from "./castkit";
import { FPS, Cam, ShotDef } from "./camkit";
const D0 = 0;

// ---------------- assets ----------------
/** models the town + harbour need, as <pack>/<model>.gltf under public/models/ (INDEX.txt); a video adds its own */
export const TOWN_KIT = [...QV_KIT, ...["CommonTree_1", "CommonTree_2", "CommonTree_3", "CommonTree_4", "Bush_Common", "Flower_3_Group"].map((n) => `quaternius-nature/${n}.gltf`),
  ...["Bench", "Barrel", "Crate_Wooden", "Lantern_Wall", "Pot_1", "Banner_1"].map((n) => `quaternius-props/${n}.gltf`)];
/** road / pavement maps with normal maps (relief under the two-tone light), filled by the kit loader */
export const QTEX: Record<string, THREE.Texture> = {};
const QTEX_FILES: Record<string, string> = { road: "T_UnevenBrick_BaseColor", roadN: "T_UnevenBrick_Normal", pave: "T_Brick_BaseColor", paveN: "T_Brick_Normal" };
/** memory budget (7.4 GB laptop): textures under o capped at max px (2048 trim sheets cost 4x the RAM + GPU); frees decoded ImageBitmaps */
export const capTextures = (o: THREE.Object3D, max = 1024) => {
  const done = new Set<THREE.Texture>();
  o.traverse((x) => { const m = x as THREE.Mesh; if (!m.isMesh) return;
    for (const mt of [m.material].flat() as THREE.MeshStandardMaterial[]) for (const t of [mt.map, mt.emissiveMap, mt.normalMap, mt.roughnessMap, mt.metalnessMap, mt.aoMap]) {
      const im = t?.image as { width: number; height: number; close?: () => void } | undefined; if (!t || !im || done.has(t) || Math.max(im.width, im.height) <= max) continue;
      done.add(t); const k = max / Math.max(im.width, im.height), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d")!.drawImage(im as CanvasImageSource, 0, 0, c.width, c.height);
      im.close?.(); t.image = c; t.needsUpdate = true; } });
};
/** "Vice City" glow (golden hour / dusk): markGlass(kit) before the build tags kit materials named Glass / Window; after
 *  this.finish(), lightGlass(this.root) makes every tagged material an emissive amber window (toLambert copies colours, not names) */
const GLOW_MARK = new THREE.Color(0.913, 0.517, 0.271);
export const markGlass = (kit: Kit) => { for (const k of Object.values(kit)) k.traverse((x) => { const m = x as THREE.Mesh;
  if (m.isMesh) for (const mt of [m.material].flat() as THREE.MeshStandardMaterial[]) if (mt.name === "Glass" || mt.name === "Window") mt.color?.copy(GLOW_MARK); }); };
export const lightGlass = (root: THREE.Object3D, col = "#ffb45a", i = 1.6) => root.traverse((x) => { const m = x as THREE.Mesh; if (!m.isMesh) return;
  for (const mt of [m.material].flat() as THREE.MeshLambertMaterial[]) if (mt.color?.equals(GLOW_MARK) && mt.emissive) { mt.color.set("#3a2a20"); mt.emissive.set(col); mt.emissiveIntensity = i; } });
/** loader for a list of models; the kit key is the model name without pack or extension. Missing files are skipped. */
export const makeKitLoader = (names: string[]) => {
  let kitP: Promise<Kit> | null = null;
  return () => {
    if (!kitP) {
      const loader = new GLTFLoader(), tl = new THREE.TextureLoader();
      const key = (n: string) => n.split("/").pop()!.replace(/\.gltf$/, "");
      const texP = Promise.all(Object.entries(QTEX_FILES).filter(([k]) => !QTEX[k]).map(([k, f]) => tl.loadAsync(staticFile(`models/quaternius-village/${f}.png`)).then((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 8; if (!k.endsWith("N")) t.colorSpace = THREE.SRGBColorSpace; QTEX[k] = t;
      }).catch(() => undefined)));
      kitP = Promise.all([texP, ...names.map((n) => loader.loadAsync(staticFile(`models/${n}${n.endsWith(".gltf") ? "" : ".glb"}`)).then((g) => { capTextures(g.scene); return [key(n), g.scene] as const; }).catch(() => [key(n), null] as const))])
        .then(([, ...list]) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
    }
    return kitP;
  };
};

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

/** what the engine needs from a video: its shots, camera, staging and per-shot sun overrides (interiors: az 150, el 50) */
export type WorldCfg = {
  SHOTS: ShotDef[]; camAt: (id: number, f: number) => Cam; stage: (id: number, t: number, tau: number, cam: CamInfo) => Stage;
  sunShot?: Record<number, { az?: number; el?: number }>;
  /** "lane" (new shorts): compact 6 m lane closed by a bend at both ends; unset = the long street + harbour (older shorts) */
  town?: "lane";
  /** lane only: make the -x row houses centred at these z (3, 9, 15, 21, 27, 33, 39, 45) enterable (qRoomAt); neighbours
   *  (6 m apart) are joined by an inner doorway, so the camera can move from room to room in one take */
  laneRoom?: number[];
};
const sightLines = (cfg: WorldCfg, only: number): Ray[] => {
  const out: Ray[] = [];
  for (const s of cfg.SHOTS.filter((x) => x.id === only)) for (let f = s.a - 8; f < s.b + 8; f += 2) {
    const c = cfg.camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    // long takes: only the holds clear sight lines; mid-glide frames would carve a path through the neighbouring sets
    const n = cfg.camAt(s.id, Math.max(0, f) + 1);
    if (Math.hypot(n.pos[0] - c.pos[0], n.pos[1] - c.pos[1], n.pos[2] - c.pos[2]) > 0.03 || Math.hypot(n.look[0] - c.look[0], n.look[1] - c.look[1], n.look[2] - c.look[2]) > 0.06) continue;
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

export type Mats = Record<string, THREE.Material>;
/** box from (x0, y0, z0) to (x1, y1, z1) into the batch */
export const bx = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0, bottom = false) => b.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile, bottom), m);
/** unlit painted plane material (signs, banners, wall panels, drapes): lit ones go grey or purple in shade. Slightly under white so it does not glow.
 *  cut = true for cut-out shapes (throne backs, pennants): transparent areas become holes */
export const unlit = (map: THREE.Texture, cut = false) => new THREE.MeshBasicMaterial({ map, color: "#e2dada", ...(cut ? { alphaTest: 0.5 } : {}) });
/** painted crowd strip (one per stand tier) from (x0, z0) to (x1, z1), base at y, h tall; the texture repeats every `tile` m,
 *  offset by position so neighbouring bands do not line up. No fog (far stands stay readable); cards stand in front only for close shots */
export const crowdBand = (R: THREE.Object3D, tex: THREE.Texture, x0: number, z0: number, x1: number, z1: number, y: number, h = 1.05, tile = 10) => {
  const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (tex.wrapS !== THREE.RepeatWrapping) { tex.wrapS = THREE.RepeatWrapping; tex.needsUpdate = true; }
  const g = new THREE.PlaneGeometry(len, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / tile) + (cx * 0.37 + cz * 0.13 + y));
  const m = new THREE.Mesh(g, lam(`crowdBand|${tex.uuid}`, () => ({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, fog: false })));
  m.position.set(cx, y + h / 2, cz); m.rotation.y = Math.atan2(-(z1 - z0), x1 - x0); m.layers.set(NOINK); m.receiveShadow = true; R.add(m);
  return m;
};

export class WorldBase {
  /** the merged static geometry: add sets with prop() / house() / bx() / b.add(), then call finish() */
  protected b = new Batch();
  /** static pieces drawn without ink outlines (small kit parts: windows, shutters, doors); built in finish() */
  protected small = new Batch();
  /** enterable rooms (qRoomAt / roomAt): indoor materials (dark shade side), lit by window light and lamps */
  protected room = new Batch(true);
  /** local lights: street lamps (on as it gets dark), window light (daylight into rooms), candles / lamps (always on) */
  private locals: { l: THREE.PointLight; kind: "lamp" | "window" | "candle"; i: number; glow?: THREE.Sprite }[] = [];
  /** shared materials: grass, cobble, wall, cope, wood, floor; add your own */
  protected M: Mats = {};
  root = new THREE.Group();
  private pool = new Pool();
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU!: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private fwdCache = new Map<number, [number, number]>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(protected kit: Kit, id: number, protected cfg: WorldCfg) {
    const R = this.root, M = this.M;
    // ---- sky + light (house look, from molasses) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    M.grass = lam("grassKit", () => ({ map: grassBlades() }));
    // stone road + pavement with relief (Quaternius maps + normal maps); painted fallback when the maps are missing
    M.cobble = QTEX.road ? lam("cobbleQ", () => ({ map: QTEX.road, normalMap: QTEX.roadN ?? null, color: new THREE.Color(1.3, 1.18, 1.05) })) : lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.wall = lam("wallHD", () => ({ map: stoneHD("wallHD", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") }));
    M.cope = QTEX.pave ? lam("copeQ", () => ({ map: QTEX.pave, normalMap: QTEX.paveN ?? null, color: new THREE.Color(1.45, 1.38, 1.28) })) : lam("copeHD", () => ({ map: stoneHD("copeHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
    M.wood = lam("wood", () => ({ map: beam() }));
    M.floor = lam("planksFloor", () => ({ map: planksHD(), color: "#e6c9a2" }));

    const b = this.b;
    setSight(sightLines(cfg, id));
    // ---- town: ground, street, houses, harbour (from the house town) ----
    b.add(quadUp(-900, 900, -300, 150, 450, 112), M.grass, new THREE.Matrix4().makeTranslation(0, -0.05, 0));
    if (cfg.town === "lane") this.lane(kit);
    else {
    b.add(quadUp(-4.5, 4.5, -3, 150, 2.25, 38, 0.012), M.cobble);
    b.add(quadUp(-40, 40, -48, -3, 10, 11, 0.01), M.cobble);
    b.add(quadUp(-140, 140, 138, 150, 70, 3, 0.012), M.cobble);
    for (const sx of [-1, 1]) b.add(boxGeo(V(sx > 0 ? 4.5 : -6.5, 0, -3), V(sx > 0 ? 6.5 : -4.5, 0.15, 138), 2), M.cope);
    b.add(boxGeo(V(-60, -0.5, 148), V(60, 0.05, 150), 2), M.wall);
    const r = rng(23), pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
    for (const sx of [-1, 1]) {
      for (const [xo, z0, z1] of [[10.5, 6, 140], [22.5, 6, 134], [34.5, 8, 128]] as const) {
        let z = z0;
        while (z < z1) {
          const w = pick([7, 9]), h = pick([7, 8.4, 9.8]);
          house(b, sx * xo, z + w / 2, sx < 0 ? Math.PI / 2 : -Math.PI / 2, w, 8, h, Math.floor(r() * 8), 0);
          z += w + (r() < 0.08 ? 2 : 0.2);
        }
      }
      for (let k = 0, zc = 9; zc < 140; zc += 6, k++) qHouse(b, this.small, kit, sx, zc, k * 7 + (sx > 0 ? 3 : 0)); // detailed fronts over row 1
      for (const xo of [21, 33]) for (let z = -46; z < -2; z += 9) house(b, sx * xo, z + 4, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 9, 8, pick([7, 8.4]), Math.floor(r() * 8), 0);
    }
    type P = [string, number, number, number, number];
    const dress: P[] = [];
    const TREES = ["CommonTree_1", "CommonTree_2", "CommonTree_3", "CommonTree_4"];
    for (let k = 0, z = 9; z < 132; z += 9, k++) for (const sx of [-1, 1]) {
      const yaw = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      dress.push(["Lantern_Wall", sx * 6.2, z + (sx > 0 ? 4.5 : 0), 0.75, yaw]); // on the house fronts (wall plane |x| 6.4)
      if ((k + (sx > 0 ? 1 : 0)) % 2 === 0) dress.push([TREES[(k + (sx > 0 ? 2 : 0)) % 4], sx * 5.6, z + 4.5 - (sx > 0 ? 4.5 : 0), 6.5 + (k % 3), 0]);
      if (k % 3 === (sx > 0 ? 1 : 2)) dress.push(["Bench", sx * 5.9, z + 2.2, 0.95, yaw]);
      if (k % 3 === (sx > 0 ? 0 : 1)) dress.push(["Pot_1", sx * 6.0, z + 3, 0.7, yaw], ["Flower_3_Group", sx * 6.0, z + 3, 0.5, yaw]);
      if (k % 2 === 1) dress.push(["Bush_Common", sx * 6.2, z + 6, 1.2, k]);
    }
    dress.push(["CommonTree_1", 46, -20, 9, 0], ["CommonTree_2", -46, -25, 9, 0], ["CommonTree_3", 40, 30, 8, 0],
      ["Bench", 6.0, -1, 0.95, -Math.PI / 2], ["Bench", -6.0, -1, 0.95, Math.PI / 2],
      ["Bush_Common", 8.5, -15, 1.3, 0], ["Bush_Common", -8.5, -15, 1.2, 2], ["Banner_1", -6.5, -18, 4, 0], ["Banner_1", 6.5, -18, 4, 0]);
    for (const [name, x, z, h, yaw] of dress) prop(b, kit, name, x, name === "Lantern_Wall" ? 2.3 : name === "Flower_3_Group" ? 0.55 : 0, z, h, yaw);
    // harbour: pier, crates, barrels
    M.pier = lam("pierMol", () => ({ map: ctex("pierHD2", 256, 256, (g, rr) => { for (let i = 0; i < 8; i++) { const k = 0.92 + 0.16 * rr(); g.fillStyle = `rgb(${Math.round(180 * k)},${Math.round(131 * k)},${Math.round(78 * k)})`; g.fillRect(i * 32, 0, 32, 256); g.fillStyle = "#5a3d22"; g.fillRect(i * 32, 0, 1, 256); } }) }));
    b.add(boxGeo(V(-3, -0.3, 150), V(3, 0.1, 176), 2), M.pier);
    for (const [name, x, z, h, yaw] of [["Crate_Wooden", 1.6, 156, 1.1, 0.3], ["Crate_Wooden", 1.7, 158.2, 1.1, 0.8], ["Barrel", -1.6, 157, 1.2, 0], ["Barrel", -1.7, 159, 1.2, 0]] as P[])
      prop(b, kit, name, x, 0, z, h, yaw);
    for (const sx of [-1, 1]) for (let x = 14; x < 76; x += 8.6) house(b, sx * x, 141, 0, 8, 8, [7, 8.4, 9.8][Math.floor(x / 8.6) % 3], Math.floor(x) % 8, 0);
    // horizon rule: the far shore across the harbour (shot 2a looks out to sea): low hills with a row of houses on the waterline
    for (const [hx, hz, hr] of [[-70, 300, 70], [10, 320, 80], [85, 295, 65], [-150, 330, 80], [160, 330, 80]]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(hr, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), lam("farShore", () => ({ color: "#7fa35a" })));
      hill.scale.set(1, 0.32, 1); hill.position.set(hx, -0.6, hz); R.add(hill);
    }
    for (let x = -90; x <= 90; x += 9) house(b, x, 236, Math.PI, 8, 8, [7, 8.4, 9.8][Math.abs(Math.floor(x / 9)) % 3], Math.abs(Math.floor(x)) % 8, -0.3);
    }

  }

  /** compact lane (cfg.town "lane"): a 6 m road between Quaternius house rows from z 0 to 42, closed at both ends by a
   *  bend: at z 42 the road turns +x into a short stub, at z 0 it turns -x; a house row across each end and a house at
   *  each stub's end close every view down the lane. House fronts at |x| = 4.4, pavements x 3..4.4. */
  private lane(kit: Kit) {
    const b = this.b, M = this.M, Q = (x: number, z: number, yaw: number, seed: number) => qHouseAt(b, this.small, kit, x, z, yaw, seed, true);
    b.add(quadUp(-3, 3, -6.4, 48.4, 1.5, 13.7, 0.012), M.cobble);
    b.add(quadUp(3, 14.4, 42, 48.4, 2.85, 1.6, 0.012), M.cobble);
    b.add(quadUp(-14.4, -3, -6.4, 0, 2.85, 1.6, 0.012), M.cobble);
    b.add(boxGeo(V(3, 0, -6.4), V(4.4, 0.15, 42), 2), M.cope);
    b.add(boxGeo(V(-4.4, 0, 0), V(-3, 0.15, 48.4), 2), M.cope);
    let k = 0;
    for (let zc = -3; zc < 42; zc += 6) Q(4.4, zc, -Math.PI / 2, k++ * 7 + 3);   // +x row, faces the lane
    for (let zc = 3; zc < 48; zc += 6) {                                          // -x row
      const rooms = this.cfg.laneRoom ?? [];
      if (rooms.includes(zc)) this.roomAt(-4.4, zc, Math.PI / 2, k++ * 7, [...(rooms.includes(zc + 6) ? ["-x" as const] : []), ...(rooms.includes(zc - 6) ? ["+x" as const] : [])]);
      // a room's neighbours get no back block: its walls would poke into the room through the side wall
      else if (rooms.some((r) => Math.abs(r - zc) === 6)) qHouseAt(b, this.small, kit, -4.4, zc, Math.PI / 2, k++ * 7);
      else Q(-4.4, zc, Math.PI / 2, k++ * 7);
    }
    for (let xc = -1.4; xc < 20; xc += 6) Q(xc, 48.4, Math.PI, k++ * 7 + 1);    // across the far end
    for (let xc = 1.4; xc > -20; xc -= 6) Q(xc, -6.4, 0, k++ * 7 + 2);           // across the near end
    Q(14.4, 45.2, -Math.PI / 2, k++ * 7 + 4); Q(-14.4, -3.2, Math.PI / 2, k++ * 7 + 5); // stub ends
    type P = [string, number, number, number, number];
    const dress: P[] = [];
    for (const z of [6, 18, 30]) {
      // wall lanterns on every second house front (house joints), staggered across the lane
      dress.push(["Lantern_Wall", 4.2, z, 0.75, -Math.PI / 2], ["Lantern_Wall", -4.2, z + 6, 0.75, Math.PI / 2]);
      this.light(3.8, 2.5, z, "lamp"); this.light(-3.8, 2.5, z + 6, "lamp");
    }
    dress.push(["Bench", -4.0, 21, 0.95, Math.PI / 2], ["Bench", 4.0, 9, 0.95, -Math.PI / 2], ["Barrel", 3.9, 27, 1.0, 0], ["Barrel", 3.95, 27.8, 1.0, 1],
      ["Crate_Wooden", 3.9, 28.8, 0.8, 0.3], ["Bush_Common", 13.4, 47.4, 1.3, 0], ["Bush_Common", -13.4, -5.4, 1.3, 2], ["Barrel", -3.9, 40.5, 1.0, 0.5]);
    const doors = this.cfg.laneRoom ?? []; // keep the enterable doors clear (the camera passes through them)
    for (const [name, x, z, h, yaw] of dress) if (x > 0 || doors.every((d) => Math.abs(z - d) > 1.6)) prop(b, kit, name, x, name === "Lantern_Wall" ? 2.3 : 0, z, h, yaw);
  }

  /** a local light: "lamp" = street or wall lantern (warm, on from dusk), "window" = daylight through a window (cool, off at night,
   *  "candle" = candle / oil lamp (warm, always on; a small flame glow). i scales it. Lights within 9 m of the lens cast shadows. */
  protected light(x: number, y: number, z: number, kind: "lamp" | "window" | "candle", i = 1) {
    const P = { lamp: ["#ffb867", 26, 13], window: ["#dce8ff", 16, 7.5], candle: ["#ffa04a", 5, 5] } as const, [col, , dist] = P[kind];
    const l = new THREE.PointLight(col, 0, dist, 2);
    l.position.set(x, y, z);
    l.shadow.mapSize.set(512, 512); l.shadow.camera.near = 0.1; l.shadow.camera.far = dist; l.shadow.bias = -0.002;
    let glow: THREE.Sprite | undefined;
    if (kind !== "window") { // the flame / lamp head: a small additive halo (bloom catches it)
      glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(col).multiplyScalar(kind === "lamp" ? 3 : 2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      glow.position.copy(l.position); glow.scale.setScalar(kind === "lamp" ? 0.9 : 0.22); glow.layers.set(NOINK); this.root.add(glow);
    }
    this.root.add(l); this.locals.push({ l, kind, i: P[kind][1] * i, glow });
  }
  /** an enterable house (qRoomAt) with a window light inside each ground-floor window; furnish with prop(this.room, ...)
   *  and light it with this.light(x, y, z, "candle") on the tables / walls */
  protected roomAt(x: number, z: number, yaw: number, seed: number, doors: ("+x" | "-x")[] = []) {
    for (const p of qRoomAt(this.b, this.small, this.room, this.kit, x, z, yaw, seed, doors)) this.light(p.x, p.y, p.z, "window");
  }

  /** call last in the subclass constructor: builds the batch and adds the harbour water */
  protected finish() {
    const R = this.root;
    this.b.build(R);
    const sm = new THREE.Group(); this.small.build(sm); sm.traverse((c) => c.layers.set(NOINK)); R.add(sm);
    this.room.build(R);

    // ---- water (the harbour) ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wNearC: { value: new THREE.Color() }, wMidC: { value: new THREE.Color() }, wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wTrough: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) }, wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "river1";
    const wm = new THREE.Mesh(quadUp(-900, 250, 150, 900, 1, 1, -0.5), waterM);
    wm.receiveShadow = true;
    R.add(wm);

  }

  /** story props: override to pose them for shot id at time t (s) / story time tau (pure function of both) */
  protected pose(_id: number, _t: number, _tau: number) {}

  /** sun direction: the shot camera's mean forward (cached per shot) turned by the preset's az / el (blended per frame) */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let fw = this.fwdCache.get(id);
    if (!fw) {
      let fx = 0, fz = 0;
      for (let f = s.a; f < s.b; f += 3) {
        const c = this.cfg.camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
        fx += x / n; fz += z / n;
      }
      const n = Math.hypot(fx, fz) || 1; fw = [fx / n, fz / n]; this.fwdCache.set(id, fw);
    }
    const [fx, fz] = fw, o = s.tod ? undefined : this.cfg.sunShot?.[id];
    const az = THREE.MathUtils.degToRad(o?.az ?? L.az), el = THREE.MathUtils.degToRad(o?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    return new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  }

  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = this.cfg.SHOTS[id - 1], tau = s.tau(t), td = s.tod && lightAt(s.tod(t));
    const L = td ? td.L : LIGHTS[s.light], K = td ? td.K : LOOK[s.light], lname = td ? td.name : s.light;
    const c = this.cfg.camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.near ?? 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const sunDir = this.shotSun(id, s, L);
    for (const o of this.locals) {
      const k = o.kind === "lamp" ? L.glow ** 2 : o.kind === "window" ? 1 - L.glow : 1;
      o.l.intensity = o.i * k; if (o.glow) o.glow.visible = k > 0.02;
      // shadows only from lit lights near the lens (each point shadow re-renders the scene 6 times)
      o.l.castShadow = k > 0.02 && o.l.position.distanceTo(cam.position) < 9;
    }
    for (const g of GLASS) g.emissive.setRGB(1.0, 0.62, 0.28).multiplyScalar(2.4 * L.glow); // lit windows at dusk / night
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 2.5, 3, 95);
    if (lname !== "day") Rr = Math.max(Rr, 8);
    // stable shadows on a moving camera: radius in whole-metre steps, focus snapped to whole shadow texels in the sun's view
    // plane (a sliding shadow box makes shadow edges crawl and flicker)
    Rr = Math.ceil(Rr);
    { const tx = (2 * Rr) / this.sun.shadow.mapSize.x, rt = new THREE.Vector3().crossVectors(V(0, 1, 0), sunDir).normalize(), up = new THREE.Vector3().crossVectors(sunDir, rt);
      const a = Math.round(focus.dot(rt) / tx) * tx, b = Math.round(focus.dot(up) / tx) * tx, c = focus.dot(sunDir);
      focus.copy(rt.multiplyScalar(a)).addScaledVector(up, b).addScaledVector(sunDir, c); }
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = false;
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[lname][i % 4];
    }
    const W = this.WU, wc = K.water;
    untone(wc.near, W.wNearC.value); untone(wc.mid, W.wMidC.value); untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value); untone(wc.trough, W.wTrough.value); untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade); W.wTime.value = t;

    this.pose(id, t, tau);

    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = this.cfg.stage(id, t, tau, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.0);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

/** horizontal quad facing up at height D0 + dy covering x0..x1, z0..z1 (z0 < z1) */
export function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
