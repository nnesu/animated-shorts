"""EXAMPLE (copied from the Slinky short): original scene cues synthesized with numpy only (scipy is not installed).
Copy to _sfx/<name>_music.py and rename "slinky" (OUT, cues json name). Writes _sfx/music/slinky/c*.wav and _sfx/slinky_music_cues.json for music_cues.py.
Cue plan (times = voice seconds, story.ts shots): playful hook | warm wartime march | playful-tense walk with a falling
step motif on each landing, hard stop before the snap | silence (snap) | warm home + Gimbels | festive rush, hard stop |
silence (deadpan) | curious explanation + stadium lift | tense drop, resolves on "reaches" | proud state toy | warm end."""
import json, os, wave
import numpy as np

SR = 48000
TAU = 2 * np.pi
OUT = os.path.join(os.path.dirname(__file__), "music", "slinky")
R = np.random.default_rng(7)

def m2f(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(d): return np.arange(int(d * SR)) / SR
def env_ad(n, a, tau):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / tau)

def pluck(f, vel=0.6, dur=0.7):
    t = tt(dur); y = np.zeros_like(t)
    for k in range(1, int(min(18, 6000 / f)) + 1):
        y += abs(np.sin(np.pi * k * 0.18)) / k ** 1.1 * np.exp(-t * (2.5 + 1.6 * k * (f / 200) ** 0.4)) * np.sin(TAU * k * f * t + R.uniform(0, TAU))
    return vel * y * np.minimum(1, t / 0.002)

def glock(f, vel=0.5, dur=1.6):
    t = tt(dur)
    y = sum(a * np.exp(-t / d) * np.sin(TAU * f * r * t) for r, a, d in [(1, 1, 0.9), (2.76, 0.35, 0.25), (5.4, 0.15, 0.08)])
    return vel * y * np.minimum(1, t / 0.001)

def vibes(f, vel=0.4, dur=2.0):
    t = tt(dur)
    y = (np.sin(TAU * f * t) + 0.25 * np.sin(TAU * 4 * f * t) * np.exp(-t / 0.2)) * np.exp(-t / 1.1)
    return vel * y * (1 - 0.25 * (0.5 + 0.5 * np.sin(TAU * 5.0 * t))) * np.minimum(1, t / 0.002)

def musicbox(f, vel=0.35, dur=1.4):
    t = tt(dur)
    return vel * (np.sin(TAU * f * t) + 0.3 * np.sin(TAU * 3 * f * t) * np.exp(-t / 0.15)) * np.exp(-t / 0.6) * np.minimum(1, t / 0.001)

def pad(freqs, dur, vel=0.25, att=0.5, rel=0.8):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for f in freqs:
        for dc in (-6, 0, 6):
            ff = f * 2 ** (dc / 1200)
            y += sum(np.sin(TAU * k * ff * t + R.uniform(0, TAU)) / k ** 1.8 for k in range(1, 5))
    e = np.minimum(1, t / att) * np.clip((dur + rel - t) / rel, 0, 1)
    return vel * y * e / (3 * len(freqs))

def brass(f, dur, vel=0.4):
    t = tt(dur + 0.15)
    vib = 1 + 0.004 * np.sin(TAU * 5.2 * t) * np.minimum(1, t / 0.3)
    y = sum(np.sin(TAU * k * f * vib * t) / k ** 1.3 * (1 if k < 3 else np.minimum(1, t / 0.05)) for k in range(1, 8))
    e = np.minimum(1, t / 0.04) * np.clip((dur + 0.15 - t) / 0.15, 0, 1)
    return vel * y * e * 0.3

def snare(vel=0.3):
    t = tt(0.25); n = R.standard_normal(len(t)); n = np.diff(n, prepend=0)
    return vel * (0.6 * n * np.exp(-t / 0.05) + 0.4 * np.sin(TAU * 190 * t) * np.exp(-t / 0.04))

def tri(vel=0.25):
    t = tt(1.4)
    return vel * sum(a * np.sin(TAU * f * t) for f, a in [(1320, 1), (3560, 0.5), (5280, 0.3)]) * np.exp(-t / 0.5)

def clap(vel=0.25):
    t = tt(0.15); n = np.diff(R.standard_normal(len(t)), prepend=0)
    e = sum(np.exp(-np.maximum(0, t - d) / 0.012) * (t >= d) for d in (0, 0.01, 0.02))
    return vel * n * e * 0.4

