import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
SR = 48000
DUR = 79.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
music = np.zeros((N, 2))
sfx = np.zeros((N, 2))

def put(buf, t, sig, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * l
    buf[i:i + len(sig), 1] += sig * r

def env(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain
    na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, sustain, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e

def note(f, dur, kind='pluck', vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    if kind == 'pluck':
        s = sum((0.6 ** (k - 1)) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.2 + k * 1.3)) for k in range(1, 6))
        s *= np.minimum(1, t / 0.004)
    elif kind == 'pad':
        s = np.zeros(n)
        for d in (-0.0035, 0, 0.0041):
            s += sum((1 / k ** 1.6) * np.sin(2 * np.pi * f * (1 + d) * k * t + k) for k in range(1, 7))
        s *= env(n, min(1.2, dur / 3), min(1.5, dur / 2.5)) / 3
    elif kind == 'bass':
        s = np.tanh(1.6 * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t))) * np.exp(-t * 3.0) * np.minimum(1, t / 0.006)
    return s * vel

def kick(vel=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) * vel

def noise(dur): return rng.standard_normal(int(dur * SR))
def bp(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype='band', fs=SR, output='sos'); return sosfilt(sos, x)
def hp(x, f): return sosfilt(butter(2, f, btype='high', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, btype='low', fs=SR, output='sos'), x)

def hat(vel=1.0):
    x = hp(noise(0.05), 7000); t = np.arange(len(x)) / SR
    return x * np.exp(-t * 90) * 0.25 * vel
def clap(vel=1.0):
    x = bp(noise(0.25), 900, 4000); t = np.arange(len(x)) / SR
    e = np.exp(-t * 18) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 30) * (t > 0.012)
    return x * e * 0.35 * vel
def whoosh(dur=0.8, vel=1.0):
    x = noise(dur); n = len(x); t = np.arange(n) / SR
    out = np.zeros(n); step = 2048
    for i in range(0, n, step):
        c = 400 + 5000 * (i / n) ** 1.5
        seg = bp(x[max(0, i - 512):i + step], c * 0.7, min(c * 1.4, 20000))[-min(step, n - i):]
        out[i:i + len(seg)] = seg
    return out * np.sin(np.pi * t / dur) ** 2 * 0.25 * vel
def riser(dur, vel=1.0):
    x = noise(dur); n = len(x); t = np.arange(n) / SR
    out = np.zeros(n); step = 2048
    for i in range(0, n, step):
        c = 300 + 7000 * (i / n) ** 2
        seg = bp(x[max(0, i - 512):i + step], c * 0.8, min(c * 1.25, 20000))[-min(step, n - i):]
        out[i:i + len(seg)] = seg
    tone = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / dur) ** 2) / SR) * 0.15
    return (out * 0.5 + tone) * (t / dur) ** 2.2 * vel
def beep(f=1760, d=0.07):
    t = np.arange(int(d * SR)) / SR
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.18 + np.sin(2 * np.pi * f * t) * 0.3
    return lp(s, 6000) * env(len(t), 0.002, 0.01)
def ding():
    out = np.zeros(int(1.6 * SR))
    for k, (f, dt) in enumerate([(1318.5, 0), (1760, 0.11)]):
        t = np.arange(int(1.4 * SR)) / SR
        s = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t * 4) * np.minimum(1, t / 0.003)
        i = int(dt * SR); out[i:i + len(s)] += s * 0.45
    return out
def tick():
    x = hp(noise(0.02), 3000); t = np.arange(len(x)) / SR
    return x * np.exp(-t * 300) * 0.35
