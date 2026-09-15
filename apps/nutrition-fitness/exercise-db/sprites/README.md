# Wellness 2.0 exercise sprites

Source: `../calisthenics-exercises.md` (451 exercises).

All **451 catalog entries have a saved image**. `checkpoint.json` and `manifest.json` record coverage; `validation.json` records file checks. Visual review remains separate from generation coverage.

The selected style is the original v1: outlined, cel-shaded fitness characters with dark softly shaded backgrounds. Each named PNG is a single exercise sheet with an adult woman in the top row and an adult man in the bottom row, three poses per character. Purple female clothing and blue male clothing use the requested Wellness 2.0 brand. No alternate versions are being generated.

Open `index.html` to browse/search the collection. `manifest.json` tracks saved sheets and pending exercises. Run `python3 sync-catalog.py` from this directory to refresh both after adding images.

`generation-log.jsonl` records exact prompts and generated filenames for the ongoing built-in image_gen run. `prompts.json` records the original wall push-up experiments; `drafts` preserves those original files. `wall-push-up.png` is the user-selected v1.

Generated sheets are source artwork for future animation, not finished animations. The images have opaque backgrounds. Movement anatomy, exact branding, consistent frame anchors and crop coordinates require review before app integration. Generated text can vary from the requested spelling. Status `generated-unreviewed` means the file exists, not that animation or exercise-form validation is complete.
