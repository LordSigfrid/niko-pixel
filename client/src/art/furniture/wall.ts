// Itens montados na parede norte. Coordenadas de desenho: x = 0 na borda esquerda do trecho,
// y = 0 na linha do rodapé; a face da parede vai de y = -32 (topo, com a tampa até -28) a 0.
import { ramp, shade } from '../core/color';
import { rectAt, wallSheet, type BufFurniture } from '../core/sprite';
import { TACTICAL_THEME } from '../theme';
import { ACCENTS, M, book, foliage, glass, mug, pick, pot, rngOf, smallSucculent } from './kit';
import { SAFETY_ORANGE, SAFETY_YELLOW, STENCIL, STENCIL_DARK, T, diamondPlate, hazard, rivets, stencilArrow, stencilMarks } from './tactical-common';

/** Sombra suave projetada na parede (abaixo/direita do objeto). */
function wallShadow(b: import('../core/pixbuf').PixelBuf, x: number, y: number, w: number, h: number): void {
  for (let yy = y + 1; yy <= y + h; yy++) b.under(x + w, yy, 'rgba(30,34,52,0.16)');
  for (let xx = x + 1; xx <= x + w; xx++) b.under(xx, y + h, 'rgba(30,34,52,0.16)');
}

export function whiteboard(): BufFurniture {
  if (TACTICAL_THEME) return tWhiteboard();
  const s = wallSheet(3);
  const b = s.buf;
  const frame = ramp('#c3cad4', 0.06);
  const x = 2;
  const y = -27;
  const w = 44;
  const h = 19;
  b.rect(x, y, w, h, frame.base);
  b.hline(x, x + w - 1, y, frame.hi);
  b.vline(x, y, y + h - 1, frame.lt);
  b.vline(x + w - 1, y, y + h - 1, frame.dk);
  b.hline(x, x + w - 1, y + h - 1, frame.dk);
  b.rect(x + 1, y + 1, w - 2, h - 2, '#fbfcfd');
  // Reflexo sutil.
  b.line(x + 30, y + 1, x + 24, y + h - 2, 'rgba(210,225,240,0.5)');
  b.line(x + 33, y + 1, x + 27, y + h - 2, 'rgba(210,225,240,0.35)');
  // Bandeja com pincéis e apagador.
  b.rect(x + 3, y + h, w - 6, 2, frame.base);
  b.hline(x + 3, x + w - 4, y + h, frame.lt);
  for (const [i, c] of [[0, '#e05a5a'], [3, '#3f7fd8'], [6, '#2b2f3b'], [9, '#4cae6a']] as const) {
    b.rect(x + 8 + i, y + h - 1, 2, 1, c);
  }
  b.rect(x + w - 14, y + h - 2, 5, 2, '#3a3f4b');
  b.hline(x + w - 14, x + w - 10, y + h - 2, '#f2efe6');
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 3);
  s.rects = { board: rectAt(s, x + 2, y + 2, w - 4, h - 4) };
  return { base: s };
}

export function windowItem(): BufFurniture {
  if (TACTICAL_THEME) return tWindow();
  const s = wallSheet(2);
  const b = s.buf;
  const fr = ramp('#f4f4f1', 0.05);
  const x = 2;
  const y = -27;
  const w = 28;
  const h = 19;
  // Moldura (o vidro fica transparente: o mundo desenha o céu antes).
  b.rect(x, y, w, 2, fr.lt);
  b.rect(x, y + h - 2, w, 2, fr.base);
  b.rect(x, y, 2, h, fr.lt);
  b.rect(x + w - 2, y, 2, h, fr.base);
  b.hline(x, x + w - 1, y, fr.hi);
  b.vline(x + w - 1, y, y + h - 1, fr.dk);
  // Montantes.
  b.rect(x + 13, y + 2, 2, h - 4, fr.base);
  b.vline(x + 14, y + 2, y + h - 3, fr.dk);
  b.hline(x + 2, x + w - 3, y + 2, 'rgba(40,50,70,0.25)');
  // Vidro: só reflexos semitransparentes.
  const gx = x + 2;
  const gy = y + 2;
  const gw = w - 4;
  const gh = h - 4;
  for (const off of [3, 16]) {
    b.line(gx + off + 6, gy, gx + off, gy + gh - 1, 'rgba(255,255,255,0.28)');
    b.line(gx + off + 7, gy, gx + off + 1, gy + gh - 1, 'rgba(255,255,255,0.16)');
  }
  // Peitoril.
  b.rect(x - 1, y + h, w + 2, 2, fr.lt);
  b.hline(x - 1, x + w, y + h, fr.hi);
  b.hline(x - 1, x + w, y + h + 1, fr.dk);
  b.outline();
  wallShadow(b, x - 1, y, w + 2, h + 3);
  s.rects = { glass: rectAt(s, gx, gy, gw, gh) };
  return { base: s };
}

export function clock(): BufFurniture {
  if (TACTICAL_THEME) return tClock();
  const s = wallSheet(1);
  const b = s.buf;
  const cx = 8;
  const cy = -21.5;
  b.ellipse(cx, cy, 6.5, 6.5, '#3a3f4b');
  b.ellipse(cx, cy, 5.5, 5.5, '#fbfbf8');
  b.ellipse(cx - 1, cy - 1, 3, 3, '#ffffff');
  // Marcações das horas.
  for (const [dx, dy] of [[0, -5], [5, 0], [0, 4], [-5, 0]] as const) b.set(Math.floor(cx + dx), Math.floor(cy + dy), '#5a6070');
  b.outline();
  wallShadow(b, 1, -29, 14, 14);
  s.rects = { face: rectAt(s, 3, -27, 10, 10) };
  return { base: s };
}