class Cue:
    def __init__(self, dur): self.b = np.zeros((2, int(dur * SR)))
    def add(self, x, t, g=1.0, p=0.0):
        x = np.asarray(x); x = np.stack([x, x]) if x.ndim == 1 else x
        th = (p + 1) * np.pi / 4; x = x * np.array([[np.cos(th)], [np.sin(th)]]) * np.sqrt(2)
        i = int(t * SR); j = min(self.b.shape[1], i + x.shape[1])
        if j > i: self.b[:, i:j] += g * x[:, : j - i]
    def done(self, name, rt=1.1, wet=0.18):
        n = int(rt * SR * 1.3); t = np.arange(n) / SR
        ir = R.standard_normal((2, n)) * np.exp(-t / (rt / 6.9)); ir[:, : int(0.015 * SR)] = 0
        L = self.b.shape[1] + n; F = 1 << (L - 1).bit_length()
        mono = self.b.mean(0)
        w = np.stack([np.fft.irfft(np.fft.rfft(mono, F) * np.fft.rfft(ir[c], F), F)[: self.b.shape[1]] for c in range(2)])
        y = self.b + wet * w / (np.abs(w).max() + 1e-9) * np.abs(self.b).max()
        y = y / (np.abs(y).max() + 1e-9) * 0.5
        path = os.path.join(OUT, name)
        with wave.open(path, "wb") as f:
            f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
            f.writeframes((np.clip(y.T, -1, 1) * 32767).astype("<i2").tobytes())
        return path

F, Bb, C, Dm = [53, 57, 60], [58, 62, 65], [55, 60, 64], [50, 57, 62]  # F major triads (midi)

def c1_hook():  # playful: bouncy pizz eighths at 140 bpm, glock "boing" on the two landings (t 3.0, 4.35)
    c, e = Cue(5.15), 60 / 140 / 2
    bass = [41, 48, 45, 48, 46, 50, 48, 43]
    for k in range(int(5.0 / e)):
        c.add(pluck(m2f(bass[k % 8] + (12 if k % 2 else 0)), 0.5 if k % 2 else 0.7, 0.4), k * e, p=-0.2 if k % 2 else 0.2)
    for t0, m in [(3.0, 84), (4.35, 81)]: c.add(glock(m2f(m), 0.6), t0); c.add(glock(m2f(m - 12), 0.3), t0 + 0.06)
    return c.done("c1_hook.wav")

def c2_march():  # warm wartime: soft brass chords + light snare taps, 112 bpm
    c, q = Cue(6.2), 60 / 112
    for i, ch in enumerate([F, Bb, C, F]):
        for m in ch: c.add(brass(m2f(m), 2 * q * 0.92, 0.35), i * 2 * q, p=(m % 3 - 1) * 0.3)
        c.add(brass(m2f(ch[0] - 12), 2 * q * 0.9, 0.4), i * 2 * q)
    for k in range(int(6.0 / (q / 2))):
        if k % 4 in (0, 3): c.add(snare(0.18 if k % 4 else 0.25), k * q / 2, p=0.3)
    return c.done("c2_march.wav")

def c3_walk():  # playful-tense: tiptoe pizz walking bass, elbow stab, rising plucks on the tip, falling glock steps on landings
    c, q = Cue(16.35), 60 / 112
    walk = [41, 45, 48, 50, 48, 45, 43, 47]
    for k in range(int(16.3 / (q / 2))):
        t0 = k * q / 2
        if t0 > 16.2: break
        v = 0.35 + 0.25 * (t0 / 16)
        c.add(pluck(m2f(walk[k % 8]), v, 0.35), t0, p=-0.15)
    T0 = 11.6
    c.add(pluck(m2f(36), 0.9, 0.8), 12.6 - T0); c.add(snare(0.35), 12.6 - T0)
    for i in range(10): c.add(pluck(m2f(60 + 2 * i), 0.35, 0.3), 14.25 - T0 + i * 0.29, p=0.3)
    for t, m in [(17.2, 84), (21.4, 81), (22.75, 77), (24.3, 72)]: c.add(glock(m2f(m), 0.7), t - T0); c.add(pad([m2f(m - 24)], 0.6, 0.15, 0.02, 0.4), t - T0)
    for i in range(6): c.add(pluck(m2f([72, 76, 79, 77, 76, 72][i]), 0.3, 0.3), 25.2 - T0 + i * 0.36, p=0.25)
    return c.done("c3_walk.wav")

def c4_warm():  # warm home -> Gimbels in November: vibes + pad at 84 bpm, triangle from 35.2
    c, q = Cue(8.4), 60 / 84
    for i, ch in enumerate([F, Dm, Bb, C, F]):
        t0 = i * 2 * q
        c.add(pad([m2f(m) for m in ch], 2 * q, 0.22), t0)
        for j, m in enumerate(ch + [ch[1]]): c.add(vibes(m2f(m + 12), 0.25), t0 + j * q / 2, p=(j - 1.5) * 0.3)
    for k in range(6): c.add(tri(0.15), 35.2 - 31.5 + k * q)
    return c.done("c4_warm.wav")

