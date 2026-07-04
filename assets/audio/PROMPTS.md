# Calm session audio — Suno prompt sheet

How to use each prompt in Suno:
1. Open Suno → **Create** → toggle **Custom** mode ON.
2. Turn **Instrumental** ON for every music bed (no lyrics) — except the "Aurora" vocal pad.
3. Paste the text below into the **Style / Style of Music** box. Leave **Lyrics** empty.
4. Generate, pick the best take, then use **Extend** to reach 3–5+ minutes so it loops smoothly.
5. Download as MP3, rename to the **filename** shown, and drop it into `assets/audio/`.
   Hand the files back and they get wired into `app/(tabs)/calm.tsx`.

Target loop length: 3–5 min each (we cross-fade-loop in-app, so a clean, seamless tail matters more than length).

---

## 1. bed-drift.mp3  — DEFAULT bed (universal, works for every rhythm)
```
ambient meditation soundscape, warm analog pads, slow evolving drone, soft sub-bass swells, distant bowed strings, gentle sine tones, no percussion, no melody hooks, spacious reverb, 55 BPM, calming, weightless, seamless loop, cinematic, instrumental
```

## 2. bed-morning.mp3  — light & hopeful (for daytime / focus)
```
peaceful ambient, soft felt piano single notes, airy synth pads, subtle nature texture, warm and hopeful, minimal, tranquil, 50 BPM, deep reverb, healing frequencies, seamless loop, instrumental
```

## 3. bed-night.mp3  — deep rest (for wind-down / sleep)
```
dark ambient sleep music, low warm drone, muffled deep pads, occasional soft distant bell, brown-noise undertone, extremely slow, no rhythm, womb-like, hypnotic, 40 BPM, seamless loop, instrumental
```

## 4. bed-aurora.mp3  — OPTIONAL wordless vocal pad (ethereal)
Turn Instrumental OFF for this one, put the style below in Style, and paste the lyric block in Lyrics.
```
Style: ethereal ambient, breathy wordless female vocal, soft "ooh" and "aah" pads, angelic, reverb-drenched, very slow, meditative, no drums, no words
```
```
Lyrics:
[soft breathy humming]
Ooh... ooh... aah...
Mmm... let it all release
[humming fades]
```

---

## Optional extra beds (generate only if you want more variety)

### bed-rain.mp3 — rain + pads
```
gentle rain ambience layered with warm soft synth pads, distant thunder far away, cozy, sleepy, no melody, no drums, 45 BPM, seamless loop, instrumental
```

### bed-ocean.mp3 — ocean + drone
```
slow ocean waves on a calm shore, deep warm drone underneath, airy pad, meditative, no melody, no percussion, seamless loop, instrumental
```

### bed-bowls.mp3 — singing bowls
```
tibetan singing bowls, long sustained resonant tones, soft mallet strikes, deep reverberant hall, 432hz tuning feel, meditative, sparse, no rhythm, seamless loop, instrumental
```

---

## Spoken breath cues — NOT Suno
The words "Breathe in", "Hold", "Breathe out", "Well done" are spoken by the phone's
built-in voice via `expo-speech` — no files to generate, works offline, matches the
on-screen phase label exactly. This is handled in code, not here.
