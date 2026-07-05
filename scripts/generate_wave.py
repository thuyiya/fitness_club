#!/usr/bin/env python3
"""
Generate a seamless, loopable water-wave video for the breathing / calm screens.

The animation is built entirely from sine layers whose *temporal* frequencies are
whole numbers of cycles across the clip, so the last frame flows perfectly back
into the first — no visible seam when looped with expo-av `isLooping`.

An optional "breath" swell brightens and lifts the water once per loop, so you can
match the clip length to a breath cycle (e.g. 19s for a 4-7-8) if you want the
water to literally breathe with the exercise.

Usage
-----
  pip install numpy imageio imageio-ffmpeg
  python scripts/generate_wave.py --preset ocean --duration 12 --out assets/wave.mp4

  # match a 4-7-8 breath (19s), portrait, higher res:
  python scripts/generate_wave.py --preset teal --duration 19 --width 1080 --height 1920

Presets: ocean, teal, sage, night   (or pass --deep/--mid/--light hex colors)
"""
import argparse
import numpy as np
import imageio.v2 as imageio

PRESETS = {
    # deep water,        mid water,        surface / foam highlight
    "ocean": ("#06263F", "#0E5A82", "#7FC6D6"),
    "teal":  ("#062B2B", "#0E6E66", "#8FE3D0"),
    "sage":  ("#26331F", "#4F7A4A", "#C9E0B4"),  # matches the app's calm palette
    "night": ("#0B1026", "#243B6B", "#6E86C8"),
}


def hex_to_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# Wave layers: (amplitude, fx, fy, temporal_cycles, phase, drift_direction)
# temporal_cycles MUST be integers -> guarantees a seamless loop.
LAYERS = [
    (1.00, 1.2, 0.6, 1,  0.00,  1),
    (0.65, 2.3, 1.1, 2,  1.30, -1),
    (0.42, 3.7, 0.4, 3,  2.10,  1),
    (0.28, 5.1, 2.0, 2,  0.75, -1),
    (0.18, 8.0, 3.3, 4,  3.40,  1),  # fine shimmer / caustics
]


def render(args):
    W, H, fps = args.width, args.height, args.fps
    frames = max(1, round(args.duration * fps))

    deep = hex_to_rgb(args.deep or PRESETS[args.preset][0])
    mid = hex_to_rgb(args.mid or PRESETS[args.preset][1])
    light = hex_to_rgb(args.light or PRESETS[args.preset][2])

    # Normalised pixel grid (x across, y down). Aspect-correct x so waves aren't stretched.
    xs = np.linspace(0.0, 1.0, W, dtype=np.float32) * (W / H)
    ys = np.linspace(0.0, 1.0, H, dtype=np.float32)
    x, y = np.meshgrid(xs, ys)

    amp_sum = sum(l[0] for l in LAYERS)
    # Vertical depth gradient: darker at the bottom, lighter toward the surface (top).
    depth = smoothstep(0.0, 1.0, 1.0 - y)

    writer = imageio.get_writer(
        args.out, fps=fps, codec="libx264", quality=8,
        macro_block_size=None, pixelformat="yuv420p",
        ffmpeg_params=["-crf", str(args.crf), "-movflags", "+faststart"],
    )

    two_pi = 2.0 * np.pi
    try:
        for f in range(frames):
            p = f / frames  # loop phase in [0, 1)

            field = np.zeros((H, W), dtype=np.float32)
            for amp, fx, fy, ft, ph, drift in LAYERS:
                field += amp * np.sin(
                    two_pi * (fx * x + fy * y + drift * ft * p + ph)
                )
            n = 0.5 + 0.5 * (field / amp_sum)  # -> [0, 1]

            # Breath swell: one gentle rise/fall per loop (0 at start & end = seamless).
            breath = 0.5 - 0.5 * np.cos(two_pi * p)
            lift = 1.0 + args.breath * 0.18 * breath

            # Colour: deep -> mid across the field, then push toward the surface tint on crests.
            t1 = np.clip(n * depth * lift, 0.0, 1.0)[..., None]
            base = deep[None, None, :] * (1.0 - t1) + mid[None, None, :] * t1

            crest = smoothstep(0.62, 0.98, n)[..., None]
            frame = base * (1.0 - 0.55 * crest) + light[None, None, :] * (0.55 * crest)

            # Soft vignette so the edges settle behind UI text.
            vig = (1.0 - 0.35 * smoothstep(0.55, 1.0, np.abs(y - 0.5) * 2.0))[..., None]
            frame *= 0.9 + 0.1 * breath  # subtle global brightness breath
            frame *= vig

            writer.append_data(np.clip(frame, 0, 255).astype(np.uint8))
            if f % 30 == 0:
                print(f"  frame {f + 1}/{frames}")
    finally:
        writer.close()
    print(f"✓ wrote {args.out}  ({W}x{H}, {args.duration}s, {fps}fps, seamless loop)")


def main():
    ap = argparse.ArgumentParser(description="Seamless water-wave loop generator")
    ap.add_argument("--out", default="wave.mp4")
    ap.add_argument("--preset", choices=list(PRESETS), default="ocean")
    ap.add_argument("--deep"); ap.add_argument("--mid"); ap.add_argument("--light")
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--duration", type=float, default=12.0, help="seconds")
    ap.add_argument("--breath", type=float, default=1.0,
                    help="0 = flat ambient, 1 = full breathing swell")
    ap.add_argument("--crf", type=int, default=20, help="quality (lower=better, 18-24 typical)")
    render(ap.parse_args())


if __name__ == "__main__":
    main()
