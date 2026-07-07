# media/ — Supabase-hosted assets (source copies)

These files are **not bundled in the app**. They live in Supabase Storage and are
downloaded + cached on the device at runtime (see `src/lib/remoteAsset.ts`). This
folder is the local master / re-upload source, and is excluded from the app bundle
(`assetBundlePatterns` in app.json) and from EAS build archives (`.easignore`).

```
media/audio/*.mp3   -> Supabase bucket "solace_voices"   (voice, music, beds)
media/images/*.jpg  -> Supabase bucket "solace_images"   (backgrounds)
```

Public URL pattern:
```
https://nhkszwctydlsxadpbahx.supabase.co/storage/v1/object/public/<bucket>/<filename>
```

## Re-uploading after adding/replacing a file

Drop the new file in the matching `media/` subfolder, then:

```bash
SUPABASE_SERVICE_ROLE_KEY=<secret key> node scripts/upload-assets-to-supabase.mjs
```

(Upload is upsert, so re-running is safe.) Then reference it by filename in
`calmSessions.ts` / `calmSounds.ts` / `practiceSounds.ts`.
See `assets/audio/scripts/AUDIO_MAP.md` for the canonical filename map.
