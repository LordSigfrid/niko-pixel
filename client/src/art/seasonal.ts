// Decorações procedurais em pixel art. Mesma escala dos móveis do escritório.
import { PixelBuf } from './core/pixbuf';
import type { BufSprite } from './core/sprite';

export type SeasonalProp = 'tree' | 'gift' | 'pumpkin' | 'ghost' | 'wreath' | 'bat' | 'ammo_stack' | 'sandbag_post' | 'beacon';

/** Caixote de munição verde-oliva com alças, estêncil e faixa amarela (Guerra). */
function crate(b: PixelBuf, x: number, y: number, w: number, h: number, shade = 0): void {
  const mid = y + Math.floor(h / 2);
  b.rect(x, y, w, h, shade ? '#4f5a32' : '#5d6a3a');
  b.rect(x, y, w, 2, shade ? '#66733f' : '#76854a');
  b.rect(x, y + h - 1, w, 1, '#3a4224');
  b.vline(x + 1, y + 2, y + h - 2, '#3f4827');
  b.vline(x + w - 2, y + 2, y + h - 2, '#3f4827');
  // estêncil: faixa amarela e marcas de lote
  b.hline(x + 3, x + w - 4, mid, '#d9b341');
  b.hline(x + 3, x + 5, mid + 2, '#c9c29a');
  b.set(x + 7, mid + 2, '#c9c29a');
  b.rect(x + Math.floor(w / 2) - 1, y + 2, 3, 1, '#2f3520');
}

