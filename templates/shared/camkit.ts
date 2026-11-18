// Camera / timeline engine shared by every short (house camera grammar: one take per area, still holds, fill-in pans
// after 3 quiet seconds, hard cuts only for a change of place or time, glides 18-40 f, 7-frame impact kicks that flip
// sign every frame, no hand-held float). A video's story.ts holds only data (SHOTS, XFADE, CAMS, KICKS, DOF) and gets
// its lookup functions from makeTimeline().
export const FPS = 30;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** set-local coordinates: at(SET, x, y, z) */
export const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
/** frames a..b; tau maps time (s) to story time; near = camera near plane (0.03-0.05 for macro shots) */
export type ShotDef<C extends string = string> = { id: number; a: number; b: number; light: Light; crowd: C; tau: (t: number) => number; near?: number;
  /** time of day over shot time t (s): 0 day, 1 golden, 2 night, fractions blend (overrides light; for time-lapse in a long take) */
  tod?: (t: number) => number };
export const sh = <C extends string>(id: number, a: number, b: number, light: Light, crowd: C, tau: (t: number) => number = (t) => t, near = 0.2): ShotDef<C> => ({ id, a, b, light, crowd, tau, near });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Shot = Partial<Cam> & { pos: V3; look: V3 };
/** cut: true = hard cut at frame f; otherwise a glide of dur frames (default 24) from the previous key */
export type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
/** one move of a long take: frames a..b, cubic bezier control points for the camera (C) and its look target (L),
 *  optional fov at start / end. The next move must start where this one ends (C[0] = previous C[3], same for L). */
export type Move = { a: number; b: number; C: [V3, V3, V3, V3]; L: [V3, V3, V3, V3]; fov?: [number, number] };
const bez = (p: V3[], u: number): V3 => p[0].map((_, i) => (1 - u) ** 3 * p[0][i] + 3 * (1 - u) ** 2 * u * p[1][i] + 3 * (1 - u) * u * u * p[2][i] + u ** 3 * p[3][i]) as V3;
/** long take: still holds joined by moves; each move is a bezier for camera and look target over frames a..b.
 *  rate is unused (holds never creep) and kept so older calls compile. Returns the camera key's s(f) and the look point. */
export const longTake = (moves: Move[], rate = 0, fov = 50, start = 0) => {
  void rate; void start;
  const at = (f: number) => {
    let i = moves.findIndex((m) => f < m.b);
    if (i < 0) i = moves.length; // after the last move
    const m = moves[Math.min(i, moves.length - 1)];
    if (i < moves.length && f >= m.a) { // moving
      const u = glide((f - m.a) / (m.b - m.a));
      return { pos: bez(m.C, u), look: bez(m.L, u), fov: m.fov ? m.fov[0] + (m.fov[1] - m.fov[0]) * u : fov };
    }
    const prev = i ? moves[i - 1] : null; // holding: before move i (or after the last)
    return { pos: prev ? prev.C[3] : m.C[0], look: prev ? prev.L[3] : m.L[0], fov: (prev ? prev.fov?.[1] : m.fov?.[0]) ?? fov };
  };
  return { s: (f: number): Shot => at(f), look: (f: number): V3 => at(f).look };
};

// ---------------- one take per area: story moves plus fill-in pans ----------------
/** a camera view: position C, look target L, vertical fov */
export type View = { C: V3; L: V3; fov: number };
/** inner bezier points of a move (a path through a door) */
export type Via = { C: [V3, V3]; L: [V3, V3] };
/** turn a view around its look target by deg (sideways move capped at 2 m, so far views stay clear of the scenery) */
export const orbit = (v: View, deg: number): View => {
  const dx = v.C[0] - v.L[0], dz = v.C[2] - v.L[2], d = Math.hypot(dx, dz);
  const a = Math.sign(deg) * Math.min(Math.abs(deg) * Math.PI / 180, Math.asin(Math.min(1, 2 / d))), c = Math.cos(a), s = Math.sin(a);
  return { ...v, C: [v.L[0] + dx * c - dz * s, v.C[1], v.L[2] + dx * s + dz * c] };
};
/** fill-in pans: after QUIET frames with no story move or cut, a PAN-frame pan to a new setup, skipped when a story move
 *  starts within SOON frames. Setups = [side deg, height m, fov x]: each reads as a different camera, not an orbit */
