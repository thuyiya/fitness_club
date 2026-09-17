#!/usr/bin/env bash
#
# Regenerates every Wellness 2.0 app asset from the single source mark.
#
#   apps/wellness/scripts/generate-brand-assets.sh [source.png]
#
# Run this rather than editing the PNGs by hand: the sizes, the safe-zone
# padding and the background colours all have to stay in step, and "the icon
# looks slightly off on Android" is otherwise very hard to trace back.
#
# Requires ImageMagick (brew install imagemagick).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$HERE/../assets"
BRAND="$ASSETS/brand"
SRC="${1:-$BRAND/logo-source.png}"

# Brand constants. LIME is sampled from the source art, not from the theme:
# tokens.ts carries a slightly different lime (#B4FF3A) for UI accents, and the
# logo must not drift toward it.
LIME="#C1FB09"
BLACK="#000000"

[ -f "$SRC" ] || { echo "no source mark at $SRC" >&2; exit 1; }
command -v magick >/dev/null || { echo "ImageMagick not installed" >&2; exit 1; }

echo "source: $SRC"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 1. Lift the mark off its black background.
#
# The source is a flat lime shape on solid black, so luminance IS the coverage
# mask --- including the anti-aliased edge pixels, which a colour-key or a
# hard threshold would either lose or leave with a dark fringe. Build the alpha
# from grayscale, then paint it onto flat brand lime so the edges blend to the
# right hue instead of toward black.
#
# The -level clamp is required, not cosmetic. The source's "black" background is
# not all #000000 --- JPEG-ish ringing leaves a spread of #010000-ish pixels that
# auto-level lifts to alpha 1/255. That is invisible but non-zero, so -trim finds
# no border to cut and every asset below silently keeps the source's off-centre
# framing. Clamping <20% to fully transparent and >80% to fully opaque kills the
# ringing while leaving the genuine anti-aliased edge ramp intact.
magick "$SRC" -colorspace Gray -auto-level -level '20%,80%' "$TMP/alpha.png"
magick -size "$(magick identify -format '%wx%h' "$SRC")" "xc:$LIME" \
       "$TMP/alpha.png" -alpha off -compose CopyOpacity -composite \
       "$TMP/mark-full.png"

# 2. Trim to the artwork. The figure sits off-centre in the source frame, so
#    everything below centres the TRIMMED mark --- centring the original frame
#    would leave the icon visibly low and right.
magick "$TMP/mark-full.png" -trim +repage "$TMP/mark.png"
echo "trimmed mark: $(magick identify -format '%wx%h' "$TMP/mark.png")"

# Centres the mark on a square canvas, scaled to COVER percent of the edge.
# $1 output  $2 canvas px  $3 coverage %  $4 background (or 'none')
emit() {
  local out="$1" size="$2" cover="$3" bg="$4"
  local box=$(( size * cover / 100 ))
  # An opaque target drops the alpha CHANNEL, not just the transparency. A fully
  # opaque RGBA png still reads as "contains alpha" to App Store Connect, which
  # rejects the upload; -alpha remove flattens onto $bg, -alpha off deletes the
  # channel. Transparent targets obviously keep theirs.
  # ${arr[@]+...} rather than a bare ${arr[@]}: macOS ships bash 3.2, where
  # expanding an EMPTY array under `set -u` is an unbound-variable error.
  local flat=()
  [ "$bg" = "none" ] || flat=(-alpha remove -alpha off)
  magick "$TMP/mark.png" -resize "${box}x${box}" \
    -background "$bg" -gravity center -extent "${size}x${size}" \
    ${flat[@]+"${flat[@]}"} -strip "$out"
  echo "  $(basename "$out")  ${size}x${size}  ${cover}%  bg=$bg  $(magick identify -format '%[channels]' "$out")"
}

mkdir -p "$ASSETS"

# iOS / general app icon. Opaque by requirement: iOS composites icons on white
# and applies its own corner mask, so a transparent icon shows as a white tile.
# 62% keeps the mark clear of the corner radius.
emit "$ASSETS/icon.png" 1024 62 "$BLACK"

# Android adaptive foreground. The launcher guarantees only the centre 66% of
# the canvas survives masking, and circular masks crop tighter still --- so the
# mark gets 50%, comfortably inside the safe zone, and the background is a flat colour
# set in app.json rather than baked in.
emit "$ASSETS/adaptive-icon.png" 1024 50 none

# Splash. Transparent so it sits on the configured background colour, and small
# enough that `resizeMode: contain` renders a mark rather than a wall of lime.
emit "$ASSETS/splash-icon.png" 1024 40 none

# Web favicon. Opaque: browser tab strips have no mask and no guaranteed
# backdrop, so the black tile is what makes the mark legible.
emit "$ASSETS/favicon.png" 48 70 "$BLACK"

# Reusable in-app mark (headers, empty states). Transparent, square, tight.
emit "$BRAND/logo-mark.png" 512 88 none

echo "done"
