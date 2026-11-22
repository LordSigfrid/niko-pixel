// Kit do tema tático para copa/lounge/banheiro/recepção e itens de parede (puro): materiais
// militares (oliva, cáqui, coiote, aço) e detalhes pequenos — rebites, faixas de alerta, sacos de
// areia, marcas de estêncil. Tudo original: nada de logos, nomes ou cartazes reconhecíveis.
import { ramp, type Ramp } from '../core/color';
import type { PixelBuf } from '../core/pixbuf';

export const T = {
  olive: ramp('#5f6b3d', 0.07),
  oliveDark: ramp('#47512d', 0.07),
  khaki: ramp('#b39a6a', 0.06),
  coyote: ramp('#8a6a4c', 0.06),
  steel: ramp('#7d848c', 0.07),
  steelLight: ramp('#a9b0b7', 0.06),
  stainless: ramp('#c2c8cd', 0.05),
  black: ramp('#33373a', 0.07),
  plywood: ramp('#c4a46e', 0.06),
  canvas: ramp('#7a7a52', 0.07),
} as const;

/** Acentos de segurança (usar com parcimônia). */
export const SAFETY_YELLOW = '#e3b23c';
export const SAFETY_ORANGE = '#e0752f';
export const STENCIL = '#e6dcc0';
export const STENCIL_DARK = '#2b2f2a';

/** Faixa de alerta diagonal amarelo/preto dentro de um retângulo. */
export function hazard(b: PixelBuf, x: number, y: number, w: number, h: number, period = 4, c1 = SAFETY_YELLOW, c2 = '#2b2d2f'): void {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const k = (((xx + yy) % period) + period) % period;
      b.set(x + xx, y + yy, k < period / 2 ? c1 : c2);
    }
  }
}

/** Rebites (1px claro com sombra à direita). */
export function rivets(b: PixelBuf, pts: readonly (readonly [number, number])[], m: Ramp = T.steel): void {
  for (const [x, y] of pts) {
    b.set(x, y, m.hi);
    b.set(x + 1, y, m.dd);
  }
}

/** Saco de areia visto de frente (cantos arredondados, costura no meio). */
export function sandbag(b: PixelBuf, x: number, y: number, w: number, h: number, m: Ramp = T.khaki): void {
  b.rect(x, y, w, h, m.base);
  b.hline(x + 1, x + w - 2, y, m.lt);
  b.hline(x + 1, x + w - 2, y + 1, m.lt);
  b.hline(x, x + w - 1, y + h - 1, m.dk);
  b.vline(x + w - 1, y + 1, y + h - 1, m.dk);
  b.clear(x, y);
  b.clear(x + w - 1, y);
  b.set(x, y + h - 1, m.dd);
  b.set(x + w - 1, y + h - 1, m.dd);
  // Amarração nas pontas e costura.
  b.vline(x + 1, y + 1, y + h - 2, m.dk);
  b.vline(x + w - 2, y + 1, y + h - 2, m.dd);
  for (let xx = x + 3; xx < x + w - 3; xx += 2) b.set(xx, y + Math.floor(h / 2), m.dk);
}

/** Fileiras de sacos de areia desencontrados cobrindo um retângulo (de baixo para cima). */
export function sandbagWall(b: PixelBuf, x: number, y: number, w: number, h: number, bagW = 8, bagH = 4, mats: readonly Ramp[] = [T.khaki, T.coyote]): void {
  let row = 0;
  for (let yy = y + h - bagH; yy > y - bagH; yy -= bagH - 1) {
    const off = row % 2 ? -Math.floor(bagW / 2) : 0;
    let i = 0;
    for (let xx = x + off; xx < x + w; xx += bagW) {
      const x0 = Math.max(x, xx);
      const x1 = Math.min(x + w, xx + bagW);
      const top = Math.max(y, yy);
      if (x1 - x0 >= 3) sandbag(b, x0, top, x1 - x0, yy + bagH - top, mats[(row + i) % mats.length]);
      i++;
    }
    row++;
  }
}

/** Placa de identificação de estêncil (traços e pontos curtos que leem como texto a 16px). */
export function stencilMarks(b: PixelBuf, x: number, y: number, w: number, color = STENCIL, seed = 0): void {
  let xx = x;
  let i = seed;
  while (xx < x + w) {
    const len = 1 + ((i * 7 + 3) % 3);
    const end = Math.min(x + w - 1, xx + len - 1);
    b.hline(xx, end, y, color);
    if ((i + seed) % 3 === 0) b.set(xx, y + 1, color);
    xx = end + 2;
    i++;
  }
}

/** Seta de estêncil apontando para a direita (ponta triangular 5px de altura). */
export function stencilArrow(b: PixelBuf, x: number, y: number, len: number, color = STENCIL): void {
  b.rect(x, y + 1, len - 3, 3, color);
  for (let k = 0; k < 3; k++) b.vline(x + len - 3 + k, y + k, y + 4 - k, color);
}

/** Chapa xadrez (diamond plate): marcas diagonais curtas sobre a cor base. */
export function diamondPlate(b: PixelBuf, x: number, y: number, w: number, h: number, m: Ramp): void {
  b.rect(x, y, w, h, m.base);
  for (let yy = 0; yy < h; yy += 2) {
    for (let xx = (yy / 2) % 2 ? 1 : 3; xx < w - 1; xx += 4) {
      b.set(x + xx, y + yy, m.lt);
      b.set(x + xx + 1, y + yy, m.dk);
    }
  }
}

/** Grade de ventilação (frestas horizontais). */
export function louver(b: PixelBuf, x: number, y: number, w: number, n: number, m: Ramp, gap = 2): void {
  for (let i = 0; i < n; i++) {
    b.hline(x, x + w - 1, y + i * gap, m.dd);
    b.hline(x, x + w - 1, y + i * gap + 1, m.lt);
  }
}

/** Remove o contorno lateral para módulos que se encaixam lado a lado. */
export function seamlessSides(b: PixelBuf, w = 16): void {
  for (let y = -b.oy; y < b.h - b.oy; y++) {
    b.clear(-1, y);
    b.clear(w, y);
  }
}
