"""Genera los recortes de marca y la tarjeta social del sitio TAMV.

Reproduce en local lo que el CSS hacía con `object-fit: cover`, pero en píxeles
reales: así el encuadre no depende del ancho del contenedor y no puede cortar
una línea de texto a media altura.

Salidas (todas dentro de web/assets/brand/):
  tamv-mark.webp      TAMV + ONLINE              (cabecera y pie)
  tamv-lockup.webp    TAMV + ONLINE + VERSÁTIL   (intermedio: solo se usa para
                                                  componer og-cover.jpg; ninguna
                                                  página lo enlaza)
  emblem-mark.webp    colibrí sin la línea de nombre
  og-cover.jpg        1200x630 para `og:image`

No se toca el archivo oficial completo: `tamv-wordmark.webp` y
`isabella-hummingbird.webp` siguen intactos porque la página de organización los
expone como pieza de identidad, con su descargo.

Uso:  python tools/brand-build.py
"""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, 'web', 'assets', 'brand')
FONTS = 'C:/Windows/Fonts/'
SRC_LOCKUP = os.path.join(BRAND, 'tamv-wordmark.webp')   # 1000x754
SRC_EMBLEM = os.path.join(BRAND, 'isabella-hummingbird.webp')  # 1280x761

# Bandas de luminancia medidas con tools/brand-inspect.py (umbral 28):
#   lockup : TAMV 113-265 · ONLINE 279-322 · VERSÁTIL 347-379 · superlativo 397-420
#   emblem : arte 48-561 · filete 584-609 · ISABELLA VILLASEÑOR V6 619-699
CROPS = {
    'tamv-mark.webp': (SRC_LOCKUP, 104, 327),
    'tamv-lockup.webp': (SRC_LOCKUP, 104, 389),
    'emblem-mark.webp': (SRC_EMBLEM, 38, 567),
}


def tight_box(im, thr=26, pad=0.035):
    """Recorta el aire sobrante por los lados, manteniendo el centro."""
    g = im.convert('L')
    w, h = g.size
    px = g.load()
    lo_x, hi_x, lo_y, hi_y = w, 0, h, 0
    for y in range(h):
        first = last = -1
        for x in range(0, w):
            if px[x, y] > thr:
                if first < 0:
                    first = x
                last = x
        if first < 0:
            continue
        lo_x, hi_x = min(lo_x, first), max(hi_x, last)
        lo_y, hi_y = min(lo_y, y), max(hi_y, y)
    if hi_x <= lo_x:
        return im
    cx = (lo_x + hi_x) / 2
    half = max(hi_x - lo_x, 1) / 2 * (1 + pad * 2)
    x0, x1 = int(max(0, cx - half)), int(min(w, cx + half))
    return im.crop((x0, max(0, lo_y - 6), x1, min(h, hi_y + 7)))


def build_crops():
    made = []
    cache = {}
    for name, (src, y0, y1) in CROPS.items():
        if src not in cache:
            cache[src] = Image.open(src).convert('RGB')
        im = tight_box(cache[src].crop((0, y0, cache[src].width, y1)))
        out = os.path.join(BRAND, name)
        im.save(out, 'WEBP', quality=92, method=6)
        made.append((name, im.size, os.path.getsize(out)))
    return made


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


VOID, NIGHT, NIGHT2 = (3, 6, 11), (6, 17, 32), (10, 26, 44)


def background(w, h):
    """Degradado vertical + dos halos radiales + retícula, en píxeles."""
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        t = y / (h - 1)
        base = lerp(VOID, NIGHT, min(1, t / 0.55)) if t < 0.55 else lerp(NIGHT, NIGHT2, (t - 0.55) / 0.45)
        for x in range(w):
            px[x, y] = base
    # halos
    glows = [(int(w * 0.76), int(h * 0.14), int(w * 0.46), (111, 224, 255), 0.30),
             (int(w * 0.06), int(h * 0.98), int(w * 0.40), (31, 111, 208), 0.26)]
    for gx, gy, gr, col, amp in glows:
        layer = Image.new('L', (w, h), 0)
        lp = layer.load()
        for y in range(max(0, gy - gr), min(h, gy + gr)):
            dy = (y - gy) / gr
            for x in range(max(0, gx - gr), min(w, gx + gr)):
                dx = (x - gx) / gr
                d = (dx * dx + dy * dy) ** 0.5
                if d < 1:
                    lp[x, y] = int(255 * amp * (1 - d) ** 2)
        layer = layer.filter(ImageFilter.GaussianBlur(28))
        im = ImageChops.add(im, ImageChops.multiply(Image.new('RGB', (w, h), col),
                                                   Image.merge('RGB', (layer, layer, layer))))
    # retícula
    grid = Image.new('L', (w, h), 0)
    gp = grid.load()
    for x in range(0, w, 62):
        for y in range(h):
            gp[x, y] = 16
    for y in range(0, h, 62):
        for x in range(w):
            gp[x, y] = max(gp[x, y], 16)
    grid = grid.filter(ImageFilter.GaussianBlur(0.4))
    im = ImageChops.add(im, ImageChops.multiply(Image.new('RGB', (w, h), (158, 212, 255)),
                                                Image.merge('RGB', (grid, grid, grid))))
    return im


