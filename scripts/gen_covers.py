"""Generate cover art for the demo beats (dark neon theme, English text)."""
import math
import random
from PIL import Image, ImageDraw, ImageFont

random.seed(7)

W = H = 800
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

BEATS = [
    ("Midnight Drive", "TRAP / 140 BPM", (16, 185, 129)),
    ("Paper Planes", "DRILL / 145 BPM", (52, 211, 153)),
    ("Neon Skyline", "SYNTHWAVE / 110 BPM", (45, 212, 191)),
    ("Gravity", "R&B / 92 BPM", (110, 231, 183)),
    ("Cold Cash", "BOOM BAP / 88 BPM", (5, 150, 105)),
    ("Overdrive", "EDM / 128 BPM", (16, 163, 127)),
]


def radial_gradient(img: Image.Image, inner, outer):
    px = img.load()
    cx, cy = W / 2, H / 2
    max_d = math.hypot(cx, cy)
    for y in range(H):
        for x in range(0, W, 2):
            d = math.hypot(x - cx, y - cy) / max_d
            t = d ** 1.6
            r = int(outer[0] + (inner[0] - outer[0]) * (1 - t))
            g = int(outer[1] + (inner[1] - outer[1]) * (1 - t))
            b = int(outer[2] + (inner[2] - outer[2]) * (1 - t))
            px[x, y] = (r, g, b)
            if x + 1 < W:
                px[x + 1, y] = (r, g, b)


def waveform_bars(draw: ImageDraw.ImageDraw, accent, n_bars=48):
    bar_w = W // (n_bars * 2)
    heights = []
    for i in range(n_bars):
        h = 30 + abs(math.sin(i * 0.55)) * 90 + random.uniform(-12, 18)
        heights.append(h)
    total_w = n_bars * bar_w * 2
    x0 = (W - total_w) // 2
    for i, h in enumerate(heights):
        x = x0 + i * bar_w * 2
        y0 = 470 - h / 2
        y1 = 470 + h / 2
        shade = 0.55 + 0.45 * (h / 140)
        col = tuple(int(c * shade) for c in accent)
        draw.rectangle([x, y0, x + bar_w, y1], fill=col)


for idx, (title, subtitle, accent) in enumerate(BEATS, start=1):
    img = Image.new("RGB", (W, H), (9, 9, 11))
    radial_gradient(img, (24, 26, 32), (9, 9, 11))
    draw = ImageDraw.Draw(img)

    # accent glow circle
    gx, gy, gr = W // 2, 250, 170
    for r in range(gr, 0, -6):
        a = 1 - r / gr
        col = tuple(int(c * a * 0.55) for c in accent)
        draw.ellipse([gx - r, gy - r, gx + r, gy + r], outline=col, width=3)

    waveform_bars(draw, accent)

    f_title = ImageFont.truetype(FONT_BOLD, 64)
    f_sub = ImageFont.truetype(FONT_REG, 28)
    f_brand = ImageFont.truetype(FONT_BOLD, 24)

    tb = draw.textbbox((0, 0), title, font=f_title)
    tw = tb[2] - tb[0]
    draw.text(((W - tw) / 2, 520), title, font=f_title, fill=(240, 240, 245))

    sb = draw.textbbox((0, 0), subtitle, font=f_sub)
    sw = sb[2] - sb[0]
    draw.text(((W - sw) / 2, 610), subtitle, font=f_sub, fill=accent)

    draw.text((40, 40), "PLAYBEAT", font=f_brand, fill=(255, 255, 255))
    draw.text((W - 130, 40), f"{idx:02d}", font=f_brand, fill=accent)

    img.save(f"public/covers/beat-{idx}.png", optimize=True)
    print("wrote", f"public/covers/beat-{idx}.png")