export function poster(variant: string | undefined): BufFurniture {
  if (TACTICAL_THEME) return tPoster(variant);
  const s = wallSheet(1);
  const b = s.buf;
  const x = 2;
  const y = -28;
  const w = 12;
  const h = 16;
  b.rect(x, y, w, h, '#2f3440');
  const ix = x + 1;
  const iy = y + 1;
  const iw = w - 2;
  const ih = h - 2;
  switch (variant ?? 'code') {
    case 'coffee': {
      b.rect(ix, iy, iw, ih, '#f2d7b0');
      b.rect(ix, iy + ih - 4, iw, 4, '#c98a52');
      mug(b, ix + 3, iy + 5, '#e2604f');
      b.set(ix + 4, iy + 3, '#ffffff');
      b.set(ix + 5, iy + 2, '#ffffff');
      b.set(ix + 4, iy + 1, '#ffffff');
      b.hline(ix + 2, ix + 7, iy + ih - 2, '#f4efe2');
      break;
    }
    case 'rocket': {
      b.rect(ix, iy, iw, ih, '#24325a');
      for (const [px, py] of [[1, 2], [8, 1], [6, 5], [2, 9], [9, 8]] as const) b.set(ix + px, iy + py, '#f7e7a1');
      b.rect(ix + 4, iy + 3, 2, 6, '#f4f2ee');
      b.set(ix + 4, iy + 2, '#e05a5a');
      b.set(ix + 5, iy + 2, '#e05a5a');
      b.set(ix + 4, iy + 5, '#5bc0de');
      b.set(ix + 3, iy + 8, '#e05a5a');
      b.set(ix + 6, iy + 8, '#e05a5a');
      b.rect(ix + 4, iy + 9, 2, 2, '#f2a03d');
      b.set(ix + 4, iy + 11, '#f7d154');
      b.hline(ix, ix + iw - 1, iy + ih - 1, '#3b4a7a');
      break;
    }
    case 'cat': {
      b.rect(ix, iy, iw, ih, '#f7c9d4');
      const c = '#3a3f4b';
      b.set(ix + 2, iy + 4, c);
      b.set(ix + 7, iy + 4, c);
      b.rect(ix + 2, iy + 5, 6, 5, c);
      b.set(ix + 3, iy + 7, '#f7d154');
      b.set(ix + 6, iy + 7, '#f7d154');
      b.set(ix + 4, iy + 8, '#e47aa8');
      b.set(ix + 5, iy + 8, '#e47aa8');
      b.hline(ix + 1, ix + 8, iy + ih - 2, '#e47aa8');
      break;
    }
    case 'bug': {
      b.rect(ix, iy, iw, ih, '#f7d154');
      const c = '#3a3f4b';
      b.rect(ix + 3, iy + 5, 4, 5, '#4cae6a');
      b.vline(ix + 5, iy + 5, iy + 9, c);
      b.rect(ix + 4, iy + 3, 2, 2, c);
      for (const dy of [5, 7, 9]) {
        b.set(ix + 2, iy + dy, c);
        b.set(ix + 7, iy + dy, c);
      }
      b.line(ix + 1, iy + 1, ix + 8, iy + 12, '#e05a5a');
      break;
    }
    case 'ship_it': {
      b.rect(ix, iy, iw, ih, '#bfe3f2');
      b.rect(ix, iy + 9, iw, 5, '#3f7fd8');
      b.hline(ix, ix + iw - 1, iy + 9, '#8fc8f0');
      b.rect(ix + 2, iy + 7, 6, 2, '#e05a5a');
      b.hline(ix + 3, ix + 6, iy + 9, '#a83232');
      b.vline(ix + 5, iy + 1, iy + 6, '#6b4a32');
      b.rect(ix + 6, iy + 2, 3, 2, '#f4f2ee');
      b.set(ix + 1, iy + 2, '#f7d154');
      break;
    }
    default: {
      // code: editor escuro com linhas coloridas e "</>".
      b.rect(ix, iy, iw, ih, '#1f2433');
      const cols = ['#ff79c6', '#8be9fd', '#f1fa8c', '#50fa7b', '#bd93f9'];
      for (let i = 0; i < 6; i++) b.hline(ix + 1 + (i % 3), ix + 2 + ((i * 3) % 5) + 2, iy + 1 + i * 2, cols[i % cols.length]);
      break;
    }
  }
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  return { base: s };
}

export function painting(seed: number): BufFurniture {
  if (TACTICAL_THEME) return tPainting(seed);
  const s = wallSheet(2);
  const b = s.buf;
  const fr = ramp('#c89b5c', 0.07);
  const x = 3;
  const y = -27;
  const w = 26;
  const h = 17;
  b.rect(x, y, w, h, fr.base);
  b.hline(x, x + w - 1, y, fr.hi);
  b.vline(x, y, y + h - 1, fr.lt);
  b.vline(x + w - 1, y, y + h - 1, fr.dk);
  b.hline(x, x + w - 1, y + h - 1, fr.dk);
  const ax = x + 2;
  const ay = y + 2;
  const aw = w - 4;
  const ah = h - 4;
  // Paisagem padrão: céu, sol, montanhas e lago.
  const r = rngOf(seed, 41);
  const warm = r() < 0.5;
  for (let i = 0; i < ah; i++) b.hline(ax, ax + aw - 1, ay + i, shade(warm ? '#f6c48a' : '#9fd3f0', -i * 0.012));
  b.ellipse(ax + 15, ay + 3, 2, 2, warm ? '#fff2c2' : '#fffbe6');
  const mt = warm ? '#7a5a8a' : '#5a7fa8';
  for (let i = 0; i < aw; i++) {
    const hh = Math.round(3 + 2.5 * Math.sin(i * 0.55 + seed) + 1.5 * Math.sin(i * 1.3));
    b.vline(ax + i, ay + ah - 4 - hh, ay + ah - 4, mt);
    b.set(ax + i, ay + ah - 4 - hh, shade(mt, 0.15));
  }
  b.rect(ax, ay + ah - 4, aw, 4, warm ? '#4f8a6a' : '#3f7fb0');
  b.hline(ax + 3, ax + 9, ay + ah - 3, 'rgba(255,255,255,0.5)');
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  s.rects = { art: rectAt(s, ax, ay, aw, ah) };
  return { base: s };
}