def chirp(f0, f1, d):
    t = np.arange(int(d * SR)) / SR
    f = f0 + (f1 - f0) * np.sin(np.pi * t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * 0.12
def shutter():
    out = np.zeros(int(0.2 * SR))
    for dt, g in [(0, 1.0), (0.055, 0.7)]:
        x = bp(noise(0.08), 1500, 9000); t = np.arange(len(x)) / SR
        i = int(dt * SR); out[i:i + len(x)] += x * np.exp(-t * 70) * 0.5 * g
    return out
def blip(f):
    t = np.arange(int(0.18 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 26) * np.minimum(1, t / 0.002) * 0.16
def boom():
    n = int(1.8 * SR); t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 10)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * 0.9

M = lambda n: 440 * 2 ** ((n - 69) / 12)
CH = [
    ([50, 57, 61, 64, 66], 38),
    ([47, 54, 57, 62, 64], 35),
    ([43, 50, 54, 59, 62], 31),
    ([45, 52, 57, 59, 64], 33),
]
BPM = 110; BEAT = 60 / BPM; T0 = 12.45
BAR = 4 * BEAT

for i, (tt, dd, c) in enumerate([(0.2, 6.3, 0), (6.3, 6.15, 1)]):
    for n in CH[c][0][1:]:
        put(music, tt, note(M(n), dd + 1.5, 'pad', 0.10), pan=rng.uniform(-0.5, 0.5))
for t0, n in [(0.4, 74), (1.6, 69), (3.1, 78), (4.5, 73), (6.4, 71), (7.9, 74), (9.3, 69)]:
    put(music, t0, note(M(n), 3.0, 'pluck', 0.16), pan=rng.uniform(-0.6, 0.6))

breaks = [(30.1, 32.85)]
in_break = lambda t: any(a <= t < b for a, b in breaks)
END = 74.0
b = 0
while True:
    t = T0 + b * BEAT
    if t >= END: break
    bar = b // 4; beat = b % 4
    chord = CH[(bar // 2) % 4]
    if beat == 0 and bar % 2 == 0:
        dur = min(2 * BAR, END - t) + 1.2
        for n in chord[0][1:]:
            put(music, t, note(M(n), dur, 'pad', 0.085), pan=rng.uniform(-0.6, 0.6))
    if not in_break(t):
        put(music, t, kick(0.95 if beat in (0, 2) else 0.75))
        put(music, t, note(M(chord[1]), BEAT * 0.95, 'bass', 0.32))
        if t >= 21.3: put(music, t + BEAT / 2, hat(0.9), pan=0.3)
        if t >= 25.5 and beat in (1, 3): put(music, t, clap(0.9), pan=-0.1)
        for k in range(2):
            tones = chord[0][1:] + [chord[0][2] + 12]
            n = tones[(b * 2 + k) % len(tones)] + 12
            put(music, t + k * BEAT / 2, note(M(n), 1.2, 'pluck', 0.075), pan=0.5 * np.sin(b + k))
    else:
        if beat == 0:
            put(music, t, note(M(chord[0][3] + 12), 2.4, 'pluck', 0.12), pan=0.2)
    b += 1

for n in CH[0][0]:
    put(music, END, note(M(n), 5.5, 'pad', 0.11), pan=rng.uniform(-0.5, 0.5))
for k, n in enumerate([62, 66, 69, 73, 76]):
    put(music, END + 0.15 + k * 0.12, note(M(n + 12), 4.0, 'pluck', 0.11), pan=-0.5 + k * 0.25)
put(music, END, boom(), gain=0.6)

ir_n = int(2.4 * SR); tir = np.arange(ir_n) / SR
ir = rng.standard_normal((ir_n, 2)) * np.exp(-tir * 2.6)[:, None]
ir[:, 0] = lp(ir[:, 0], 6000); ir[:, 1] = lp(ir[:, 1], 6000)
ir /= np.sqrt((ir ** 2).sum(axis=0))
wet = np.stack([fftconvolve(music[:, c], ir[:, c])[:N] for c in range(2)], axis=1)
music = music * 0.82 + wet * 0.35

for t0 in [3.3, 3.9, 5.1, 6.0, 6.7]:
    f = rng.uniform(3200, 4800)
    put(sfx, t0, chirp(f, f * rng.uniform(1.15, 1.35), rng.uniform(0.08, 0.16)), pan=rng.uniform(-0.8, 0.8))
    put(sfx, t0 + 0.13, chirp(f * 1.1, f * 1.4, 0.07), pan=rng.uniform(-0.8, 0.8), gain=0.8)
for k in range(6):
    put(sfx, 7.45 + k * 0.45, tick(), pan=0.15)
put(sfx, 10.55, riser(1.9, 0.8))
put(sfx, 15.2, beep()); put(sfx, 15.2 + 0.16, beep())
put(sfx, 15.2, kick(0.4))
put(sfx, 27.0, ding(), gain=0.8)
for t0 in [17.6, 21.3, 25.5, 32.9, 37.2, 42.0, 46.4, 50.8, 55.6, 58.6, 63.2, 66.6]:
    put(sfx, t0 - 0.45, whoosh(0.8, 0.9), pan=rng.uniform(-0.3, 0.3))
for t0 in [71.0, 72.0, 73.0]:
    put(sfx, t0, kick(1.0)); put(sfx, t0, boom(), gain=0.35)
put(sfx, 48.3, ding(), gain=0.35)
put(sfx, 34.95, beep()); put(sfx, 34.95 + 0.16, beep())
put(sfx, 35.01, shutter(), pan=0.35, gain=0.9)
for j in range(16):
    i = j % 4
    t0 = 37.2 + 1.55 + (j // 4) * 0.62 + i * 0.15 + 0.75
    put(sfx, t0, blip(1568 + 196 * i), pan=[-0.5, 0.5, -0.5, 0.5][i], gain=0.5)
for k in range(3):
    put(sfx, 25.5 + 2.9 + k * 0.14, tick(), pan=-0.4 + k * 0.2, gain=0.8)
put(sfx, 66.6 + 0.3, chirp(2400, 3400, 0.14), pan=-0.4)
put(sfx, 66.6 + 0.45, chirp(2800, 3900, 0.1), pan=-0.4, gain=0.8)
for t0 in [66.6 + 1.7, 66.6 + 3.0]:
    put(sfx, t0, tick(), pan=0.4)

mix = music + sfx
t = np.arange(N) / SR
mix *= np.minimum(1, t / 0.05)[:, None]
fade = np.clip((DUR - t) / 2.5, 0, 1)[:, None]
mix *= fade
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 0.89
import os
wavfile.write(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio.wav'), SR, (mix * 32767).astype(np.int16))
print('ok', mix.shape)
