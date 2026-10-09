"""Draws the app icons (a white sigma on a blue square) as PNG files, using only the
Python standard library. Run:  python scripts/make-icons.py"""
import math
import struct
import zlib
from pathlib import Path

BLUE = (47, 91, 234)
WHITE = (255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "public"

# Sigma as line segments, in 0..1 icon coordinates.
SIGMA = [
    ((0.33, 0.27), (0.68, 0.27)),
    ((0.33, 0.27), (0.53, 0.50)),
    ((0.53, 0.50), (0.33, 0.73)),
    ((0.33, 0.73), (0.68, 0.73)),
    ((0.68, 0.27), (0.69, 0.33)),  # small serifs
    ((0.68, 0.73), (0.69, 0.67)),
]


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def rounded_rect_dist(px, py, size, r):
    """Signed distance to a rounded square (negative inside)."""
    half = size / 2
    qx = abs(px - half) - (half - r)
    qy = abs(py - half) - (half - r)
    outside = math.hypot(max(qx, 0), max(qy, 0))
    return outside + min(max(qx, qy), 0) - r


def render(size, maskable):
    scale = 0.8 if maskable else 1.0  # maskable icons keep the glyph inside the safe zone
    radius = 0 if maskable else size * 0.22
    width = size * 0.085 * scale
    segs = [
        tuple(((0.5 + (x - 0.5) * scale) * size, (0.5 + (y - 0.5) * scale) * size) for x, y in s) for s in SIGMA
    ]
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter type 0
        py = y + 0.5
        for x in range(size):
            px = x + 0.5
            bg = 1.0 if maskable else max(0.0, min(1.0, 0.5 - rounded_rect_dist(px, py, size, radius)))
            d = min(seg_dist(px, py, *a, *b) for a, b in segs)
            ink = max(0.0, min(1.0, width / 2 + 0.5 - d))
            r, g, b = (round(BLUE[i] * (1 - ink) + WHITE[i] * ink) for i in range(3))
            row += bytes((r, g, b, round(255 * bg)))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


if __name__ == "__main__":
    for name, size, maskable in [
        ("pwa-192.png", 192, False),
        ("pwa-512.png", 512, False),
        ("maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
    ]:
        (OUT / name).write_bytes(render(size, maskable))
        print("wrote", name)