export function tv(): BufFurniture {
  if (TACTICAL_THEME) return tTv();
  const s = wallSheet(2);
  const b = s.buf;
  const x = 1;
  const y = -27;
  const w = 30;
  const h = 18;
  b.rect(x, y, w, h, '#23262f');
  b.hline(x, x + w - 1, y, '#3a3f4b');
  b.hline(x, x + w - 1, y + h - 1, '#15171d');
  b.rect(x + 1, y + 1, w - 2, h - 3, '#151b26');
  b.line(x + 20, y + 1, x + 12, y + h - 3, 'rgba(255,255,255,0.08)');
  b.line(x + 22, y + 1, x + 14, y + h - 3, 'rgba(255,255,255,0.05)');
  b.set(x + w - 3, y + h - 2, '#e05a5a');
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  s.rects = { tv: rectAt(s, x + 1, y + 1, w - 2, h - 3) };
  return { base: s };
}

export function lightSwitch(variant: string | undefined): BufFurniture {
  if (TACTICAL_THEME) return tLightSwitch(variant);
  const s = wallSheet(1);
  const b = s.buf;
  const on = (variant ?? 'on') === 'on';
  b.rect(6, -19, 5, 7, '#f6f6f3');
  b.hline(6, 10, -19, '#ffffff');
  b.vline(10, -19, -13, '#d3d6dc');
  b.hline(6, 10, -13, '#c9cdd4');
  b.rect(7, -17, 3, 3, on ? '#e9ebee' : '#d5d8de');
  b.hline(7, 9, on ? -17 : -15, on ? '#ffffff' : '#b9bec7');
  b.hline(7, 9, on ? -15 : -17, on ? '#c3c8d0' : '#f4f5f7');
  b.set(8, -18, on ? '#7be08a' : '#9aa1ad');
  b.outline();
  return { base: s };
}

export function elevator(state: number): BufFurniture {
  if (TACTICAL_THEME) return tElevator(state);
  const s = wallSheet(2, 2);
  const b = s.buf;
  const st = Math.max(0, Math.min(4, Math.round(state)));
  const frame = ramp('#aeb6c2', 0.06);
  const door = ramp('#c9d0d9', 0.05);
  // Moldura de aço escovado.
  b.rect(0, -28, 32, 28, frame.base);
  b.hline(0, 31, -28, frame.hi);
  b.vline(0, -28, -1, frame.lt);
  b.vline(31, -28, -1, frame.dk);
  // Painel indicador.
  b.rect(10, -27, 12, 3, '#22262f');
  const lit = st > 0;
  b.set(13, -26, lit ? '#5fd07a' : '#3b4a3f');
  b.set(12, -25, lit ? '#5fd07a' : '#3b4a3f');
  b.set(14, -25, lit ? '#5fd07a' : '#3b4a3f');
  b.rect(16, -26, 4, 1, lit ? '#f2c14e' : '#4a4535');
  // Vão interno (cabine): luz quente, parede de fundo e corrimão.
  const ix = 3;
  const iy = -23;
  const iw = 26;
  const ih = 23;
  b.rect(ix, iy, iw, ih, '#f3e2bf');
  b.rect(ix, iy, iw, 3, '#fff3d6');
  b.rect(ix + 2, iy + 3, iw - 4, ih - 7, '#e4caa0');
  b.hline(ix + 2, ix + iw - 3, iy + 12, '#b9c0ca');
  b.rect(ix, iy + ih - 4, iw, 4, '#b89a72');
  b.hline(ix, ix + iw - 1, iy + ih - 4, '#a5865f');
  // Portas deslizantes: cada folha recua 3px por estado.
  const leaf = 13;
  const open = st * 3;
  const drawLeaf = (x0: number, w: number) => {
    if (w <= 0) return;
    b.rect(x0, iy, w, ih, door.base);
    b.hline(x0, x0 + w - 1, iy, door.hi);
    b.vline(x0, iy, iy + ih - 1, door.lt);
    b.vline(x0 + w - 1, iy, iy + ih - 1, door.dk);
    for (let k = 2; k < w - 1; k += 4) b.vline(x0 + k, iy + 2, iy + ih - 3, 'rgba(255,255,255,0.18)');
  };
  drawLeaf(ix, leaf - open);
  drawLeaf(ix + leaf + open, leaf - open);
  if (st === 0) b.vline(ix + leaf, iy, iy + ih - 1, door.dd);
  // Botoeira lateral.
  b.rect(29, -15, 2, 4, '#22262f');
  b.set(29, -14, lit ? '#f2c14e' : '#6b7282');
  b.set(29, -12, '#6b7282');
  b.outline();
  return { base: s };
}

export function doorFrame(): BufFurniture {
  if (TACTICAL_THEME) return tDoorFrame();
  const s = wallSheet(2, 3);
  const b = s.buf;
  const tr = ramp('#f2f1ed', 0.05);
  // Batentes laterais e verga.
  b.rect(-2, -27, 3, 27, tr.base);
  b.vline(-2, -27, -1, tr.hi);
  b.vline(0, -26, -1, tr.dk);
  b.rect(31, -27, 3, 27, tr.base);
  b.vline(31, -26, -1, tr.dk);
  b.vline(33, -27, -1, tr.dd);
  b.rect(-2, -30, 36, 3, tr.lt);
  b.hline(-2, 33, -30, tr.hi);
  b.hline(1, 30, -27, 'rgba(30,34,52,0.35)');
  b.outline();
  return { base: s };
}

export function sign(): BufFurniture {
  if (TACTICAL_THEME) return tSign();
  const s = wallSheet(3);
  const b = s.buf;
  const x = 3;
  const y = -28;
  const w = 42;
  const h = 11;
  const fr = ramp('#3a4256', 0.07);
  b.rect(x, y, w, h, fr.base);
  b.hline(x, x + w - 1, y, fr.lt);
  b.hline(x, x + w - 1, y + h - 1, fr.dd);
  b.rect(x + 1, y + 1, w - 2, h - 2, '#f7f3e8');
  b.hline(x + 1, x + w - 2, y + 1, '#ffffff');
  b.hline(x + 1, x + w - 2, y + h - 2, '#e6e0cf');
  // Parafusos.
  b.set(x + 2, y + 2, '#b9c0ca');
  b.set(x + w - 3, y + 2, '#b9c0ca');
  b.set(x + 2, y + h - 3, '#b9c0ca');
  b.set(x + w - 3, y + h - 3, '#b9c0ca');
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  s.rects = { sign: rectAt(s, x + 4, y + 2, w - 8, h - 4) };
  return { base: s };
}