def c5_rush():  # festive burst: glock + pizz + triangle at 140 bpm, hard stop before "Unluckily"
    c, e = Cue(2.15), 60 / 140 / 2
    mel = [72, 76, 79, 84, 79, 76, 77, 81, 84, 81, 77, 79, 76]
    for k in range(int(2.1 / e)):
        c.add(glock(m2f(mel[k % len(mel)]), 0.35, 0.6), k * e, p=0.2)
        if k % 2 == 0: c.add(pluck(m2f([41, 48][(k // 2) % 2]), 0.6, 0.3), k * e, p=-0.2)
        if k % 4 == 0: c.add(tri(0.18), k * e)
    return c.done("c5_rush.wav")

def c6_explain():  # curious: slow music-box arpeggio over pizz bass; brighter with claps from the stadium (t 51.1)
    c, q = Cue(11.1), 60 / 96
    chords = [F, Dm, Bb, C]
    for k in range(int(11.0 / (q / 2))):
        t0 = k * q / 2; ch = chords[(k // 8) % 4]
        c.add(musicbox(m2f(ch[k % 3] + 24), 0.3), t0, p=(k % 3 - 1) * 0.4)
        if k % 4 == 0: c.add(pluck(m2f(ch[0] - 12), 0.45, 0.6), t0)
        if 45.9 + t0 > 51.3 and k % 4 == 2: c.add(clap(0.5), t0, p=0.2)
    return c.done("c6_explain.wav")

def c7_drop():  # tense: low pad + ticking pizz speeding up; glock chord resolves on "reaches" (61.2)
    c = Cue(4.5)
    c.add(pad([m2f(41), m2f(48), m2f(56)], 3.9, 0.3, 0.8, 0.5), 0)
    t, gap = 0.0, 0.42
    while t < 4.0: c.add(pluck(m2f(72), 0.35, 0.2), t, p=0.3); t += gap; gap = max(0.14, gap * 0.9)
    for m in (65, 69, 72, 77): c.add(glock(m2f(m + 12), 0.4, 1.2), 61.2 - 57.1)
    return c.done("c7_drop.wav")

def c8_proud():  # proud: soft brass fanfare in F
    c, q = Cue(3.3), 60 / 100
    for i, (ch, d) in enumerate([(F, 1), (Bb, 1), (C, 1), (F, 2)]):
        t0 = [0, 1, 2, 3][i] * q
        for m in ch: c.add(brass(m2f(m + 12), d * q * 0.9, 0.3), t0, p=(m % 3 - 1) * 0.3)
        c.add(brass(m2f(ch[0]), d * q * 0.9, 0.35), t0)
    c.add(tri(0.12), 3 * q)
    return c.done("c8_proud.wav")

def c9_end():  # warm ending: vibes + pad, final F chord on "antenna" (71.1) ringing out
    c, q = Cue(7.55), 60 / 84
    for i, ch in enumerate([Dm, Bb, C]):
        t0 = i * 2 * q
        c.add(pad([m2f(m) for m in ch], 2 * q, 0.2), t0)
        for j, m in enumerate(ch): c.add(vibes(m2f(m + 12), 0.22), t0 + j * q * 0.66, p=(j - 1) * 0.3)
    tf = 71.1 - 65.8
    c.add(pad([m2f(m) for m in F + [65]], 1.6, 0.25, 0.1, 0.6), tf)
    for m in F: c.add(vibes(m2f(m + 12), 0.3, 2.2), tf)
    c.add(glock(m2f(77 + 12), 0.25), tf)
    return c.done("c9_end.wav")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    rel = lambda p: os.path.relpath(p, os.path.dirname(__file__)).replace("\\", "/")  # relative to the cues json folder (music_cues.py)
    cues = [  # [start s, file, gain dB, length s|null, fade-in s, fade-out s]
        [0.0, rel(c1_hook()), 0, None, 0.05, 0.08],
        [5.35, rel(c2_march()), -2, None, 0.4, 0.6],
        [11.6, rel(c3_walk()), 0, None, 0.3, 0.1],      # hard stop 0.25 s before "Richard" (28.2): the snap is silent
        [31.5, rel(c4_warm()), -1, 8.4, 0.6, 0.5],
        [39.45, rel(c5_rush()), 0, None, 0.05, 0.08],   # hard stop 0.25 s before "Unluckily" (41.8): the deadpan is silent
        [45.9, rel(c6_explain()), -1, None, 0.5, 0.5],
        [57.1, rel(c7_drop()), 0, None, 0.3, 0.3],
        [62.4, rel(c8_proud()), -2, None, 0.1, 0.5],
        [65.8, rel(c9_end()), -1, None, 0.6, 0.4],
    ]
    json.dump(cues, open(os.path.join(os.path.dirname(__file__), "slinky_music_cues.json"), "w"), indent=1)
    print("\n".join(f"{c[0]:6.2f}  {c[1]}" for c in cues))