export function renderSeasonalProp(kind: SeasonalProp): BufSprite {
  const b = new PixelBuf(40, 64);
  const rect = (x: number, y: number, w: number, h: number, c: string) => b.rect(x, y, w, h, c);
  if (kind === 'tree') {
    b.shadow(20, 59, 17, 3, '#252c39', 0.22);
    rect(17, 49, 6, 9, '#80573d');
    for (let row = 0; row < 4; row++) {
      const y = 13 + row * 8;
      const half = 6 + row * 3;
      rect(20 - half, y, half * 2 + 1, 9, '#245644');
      rect(22 - half, y, half * 2 - 4, 6, '#387956');
      rect(22 - half, y + 1, half - 1, 3, '#4d9361');
    }
    b.vline(20, 5, 13, '#ffe0a0');
    b.hline(16, 24, 9, '#ffe0a0');
    rect(18, 7, 5, 5, '#ffc45d');
    for (const [x, y] of [[16, 20], [24, 24], [13, 31], [25, 36], [9, 42], [20, 43], [31, 44]]) {
      rect(x, y, 3, 3, '#e05250');
      b.set(x, y, '#ffb27b');
    }
    for (const [x, y] of [[21, 17], [15, 26], [23, 30], [15, 38], [26, 42], [11, 47]]) {
      rect(x, y, 2, 2, '#ffe8b2');
    }
    rect(3, 52, 10, 8, '#a82d42');
    rect(6, 51, 2, 9, '#e5c17b');
    rect(3, 54, 10, 1, '#e5c17b');
    rect(26, 51, 10, 9, '#e6b357');
    rect(30, 50, 2, 10, '#b33549');
    rect(26, 54, 10, 1, '#b33549');
  } else if (kind === 'gift') {
    b.shadow(20, 59, 9, 2, '#252c39', 0.2);
    rect(11, 49, 17, 11, '#bf3849');
    rect(11, 49, 17, 3, '#e35a58');
    rect(18, 49, 3, 11, '#efd1a0');
    rect(11, 54, 17, 2, '#efd1a0');
    rect(14, 46, 5, 3, '#e8b860');
    rect(21, 46, 5, 3, '#e8b860');
  } else if (kind === 'pumpkin') {
    b.shadow(20, 59, 11, 2, '#252c39', 0.2);
    rect(18, 41, 3, 6, '#557342');
    rect(11, 46, 18, 14, '#c56832');
    rect(8, 49, 24, 8, '#e18b39');
    rect(13, 46, 4, 13, '#f0a647');
    rect(23, 47, 3, 12, '#f0a647');
    rect(12, 50, 4, 3, '#523347');
    rect(24, 50, 4, 3, '#523347');
    rect(17, 56, 7, 2, '#523347');
    b.set(13, 51, '#ffd680');
    b.set(25, 51, '#ffd680');
    b.hline(18, 22, 56, '#ffd680');
  } else if (kind === 'ghost') {
    rect(15, 39, 10, 3, '#e0dae9');
    rect(12, 42, 16, 15, '#e0dae9');
    rect(14, 41, 11, 15, '#fff4ed');
    rect(10, 47, 4, 4, '#e0dae9');
    rect(26, 47, 4, 4, '#e0dae9');
    for (const x of [12, 18, 24]) rect(x, 56, 4, 3, '#e0dae9');
    rect(16, 46, 2, 3, '#574563');
    rect(23, 46, 2, 3, '#574563');
    rect(19, 51, 3, 2, '#574563');
  } else if (kind === 'wreath') {
    rect(12, 39, 16, 4, '#347653');
    rect(10, 43, 5, 10, '#245644');
    rect(25, 43, 5, 10, '#347653');
    rect(13, 53, 15, 4, '#245644');
    for (const [x, y] of [[14, 41], [26, 47], [12, 50], [23, 54]]) rect(x, y, 2, 2, '#e45c58');
    rect(15, 55, 4, 4, '#c93945');
    rect(21, 55, 4, 4, '#c93945');
    rect(19, 54, 2, 4, '#f07368');
  } else if (kind === 'ammo_stack') {
    // Pilha de caixotes de munição sob uma rede de camuflagem.
    b.shadow(20, 59, 17, 3, '#1c2034', 0.26);
    crate(b, 4, 47, 16, 12, 1);
    crate(b, 21, 47, 15, 12);
    crate(b, 9, 36, 18, 11);
    crate(b, 13, 27, 12, 9, 1);
    // rede: trama escura por cima, mais rala nas laterais, com folhas soltas
    const net = ['#3c4a2c', '#4f5f35', '#2f3a22', '#6b7a45'];
    for (let y = 24; y < 50; y++) {
      const half = Math.min(17, 5 + Math.floor((y - 24) * 0.62));
      for (let x = 20 - half; x <= 20 + half; x++) {
        const edge = Math.abs(x - 20) > half - 4;
        if (y > 34 && !edge) continue;
        if ((x + y) % 3 === 0 || (x * 5 + y * 11) % 7 < 2) b.set(x, y, net[(x * 3 + y * 5) % 4]);
      }
    }
    for (const [x, y] of [[8, 40], [31, 41], [5, 45], [34, 46], [14, 30], [26, 31]]) {
      rect(x, y, 2, 3, '#4f5f35');
      b.set(x, y, '#7d8c52');
    }
  } else if (kind === 'sandbag_post') {
    // Posto de sacos de areia em meia-lua, com um caixote atrás.
    b.shadow(20, 59, 12, 3, '#1c2034', 0.26);
    crate(b, 14, 43, 12, 8, 1);
    const tones = ['#b39d6e', '#a89262', '#bca777'];
    const bag = (cx: number, cy: number, i: number) => {
      b.ellipse(cx, cy, 4, 2.2, tones[i % 3]);
      b.hline(cx - 2, cx + 1, cy - 1, '#cfbc8f');
      b.set(cx + 2, cy + 1, '#8a7650');
    };
    for (let i = 0; i < 2; i++) bag(16.5 + i * 7, 52, i + 1);
    for (let i = 0; i < 3; i++) bag(13 + i * 7, 56, i);
  } else if (kind === 'beacon') {
    // Sirene de alerta de parede: base escura, cúpula vermelha com reflexo.
    rect(14, 52, 12, 4, '#2f3332');
    rect(15, 51, 10, 1, '#4a4f4d');
    rect(16, 44, 8, 8, '#d0482f');
    rect(17, 45, 6, 6, '#ec6a3c');
    rect(17, 45, 2, 3, '#ffc59a');
    rect(19, 42, 2, 2, '#2f3332');
    b.hline(16, 23, 48, '#9b2f22');
  } else {
    rect(18, 51, 5, 6, '#47344f');
    rect(10, 50, 9, 4, '#47344f');
    rect(22, 50, 9, 4, '#47344f');
    rect(7, 48, 4, 4, '#47344f');
    rect(30, 48, 4, 4, '#47344f');
    rect(13, 53, 3, 3, '#47344f');
    rect(25, 53, 3, 3, '#47344f');
    b.set(19, 52, '#f5b95f');
    b.set(21, 52, '#f5b95f');
  }
  b.outline();
  return { buf: b, ax: 20, ay: 60 };
}
