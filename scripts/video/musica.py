# Musica d'ambiente generata al computer per i video di Stella: nessun campione, nessun diritto di terzi.
# Accordi tenuti (pad) con un arpeggio lieve, in Do maggiore, 60 bpm circa.
import numpy as np, sys, wave
SR = 44100
dur = float(sys.argv[2]) if len(sys.argv) > 2 else 280.0
rng = np.random.default_rng(7)
def note(f, t, amp=1.0, harm=(1, .35, .15, .08)):
    s = np.zeros_like(t)
    for i, h in enumerate(harm):
        s += h * np.sin(2*np.pi*f*(i+1)*t + rng.uniform(0, 6.28))
    return amp * s
def env(n, a, r):
    e = np.ones(n); A = int(a*SR); R = int(r*SR)
    e[:A] = np.linspace(0, 1, A); e[-R:] *= np.linspace(1, 0, R)
    return e
midi = lambda m: 440*2**((m-69)/12)
# progressione: C  Am  F  G  (ogni accordo 8 s), voci chiuse attorno al do centrale
chords = [[48,55,60,64,67],[45,52,57,60,64],[41,48,53,57,60],[43,50,55,59,62]]
bar = 8.0
total = int(dur*SR)
out = np.zeros(total)
tpos = 0.0; i = 0
while tpos < dur:
    ch = chords[i % 4]
    n = int(min(bar+2.5, dur-tpos)*SR)
    t = np.arange(n)/SR
    pad = sum(note(midi(m), t, .22 if k else .3, (1,.25,.08)) for k, m in enumerate(ch))
    pad *= env(n, 2.5, 2.5)
    # vibrato lentissimo d'ampiezza
    pad *= 1 + .08*np.sin(2*np.pi*.11*t)
    s0 = int(tpos*SR); seg = min(n, total-s0)
    out[s0:s0+seg] += pad[:seg]
    # arpeggio: una nota ogni 1 s, ottava sopra, con decadimento morbido
    for k in range(8):
        if rng.random() < .55:
            m = ch[rng.integers(1, len(ch))] + 12
            nn = int(2.2*SR); tt = np.arange(nn)/SR
            pl = note(midi(m), tt, .13, (1,.2,.05)) * np.exp(-tt*1.6) * np.minimum(1, tt*60)
            s1 = int((tpos + k*1.0 + .5)*SR); seg1 = min(nn, total-s1)
            if seg1 > 0: out[s1:s1+seg1] += pl[:seg1]
    tpos += bar; i += 1
# riverbero semplice (eco diffusa) e normalizzazione
ir = np.exp(-np.arange(int(1.2*SR))/SR*3) * rng.normal(0, 1, int(1.2*SR)) * .02
ir[0] = 1
out = np.convolve(out, ir)[:total]
out /= np.abs(out).max() * 1.6
fade = int(4*SR); out[-fade:] *= np.linspace(1, 0, fade); out[:fade] *= np.linspace(0, 1, fade)
st = np.stack([out, np.roll(out, 300)], axis=1)
pcm = (st*32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', dur)
