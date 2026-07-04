# Calm voice scripts — ElevenLabs

Six guided sessions, all grounded in real Buddhist practice, written for a slow,
warm, unhurried delivery. Generate each, name the MP3 as shown, and drop it in
`assets/audio/`. They get wired into the Calm screen as a "Guided" track list.

## Recommended ElevenLabs settings
- **Voice:** a soft, low, warm voice — e.g. "Charlotte", "Matilda", or "Rachel"
  (female) / "Daniel", "George" (male). Pick one and keep it consistent across all six.
- **Model:** Eleven Multilingual v2 (best for expressive, slow narration).
- **Stability:** 55–65%  ·  **Similarity:** 75%  ·  **Style:** 0–15%  ·  **Speaker boost:** on
- **Speed:** 0.8–0.9× (ElevenLabs "Speed" slider, or leave 1.0 — the `<break>` tags already pace it).
- The `<break time="x.xs" />` tags create the silences. ElevenLabs caps a single break
  around 3s; for longer gaps stack two breaks.

## Files → tracks
| Script file            | MP3 filename            | Length (approx) | Use |
|------------------------|-------------------------|-----------------|-----|
| 01-breath.md           | voice-breath.mp3        | ~5 min          | Settle the mind (Anapanasati) |
| 02-body-scan.md        | voice-bodyscan.mp3      | ~7 min          | Release body tension |
| 03-letting-go-thoughts.md | voice-thoughts.mp3   | ~6 min          | Quiet a racing mind |
| 04-problem-solving.md  | voice-problem.mp3       | ~8 min          | Think clearly about a problem |
| 05-loving-kindness.md  | voice-metta.mp3         | ~7 min          | Soften anxiety / self-criticism (Metta) |
| 06-sleep-story.md      | voice-sleepstory.mp3    | ~12 min         | Bedtime story to fall asleep |

Pair each with a bed: breath/thoughts/problem → Drift, body-scan/metta → Morning,
sleep-story → Night. (Wiring handles this.)
