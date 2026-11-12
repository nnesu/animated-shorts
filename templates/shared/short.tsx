// Composition engine shared by every short (house look). One three.js world per shot, posed per frame.
// Post chain: InkPass (world ink, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at scale 0.5 match the final.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";
import { qaDump } from "./qadump";
import { Cam, ShotDef, V3 } from "./camkit";
import { WorldBase } from "./worldkit";

export type ShortCfg = {
  World: new (kit: Kit, id: number) => WorldBase; loadKit: () => Promise<Kit>;
  story: {
    FLASH_AT: number; SHOTS: ShotDef[]; layersAt: (f: number) => { id: number; alpha: number }[];
    dofAt: (f: number) => { cInf: number; focus?: (f: number) => V3 }; camAt: (id: number, f: number) => Cam;
  };
  /** close-up shot ids that get the soft light pool behind the subject's head */
  poolShots?: number[];
  /** false = the original reference look: thin near-black ink, no vignette / warm tint / light pool, uncapped foreground blur */
  houseLook?: boolean;
};

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3(), tmpv = new THREE.Vector3();

export const makeShort = (cfg: ShortCfg): React.FC => {
  const { World, loadKit, poolShots: POOL_SHOTS = [], houseLook: LOOK_V3 = true } = cfg;
  const { FLASH_AT, SHOTS, layersAt, dofAt, camAt } = cfg.story;
  const dofIsV2 = () => LOOK_V3;
  const useKit = () => {
    const [kit, setKit] = useState<Kit | null>(null);
    const [handle] = useState(() => delayRender("kit"));
    useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
    return kit;
  };

  const Inner: React.FC<{ id: number; kit: Kit }> = ({ id, kit }) => {
    const f = useCurrentFrame();
    const { camera, scene } = useThree();
    const world = useMemo(() => new World(kit, id), [kit, id]);
    const target = useMemo(() => new THREE.Vector3(), []);
    const on = useMemo(toggles, []);
    const dbg = useMemo(() => !!(getInputProps() as { post?: { dofDebug?: boolean } }).post?.dofDebug, []);
    const fx = useMemo(() => ({
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera, LOOK_V3 ? { color: "#2a1a2e", widthNear: 7.0, widthFar: 4.6 } : {}), // order 4: heavier world ink
      lens: new LensBlur(dofIsV2() ? { maxCoC: 32, nearScale: 1.2, nearMax: 6 } : { maxCoC: 24, nearScale: 1.2 }), // v2: foreground blur capped at 6 px
      bloom: makeBloom(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
      grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
    }), [camera, scene]);
    useEffect(() => () => { try { fx.ink?.dispose?.(); } catch { /* R3F may already have torn the pass down on unmount */ } }, [fx]);
    const post = useMemo(() => (
      <EffectComposer multisampling={4}>
        {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
        {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
        {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
        {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
        <primitive object={fx.tone} dispose={null} />
        {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
        {on.grain ? <primitive object={fx.grain} dispose={null} /> : null}
      </EffectComposer>
    ), [fx, on]);
    const cam = camera as THREE.PerspectiveCamera;
    target.copy(world.update(id, f, cam, scene));
    noInkFallback(world.root);
    // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
    const d = dofAt(f);
    cam.getWorldDirection(fwd);
    if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
    fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    fx.lens.cInf = d.cInf;
    if ((getInputProps() as { post?: { qaDump?: boolean } }).post?.qaDump) qaDump({ id, f, cam, root: world.root, coc: (dd: number) => d.cInf * (1 - fx.lens.main.focus / Math.max(dd, 1e-3)) });
    if (dbg) { // inputProps {"post":{"dofDebug":true}}: which things are sharp / background / foreground (CoC px at 1080 wide)
      const dist = (p: number[]) => tmpv.set(p[0], p[1], p[2]).sub(cam.position).dot(fwd);
      const coc = (dd: number) => { const c = d.cInf * (1 - fx.lens.main.focus / Math.max(dd, 1e-3)); return Math.round(c < 0 ? c * 1.2 : c); };
      const lm: [string, number[]][] = [];
      world.debugPlaces.slice(0, 6).forEach((p, i) => lm.push(["char" + i, p]));
      console.warn("DOFDBG " + JSON.stringify({ id, f, focus: +fx.lens.main.focus.toFixed(1), cInf: +d.cInf.toFixed(1), obj: lm.map(([n, p]) => [n, +dist(p).toFixed(1), coc(dist(p))]) }));
    }
    gradeFor(fx.grade, SHOTS[id - 1].light);
    fx.grain.seed = f; // deterministic per frame
    return (
      <>
        <primitive object={world.root} dispose={null} />
        {post}
      </>
    );
  };

  /** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
  const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
  const ShotView: React.FC<{ id: number; kit: Kit; alpha: number }> = ({ id, kit, alpha }) => (
    <AbsoluteFill style={{ opacity: alpha }}>
      <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.2, far: 1500 }}>
        <Inner id={id} kit={kit} />
      </ThreeCanvas>
    </AbsoluteFill>
  );

  /** screen position (%) of the subject's head in the close-ups, for the soft light pool behind it */
  const spot = (id: number, f: number): [number, number] | null => {
    if (!LOOK_V3 || !POOL_SHOTS.includes(id)) return null;
    const c = camAt(id, f), d = dofAt(f), fp = d.focus ? d.focus(f) : c.look;
    const cam = new THREE.PerspectiveCamera(c.fov, 1080 / 1920, 0.1, 500);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.updateMatrixWorld();
    const v = new THREE.Vector3(fp[0], fp[1] + 0.2, fp[2]).project(cam);
    return [(v.x * 0.5 + 0.5) * 100, (1 - (v.y * 0.5 + 0.5)) * 100];
  };

  const Short: React.FC = () => {
    const f = useCurrentFrame();
    const kit = useKit();
    if (!kit) return null;
    const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
    return (
      <AbsoluteFill style={{ background: "#cfe3f2" }}>
        {layersAt(f).map((l, i) => <ShotView key={l.id} id={l.id} kit={kit} alpha={l.alpha} />)}
        {(() => {
          const L = layersAt(f), sp = spot(L[L.length - 1].id, f);
          return sp && <AbsoluteFill style={{ background: `radial-gradient(circle 432px at ${sp[0]}% ${sp[1]}%, rgba(255,240,200,0.14) 0%, rgba(255,240,200,0) 100%), radial-gradient(circle 1100px at ${sp[0]}% ${sp[1]}%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.15) 100%)` }} />;
        })()}
        {LOOK_V3 && <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)" }} />}
        {LOOK_V3 && <AbsoluteFill style={{ background: "#ffd9a0", opacity: 0.06, mixBlendMode: "screen" }} />}
        {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      </AbsoluteFill>
    );
  };
  return Short;
};
