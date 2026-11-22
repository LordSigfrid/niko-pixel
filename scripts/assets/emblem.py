"""Emblema tático do Niko-Pixel: escudo verde-oliva com mira âmbar, desenhado pixel a pixel.

Gera em client/public/assets/brand: logo-mark (32 e 4x), favicons 16/32, ícones 192/512, apple-touch e logo-detailed.
Uso (da raiz do repo): python -I scripts/assets/emblem.py
"""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[2] / "client" / "public" / "assets" / "brand"

OUTLINE = (20, 22, 14, 255)
RIM = (138, 120, 72, 255)
FILL_HI = (98, 110, 62, 255)
FILL = (76, 86, 48, 255)
FILL_LO = (58, 66, 37, 255)
AMBER = (240, 189, 79, 255)
AMBER_DK = (176, 128, 40, 255)
RED = (232, 84, 60, 255)


def shield_inside(x: float, y: float, s: int) -> bool:
    """Escudo: topo reto com cantos chanfrados, laterais retas até 55% e ponta embaixo."""
    u, v = x / s, y / s
    if v < 0.06 or v > 0.97:
        return False
    if u < 0.08 or u > 0.92:
        return False
    if v < 0.16 and (u < 0.08 + (0.16 - v) or u > 0.92 - (0.16 - v)):
        return False  # chanfro do topo
    if v > 0.58:
        half = 0.42 * (1 - (v - 0.58) / 0.39)
        return abs(u - 0.5) <= half
    return True


def emblem(s: int) -> Image.Image:
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    px = img.load()
    inside = [[shield_inside(x + 0.5, y + 0.5, s) for x in range(s)] for y in range(s)]

    def at(x: int, y: int) -> bool:
        return 0 <= x < s and 0 <= y < s and inside[y][x]

    t = max(1, s // 32)  # espessura das linhas em pixels
    for y in range(s):
        for x in range(s):
            if not inside[y][x]:
                if any(at(x + dx, y + dy) for dx in range(-t, t + 1) for dy in range(-t, t + 1)):
                    px[x, y] = OUTLINE
                continue
            edge = not all(at(x + dx, y + dy) for dx in range(-t, t + 1) for dy in range(-t, t + 1))
            if edge:
                px[x, y] = RIM
            elif y < s * 0.3:
                px[x, y] = FILL_HI
            elif x > s * 0.5 and y > s * 0.55:
                px[x, y] = FILL_LO
            else:
                px[x, y] = FILL
    # Mira: anel, quatro hastes com folga no centro e ponto vermelho.
    cx, cy = (s - 1) / 2, s * 0.46
    r = s * 0.24
    for y in range(s):
        for x in range(s):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if inside[y][x] and abs(d - r) <= 0.55 * t + 0.25:
                px[x, y] = AMBER if y <= cy else AMBER_DK
    gap, reach = s * 0.08, r + s * 0.1
    # Hastes: colunas/linhas inteiras em volta do centro (com centro x.5 a haste vertical tem 2 px, simétrica).
    xs = sorted({int(cx), int(cx + 0.5)})
    ys = [int(cy) + w for w in range(t)]
    for k in range(int(gap), int(reach) + 1):
        for x in xs:
            for y in (int(cy) - k, int(cy) + k):
                if at(x, y):
                    px[x, y] = AMBER
        for y in ys:
            for x in (int(cx) - k, int(cx + 0.5) + k):
                if at(x, y):
                    px[x, y] = AMBER
    dot = max(1, s // 16)
    for y in range(int(cy) - dot // 2, int(cy) - dot // 2 + dot):
        for x in range(int(cx) - dot // 2, int(cx) - dot // 2 + dot):
            px[x, y] = RED
    return img


def big(base: Image.Image, size: int, pad: float = 0.1, bg: tuple | None = None) -> Image.Image:
    inner = int(size * (1 - 2 * pad))
    scale = max(1, inner // base.width)
    up = base.resize((base.width * scale, base.height * scale), Image.NEAREST)
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(up, ((size - up.width) // 2, (size - up.height) // 2))
    return canvas


def main() -> None:
    m32 = emblem(32)
    m16 = emblem(16)
    m32.save(OUT / "logo-mark.png")
    m32.resize((128, 128), Image.NEAREST).save(OUT / "logo-mark@4x.png")
    m32.save(OUT / "favicon-32.png")
    m16.save(OUT / "favicon-16.png")
    night = (16, 18, 13, 255)
    big(m32, 192, bg=night).save(OUT / "icon-192.png")
    big(m32, 512, bg=night).save(OUT / "icon-512.png")
    big(m32, 180, bg=night).convert("RGB").save(OUT / "apple-touch-icon.png")
    # Ícone do atalho do Windows (scripts/install-windows.ps1).
    ico = m32.resize((256, 256), Image.NEAREST)
    ico.save(OUT / "niko-pixel.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    # Versão detalhada (og-image, tela de abertura): o mesmo emblema desenhado em 64 px, no tamanho do antigo prédio.
    detailed = Image.new("RGBA", (78, 86), (0, 0, 0, 0))
    e64 = emblem(72)
    detailed.alpha_composite(e64, (3, 8))
    detailed.save(OUT / "logo-detailed.png")
    print("emblema gerado em", OUT)


if __name__ == "__main__":
    main()
