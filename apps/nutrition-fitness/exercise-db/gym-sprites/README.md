# Wellness 2.0 gym exercises

Source: `packages/db/seed/catalog/exercises.json`. One named PNG per catalog entry, both adult characters, three poses each, matching the selected v1 style and requested Wellness 2.0 clothing brand.

The manifest preserves source IDs for later app integration. `generation-log.jsonl` records exact built-in image_gen prompts. `index.html` is the local gallery; run `python3 sync-catalog.py` to refresh it.

These are opaque source illustration sheets, not finished animation. Generated branding, anatomy, poses and frame alignment require review before production use. Existing app URLs are unchanged.