export function mirror(): BufFurniture {
  if (TACTICAL_THEME) return tMirror();
  const s = wallSheet(1);
  const b = s.buf;
  const x = 2;
  const y = -28;
  const w = 12;
  const h = 14;
  const fr = ramp('#c3cad4', 0.06);
  b.rect(x, y, w, h, fr.base);
  b.hline(x, x + w - 1, y, fr.hi);
  b.vline(x + w - 1, y, y + h - 1, fr.dk);
  b.rect(x + 1, y + 1, w - 2, h - 2, '#cfe6f2');
  glass(b, x + 1, y + 1, w - 2, h - 2, { alpha: 0.5 });
  b.line(x + 8, y + 1, x + 3, y + h - 2, 'rgba(255,255,255,0.75)');
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  // Vidro (sem a moldura): o mundo pode desenhar ali o reflexo de quem está diante da pia.
  s.rects = { glass: rectAt(s, x + 1, y + 1, w - 2, h - 2) };
  return { base: s };
}

export function shelfWall(seed: number): BufFurniture {
  if (TACTICAL_THEME) return tShelfWall(seed);
  const s = wallSheet(2);
  const b = s.buf;
  const r = rngOf(seed, 51);
  const w = M.oak;
  const plank = (y: number) => {
    b.rect(1, y, 30, 2, w.lt);
    b.hline(1, 30, y, w.hi);
    b.hline(1, 30, y + 1, w.dk);
    for (const x of [4, 26]) b.rect(x, y + 2, 2, 2, '#5a6070');
  };
  // Prateleira de cima: livros + planta; de baixo: caixas, troféu, caneca.
  plank(-19);
  plank(-9);
  let x = 3;
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const bw = 1 + Math.floor(r() * 2);
    const bh = 5 + Math.floor(r() * 3);
    book(b, x, -19 - bh, bw, bh, pick(r, ACCENTS));
    x += bw;
  }
  b.line(x, -20, x + 3, -25, pick(r, ACCENTS));
  b.line(x + 1, -20, x + 4, -25, pick(r, ACCENTS));
  pot(b, 21, -23, 5, 4, M.ceramic);
  foliage(b, 23.5, -25, 3, 2.2, M.leaf, seed + 2);
  b.line(22, -23, 20, -20, M.leaf.dk);
  b.line(25, -23, 27, -19, M.leaf.base);
  // Prateleira de baixo.
  const v = seed % 3;
  if (v === 0) {
    b.rect(3, -14, 6, 5, '#e9e4d6');
    b.hline(3, 8, -14, '#f7f3e8');
    b.rect(4, -12, 4, 1, '#c9bfa6');
    b.rect(11, -13, 3, 2, '#f2c14e');
    b.set(10, -13, '#d9a42e');
    b.set(14, -13, '#d9a42e');
    b.set(12, -11, '#d9a42e');
    b.rect(11, -10, 3, 1, '#6b4a32');
    mug(b, 18, -13, '#3f7fd8');
    smallSucculent(b, 24, -12);
  } else if (v === 1) {
    for (let i = 0; i < 4; i++) book(b, 4 + i * 2, -16, 2, 7, pick(r, ACCENTS));
    b.rect(14, -13, 7, 4, '#c99a5e');
    b.hline(14, 20, -13, '#dcb27a');
    b.rect(23, -15, 4, 6, '#3a3f4b');
    b.rect(24, -14, 2, 2, '#8fc8f0');
  } else {
    smallSucculent(b, 4, -12);
    b.rect(10, -15, 5, 6, '#f4f2ee');
    b.rect(11, -14, 3, 3, '#e47aa8');
    for (let i = 0; i < 3; i++) book(b, 18 + i * 2, -15 + (i % 2), 2, 6 - (i % 2), pick(r, ACCENTS));
  }
  b.outline();
  return { base: s };
}

// ================================================================== tema tático (base de operações)
// Mesmas folhas, âncoras e `rects` das versões de escritório: só muda o desenho.

type Buf = import('../core/pixbuf').PixelBuf;

/** Moldura de aço com bisel e parafusos nos cantos. */
function steelFrame(b: Buf, x: number, y: number, w: number, h: number, m = T.steel, bolts = true): void {
  b.rect(x, y, w, h, m.dk);
  b.hline(x, x + w - 1, y, m.lt);
  b.vline(x, y, y + h - 1, m.base);
  b.vline(x + w - 1, y, y + h - 1, m.dd);
  b.hline(x, x + w - 1, y + h - 1, m.dd);
  if (bolts) for (const [bx, by] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]] as const) b.set(bx, by, m.hi);
}

