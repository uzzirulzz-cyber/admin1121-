"""Generate short demo beat loops (WAV) for the PlayBeat storefront.

Each loop is a simple programmatic drum/bass/chord pattern with a distinct
tempo and key so every product card has playable audio.
"""
import math
import random
import struct
import wave

SR = 22050
random.seed(42)

NOTE_OFFSETS = {
    "C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4,
    "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2,
}


def freq(note: str, octave: int) -> float:
    semis = NOTE_OFFSETS[note] + (octave - 4) * 12
    return 440.0 * (2 ** (semis / 12))


def env_exp(t: float, decay: float) -> float:
    return math.exp(-t / decay)


def kick(dur: float = 0.35) -> list[float]:
    n = int(SR * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / SR
        f = 120.0 * math.exp(-t * 18) + 42.0
        phase += 2 * math.pi * f / SR
        amp = env_exp(t, 0.12)
        out.append(0.95 * amp * math.sin(phase))
    return out


def snare(dur: float = 0.22) -> list[float]:
    n = int(SR * dur)
    out = []
    prev = 0.0
    for i in range(n):
        t = i / SR
        noise = random.uniform(-1, 1)
        hp = noise - 0.7 * prev  # cheap high-pass
        prev = noise
        tone = 0.4 * math.sin(2 * math.pi * 185 * t)
        amp = env_exp(t, 0.08)
        out.append(amp * (0.7 * hp + tone))
    return out


def hat(dur: float = 0.06, open_: bool = False) -> list[float]:
    dur = 0.18 if open_ else dur
    n = int(SR * dur)
    out = []
    prev = 0.0
    for i in range(n):
        t = i / SR
        noise = random.uniform(-1, 1)
        hp = noise - 0.9 * prev
        prev = noise
        amp = env_exp(t, 0.02 if not open_ else 0.06)
        out.append(0.32 * amp * hp)
    return out


def bass_note(f: float, dur: float) -> list[float]:
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        saw = 2 * ((f * t) % 1.0) - 1.0
        sine = math.sin(2 * math.pi * f * t)
        amp = min(1.0, t * 60) * env_exp(t, dur * 0.7)
        out.append(0.5 * amp * (0.6 * sine + 0.4 * saw))
    return out


def pad_chord(freqs: list[float], dur: float) -> list[float]:
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        attack = min(1.0, t / 0.25)
        release = env_exp(t, dur * 0.55)
        s = 0.0
        for f in freqs:
            s += math.sin(2 * math.pi * f * t) + 0.3 * math.sin(2 * math.pi * f * 1.005 * t)
        out.append(0.16 * attack * release * s / len(freqs) * 2)
    return out


def mix_at(buf: list[float], samples: list[float], at: int) -> None:
    end = min(len(buf), at + len(samples))
    for i in range(at, end):
        buf[i] += samples[i - at]


def render(pattern: dict, seconds: float, path: str) -> None:
    total = int(SR * seconds)
    buf = [0.0] * total
    beat_len = int(SR * 60 / pattern["bpm"])
    bar_len = beat_len * 4
    kick_s, snare_s, hat_c, hat_o = kick(), snare(), hat(), hat(open_=True)

    num_bars = math.ceil(seconds / (bar_len / SR)) + 1
    for bar in range(num_bars):
        bar_start = bar * bar_len
        chord = pattern["chords"][bar % len(pattern["chords"])]
        bass_root = pattern["bass"][bar % len(pattern["bass"])]

        mix_at(buf, pad_chord([freq(c, 4) for c in chord], bar_len / SR), bar_start)
        mix_at(buf, bass_note(freq(bass_root, 2), beat_len * 2 / SR), bar_start)
        mix_at(buf, bass_note(freq(bass_root, 2), beat_len * 2 / SR), bar_start + beat_len * 2)

        for step in pattern["kick"]:
            mix_at(buf, kick_s, bar_start + int(step * beat_len))
        for step in pattern["snare"]:
            mix_at(buf, snare_s, bar_start + int(step * beat_len))
        for step in pattern["hats"]:
            mix_at(buf, hat_o if step % 1 else hat_c, bar_start + int(step * beat_len))

    # master: soft clip + fade in/out
    fade = int(SR * 0.4)
    for i in range(total):
        v = max(-0.92, min(0.92, buf[i]))
        if i < fade:
            v *= i / fade
        if i > total - fade:
            v *= (total - i) / fade
        buf[i] = v

    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(s * 32767)) for s in buf)
        w.writeframes(frames)
    print("wrote", path)


PATTERNS = [
    dict(name="beat-1", bpm=140, chords=[["F", "A", "C"], ["D", "F", "A"], ["G", "A#", "D"], ["C", "D#", "G"]],
         bass=["F", "D", "G", "C"], kick=[0, 1.5, 2.75], snare=[1, 3], hats=[i * 0.5 for i in range(8)], seconds=14),
    dict(name="beat-2", bpm=145, chords=[["G", "A#", "D"], ["A#", "D", "F"], ["G", "A#", "D"], ["F", "G#", "C"]],
         bass=["G", "A#", "G", "F"], kick=[0, 1.25, 2.5, 3.25], snare=[1, 3], hats=[i * 0.5 for i in range(8)], seconds=14),
    dict(name="beat-3", bpm=110, chords=[["A", "C", "E"], ["F", "A", "C"], ["C", "E", "G"], ["G", "B", "D"]],
         bass=["A", "F", "C", "G"], kick=[0, 2], snare=[1, 3], hats=[i * 0.5 for i in range(8)] + [3.5], seconds=13),
    dict(name="beat-4", bpm=92, chords=[["C", "E", "G"], ["A", "C", "E"], ["F", "A", "C"], ["G", "B", "D"]],
         bass=["C", "A", "F", "G"], kick=[0, 1.75, 2.5], snare=[1, 3], hats=[i * 0.5 for i in range(8)], seconds=12),
    dict(name="beat-5", bpm=88, chords=[["E", "G", "B"], ["C", "E", "G"], ["A", "C", "E"], ["B", "D", "F#"]],
         bass=["E", "C", "A", "B"], kick=[0, 1.5, 2.5], snare=[1, 3], hats=[i * 0.25 for i in range(16)], seconds=12),
    dict(name="beat-6", bpm=128, chords=[["D", "F", "A"], ["A#", "D", "F"], ["C", "E", "G"], ["A", "C", "E"]],
         bass=["D", "A#", "C", "A"], kick=[0, 1, 2, 3], snare=[1, 3], hats=[i * 0.5 for i in range(8)] + [2.5, 3.5], seconds=13),
]

for p in PATTERNS:
    seconds = p.pop("seconds")
    name = p.pop("name")
    render(p, seconds, f"public/audio/{name}.wav")