export const QUIET = 90, SOON = 30, PAN = 12;
export const SETUPS: [number, number, number][] = [[20, 0.3, 0.85], [-20, -0.2, 1.12], [12, 0.15, 0.92], [-14, 0.35, 1.05]];
/** small-object close-ups: horizontal pans with zoom changes, a slight lift; wide ones show the person behind */
export const SETUPS_MACRO: [number, number, number][] = [[18, 0.03, 1.3], [-16, 0.02, 0.9], [8, 0.04, 1.45]];
export const setup = (v: View, k: number, S = SETUPS): View => { const [d, dy, z] = S[k % S.length], o = orbit(v, d); return { ...o, C: [o.C[0], o.C[1] + dy, o.C[2]], fov: v.fov * z }; };
/** one take from frame start to end: begins on v0, moves to each stop's view over frames a..b (straight eased, or along
 *  via), fill-in pans in the quiet gaps */
export const chain = (start: number, end: number, v0: View, stops: [number, number, View, Via?][], sets = SETUPS) => {
  const lerp = (p: V3, q: V3, k: number) => p.map((x, i) => x + (q[i] - x) * k) as V3;
  const all: [number, number, View, Via?][] = [];
  let base = v0, quiet = start, k = 0; // quiet = when the camera last finished a move (a cut counts at the shot start)
  for (let i = 0; i <= stops.length; i++) {
    const next = i < stops.length ? stops[i][0] : end;
    for (let f = quiet + QUIET; f + PAN + SOON <= next; f += QUIET + PAN) all.push([f, f + PAN, setup(base, k++, sets)]);
    if (i < stops.length) { all.push(stops[i]); base = stops[i][2]; quiet = stops[i][1]; }
  }
  if (!all.length) all.push([start + 1, start + 2, v0]); // a hold too short for a fill-in: longTake needs one move
  let v = v0;
  const moves: Move[] = all.map(([a, b, w, via]) => {
    const m: Move = { a, b, C: [v.C, via ? via.C[0] : lerp(v.C, w.C, 1 / 3), via ? via.C[1] : lerp(v.C, w.C, 2 / 3), w.C],
      L: [v.L, via ? via.L[0] : lerp(v.L, w.L, 1 / 3), via ? via.L[1] : lerp(v.L, w.L, 2 / 3), w.L], fov: [v.fov, w.fov] };
    v = w; return m;
  });
  return longTake(moves, 0, v0.fov, start);
};
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

// ---------------- retime: pauses cut after the shots were authored ----------------
/** knots = timemap.json from voice_gaps.py ([old s, new s] pairs). Keeps authored frames: every lookup maps new time to
 *  authored time; each cut pause is squeezed into its kept 0.2 s, so time stays continuous. world.ts pose(): t = OLDs(t). */
export const retime = <C extends string>(knots: [number, number][], TOTAL_OLD: number, SHOTS_OLD: ShotDef<C>[], TL: ReturnType<typeof makeTimeline>) => {
  const K: [number, number][] = [[0, 0]];
  for (let i = 1; i < knots.length - 1; i += 2) { const [c0, n] = knots[i], [c1] = knots[i + 1]; K.push([c0 - 0.1, n - 0.1], [c1 + 0.1, n + 0.1]); }
  K.push(knots[knots.length - 1]);
  const conv = (s: number, from: 0 | 1) => {
    const to = 1 - from; let i = 0;
    while (i < K.length - 2 && s > K[i + 1][from]) i++;
    const a = K[i], b = K[i + 1], u = (s - a[from]) / (b[from] - a[from] || 1);
    return a[to] + (b[to] - a[to]) * u;
  };
  const OLDs = (s: number) => conv(s, 1), NEWs = (s: number) => conv(s, 0), OLDf = (f: number) => OLDs(f / FPS) * FPS;
  const TOTAL = Math.ceil(knots[knots.length - 1][1] * FPS);
  const SHOTS: ShotDef<C>[] = SHOTS_OLD.map((s) => ({ ...s, a: Math.round(NEWs(s.a / FPS) * FPS), b: s.b === TOTAL_OLD ? TOTAL : Math.round(NEWs(s.b / FPS) * FPS),
    tau: (t: number) => s.tau(OLDs(t)), tod: s.tod && ((t: number) => s.tod!(OLDs(t))) }));
  return {
    OLDs, NEWs, TOTAL, SHOTS,
    shotAt: (f: number) => TL.shotAt(OLDf(f)), layersAt: (f: number) => TL.layersAt(OLDf(f)), kickAt: (f: number) => TL.kickAt(OLDf(f)),
    camAt: (id: number, f: number) => TL.camAt(id, OLDf(f)),
    dofAt: (f: number) => { const d = TL.dofAt(OLDf(f)); return { ...d, focus: d.focus && ((g: number) => d.focus!(OLDf(g))) }; },
  };
};