/** Quadro de briefing: mapa topográfico com grade, curvas de nível e rota (post-its por cima). */
function tWhiteboard(): BufFurniture {
  const s = wallSheet(3);
  const b = s.buf;
  const x = 2;
  const y = -27;
  const w = 44;
  const h = 19;
  steelFrame(b, x, y, w, h, T.black);
  const ix = x + 1;
  const iy = y + 1;
  const iw = w - 2;
  const ih = h - 2;
  b.rect(ix, iy, iw, ih, '#d3ccaa');
  // Grade do mapa.
  for (let gx = ix + 6; gx < ix + iw; gx += 7) b.vline(gx, iy, iy + ih - 1, '#c5bd98');
  for (let gy = iy + 5; gy < iy + ih; gy += 6) b.hline(ix, ix + iw - 1, gy, '#c5bd98');
  // Curvas de nível e rio.
  for (const [cx, cy, r] of [[12, 6, 5], [12, 6, 3], [31, 11, 6], [31, 11, 3]] as const) {
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      b.set(Math.round(ix + cx + Math.cos(t) * r * 1.4), Math.round(iy + cy + Math.sin(t) * r * 0.7), '#a99f74');
    }
  }
  for (let i = 0; i < iw; i++) b.set(ix + i, Math.round(iy + ih - 4 + Math.sin(i * 0.35) * 1.5), '#7fa3b8');
  // Rota tracejada com seta e objetivo.
  const route = [[3, 13], [10, 10], [20, 12], [28, 6], [37, 4]] as const;
  for (let k = 0; k < route.length - 1; k++) {
    const [x0, y0] = route[k];
    const [x1, y1] = route[k + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) if ((i + k) % 3 !== 2) b.set(Math.round(ix + x0 + ((x1 - x0) * i) / n), Math.round(iy + y0 + ((y1 - y0) * i) / n), '#b2402f');
  }
  b.set(ix + 36, iy + 3, '#b2402f');
  b.set(ix + 36, iy + 5, '#b2402f');
  b.rect(ix + 38, iy + 2, 3, 3, SAFETY_ORANGE);
  b.set(ix + 39, iy + 3, '#2b2d2f');
  b.rect(ix + 2, iy + 12, 2, 2, '#4f5a33');
  // Etiqueta da unidade (canto) e bandeja com marcadores.
  b.rect(x + 2, y - 2, 9, 2, T.olive.base);
  b.hline(x + 3, x + 9, y - 2, T.olive.lt);
  b.rect(x + 3, y + h, w - 6, 2, T.steel.base);
  b.hline(x + 3, x + w - 4, y + h, T.steel.lt);
  for (const [i, c] of [[0, '#b2402f'], [3, '#2b2f3b'], [6, '#4f5a33'], [9, SAFETY_ORANGE]] as const) b.rect(x + 8 + i, y + h - 1, 2, 1, c);
  b.rect(x + w - 14, y + h - 2, 5, 2, '#2f3336');
  b.hline(x + w - 14, x + w - 10, y + h - 2, T.khaki.lt);
  b.outline();
  wallShadow(b, x - 1, y - 3, w + 2, h + 5);
  s.rects = { board: rectAt(s, x + 2, y + 2, w - 4, h - 4) };
  return { base: s };
}

/** Janela gradeada com moldura de aço e caixa de persiana metálica (o céu continua no vidro). */
function tWindow(): BufFurniture {
  const s = wallSheet(2);
  const b = s.buf;
  const fr = T.steel;
  const x = 2;
  const y = -27;
  const w = 28;
  const h = 19;
  // Caixa da persiana de aço (acima da moldura).
  b.rect(x - 1, y - 3, w + 2, 3, fr.base);
  b.hline(x - 1, x + w, y - 3, fr.lt);
  b.hline(x - 1, x + w, y - 1, fr.dd);
  for (let k = x + 2; k < x + w - 1; k += 4) b.set(k, y - 2, fr.dk);
  // Moldura.
  b.rect(x, y, w, 2, fr.lt);
  b.rect(x, y + h - 2, w, 2, fr.base);
  b.rect(x, y, 2, h, fr.lt);
  b.rect(x + w - 2, y, 2, h, fr.base);
  b.hline(x, x + w - 1, y, fr.hi);
  b.vline(x + w - 1, y, y + h - 1, fr.dk);
  b.rect(x + 13, y + 2, 2, h - 4, fr.base);
  b.vline(x + 14, y + 2, y + h - 3, fr.dk);
  const gx = x + 2;
  const gy = y + 2;
  const gw = w - 4;
  const gh = h - 4;
  for (const off of [3, 16]) b.line(gx + off + 6, gy, gx + off, gy + gh - 1, 'rgba(255,255,255,0.18)');
  // Grade: barras verticais e travessa.
  for (const bx of [gx + 3, gx + 7, gx + 15, gx + 19]) {
    b.vline(bx, gy, gy + gh - 1, '#3e4347');
    b.vline(bx + 1, gy, gy + gh - 1, 'rgba(20,24,26,0.35)');
  }
  b.hline(gx, gx + gw - 1, gy + 7, '#3e4347');
  // Peitoril de chapa.
  b.rect(x - 1, y + h, w + 2, 2, fr.lt);
  b.hline(x - 1, x + w, y + h, fr.hi);
  b.hline(x - 1, x + w, y + h + 1, fr.dk);
  b.outline();
  wallShadow(b, x - 1, y - 3, w + 2, h + 6);
  s.rects = { glass: rectAt(s, gx, gy, gw, gh) };
  return { base: s };
}

/** Relógio militar: aro preto grosso, mostrador cáqui-claro com 12 marcas. */
function tClock(): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const cx = 8;
  const cy = -21.5;
  b.ellipse(cx, cy, 7, 7, '#23262a');
  b.ellipse(cx, cy, 6, 6, '#3a3f3a');
  b.ellipse(cx, cy, 5.5, 5.5, '#ece6d0');
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    const r = k % 3 === 0 ? 4.6 : 5;
    b.set(Math.floor(cx + Math.sin(t) * r), Math.floor(cy - Math.cos(t) * r), k % 3 === 0 ? '#23262a' : '#8a8670');
  }
  b.set(7, -26, SAFETY_ORANGE);
  b.outline();
  wallShadow(b, 0, -30, 16, 16);
  s.rects = { face: rectAt(s, 3, -27, 10, 10) };
  return { base: s };
}

