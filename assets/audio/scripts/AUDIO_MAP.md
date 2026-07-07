# Solace audio map — single source of truth

Every script → its session in the app → the exact voice MP3 filename(s) it expects.
Generate each voice in ElevenLabs (settings in `README.md`), name the file **exactly**
as shown, drop it in `assets/audio/`, then add the `require()` to that session's `takes`
in `src/lib/calmSessions.ts`. A session with no `takes` renders locked ("Soon").

**Naming convention**
- Meditations: two takes each → `voice-<id>-1.mp3`, `voice-<id>-2.mp3`
- Stories: one take each → `voice-<id>.mp3`
- `<id>` is the session `id` in `calmSessions.ts` (also the filename base below).

---

## Guided journeys (meditations) — 14

| # | Script | Session id | Title | Voice files | Bed | Status |
|---|--------|-----------|-------|-------------|-----|--------|
| 01 | `01-breath.md` | `breath` | Settle the Mind | `voice-breath-1.mp3`, `voice-breath-2.mp3` | drift | ✅ recorded |
| 02 | `02-body-scan.md` | `bodyscan` | Release the Body | `voice-bodyscan-1.mp3`, `voice-bodyscan-2.mp3` | morning | ✅ recorded |
| 03 | `03-letting-go-thoughts.md` | `thoughts` | Quiet a Racing Mind | `voice-thoughts-1.mp3`, `voice-thoughts-2.mp3` | drift | ✅ recorded |
| 04 | `04-problem-solving.md` | `problem` | Think Clearly | `voice-problem-1.mp3`, `voice-problem-2.mp3` | drift | ✅ recorded |
| 05 | `05-loving-kindness.md` | `metta` | Soften the Heart | `voice-metta-1.mp3`, `voice-metta-2.mp3` | morning | ✅ recorded |
| 06 | `06-sleep-story.md` | `sleep` | The Lantern on the Mountain | `voice-sleep-1.mp3`, `voice-sleep-2.mp3` | night | ⬜ needs audio |
| 07 | `07-the-miracle-of-this-moment.md` | `miracle` | The Miracle of This Moment | `voice-miracle-1.mp3`, `voice-miracle-2.mp3` | drift | ✅ recorded |
| 08 | `08-circle.md` | `circle` | The Circle Has No Beginning | `voice-circle-1.mp3`, `voice-circle-2.mp3` | drift | ✅ recorded |
| 09 | `09-the-mind-that-paints-the-world.md` | `paints` | The Mind That Paints the World | `voice-paints-1.mp3`, `voice-paints-2.mp3` | drift | ⬜ needs audio |
| 10 | `10-helplessness-is-only-in-our-mind.md` | `rope` | The Rope That Was Never There | `voice-rope-1.mp3`, `voice-rope-2.mp3` | drift | ⬜ needs audio |
| 11 | `11-satisfaction.md` | `enough` | The Secret of Enough | `voice-enough-1.mp3`, `voice-enough-2.mp3` | morning | ⬜ needs audio |
| 12 | `12-impermanence.md` | `change` | Everything Changes | `voice-change-1.mp3`, `voice-change-2.mp3` | drift | ⬜ needs audio |
| 13 | `13-wisdom.md` | `wisdom` | The Cup We Keep Filling | `voice-wisdom-1.mp3`, `voice-wisdom-2.mp3` | morning | ⬜ needs audio |
| 14 | `14-focus-samatha.md` | `focus` | Focus | `voice-focus-1.mp3`, `voice-focus-2.mp3` | morning | ⬜ needs audio |

## Sleep & morning stories — 6

| Script | Session id | Title | Voice file | Bed | Status |
|--------|-----------|-------|-----------|-----|--------|
| `story/bedtime/01-music-letgo.md` | `stars` | The River of Stars | `voice-stars.mp3` | night | ⬜ needs audio |
| `story/bedtime/02-teahouse.md` | `teahouse` | The Little Teahouse at the End of the Forest | `voice-teahouse.mp3` | night | ⬜ needs audio |
| `story/bedtime/03-littlecloud.md` | `cloud` | The Little Cloud Who Couldn't Hurry | `voice-cloud.mp3` | night | ⬜ needs audio |
| `story/bedtime/04-moonkeeper.md` | `moonkeeper` | The Moon Keeper's Garden | `voice-moonkeeper.mp3` | night | ⬜ needs audio |
| `story/bedtime/05-nighttrain.md` | `nighttrain` | The Night Train to Morning | `voice-nighttrain.mp3` | night | ⬜ needs audio |
| `story/morning/01-morningbegin.md` | `beginagain` | Begin Again | `voice-beginagain.mp3` | morning | ⬜ needs audio |

---

## Counts

**Voice narration**
- Recorded so far: **14 files** (7 meditations × 2 takes: breath, bodyscan, thoughts, problem, metta, miracle, circle)
- Still to record: **20 files** = 14 (7 meditations × 2 takes: sleep, paints, rope, enough, change, wisdom, focus) + 6 (6 stories × 1 take)
- **Total when complete: 34 voice files** across 20 sessions

> Leaner option: 1 take per meditation instead of 2 → **17 files still to record**
> (11 meditations + 6 stories). The app already supports any number of takes per
> session; it just picks one at random.

**Background audio (already present, no recording needed)**
- Beds (guided-journey ambience): `bed-drift`, `bed-morning`, `bed-night`, `bed-aurora` — 4
- Practice music (breathing exercises): `music-breath-1/2`, `music-focus-1/2`, `music-body-1/2`, `music-metta-1/2`, `music-letgo-1` — 9

**Grand total audio for a fully-voiced app: 34 voice + 13 background = 47 files.**
