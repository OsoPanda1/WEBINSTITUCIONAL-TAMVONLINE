"""Diagnóstico de los logos: dimensiones y bandas de texto por perfil de luminancia.

Solo lectura. Imprime por consola. Sirve para fijar los recortes del lockup
sin tener que mirar el navegador.
"""
import sys
from PIL import Image

def bands(path, thr=28):
    im = Image.open(path).convert('L')
    w, h = im.size
    px = im.load()
    rows = []
    for y in range(h):
        m = 0
        for x in range(0, w, 2):
            v = px[x, y]
            if v > m:
                m = v
        rows.append(m)
    out, start = [], None
    for y, v in enumerate(rows):
        if v > thr and start is None:
            start = y
        elif v <= thr and start is not None:
            if y - start > 4:
                out.append((start, y))
            start = None
    if start is not None:
        out.append((start, h))
    return (w, h), out

for p in sys.argv[1:]:
    try:
        (w, h), b = bands(p)
        print(f'{p}\n  tam {w}x{h}\n  bandas (y0,y1) alto: ' + '; '.join(f'{a}-{c} ({c-a})' for a, c in b))
    except Exception as e:
        print(f'{p}\n  ERROR {e}')