/** Cartazes táticos genéricos (insígnia inventada, hidratação, ponto de reunião, segurança, alvo, rádio). */
function tPoster(variant: string | undefined): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const x = 2;
  const y = -28;
  const w = 12;
  const h = 16;
  b.rect(x, y, w, h, '#2b2f2a');
  const ix = x + 1;
  const iy = y + 1;
  const iw = w - 2;
  const ih = h - 2;
  const K = '#23262a';
  switch (variant ?? 'code') {
    case 'coffee': {
      // Hidratação: cantil oliva com tampa e gotas.
      b.rect(ix, iy, iw, ih, T.khaki.lt);
      b.rect(ix + 3, iy + 1, 3, 2, K);
      b.rect(ix + 2, iy + 3, 5, 7, T.olive.base);
      b.vline(ix + 2, iy + 4, iy + 8, T.olive.lt);
      b.vline(ix + 6, iy + 4, iy + 9, T.olive.dd);
      b.hline(ix + 2, ix + 6, iy + 6, T.olive.dd);
      for (const [px, py] of [[8, 3], [8, 6], [7, 9]] as const) b.set(ix + px, iy + py, '#4f8fb8');
      stencilMarks(b, ix + 1, iy + ih - 3, iw - 2, K, 1);
      break;
    }
    case 'rocket': {
      // Ponto de reunião: seta de estêncil amarela sobre preto.
      b.rect(ix, iy, iw, ih, K);
      stencilArrow(b, ix + 1, iy + 3, 8, SAFETY_YELLOW);
      b.rect(ix + 3, iy + 9, 4, 3, SAFETY_YELLOW);
      b.rect(ix + 4, iy + 10, 2, 1, K);
      b.hline(ix, ix + iw - 1, iy + ih - 1, SAFETY_YELLOW);
      break;
    }
    case 'cat': {
      // Segurança primeiro: triângulo de alerta e faixa zebrada.
      b.rect(ix, iy, iw, ih, SAFETY_YELLOW);
      for (let r = 0; r < 7; r++) b.hline(ix + 5 - Math.ceil(r * 0.7), ix + 4 + Math.ceil(r * 0.7), iy + 2 + r, K);
      b.vline(ix + 4, iy + 4, iy + 6, SAFETY_YELLOW);
      b.vline(ix + 5, iy + 4, iy + 6, SAFETY_YELLOW);
      b.set(ix + 4, iy + 8, SAFETY_YELLOW);
      b.set(ix + 5, iy + 8, SAFETY_YELLOW);
      hazard(b, ix, iy + ih - 3, iw, 3, 4, SAFETY_YELLOW, K);
      break;
    }
    case 'bug': {
      // Alvo de estande (anéis concêntricos).
      b.rect(ix, iy, iw, ih, T.khaki.hi);
      b.ellipse(ix + 4.5, iy + 6, 4.5, 4.5, K);
      b.ellipse(ix + 4.5, iy + 6, 3.5, 3.5, T.khaki.hi);
      b.ellipse(ix + 4.5, iy + 6, 2.5, 2.5, K);
      b.ellipse(ix + 4.5, iy + 6, 1.3, 1.3, '#b2402f');
      b.set(ix + 1, iy + ih - 2, '#b2402f');
      b.set(ix + 3, iy + ih - 3, '#b2402f');
      stencilMarks(b, ix + 5, iy + ih - 2, 4, K, 3);
      break;
    }
    case 'ship_it': {
      // Comunicações: rádio com ondas.
      b.rect(ix, iy, iw, ih, T.oliveDark.base);
      b.rect(ix + 2, iy + 4, 4, 7, K);
      b.vline(ix + 5, iy + 1, iy + 3, K);
      b.set(ix + 3, iy + 5, '#7be08a');
      for (let yy = iy + 7; yy <= iy + 9; yy += 2) b.hline(ix + 3, ix + 4, yy, '#4a5054');
      b.vline(ix + 7, iy + 3, iy + 5, STENCIL);
      b.vline(ix + 8, iy + 2, iy + 6, STENCIL);
      b.set(ix + 7, iy + 2, STENCIL);
      stencilMarks(b, ix + 1, iy + ih - 2, iw - 2, STENCIL, 2);
      break;
    }
    default: {
      // Insígnia de unidade inventada: escudo cáqui com divisas e estrela de 4 pontas.
      b.rect(ix, iy, iw, ih, T.olive.base);
      const sh = ['11111111', '11111111', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000'];
      b.stamp(sh.map((r) => r.replace(/1/g, 'k').replace(/0/g, '.')), ix + 1, iy + 2, { k: T.khaki.base });
      b.hline(ix + 1, ix + 8, iy + 2, T.khaki.lt);
      for (const dy of [4, 6]) {
        b.line(ix + 2, iy + dy + 2, ix + 4, iy + dy, K);
        b.line(ix + 5, iy + dy, ix + 7, iy + dy + 2, K);
      }
      b.set(ix + 4, iy + 3, K);
      b.set(ix + 5, iy + 3, K);
      stencilMarks(b, ix + 1, iy + ih - 2, iw - 2, STENCIL, 4);
      break;
    }
  }
  // Fita adesiva nos cantos de cima.
  b.set(x, y, T.khaki.lt);
  b.set(x + w - 1, y, T.khaki.lt);
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  return { base: s };
}

/** Quadro com moldura de aço rebitada; paisagem padrão de deserto/serra (pode virar imagem). */
function tPainting(seed: number): BufFurniture {
  const s = wallSheet(2);
  const b = s.buf;
  const x = 3;
  const y = -27;
  const w = 26;
  const h = 17;
  steelFrame(b, x, y, w, h, T.steel);
  const ax = x + 2;
  const ay = y + 2;
  const aw = w - 4;
  const ah = h - 4;
  const r = rngOf(seed, 41);
  const desert = r() < 0.5;
  for (let i = 0; i < ah; i++) b.hline(ax, ax + aw - 1, ay + i, shade(desert ? '#e6c48e' : '#a9c2cf', -i * 0.012));
  b.ellipse(ax + 15, ay + 3, 2, 2, desert ? '#fff0c8' : '#f4f6ee');
  const mt = desert ? '#a87a50' : '#5f6b4a';
  for (let i = 0; i < aw; i++) {
    const hh = Math.round(3 + 2.5 * Math.sin(i * 0.55 + seed) + 1.5 * Math.sin(i * 1.3));
    b.vline(ax + i, ay + ah - 4 - hh, ay + ah - 4, mt);
    b.set(ax + i, ay + ah - 4 - hh, shade(mt, 0.15));
  }
  b.rect(ax, ay + ah - 4, aw, 4, desert ? '#c9a06a' : '#6b7446');
  b.hline(ax + 3, ax + 9, ay + ah - 3, desert ? '#d9b47e' : '#7d8656');
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  s.rects = { art: rectAt(s, ax, ay, aw, ah) };
  return { base: s };
}

