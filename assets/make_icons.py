import sys
from PIL import Image, ImageDraw, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
w, h = im.size
# Flood-fill the white background from the border; the thick black outlines stop it.
marked = im.copy()
for x, y in [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, 0), (w//2, h-1), (0, h//2), (w-1, h//2)]:
    if min(marked.getpixel((x, y))) > 220:
        ImageDraw.floodfill(marked, (x, y), (255, 0, 255), thresh=60)
alpha = Image.eval(Image.eval(marked.getchannel("G"), lambda v: 255) , lambda v: v)
px_m, a = marked.load(), Image.new("L", (w, h), 255)
pa = a.load()
for y in range(h):
    for x in range(w):
        if px_m[x, y] == (255, 0, 255):
            pa[x, y] = 0
a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))  # trim light fringe, smooth edge
rgba = im.copy(); rgba.putalpha(a)
rgba = rgba.crop(a.point(lambda v: 255 if v > 8 else 0).getbbox())

def square(size, scale, bg=None):
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    inner = int(size * scale)
    art = rgba.copy(); art.thumbnail((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas if bg is None else canvas.convert("RGB")

white = (255, 255, 255, 255)
square(256, 1.0).save(f"{out}/logo.png", optimize=True)
for s in (192, 512):
    square(s, 0.94).save(f"{out}/icon-{s}.png", optimize=True)
    square(s, 0.74, white).save(f"{out}/icon-maskable-{s}.png", optimize=True)  # safe zone = inner 80 % circle
square(180, 0.86, white).save(f"{out}/apple-touch-icon.png", optimize=True)