def screen_paste(base, mark, x, y, width, feather=46):
    """Coloca una marca opaca sobre fondo negro con mezcla `screen`.

    Las artes originales traen un fondo azul muy oscuro, no negro puro: sin
    desvanecer el borde, el rectángulo de la imagen se ve como una mancha.
    Se multiplica por una máscara que baja a cero en los `feather` píxeles
    exteriores antes de mezclar.
    """
    m = mark.convert('RGB')
    target_h = int(round(m.height * (width / m.width)))
    m = m.resize((width, target_h), Image.LANCZOS)
    f = min(feather, width // 3, target_h // 3)
    mask = Image.new('L', (width, target_h), 0)
    mp = mask.load()
    for yy in range(target_h):
        dy = min(yy, target_h - 1 - yy)
        if dy >= f:
            vy = 255
        else:
            vy = int(255 * (dy / f) ** 0.7)
        for xx in range(width):
            dx = min(xx, width - 1 - xx)
            v = vy if dx >= f else int(vy * ((dx / f) ** 0.7))
            mask.putpixel((xx, yy), min(v, vy))
    m = ImageChops.multiply(m, Image.merge('RGB', (mask, mask, mask)))
    layer = Image.new('RGB', base.size, (0, 0, 0))
    layer.paste(m, (x, y))
    return ImageChops.screen(base, layer)


def build_cover():
    W, H = 1200, 630
    base = background(W, H)
    lockup = Image.open(os.path.join(BRAND, 'tamv-lockup.webp'))
    emblem = Image.open(os.path.join(BRAND, 'emblem-mark.webp'))

    # marca TAMV arriba a la izquierda
    lw = 430
    base = screen_paste(base, lockup, 72, 84, lw, feather=30)
    lh = int(round(lockup.height * (lw / lockup.width)))
    # emblema a la derecha, alineado por abajo con la marca
    ew = 340
    eh = int(round(emblem.height * (ew / emblem.width)))
    base = screen_paste(base, emblem, W - 72 - ew, 84 + lh - eh, ew, feather=54)

    d = ImageDraw.Draw(base)
    # filete
    y = 300
    for x in range(72, W - 72):
        t = (x - 72) / (W - 144)
        fade = min(1.0, t / 0.16) * min(1.0, (1 - t) / 0.16)
        c = lerp((31, 111, 208), (111, 224, 255), 1 - abs(t - 0.5) * 2)
        d.point((x, y), fill=lerp((10, 26, 44), c, fade))

    f_head = ImageFont.truetype(FONTS + 'georgiai.ttf', 44)
    f_mono = ImageFont.truetype(FONTS + 'consola.ttf', 21)
    f_mono_b = ImageFont.truetype(FONTS + 'consolab.ttf', 21)
    f_host = ImageFont.truetype(FONTS + 'consola.ttf', 22)

    d.text((72, 336), 'Red independiente de investigación,', font=f_head, fill=(238, 244, 250))
    d.text((72, 392), 'tecnología y memoria', font=f_head, fill=(238, 244, 250))
    d.text((72, 470), 'MINERAL DEL MONTE  ·  HIDALGO  ·  MÉXICO', font=f_mono, fill=(126, 147, 171))
    d.text((72, 505), 'Ficha institucional pública — ES / EN', font=f_mono_b, fill=(158, 212, 255))
    d.text((72, 556), 'tamvonline-t78x4mdi9wa.qoder.website', font=f_host, fill=(111, 224, 255))

    out = os.path.join(BRAND, 'og-cover.jpg')
    base.save(out, 'JPEG', quality=90, optimize=True, progressive=True)
    return out, base.size, os.path.getsize(out)


if __name__ == '__main__':
    for name, size, kb in build_crops():
        print(f'{name:22s} {size[0]}x{size[1]:4d}  {kb // 1024} KB')
    path, size, kb = build_cover()
    print(f'{"og-cover.jpg":22s} {size[0]}x{size[1]:4d}  {kb // 1024} KB')