/** Monitor de parede em caixa robusta: cantoneiras, parafusos e barra de LEDs. */
function tTv(): BufFurniture {
  const s = wallSheet(2);
  const b = s.buf;
  const x = 1;
  const y = -27;
  const w = 30;
  const h = 18;
  b.rect(x - 1, y - 1, w + 2, h + 2, '#2b2f2a');
  b.hline(x - 1, x + w, y - 1, '#454b44');
  b.rect(x + 1, y + 1, w - 2, h - 3, '#121a16');
  b.line(x + 20, y + 1, x + 12, y + h - 3, 'rgba(255,255,255,0.07)');
  // Cantoneiras oliva.
  for (const [cx, cy] of [[x - 2, y - 2], [x + w - 1, y - 2], [x - 2, y + h - 1], [x + w - 1, y + h - 1]] as const) {
    b.rect(cx, cy, 3, 3, T.olive.base);
    b.set(cx + 1, cy + 1, T.olive.hi);
  }
  // Barra inferior com LEDs.
  b.set(x + w - 4, y + h - 2, '#7be08a');
  b.set(x + w - 6, y + h - 2, SAFETY_ORANGE);
  stencilMarks(b, x + 4, y + h - 2, 8, '#5a6058', 1);
  b.outline();
  wallShadow(b, x - 2, y - 2, w + 4, h + 4);
  s.rects = { tv: rectAt(s, x + 1, y + 1, w - 2, h - 3) };
  return { base: s };
}

/** Caixa de interruptor industrial: conduíte, alavanca e luz de estado. */
function tLightSwitch(variant: string | undefined): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const on = (variant ?? 'on') === 'on';
  const m = T.steel;
  // Conduíte subindo até o teto.
  b.rect(7, -31, 2, 11, m.base);
  b.vline(7, -31, -21, m.lt);
  b.rect(6, -25, 4, 1, m.dk);
  // Caixa.
  b.rect(5, -20, 7, 9, m.base);
  b.hline(5, 11, -20, m.hi);
  b.vline(11, -20, -12, m.dd);
  b.hline(5, 11, -12, m.dd);
  b.set(6, -19, m.dk);
  b.set(10, -13, m.dk);
  // Alavanca (para cima = ligado).
  b.rect(7, -17, 3, 3, '#2f3336');
  if (on) b.rect(8, -19, 1, 3, SAFETY_ORANGE);
  else b.rect(8, -15, 1, 3, SAFETY_ORANGE);
  b.set(10, -18, on ? '#7be08a' : '#6b4a3a');
  b.outline();
  return { base: s };
}

/** Elevador de carga: batentes com faixa de alerta, portas de chapa nervurada, cabine industrial. */
function tElevator(state: number): BufFurniture {
  const s = wallSheet(2, 2);
  const b = s.buf;
  const st = Math.max(0, Math.min(4, Math.round(state)));
  const frame = T.steel;
  const door = T.steelLight;
  b.rect(0, -28, 32, 28, frame.base);
  b.hline(0, 31, -28, frame.hi);
  // Painel indicador.
  b.rect(10, -27, 12, 3, '#1b1f1b');
  const lit = st > 0;
  b.set(13, -26, lit ? '#5fd07a' : '#3b4a3f');
  b.set(12, -25, lit ? '#5fd07a' : '#3b4a3f');
  b.set(14, -25, lit ? '#5fd07a' : '#3b4a3f');
  b.rect(16, -26, 4, 1, lit ? SAFETY_ORANGE : '#4a4535');
  rivets(b, [[2, -27], [28, -27]], frame);
  // Cabine: paredes de chapa, luz fria e piso xadrez.
  const ix = 3;
  const iy = -23;
  const iw = 26;
  const ih = 23;
  b.rect(ix, iy, iw, ih, '#5a6168');
  b.rect(ix, iy, iw, 2, '#d8e0d0');
  b.rect(ix + 2, iy + 2, iw - 4, ih - 6, '#6b737a');
  for (let k = iy + 6; k < iy + ih - 4; k += 5) b.hline(ix + 2, ix + iw - 3, k, '#565d63');
  diamondPlate(b, ix, iy + ih - 4, iw, 4, T.steel);
  // Portas deslizantes: cada folha recua 3px por estado.
  const leaf = 13;
  const open = st * 3;
  const drawLeaf = (x0: number, w: number) => {
    if (w <= 0) return;
    b.rect(x0, iy, w, ih, door.base);
    b.hline(x0, x0 + w - 1, iy, door.hi);
    b.vline(x0, iy, iy + ih - 1, door.lt);
    b.vline(x0 + w - 1, iy, iy + ih - 1, door.dk);
    for (let k = iy + 3; k < iy + ih - 3; k += 4) b.hline(x0 + 1, x0 + w - 2, k, door.dk);
    hazard(b, x0, iy + ih - 3, w, 2, 4);
  };
  drawLeaf(ix, leaf - open);
  drawLeaf(ix + leaf + open, leaf - open);
  if (st === 0) b.vline(ix + leaf, iy, iy + ih - 1, door.dd);
  // Batentes com faixa de alerta.
  hazard(b, 0, -23, 3, 23, 4);
  hazard(b, 29, -23, 3, 23, 4);
  // Botoeira lateral.
  b.rect(29, -15, 2, 4, '#1b1f1b');
  b.set(29, -14, lit ? SAFETY_ORANGE : '#6b7282');
  b.set(29, -12, '#6b7282');
  b.outline();
  return { base: s };
}

/** Batente de aço com faixas de alerta nas laterais e verga rebitada. */
function tDoorFrame(): BufFurniture {
  const s = wallSheet(2, 3);
  const b = s.buf;
  const m = T.steel;
  hazard(b, -2, -27, 3, 27, 4);
  b.vline(0, -26, -1, 'rgba(20,22,24,0.35)');
  hazard(b, 31, -27, 3, 27, 4);
  b.vline(33, -27, -1, '#2b2d2f');
  b.rect(-2, -30, 36, 3, m.base);
  b.hline(-2, 33, -30, m.hi);
  b.hline(-2, 33, -28, m.dk);
  rivets(b, [[0, -29], [15, -29], [31, -29]], m);
  b.hline(1, 30, -27, 'rgba(30,34,52,0.35)');
  b.outline();
  return { base: s };
}

