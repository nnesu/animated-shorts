// Camera / timeline engine shared by every short (house camera grammar: slow push-ins on every hold, hard cuts on big
// reframes, glides 18-40 f, 7-frame impact kicks that flip sign every frame, no hand-held float). A video's story.ts holds
// only data (SHOTS, XFADE, CAMS, KICKS, DOF) and gets its lookup functions from makeTimeline().
export const FPS = 30;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** set-local coordinates: at(SET, x, y, z) */
export const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];

// ---------------- shots ----------------
export type Light = "day" | "golden";
/** frames a..b; tau maps time (s) to story time; near = camera near plane (0.03-0.05 for macro shots) */
export type ShotDef<C extends string = string> = { id: number; a: number; b: number; light: Light; crowd: C; tau: (t: number) => number; near?: number };
export const sh = <C extends string>(id: number, a: number, b: number, light: Light, crowd: C, tau: (t: number) => number = (t) => t, near = 0.2): ShotDef<C> => ({ id, a, b, light, crowd, tau, near });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** cut: true = hard cut at frame f; otherwise a glide of dur frames (default 24) from the previous key */
export type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** creep factor for dolly / zoom: rate per frame from frame f0, plus an optional punch-in over n frames */
export const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** camera moved toward look by factor k (close work) */
export const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
/** lens narrowed by factor k (wides) */
export const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });

// ---------------- lens ----------------
/** one per camera key: cInf = background blur in px at 1080 wide, focus = the subject's eyes (default: the look target) */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };

export type Timeline = { SHOTS: ShotDef[]; XFADE: Record<number, number>; CAMS: Record<number, Key[]>; KICKS: [number, number][]; DOF: Dof[] };
export const makeTimeline = ({ SHOTS, XFADE, CAMS, KICKS, DOF }: Timeline) => {
  const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
  const layersAt = (f: number): { id: number; alpha: number }[] => {
    for (const s of SHOTS) {
      const x = XFADE[s.id];
      if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
    }
    return [{ id: shotAt(f).id, alpha: 1 }];
  };
  // impact kicks: the image offset flips sign every frame, decays to 0 in 7 f
  const kickAt = (t: number) => {
    let a = 0;
    for (const [t0, g] of KICKS) {
      const n = Math.floor((t - t0) * FPS + 1e-6);
      if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
    }
    return a;
  };
  const camAt = (id: number, f: number): Cam => {
    const c = run(CAMS[id], f), a = kickAt(f / FPS);
    if (!a) return c;
    const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
    const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
    const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
    return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
  };
  const dofAt = (f: number) => {
    let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
    const d = DOF[i], p = DOF[Math.max(0, i - 1)];
    const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
    return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
  };
  return { shotAt, layersAt, kickAt, camAt, dofAt };
};