/** Placa de chapa com estêncil: campo oliva liso para o nome e pontas zebradas. */
function tSign(): BufFurniture {
  const s = wallSheet(3);
  const b = s.buf;
  const x = 3;
  const y = -28;
  const w = 42;
  const h = 11;
  steelFrame(b, x, y, w, h, T.steel, false);
  b.rect(x + 1, y + 1, w - 2, h - 2, '#4a5530');
  b.hline(x + 1, x + w - 2, y + 1, '#56623a');
  hazard(b, x + 1, y + 1, 3, h - 2, 4);
  hazard(b, x + w - 4, y + 1, 3, h - 2, 4);
  for (const [bx, by] of [[x + 5, y + 2], [x + w - 6, y + 2], [x + 5, y + h - 3], [x + w - 6, y + h - 3]] as const) b.set(bx, by, T.steel.lt);
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  s.rects = { sign: rectAt(s, x + 4, y + 2, w - 8, h - 4) };
  return { base: s };
}

/** Espelho de aço polido com moldura parafusada. */
function tMirror(): BufFurniture {
  const s = wallSheet(1);
  const b = s.buf;
  const x = 2;
  const y = -28;
  const w = 12;
  const h = 14;
  steelFrame(b, x, y, w, h, T.steel);
  b.rect(x + 1, y + 1, w - 2, h - 2, '#c4d2d8');
  glass(b, x + 1, y + 1, w - 2, h - 2, { alpha: 0.4 });
  b.line(x + 8, y + 1, x + 3, y + h - 2, 'rgba(255,255,255,0.6)');
  for (const [bx, by] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]] as const) b.set(bx, by, T.steel.hi);
  b.outline();
  wallShadow(b, x - 1, y - 1, w + 2, h + 2);
  s.rects = { glass: rectAt(s, x + 1, y + 1, w - 2, h - 2) };
  return { base: s };
}

/** Capacete tático visto de frente (domo + aba). */
function helmet(b: Buf, x: number, y: number, m = T.olive): void {
  b.hline(x + 2, x + 4, y, m.lt);
  b.hline(x + 1, x + 5, y + 1, m.lt);
  b.rect(x, y + 2, 7, 2, m.base);
  b.set(x + 2, y + 1, m.hi);
  b.hline(x - 1, x + 7, y + 4, m.dd);
  b.set(x + 5, y + 2, '#2f3336');
}

/** Rádio portátil com antena, LED e grade. */
function radio(b: Buf, x: number, y: number, led = '#7be08a'): void {
  b.rect(x, y, 3, 6, '#2b2f2a');
  b.vline(x + 2, y - 4, y - 1, '#2b2f2a');
  b.set(x + 1, y + 1, led);
  b.set(x + 1, y + 3, '#4a5054');
  b.set(x + 1, y + 4, '#4a5054');
}

/** Prateleira de equipamentos: grade de aço com capacetes, rádios e caixas de material. */
function tShelfWall(seed: number): BufFurniture {
  const s = wallSheet(2);
  const b = s.buf;
  const m = T.steel;
  const plank = (y: number) => {
    b.rect(1, y, 30, 2, m.lt);
    b.hline(1, 30, y, m.hi);
    b.hline(1, 30, y + 1, m.dk);
    for (let x = 3; x < 30; x += 3) b.set(x, y + 1, m.dd);
    for (const x of [4, 26]) {
      b.rect(x, y + 2, 2, 1, '#2f3336');
      b.set(x, y + 3, '#2f3336');
    }
  };
  plank(-19);
  plank(-9);
  // Prateleira de cima: dois capacetes e um rádio.
  helmet(b, 3, -24, T.olive);
  helmet(b, 12, -24, seed % 2 ? T.coyote : T.olive);
  radio(b, 22, -25, seed === 1 ? SAFETY_ORANGE : '#7be08a');
  b.rect(26, -21, 3, 2, '#3e4347');
  b.set(28, -21, SAFETY_YELLOW);
  // Prateleira de baixo (varia com a seed).
  const v = seed % 3;
  if (v === 0) {
    // Caixa de material oliva com alça + cantil.
    b.rect(3, -14, 8, 5, T.olive.base);
    b.hline(3, 10, -14, T.olive.lt);
    b.hline(5, 8, -15, '#2f3336');
    stencilMarks(b, 4, -12, 6, STENCIL, 1);
    b.rect(14, -13, 4, 4, T.oliveDark.base);
    b.rect(15, -14, 2, 1, '#2f3336');
    b.rect(21, -12, 6, 3, '#2f3336');
    b.set(22, -11, '#f2e6a8');
  } else if (v === 1) {
    // Rádios na base de carga.
    b.rect(3, -11, 16, 2, '#2f3336');
    for (let i = 0; i < 4; i++) radio(b, 4 + i * 4, -16, i % 2 ? '#7be08a' : SAFETY_ORANGE);
    b.rect(21, -14, 7, 5, T.coyote.base);
    b.hline(21, 27, -14, T.coyote.lt);
    stencilMarks(b, 22, -12, 5, STENCIL_DARK, 2);
  } else {
    // Rolo de corda, baterias e óculos de proteção.
    b.ellipse(7, -12, 3.5, 2.5, T.coyote.base);
    b.ellipse(7, -12, 1.5, 1, T.coyote.dd);
    for (let i = 0; i < 3; i++) {
      b.rect(13 + i * 3, -13, 2, 4, SAFETY_YELLOW);
      b.hline(13 + i * 3, 14 + i * 3, -10, '#2f3336');
    }
    b.rect(23, -12, 6, 2, '#2f3336');
    b.set(24, -12, '#9fb4bf');
    b.set(27, -12, '#9fb4bf');
  }
  b.outline();
  return { base: s };
}
