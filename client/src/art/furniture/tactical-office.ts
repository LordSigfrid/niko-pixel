// Versão tática (base de operações) dos móveis das salas de projeto: mesa de campanha com monitor
// robusto, cadeira de lona dobrável, racks de suprimentos, armário de equipamento, estação de rádio,
// tambor, sacos de areia, barris/rede de camuflagem/torre de caixotes/suporte de colete, barreira de
// concreto com alambrado, mesa de briefing, caixote-banco, refletor de tripé e galões de água.
// Mesmo footprint, âncora, `rects`, variantes e sementes dos equivalentes em office.ts.
import { mix, ramp, shade, type Ramp } from '../core/color';
import type { PixelBuf } from '../core/pixbuf';
import { floorSheet, rectAt, type BufFurniture, type BufSprite } from '../core/sprite';
import { SCREEN_BG, contact, frontFace, pick, rngOf, topFace, underRect, woodGrain, type Rng } from './kit';

type Box = { x: number; y: number; w: number; h: number };

/** Materiais táticos. */
const T = {
  olive: ramp('#5f6b3d', 0.07),
  oliveDark: ramp('#454d2c', 0.07),
  khaki: ramp('#b39a6a', 0.06),
  coyote: ramp('#8a6a4c', 0.07),
  steel: ramp('#7d848c', 0.07),
  steelLt: ramp('#a7adb3', 0.05),
  black: ramp('#36393e', 0.07),
  plywood: ramp('#c4a775', 0.06),
  crate: ramp('#9a7a52', 0.07),
  concrete: ramp('#a9a69c', 0.05),
  water: ramp('#4a7394', 0.07),
  orange: ramp('#e8762c', 0.07),
} as const;
const YELLOW = '#e3b23c';
const STENCIL = '#e8dfc4';
const SHADOW = 'rgba(40,36,30,0.25)';

// ------------------------------------------------------------------ pequenos objetos táticos

/** Caixa de munição (lata metálica com alça e estêncil amarelo). */
function ammoCan(b: PixelBuf, x: number, y: number, w: number, h: number, m: Ramp = T.olive): void {
  topFace(b, x, y, w, 2, m);
  frontFace(b, x, y + 2, w, h - 2, m);
  b.hline(x + 1, x + w - 2, y, m.dd);
  b.hline(x + 2, x + w - 3, y - 1, m.dk);
  if (h > 4) b.hline(x + 1, x + Math.min(w - 2, 3), y + 3, YELLOW);
  b.set(x + w - 2, y + 2, m.dd);
}

/** Caixote de madeira com ripas e cantoneiras escuras. */
function crate(b: PixelBuf, x: number, y: number, w: number, h: number, m: Ramp = T.crate, stencil = true): void {
  const th = Math.max(2, Math.min(4, Math.floor(h / 3)));
  topFace(b, x, y, w, th, m);
  for (let xx = x + 3; xx < x + w - 1; xx += 4) b.vline(xx, y, y + th - 2, m.base);
  frontFace(b, x, y + th, w, h - th, m);
  for (let yy = y + th + 2; yy < y + h - 1; yy += 3) b.hline(x, x + w - 1, yy, m.dk);
  b.vline(x, y + th, y + h - 1, m.dd);
  b.vline(x + w - 1, y + th, y + h - 1, m.dd);
  b.hline(x, x + w - 1, y + th, m.lt);
  if (stencil && w >= 7 && h - th >= 4) {
    const sx = x + Math.floor(w / 2) - 1;
    const sy = y + th + Math.floor((h - th) / 2) - 1;
    b.hline(sx, sx + 2, sy, STENCIL);
    b.set(sx + 1, sy + 1, STENCIL);
  }
}

/** Saco de areia (cantos arredondados, amarras nas pontas). */
function sandbag(b: PixelBuf, x: number, y: number, w: number, h: number, m: Ramp): void {
  b.rect(x + 1, y, w - 2, h, m.base);
  b.rect(x, y + 1, w, h - 2, m.base);
  b.hline(x + 1, x + w - 2, y, m.lt);
  b.hline(x + 2, x + w - 3, y + 1, m.hi);
  b.hline(x + 1, x + w - 2, y + h - 1, m.dk);
  b.vline(x + w - 1, y + 1, y + h - 2, m.dk);
  b.set(x, y + Math.floor(h / 2), m.dd);
  b.set(x + w - 1, y + Math.floor(h / 2), m.dd);
  if (w > 5) b.set(x + Math.floor(w / 2), y + Math.floor(h / 2), m.dk);
}

/** Capacete visto de frente (cúpula com aba). */
function helmet(b: PixelBuf, cx: number, y: number, m: Ramp = T.olive, w = 8): void {
  const r = w / 2;
  b.ellipse(cx, y + 3, r, 3, m.base);
  b.rect(cx - r, y + 3, w, 1, m.base);
  b.hline(Math.floor(cx - r) - 1, Math.floor(cx + r), y + 4, m.dk);
  b.set(Math.floor(cx - r / 2), y + 1, m.hi);
  b.set(Math.floor(cx - r / 2) + 1, y + 1, m.lt);
  b.hline(Math.floor(cx - r) + 1, Math.floor(cx + r) - 2, y + 3, m.dk);
}

/** Galão (jerrycan) de frente: alça tripla, "X" estampado. */
function jerrycan(b: PixelBuf, x: number, y: number, w: number, h: number, m: Ramp): void {
  b.rect(x, y + 2, w, h - 2, m.base);
  b.vline(x, y + 2, y + h - 1, m.lt);
  b.vline(x + w - 1, y + 2, y + h - 1, m.dk);
  b.hline(x, x + w - 1, y + h - 1, m.dk);
  // Alça e bocal.
  b.hline(x + 1, x + w - 2, y, m.dk);
  b.set(x + 1, y + 1, m.dk);
  b.set(x + w - 2, y + 1, m.dk);
  b.set(x + Math.floor(w / 2), y + 1, m.dk);
  b.set(x + w - 1, y + 1, T.black.base);
  // X estampado.
  if (h >= 7 && w >= 5) {
    const x0 = x + 1;
    const x1 = x + w - 2;
    const y0 = y + 3;
    const y1 = y + h - 2;
    b.line(x0, y0, x1, y1, m.hi);
    b.line(x1, y0, x0, y1, m.hi);
  }
}

/** Mapa tático dobrado (cáqui com manchas de terreno, rio e marcador). */
function foldedMap(b: PixelBuf, x: number, y: number, w = 6, h = 4): void {
  b.hline(x + 1, x + w, y + h, SHADOW);
  b.rect(x, y, w, h, '#d9cba0');
  b.rect(x + 1, y + 1, Math.max(1, Math.floor(w / 2) - 1), Math.max(1, h - 2), '#9fae78');
  b.line(x, y + h - 1, x + w - 1, y + 1, '#6f9cbc');
  b.vline(x + Math.floor(w / 2), y, y + h - 1, '#bfae82');
  b.set(x + w - 2, y + h - 2, '#d24a3a');
}

/** Cantil verde com tampa preta. */
function canteen(b: PixelBuf, x: number, y: number): void {
  b.hline(x + 1, x + 3, y + 4, SHADOW);
  b.set(x + 1, y, T.black.base);
  b.rect(x, y + 1, 3, 3, T.olive.base);
  b.set(x, y + 1, T.olive.lt);
  b.vline(x + 2, y + 1, y + 3, T.olive.dk);
}

/** Caneca de lata (aço) com café. */
function tinCup(b: PixelBuf, x: number, y: number): void {
  b.hline(x + 1, x + 3, y + 3, SHADOW);
  b.hline(x, x + 2, y, '#c9ced3');
  b.set(x + 1, y, '#4a3020');
  b.rect(x, y + 1, 3, 2, T.steel.lt);
  b.set(x + 2, y + 2, T.steel.dk);
  b.set(x + 3, y + 1, T.steel.dk);
}

/** Rádio portátil (HT) deitado, com antena curta e LED. */
function handset(b: PixelBuf, x: number, y: number): void {
  b.hline(x + 1, x + 3, y + 3, SHADOW);
  b.rect(x, y, 3, 3, T.black.base);
  b.set(x, y, T.black.lt);
  b.set(x + 2, y, '#7fe07a');
  b.vline(x + 1, y - 2, y - 1, T.black.dk);
}

/** Lanterna tática deitada. */
function flashlight(b: PixelBuf, x: number, y: number): void {
  b.hline(x + 1, x + 5, y + 2, SHADOW);
  b.rect(x, y, 5, 2, T.black.base);
  b.hline(x, x + 3, y, T.black.lt);
  b.vline(x + 5, y - 1, y + 2, T.black.dd);
  b.set(x + 6, y, '#fff2b8');
  b.set(x + 6, y + 1, '#f2d77a');
}

/** Bússola de campo. */
function compass(b: PixelBuf, x: number, y: number): void {
  b.hline(x + 1, x + 4, y + 4, SHADOW);
  b.rect(x, y, 4, 4, T.olive.dk);
  b.rect(x + 1, y + 1, 2, 2, '#e8e2cc');
  b.set(x + 2, y + 1, '#d24a3a');
}

/** Teclado robusto (escuro, emborrachado). */
function ruggedKeyboard(b: PixelBuf, x: number, y: number, w = 10): void {
  b.hline(x + 1, x + w, y + 3, SHADOW);
  b.rect(x, y, w, 3, '#3a3f45');
  for (let i = 0; i < w - 1; i += 2) {
    b.set(x + 1 + i, y, '#5a6168');
    b.set(x + i, y + 1, '#5a6168');
  }
  b.hline(x, x + w - 1, y + 2, '#24272b');
}

function trackball(b: PixelBuf, x: number, y: number): void {
  b.hline(x + 1, x + 2, y + 2, SHADOW);
  b.rect(x, y, 2, 2, '#3a3f45');
  b.set(x, y, '#8a6a4c');
}

/**
 * Monitor robusto de frente: moldura grossa verde-oliva escura, para-choques de borracha nos cantos,
 * alças laterais e de transporte, pés curtos. Tela = mesmo retângulo do monitor comum (1px de inset).
 */
function ruggedMonitor(b: PixelBuf, x: number, y: number, w = 16, h = 11): Box {
  const frame = ramp('#3d4430', 0.07);
  b.hline(x + 3, x + w - 2, y + h + 3, SHADOW);
  // Alça de transporte no topo.
  b.hline(x + 4, x + w - 5, y - 2, T.black.base);
  b.set(x + 4, y - 1, T.black.base);
  b.set(x + w - 5, y - 1, T.black.base);
  // Alças laterais.
  b.vline(x - 1, y + 2, y + h - 3, T.steel.base);
  b.vline(x + w, y + 2, y + h - 3, T.steel.dk);
  b.rect(x, y, w, h, frame.base);
  b.hline(x, x + w - 1, y, frame.lt);
  b.vline(x, y, y + h - 1, frame.lt);
  b.hline(x, x + w - 1, y + h - 1, frame.dd);
  for (const [cx, cy] of [[x, y], [x + w - 2, y], [x, y + h - 2], [x + w - 2, y + h - 2]] as const) {
    b.rect(cx, cy, 2, 2, '#25282c');
  }
  b.set(x, y, '#3a3e44');
  const sx = x + 1;
  const sy = y + 1;
  const sw = w - 2;
  const sh = h - 2;
  b.rect(sx, sy, sw, sh, SCREEN_BG);
  b.rect(sx, sy, sw, 1, '#2a3d5f');
  for (let i = 0; i < sh; i++) b.set(sx + sw - 3 - i, sy + i, '#2f4569');
  b.set(x + w - 3, y + h - 1, '#7fe07a');
  b.set(x + 2, y + h - 1, YELLOW);
  // Pés dobráveis.
  const cx = x + Math.floor(w / 2) - 1;
  b.rect(cx - 3, y + h, 1, 2, T.black.base);
  b.rect(cx + 4, y + h, 1, 2, T.black.base);
  b.hline(cx - 4, cx + 5, y + h + 2, T.black.lt);
  return { x: sx, y: sy, w: sw, h: sh };
}

/** Telas estáticas táticas (sempre "ligadas", um pouco mais escuras que a principal). */
type TacScreen = 'map' | 'radar' | 'term';

function tacScreen(b: PixelBuf, r: Box, kind: TacScreen, seed: number): void {
  const { x, y, w, h } = r;
  const rnd = rngOf(seed, 43);
  if (kind === 'map') {
    // Mapa topográfico: terreno, curvas de nível, rio e marcadores.
    b.rect(x, y, w, h, '#5d6b45');
    for (let k = 0; k < 3; k++) {
      const cx = x + Math.floor(rnd() * w);
      const cy = y + Math.floor(rnd() * h);
      b.ellipse(cx, cy, 2 + rnd() * 2, 1 + rnd() * 1.5, '#7a8758');
      b.set(cx, cy, '#98a36c');
    }
    b.line(x, y + h - 2, x + w - 1, y + 1, '#4f84a8');
    b.set(x + Math.floor(w / 3), y + Math.floor(h / 2), '#e2604f');
    b.set(x + Math.floor((2 * w) / 3), y + 1, '#f0d060');
    return;
  }
  if (kind === 'radar') {
    b.rect(x, y, w, h, '#173524');
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    b.hline(x, x + w - 1, cy, '#2f6e45');
    b.vline(cx, y, y + h - 1, '#2f6e45');
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      b.set(Math.round(cx + Math.cos(t) * (w / 2 - 1)), Math.round(cy + Math.sin(t) * (h / 2 - 0.5)), '#3f8a58');
    }
    b.line(cx, cy, x + w - 2, y + 1, '#7fe08f');
    for (let k = 0; k < 2; k++) b.set(x + 1 + Math.floor(rnd() * (w - 2)), y + Math.floor(rnd() * h), '#e0f07a');
    return;
  }
  // Terminal verde.
  b.rect(x, y, w, h, '#18261c');
  for (let yy = y + 1; yy < y + h; yy += 2) {
    const len = 1 + Math.floor(rnd() * (w - 3));
    b.hline(x + 1, x + len, yy, rnd() < 0.2 ? '#e3b23c' : '#5fc77a');
  }
}

// ------------------------------------------------------------------ mesas

interface DeskMats {
  top: Ramp;
  edge: Ramp;
  legs: Ramp;
  apron: Ramp;
  kind: 'steel' | 'plywood' | 'olive';
}

function deskMats(variant: string | undefined): DeskMats {
  switch (variant) {
    case 'white':
      return { top: T.steelLt, edge: ramp('#6d747b', 0.07), legs: T.black, apron: ramp('#8a9096', 0.06), kind: 'steel' };
    case 'dark':
      return { top: T.olive, edge: T.oliveDark, legs: T.black, apron: ramp('#4f5934', 0.07), kind: 'olive' };
    default:
      return { top: T.plywood, edge: ramp('#6d747b', 0.07), legs: T.steel, apron: T.khaki, kind: 'plywood' };
  }
}

function deskShadow(b: PixelBuf): void {
  underRect(b, 3, 8, 26, 7, 'rgba(30,30,24,0.22)');
  contact(b, -1, 13, 34, 4, 0.2);
}

/** Mesa de campanha dobrável: tampo, aro metálico, pernas tubulares e caixa de munição embaixo. */
function deskBody(s: BufSprite, m: DeskMats, seed: number, back: boolean): void {
  const b = s.buf;
  if (back) {
    // Saia de lona cobrindo o vão (lado de quem olha), com faixa de velcro e estêncil.
    frontFace(b, 1, 8, 30, 6, m.apron);
    b.hline(1, 30, 8, m.apron.dk);
    b.hline(2, 29, 10, m.apron.lt);
    b.rect(13, 11, 6, 1, m.apron.dd);
  }
  // Pernas tubulares com travessa e sapatas.
  for (const x of [1, 28]) {
    b.rect(x, 8, 3, 8, m.legs.base);
    b.vline(x, 8, 15, m.legs.lt);
    b.vline(x + 2, 8, 15, m.legs.dk);
    b.hline(x - 1, x + 3, 15, T.black.dd);
  }
  if (!back) {
    b.hline(4, 27, 12, m.legs.dk);
    // Caixa de munição sob o lado direito.
    ammoCan(b, 18, 9, 9, 7, T.olive);
  }
  // Tampo (12 linhas) + aro (2 linhas).
  topFace(b, 0, -6, 32, 12, m.top);
  if (m.kind === 'plywood') woodGrain(b, 1, -5, 30, 10, m.top, seed);
  else if (m.kind === 'steel') {
    // Chapa xadrez (pontos alternados) — sutil para não brigar com os objetos.
    for (let y = -4; y < 4; y += 3) for (let x = 2 + ((y + 6) % 2) * 2; x < 30; x += 4) b.set(x, y, m.top.base);
  } else {
    const r = rngOf(seed, 13);
    for (let k = 0; k < 6; k++) b.set(1 + Math.floor(r() * 30), -5 + Math.floor(r() * 10), m.top.base);
    b.rect(27, 3, 3, 1, mix(m.top.lt, STENCIL, 0.5));
  }
  b.hline(0, 31, 6, m.edge.base);
  b.hline(0, 31, 7, m.edge.dk);
  b.set(0, 6, m.edge.lt);
  for (const x of [2, 15, 29]) b.set(x, 6, m.edge.hi);
}

/** Objetos sobre a mesa; posições das telas idênticas às da mesa de escritório. */
function deskTop(s: BufSprite, seed: number): { screen: Box; screen2?: Box } {
  const b = s.buf;
  const v = seed % 6;
  let screen: Box;
  let screen2: Box | undefined;
  switch (v) {
    case 1: {
      screen = ruggedMonitor(b, 2, -17, 16, 11);
      screen2 = ruggedMonitor(b, 18, -16, 13, 10);
      tacScreen(b, screen2, 'map', seed);
      ruggedKeyboard(b, 6, -1, 11);
      trackball(b, 20, 0);
      tinCup(b, 26, -2);
      break;
    }
    case 2: {
      screen = ruggedMonitor(b, 5, -17, 16, 11);
      // Notebook robusto à direita (tampa verde-oliva com cantos de borracha).
      b.rect(22, -9, 9, 6, '#3d4430');
      b.hline(22, 30, -9, '#4f5840');
      b.set(22, -9, '#25282c');
      b.set(30, -9, '#25282c');
      screen2 = { x: 23, y: -8, w: 7, h: 4 };
      tacScreen(b, screen2, 'radar', seed);
      b.rect(21, -3, 11, 2, '#4a5236');
      b.hline(21, 31, -2, '#30361f');
      b.hline(22, 31, -1, SHADOW);
      ruggedKeyboard(b, 8, -1, 10);
      flashlight(b, 0, -3);
      break;
    }
    case 3: {
      screen = ruggedMonitor(b, 8, -17, 16, 11);
      // Fitas de identificação na moldura.
      b.rect(22, -15, 2, 1, YELLOW);
      b.rect(9, -15, 2, 1, T.orange.base);
      ruggedKeyboard(b, 11, -1, 10);
      trackball(b, 23, 0);
      compass(b, 2, -5);
      foldedMap(b, 24, -4, 6, 4);
      canteen(b, 3, 0);
      break;
    }
    case 4: {
      screen = ruggedMonitor(b, 4, -17, 15, 11);
      screen2 = ruggedMonitor(b, 19, -17, 12, 10);
      tacScreen(b, screen2, 'term', seed);
      ruggedKeyboard(b, 7, -1, 11);
      trackball(b, 21, 0);
      foldedMap(b, 0, -2, 5, 4);
      break;
    }
    case 5: {
      screen = ruggedMonitor(b, 8, -17, 16, 11);
      ruggedKeyboard(b, 11, -1, 10);
      trackball(b, 23, 0);
      // Headset de rádio sobre a mesa.
      b.hline(2, 6, -4, T.black.base);
      b.set(1, -3, T.black.base);
      b.set(7, -3, T.black.base);
      b.rect(1, -2, 2, 2, T.olive.base);
      b.rect(6, -2, 2, 2, T.olive.base);
      b.set(7, 0, T.black.base);
      b.set(8, 0, T.black.base);
      tinCup(b, 26, -3);
      handset(b, 28, 1);
      break;
    }
    default: {
      screen = ruggedMonitor(b, 8, -17, 16, 11);
      ruggedKeyboard(b, 11, -1, 10);
      trackball(b, 23, 0);
      canteen(b, 2, -1);
      foldedMap(b, 25, -4, 6, 4);
      handset(b, 27, 2);
      break;
    }
  }
  return { screen, screen2 };
}

export function desk(variant: string | undefined, seed: number): BufFurniture {
  const s = floorSheet(2, 1, 20);
  deskBody(s, deskMats(variant), seed, false);
  const scr = deskTop(s, seed);
  s.buf.outline();
  deskShadow(s.buf);
  s.rects = { screen: rectAt(s, scr.screen.x, scr.screen.y, scr.screen.w, scr.screen.h) };
  if (scr.screen2) s.rects.screen2 = rectAt(s, scr.screen2.x, scr.screen2.y, scr.screen2.w, scr.screen2.h);
  return { base: s };
}

/** Traseira do monitor robusto: estojo cáqui-claro (ou aço na mesa oliva), nervuras e para-choques. */
function ruggedBack(b: PixelBuf, x: number, y: number, w: number, h: number, tone: 'tan' | 'steel'): void {
  const p =
    tone === 'steel'
      ? { hi: '#b9bfc5', lt: '#a5acb2', base: '#949ba1', dk: '#787f86', line: '#3f4449' }
      : { hi: '#e8dfc6', lt: '#ddd3b6', base: '#d0c4a0', dk: '#b1a47f', line: '#5d5440' };
  const cx = x + Math.floor(w / 2);
  b.hline(x + 2, x + w - 1, y + h + 3, SHADOW);
  // Pés dobráveis.
  b.rect(cx - 5, y + h, 1, 2, T.black.base);
  b.rect(cx + 4, y + h, 1, 2, T.black.base);
  b.hline(cx - 6, cx + 5, y + h + 2, T.black.lt);
  b.rect(x, y, w, h, p.base);
  b.hline(x + 1, x + w - 2, y + 1, p.lt);
  b.vline(x + 1, y + 1, y + h - 2, p.lt);
  b.vline(x + w - 2, y + 1, y + h - 2, p.dk);
  b.hline(x + 1, x + w - 2, y + h - 2, p.dk);
  b.hline(x, x + w - 1, y, p.hi);
  b.vline(x, y + 1, y + h - 1, p.line);
  b.vline(x + w - 1, y + 1, y + h - 1, p.line);
  b.hline(x, x + w - 1, y + h - 1, p.line);
  // Para-choques de borracha nos cantos.
  for (const [qx, qy] of [[x, y], [x + w - 2, y], [x, y + h - 2], [x + w - 2, y + h - 2]] as const) b.rect(qx, qy, 2, 2, '#2e3134');
  // Nervuras horizontais e placa central com estêncil.
  b.hline(x + 3, x + w - 4, y + 2, p.dk);
  b.rect(cx - 3, y + 4, 6, Math.max(2, h - 6), p.lt);
  b.hline(cx - 3, cx + 2, y + 4, p.hi);
  b.hline(cx - 3, cx + 2, y + 4 + Math.max(2, h - 6) - 1, p.dk);
  b.set(cx - 1, y + 5, p.line);
  b.set(cx, y + 5, p.line);
  b.vline(cx + 2, y + h, y + h + 2, T.black.dd);
}

export function deskBack(variant: string | undefined, seed: number): BufFurniture {
  const s = floorSheet(2, 1, 12);
  const m = deskMats(variant);
  const b = s.buf;
  deskBody(s, m, seed, true);
  const v = seed % 4;
  const tone = variant === 'dark' ? 'steel' : 'tan';
  if (v === 1) {
    ruggedBack(b, 2, -7, 15, 10, tone);
    ruggedBack(b, 17, -6, 13, 9, tone);
  } else {
    ruggedBack(b, 8, -7, 16, 10, tone);
    if (v === 2) handset(b, 27, 1);
    else foldedMap(b, 25, -1, 6, 4);
    if (v === 3) compass(b, 2, -3);
    else canteen(b, 2, 0);
  }
  b.outline();
  deskShadow(b);
  return { base: s };
}

// ------------------------------------------------------------------ cadeiras (lona dobrável)

const CANVAS: Readonly<Record<string, string>> = {
  blue: '#5f6b3d',
  black: '#3a3d42',
  green: '#b39a6a',
  gray: '#7d848c',
  red: '#8a6a4c',
};

function canvasRamp(variant: string | undefined): Ramp {
  return ramp(CANVAS[variant ?? 'black'] ?? CANVAS.black, 0.07);
}

const TUBE = ramp('#5c6168', 0.08);

/** Pernas em X da cadeira de campanha. */
function campLegs(b: PixelBuf, top: number): void {
  for (const x of [2, 13]) {
    b.vline(x, top, 15, TUBE.base);
    b.set(x, 15, T.black.dd);
  }
  b.line(3, top + 1, 12, 14, TUBE.dk);
  b.line(12, top + 1, 3, 14, TUBE.dk);
}

export function officeChair(variant: string | undefined): BufFurniture {
  const c = canvasRamp(variant);
  const base = floorSheet(1, 1, 6);
  const b = base.buf;
  campLegs(b, 9);
  // Assento de lona (caído no meio) com trilhos metálicos.
  b.rect(2, 4, 12, 6, c.lt);
  b.hline(3, 12, 4, c.hi);
  b.hline(3, 12, 7, c.base);
  b.hline(2, 13, 8, c.base);
  b.hline(2, 13, 9, TUBE.base);
  b.vline(2, 4, 9, TUBE.lt);
  b.vline(13, 4, 9, TUBE.dk);
  b.outline();
  contact(b, 1, 13, 14, 3, 0.22);
  // Encosto baixo de lona entre os tubos (por cima de quem senta).
  const front = floorSheet(1, 1, 6);
  const f = front.buf;
  f.rect(4, 7, 8, 6, c.base);
  f.hline(5, 10, 6, TUBE.lt);
  f.hline(4, 11, 7, c.lt);
  f.vline(4, 6, 12, TUBE.lt);
  f.vline(11, 6, 12, TUBE.dk);
  f.hline(5, 10, 9, c.dk);
  f.rect(7, 10, 2, 1, mix(c.base, STENCIL, 0.45));
  f.hline(4, 11, 12, c.dd);
  f.rect(7, 13, 2, 1, TUBE.dk);
  f.outline();
  return { base, front };
}

export function officeChairFront(variant: string | undefined): BufFurniture {
  const c = canvasRamp(variant);
  const s = floorSheet(1, 1, 10);
  const b = s.buf;
  campLegs(b, 10);
  // Encosto ao norte: lona esticada entre dois tubos com travessa.
  b.rect(4, -6, 8, 10, c.base);
  b.rect(5, -5, 6, 7, c.lt);
  b.hline(5, 10, -5, c.hi);
  b.hline(4, 11, 3, c.dd);
  b.rect(7, -2, 2, 1, mix(c.base, STENCIL, 0.45));
  for (const [x, m] of [[3, TUBE.lt], [12, TUBE.dk]] as const) b.vline(x, -7, 5, m);
  b.hline(3, 12, -7, TUBE.lt);
  // Assento.
  b.rect(2, 5, 12, 5, c.lt);
  b.hline(3, 12, 5, c.hi);
  b.hline(2, 13, 8, c.base);
  b.hline(2, 13, 9, c.dk);
  b.hline(2, 13, 10, TUBE.dk);
  // Braços de lona, porta-copo de tela no direito.
  for (const x of [1, 13]) {
    b.rect(x, 2, 2, 5, c.dk);
    b.set(x, 2, c.base);
    b.vline(x, 7, 9, TUBE.base);
  }
  b.set(14, 3, T.black.base);
  b.set(13, 4, T.black.base);
  b.outline();
  contact(b, 1, 13, 14, 3, 0.22);
  return { base: s };
}

// ------------------------------------------------------------------ racks e armário

/** Estrutura de rack metálico (laterais perfuradas, prateleiras, fundo escuro). */
function rackFrame(b: PixelBuf, w: number, shelves: readonly number[]): void {
  const m = T.steel;
  topFace(b, 0, -21, w, 3, m);
  b.rect(0, -18, w, 34, m.dk);
  b.rect(2, -17, w - 4, 31, '#2b2f2a');
  for (const x of [0, w - 2]) {
    b.rect(x, -18, 2, 34, m.base);
    b.vline(x, -18, 15, x === 0 ? m.lt : m.base);
    b.vline(x + 1, -18, 15, x === 0 ? m.base : m.dd);
    for (let y = -16; y < 14; y += 3) b.set(x + (x === 0 ? 1 : 0), y, m.dd);
  }
  for (const y of shelves) {
    b.hline(1, w - 2, y, m.lt);
    b.hline(1, w - 2, y + 1, m.dk);
    for (let x = 3; x < w - 3; x += 3) b.set(x, y, m.base);
  }
  b.hline(0, w - 1, 15, m.dd);
}

/** Preenche uma prateleira com suprimentos variados (base em `bottom`). Retorna o próximo x livre. */
function supplyItem(b: PixelBuf, r: Rng, x: number, bottom: number, maxX: number, maxH: number): number {
  const room = maxX - x;
  const k = r();
  if (k < 0.28 && room >= 7) {
    const w = 6 + Math.floor(r() * 2);
    ammoCan(b, x, bottom - 4, w, 5, pick(r, [T.olive, T.olive, T.oliveDark]));
    return x + w + 1;
  }
  if (k < 0.46 && room >= 8 && maxH >= 7) {
    crate(b, x, bottom - 6, 8, 7, pick(r, [T.crate, T.plywood]));
    return x + 9;
  }
  if (k < 0.58 && room >= 6) {
    // Bolsa de primeiros socorros (laranja de segurança, cruz branca).
    const m = T.orange;
    b.rect(x, bottom - 3, 6, 4, m.base);
    b.hline(x, x + 5, bottom - 3, m.lt);
    b.hline(x, x + 5, bottom, m.dk);
    b.hline(x + 2, x + 4, bottom - 1, '#f4f2ee');
    b.vline(x + 3, bottom - 2, bottom, '#f4f2ee');
    return x + 7;
  }
  if (k < 0.74 && room >= 7) {
    // Pilha de roupa/equipamento dobrado em camadas.
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const m = pick(r, [T.olive, T.khaki, T.coyote, T.oliveDark]);
      const yy = bottom - 1 - i * 2;
      b.rect(x, yy, 7, 2, m.base);
      b.hline(x, x + 6, yy, m.lt);
      b.set(x + 6, yy + 1, m.dk);
    }
    return x + 8;
  }
  if (k < 0.86 && room >= 8) {
    helmet(b, x + 4, bottom - 4, pick(r, [T.olive, T.khaki, T.coyote]), 7);
    return x + 9;
  }
  if (room >= 5 && maxH >= 7) {
    jerrycan(b, x, bottom - 6, 5, 7, pick(r, [T.olive, T.water]));
    return x + 6;
  }
  return x + 1;
}

export function bookshelf(seed: number): BufFurniture {
  const s = floorSheet(2, 1, 22);
  const b = s.buf;
  const r = rngOf(seed, 21);
  const shelves = [-8, 3, 15];
  rackFrame(b, 32, shelves);
  shelves.forEach((shelf) => {
    const bottom = shelf - 1;
    let x = 3;
    while (x < 28) x = supplyItem(b, r, x, bottom, 29, 8);
  });
  b.outline();
  contact(b, -1, 13, 34, 4, 0.22);
  return { base: s };
}

export function binderShelf(seed: number): BufFurniture {
  const s = floorSheet(1, 1, 22);
  const b = s.buf;
  const r = rngOf(seed, 23);
  const shelves = [-8, 3, 15];
  rackFrame(b, 16, shelves);
  shelves.forEach((shelf, i) => {
    const bottom = shelf - 1;
    if (i === 2) {
      // Embaixo: duas caixas de munição empilhadas ou um caixote.
      if (r() < 0.5) {
        ammoCan(b, 3, bottom - 4, 10, 5);
        ammoCan(b, 4, bottom - 9, 8, 5, T.oliveDark);
      } else crate(b, 2, bottom - 8, 12, 9);
      return;
    }
    let x = 2;
    while (x < 13) x = supplyItem(b, r, x, bottom, 14, 8);
  });
  b.outline();
  contact(b, 0, 13, 16, 4, 0.22);
  return { base: s };
}

export function filingCabinet(): BufFurniture {
  const s = floorSheet(1, 1, 8);
  const b = s.buf;
  const m = ramp('#6f7a52', 0.06);
  // Armário de equipamento em chapa verde-oliva: veneziana, puxador, cadeado e etiqueta.
  topFace(b, 1, -7, 14, 4, m);
  frontFace(b, 1, -3, 14, 19, m);
  b.vline(8, -3, 15, m.dd);
  b.vline(9, -3, 15, m.lt);
  for (const x0 of [2, 10]) {
    for (let y = -1; y <= 3; y += 2) b.hline(x0 + 1, x0 + 4, y, m.dd);
    b.rect(x0 + 1, 7, 3, 2, STENCIL);
    b.set(x0 + 2, 8, m.dk);
  }
  // Puxadores e cadeado amarelo.
  b.vline(7, 4, 7, T.black.base);
  b.vline(10, 4, 7, T.black.base);
  b.rect(8, 6, 2, 2, YELLOW);
  b.set(8, 5, '#9aa1a8');
  b.set(9, 5, '#9aa1a8');
  // Pés e faixa inferior.
  b.hline(1, 14, 13, m.dk);
  b.set(2, -3, m.hi);
  b.outline();
  contact(b, 0, 13, 16, 4, 0.22);
  return { base: s };
}

export function printer(): BufFurniture {
  const s = floorSheet(1, 1, 14);
  const b = s.buf;
  const caseM = T.olive;
  const radio = ramp('#3d4430', 0.07);
  // Estojo de transporte (base) com travas pretas e estêncil.
  topFace(b, 0, 3, 16, 2, caseM);
  frontFace(b, 0, 5, 16, 11, caseM);
  for (const x of [2, 12]) {
    b.rect(x, 5, 2, 3, T.black.base);
    b.set(x, 5, T.black.lt);
  }
  b.hline(5, 10, 10, STENCIL);
  b.hline(6, 8, 12, STENCIL);
  b.hline(0, 15, 14, caseM.dd);
  // Rádio de campanha sobre o estojo.
  topFace(b, 1, -6, 14, 3, radio);
  frontFace(b, 1, -3, 14, 7, radio);
  b.rect(2, -2, 6, 2, '#8fd07a');
  b.hline(2, 7, -2, '#b4e89c');
  b.set(3, -1, '#4f7a3f');
  b.set(5, -1, '#4f7a3f');
  for (const x of [10, 13]) {
    b.rect(x, -2, 2, 2, T.black.dk);
    b.set(x, -2, T.black.lt);
  }
  for (let x = 2; x < 9; x += 2) b.set(x, 1, radio.dd);
  b.set(12, 1, T.orange.base);
  b.set(13, 1, '#7fe07a');
  // Monofone no topo com fio enrolado descendo pela lateral.
  b.rect(2, -6, 6, 1, T.black.base);
  b.rect(2, -7, 2, 2, T.black.base);
  b.rect(6, -7, 2, 2, T.black.base);
  for (let y = -5; y <= 4; y += 2) b.set(0, y, T.black.dk);
  // Antena chicote.
  b.vline(12, -14, -7, T.black.base);
  b.rect(11, -8, 3, 2, T.black.dk);
  b.set(12, -14, T.orange.base);
  b.outline();
  contact(b, -1, 13, 18, 4, 0.22);
  return { base: s };
}

export function trashBin(): BufFurniture {
  const s = floorSheet(1, 1, 2);
  const b = s.buf;
  const m = ramp('#5f6b3d', 0.07);
  // Tambor metálico pequeno com aros.
  for (let y = 7; y <= 15; y++) {
    b.hline(4, 11, y, m.base);
    b.set(4, y, m.lt);
    b.set(5, y, m.lt);
    b.set(11, y, m.dk);
  }
  for (const y of [9, 13]) {
    b.hline(4, 11, y, m.hi);
    b.hline(4, 11, y + 1, m.dk);
  }
  b.hline(4, 11, 15, m.dd);
  b.rect(7, 11, 2, 1, YELLOW);
  // Tampa aberta com trapo pendurado.
  b.ellipse(8, 6.5, 4.5, 2, m.lt);
  b.ellipse(8, 6.6, 3.5, 1.3, '#2e3226');
  b.rect(6, 5, 3, 2, T.khaki.lt);
  b.set(8, 6, T.khaki.dk);
  b.set(5, 7, T.khaki.base);
  b.set(5, 8, T.khaki.dk);
  b.outline();
  contact(b, 3, 14, 10, 2, 0.22);
  return { base: s };
}

// ------------------------------------------------------------------ sacos de areia e itens altos

export function plantSmall(variant: string | undefined, seed: number): BufFurniture {
  const s = floorSheet(1, 1, 10);
  const b = s.buf;
  const v = variant ?? 'fern';
  const r = rngOf(seed, 5);
  const bag = pick(r, [T.khaki, ramp('#a08a5c', 0.06), ramp('#9a9668', 0.06)]);
  if (v === 'succulent') {
    // Caixote pequeno com capacete em cima.
    crate(b, 2, 6, 12, 10, T.crate);
    helmet(b, 8, 1, pick(r, [T.olive, T.coyote, T.khaki]), 8);
  } else if (v === 'flower') {
    // Dois sacos de areia com caixa de munição em cima.
    sandbag(b, 0, 11, 8, 5, bag);
    sandbag(b, 8, 11, 8, 5, ramp(shade(bag.base, -0.05), 0.06));
    ammoCan(b, 3, 5, 10, 6, T.olive);
  } else {
    // Pirâmide de sacos de areia (3 fileiras).
    sandbag(b, 0, 11, 8, 5, bag);
    sandbag(b, 8, 11, 8, 5, ramp(shade(bag.base, -0.04), 0.06));
    sandbag(b, 1, 7, 7, 5, ramp(shade(bag.base, 0.03), 0.06));
    sandbag(b, 8, 7, 7, 5, bag);
    sandbag(b, 4, 3, 8, 5, ramp(shade(bag.base, 0.05), 0.06));
  }
  b.outline();
  contact(b, 1, 14, 14, 2, 0.24);
  return { base: s };
}

export function plantTall(variant: string | undefined, seed: number): BufFurniture {
  const s = floorSheet(1, 1, 24, 6);
  const b = s.buf;
  const v = variant ?? 'ficus';
  const r = rngOf(seed, 9);
  if (v === 'palm') {
    // Dois tambores empilhados.
    const drum = (y: number, h: number, m: Ramp) => {
      b.rect(2, y + 1, 12, h - 1, m.base);
      b.vline(2, y + 1, y + h - 1, m.lt);
      b.vline(3, y + 1, y + h - 1, m.lt);
      b.vline(13, y + 1, y + h - 1, m.dk);
      for (const yy of [y + 4, y + h - 4]) {
        b.hline(2, 13, yy, m.hi);
        b.hline(2, 13, yy + 1, m.dk);
      }
      b.hline(2, 13, y + h - 1, m.dd);
      b.ellipse(8, y + 1, 6, 1.6, m.lt);
      b.set(10, y + 1, m.dd);
    };
    const pal = [T.olive, T.water, ramp('#8a4f32', 0.07), T.steel];
    const lower = pal[seed % pal.length];
    drum(2, 14, lower);
    drum(-13, 15, pal[(seed + 1) % pal.length]);
    b.rect(6, -5, 4, 2, YELLOW);
    b.set(7, -4, T.black.base);
  } else if (v === 'ficus') {
    // Rede de camuflagem jogada sobre um mastro com travessa: caimento em "tenda", manchas
    // orgânicas (não xadrez), borda de baixo esfarrapada e alguns furos.
    const blobs = Array.from({ length: 14 }, () => ({
      x: -4 + r() * 24,
      y: -20 + r() * 30,
      rx: 2 + r() * 3,
      ry: 1.5 + r() * 2.5,
      c: pick(r, [T.khaki.base, T.coyote.base, T.olive.lt, T.oliveDark.dd, T.khaki.dk]),
    }));
    b.hline(1, 15, -18, '#6b5a40');
    for (let y = -21; y <= 10; y++) {
      const t = (y + 21) / 31;
      const half = 1 + Math.round(Math.pow(t, 0.7) * 11);
      for (let x = 8 - half; x <= 8 + half; x++) {
        const edge = Math.min(x - (8 - half), 8 + half - x);
        if (y > 6 && ((x * 7 + y * 3 + seed * 5) % 6) < y - 5 + (edge < 2 ? 2 : 0)) continue;
        let c: string = T.olive.base;
        for (const bl of blobs) {
          const dx = (x - bl.x) / bl.rx;
          const dy = (y - bl.y) / bl.ry;
          if (dx * dx + dy * dy <= 1) c = bl.c;
        }
        // Dobras verticais do caimento.
        if (((x - 8) * 5 + 40) % 9 === 0 && y > -14) c = shade(c, -0.12);
        b.set(x, y, c);
      }
    }
    for (let k = 0; k < 8; k++) b.clear(Math.floor(r() * 16), Math.floor(-12 + r() * 18));
    b.vline(8, -23, 13, '#6b5a40');
    b.set(8, -23, T.black.base);
    sandbag(b, 3, 11, 10, 5, T.khaki);
  } else if (v === 'monstera') {
    // Torre de caixotes de madeira e caixa de munição no topo.
    crate(b, 0, 4, 16, 12, T.crate);
    crate(b, 1, -7, 14, 11, pick(r, [T.plywood, T.crate]));
    ammoCan(b, 3, -14, 10, 7, T.olive);
    b.rect(2, 10, 3, 1, YELLOW);
  } else {
    // Suporte com colete tático e capacete.
    const pole = '#5c6168';
    b.hline(3, 12, 15, T.black.base);
    b.line(8, 10, 3, 15, pole);
    b.line(8, 10, 13, 15, pole);
    b.vline(8, -16, 14, pole);
    b.hline(3, 12, -15, pole);
    const vest = pick(r, [T.olive, T.coyote, T.khaki]);
    b.rect(3, -14, 10, 15, vest.base);
    b.rect(4, -16, 2, 3, vest.base);
    b.rect(10, -16, 2, 3, vest.base);
    b.clearRect(6, -14, 4, 2);
    b.vline(3, -14, 0, vest.lt);
    b.vline(12, -14, 0, vest.dk);
    b.hline(3, 12, 0, vest.dd);
    // Bolsos (porta-carregadores) e faixas MOLLE.
    for (const x of [4, 7, 10]) {
      b.rect(x, -6, 2, 5, vest.dk);
      b.hline(x, x + 1, -6, vest.lt);
    }
    for (const y of [-10, -8]) b.hline(4, 11, y, vest.dk);
    b.rect(6, -12, 4, 1, STENCIL);
    helmet(b, 8, -23, pick(r, [T.olive, T.oliveDark, T.coyote]), 9);
  }
  b.outline();
  contact(b, 1, 14, 14, 3, 0.24);
  return { base: s };
}

// ------------------------------------------------------------------ barreira + alambrado

function meshAt(x: number, y: number): boolean {
  const a = (((x + y) % 6) + 6) % 6;
  const c = (((x - y) % 6) + 6) % 6;
  return a === 0 || c === 0;
}

export function glassPartition(variant: string | undefined): BufFurniture {
  const v = variant ?? 'h';
  const s = floorSheet(1, 1, 22, 2);
  const b = s.buf;
  const con = T.concrete;
  const post = ramp('#8d949b', 0.07);
  if (v === 'v') {
    // Norte-sul visto de cima: topo da barreira com a linha do alambrado no meio.
    const cols = [con.dd, con.lt, con.hi, '#5d636a', post.lt, con.base, con.dk, mix(con.dd, '#3a3d3b', 0.5)];
    cols.forEach((c, i) => b.vline(4 + i, -16, 15, c));
    for (let y = -16; y < 16; y += 8) {
      b.set(7, y, post.dd);
      b.set(8, y, post.dd);
    }
    for (let y = -14; y < 16; y += 4) b.set(5, y, con.base);
    underRect(b, 12, -16, 2, 32, 'rgba(30,30,24,0.14)');
    return { base: s };
  }
  if (v === 'end') {
    // Ponta: bloco de concreto com o mourão do alambrado.
    topFace(b, 3, 3, 10, 4, con);
    frontFace(b, 3, 7, 10, 9, con);
    b.hline(3, 12, 13, con.dd);
    b.rect(4, 9, 2, 1, YELLOW);
    b.rect(6, -18, 3, 22, post.base);
    b.vline(6, -18, 3, post.hi);
    b.vline(8, -18, 3, post.dk);
    b.rect(5, -19, 5, 2, post.lt);
    b.outline();
    contact(b, 2, 13, 12, 4, 0.2);
    return { base: s };
  }
  // 'h': barreira de concreto baixa (leste-oeste) com alambrado em cima.
  topFace(b, 0, 3, 16, 3, con);
  frontFace(b, 0, 6, 16, 10, con);
  b.hline(0, 15, 9, con.lt);
  b.hline(0, 15, 13, con.dk);
  b.rect(3, 11, 3, 1, mix(con.base, STENCIL, 0.5));
  // Trilho superior e mourão.
  b.hline(0, 15, -17, post.hi);
  b.hline(0, 15, -16, post.dk);
  b.rect(0, -17, 2, 20, post.base);
  b.vline(0, -17, 2, post.lt);
  b.outline();
  // Tela losangular (sem contorno), presa no trilho e na barreira.
  for (let y = -15; y <= 2; y++) {
    for (let x = 2; x < 16; x++) if (meshAt(x, y)) b.set(x, y, 'rgba(178,184,190,0.85)');
  }
  b.hline(2, 15, 2, 'rgba(90,96,104,0.6)');
  for (let y = 0; y < b.h; y++) {
    b.clear(-1, y - b.oy);
    b.clear(16, y - b.oy);
  }
  contact(b, 0, 14, 16, 3, 0.18);
  return { base: s };
}

// ------------------------------------------------------------------ briefing e apoio

export function meetingTable(seed: number): BufFurniture {
  const s = floorSheet(3, 2, 10);
  const b = s.buf;
  const m = T.plywood;
  const r = rngOf(seed, 31);
  for (const x of [2, 43]) {
    b.rect(x, 21, 3, 11, T.steel.base);
    b.vline(x, 21, 31, T.steel.lt);
    b.vline(x + 2, 21, 31, T.steel.dk);
  }
  b.hline(5, 42, 28, T.steel.dk);
  topFace(b, 0, -4, 48, 24, m);
  woodGrain(b, 1, -3, 46, 22, m, seed);
  b.hline(0, 47, 20, T.steel.base);
  b.hline(0, 47, 21, T.steel.dk);
  // Mapa tático aberto no centro.
  const mx = 9;
  const my = 1;
  const mw = 30;
  const mh = 15;
  b.rect(mx + 1, my + 1, mw, mh, 'rgba(60,44,28,0.25)');
  b.rect(mx, my, mw, mh, '#d6c99c');
  const terrain = ['#a9b47e', '#97a56c', '#c2b483'];
  for (let k = 0; k < 6; k++) {
    const cx = mx + 3 + Math.floor(r() * (mw - 6));
    const cy = my + 2 + Math.floor(r() * (mh - 4));
    b.ellipse(cx, cy, 2 + r() * 3, 1.5 + r() * 2, pick(r, terrain));
    b.set(cx, cy, '#7d8a52');
  }
  b.line(mx, my + 4, mx + mw - 1, my + mh - 3, '#6f9cbc');
  b.line(mx, my + 5, mx + mw - 1, my + mh - 2, '#6f9cbc');
  for (let x = mx + 2; x < mx + mw - 2; x++) if (x % 2 === 0) b.set(x, my + mh - 5 - Math.floor((x - mx) / 4), T.orange.base);
  for (const x of [mx + 10, mx + 20]) b.vline(x, my, my + mh - 1, '#c4b588');
  // Marcadores (amigos azuis, objetivo vermelho, ponto amarelo).
  for (const [x, y, c] of [[mx + 6, my + 3, '#3f6fb8'], [mx + 8, my + 4, '#3f6fb8'], [mx + 22, my + 6, '#d24a3a'], [mx + 15, my + 10, YELLOW]] as const) {
    b.rect(x, y, 2, 2, c);
    b.set(x, y, shade(c, 0.2));
  }
  for (const [x, y] of [[mx, my], [mx + mw - 1, my], [mx, my + mh - 1], [mx + mw - 1, my + mh - 1]] as const) b.set(x, y, '#3a3d42');
  // Notebooks robustos.
  const laptop = (x: number, y: number, facing: 'up' | 'down') => {
    if (facing === 'down') {
      b.rect(x, y, 9, 5, '#3d4430');
      b.hline(x, x + 8, y, '#4f5840');
      tacScreen(b, { x: x + 1, y: y + 1, w: 7, h: 3 }, x < 20 ? 'term' : 'radar', seed + x);
      b.rect(x - 1, y + 5, 11, 2, '#4a5236');
      b.hline(x - 1, x + 9, y + 6, '#30361f');
    } else {
      b.rect(x - 1, y, 11, 2, '#4a5236');
      b.rect(x, y + 2, 9, 4, '#d0c4a0');
      b.hline(x, x + 8, y + 2, '#e8dfc6');
      b.set(x, y + 5, '#2e3134');
      b.set(x + 8, y + 5, '#2e3134');
    }
  };
  laptop(2, -3, 'down');
  laptop(34, 13, 'up');
  if (seed % 2 === 0) laptop(37, -3, 'down');
  else {
    // Prancheta com ordens.
    b.rect(38, -2, 6, 7, '#8a6a4c');
    b.rect(39, -1, 4, 5, '#ece6d2');
    b.rect(40, -3, 2, 1, '#5c6168');
    for (const y of [0, 2]) b.hline(39, 41, y, '#9a9a8a');
  }
  handset(b, 4, 15);
  compass(b, 23, -3);
  tinCup(b, 18, 16);
  tinCup(b, 29, -3);
  canteen(b, 43, 8);
  b.outline();
  contact(b, -1, 28, 50, 5, 0.22);
  underRect(b, 4, 22, 40, 8, 'rgba(30,30,24,0.18)');
  return { base: s };
}

export function stool(): BufFurniture {
  const s = floorSheet(1, 1, 2);
  const b = s.buf;
  // Caixote de suprimentos usado como banco.
  crate(b, 2, 3, 12, 12, T.crate);
  b.set(1, 9, '#c9b27a');
  b.set(14, 9, '#c9b27a');
  b.outline();
  contact(b, 1, 13, 14, 3, 0.22);
  return { base: s };
}

export function floorLamp(): BufFurniture {
  const s = floorSheet(1, 1, 26);
  const b = s.buf;
  const leg = '#3f444a';
  // Tripé.
  b.line(8, 1, 2, 15, leg);
  b.line(8, 1, 14, 15, leg);
  b.line(8, 1, 9, 12, '#5c6168');
  b.set(2, 15, T.black.dd);
  b.set(14, 15, T.black.dd);
  b.vline(8, -16, 2, '#5c6168');
  b.vline(7, -16, 2, '#7d848c');
  b.rect(6, -4, 4, 2, T.black.base);
  // Cabo laranja descendo.
  b.line(9, -3, 11, 6, T.orange.dk);
  b.line(11, 6, 13, 13, T.orange.dk);
  // Suporte em U e refletor (carcaça amarela, lente acesa).
  b.vline(2, -21, -17, T.black.base);
  b.vline(13, -21, -17, T.black.base);
  b.hline(2, 13, -16, T.black.base);
  const hs = ramp('#d9a42e', 0.07);
  b.rect(3, -24, 10, 8, hs.base);
  b.hline(3, 12, -24, hs.lt);
  b.vline(12, -24, -17, hs.dk);
  b.hline(3, 12, -17, hs.dd);
  b.rect(4, -23, 8, 5, '#fff6d8');
  b.hline(4, 11, -21, '#f3e3a8');
  b.vline(7, -23, -19, '#f3e3a8');
  b.set(4, -23, '#ffffff');
  b.set(5, -23, '#ffffff');
  b.outline();
  contact(b, 1, 13, 14, 3, 0.22);
  s.rects = { glow: rectAt(s, 4, -20, 8, 6) };
  return { base: s };
}

export function waterCooler(): BufFurniture {
  const s = floorSheet(1, 1, 20);
  const b = s.buf;
  const m = T.steel;
  // Rack de galões: montantes e prateleiras.
  b.rect(2, -18, 12, 34, '#2b2f2a');
  for (const x of [1, 13]) {
    b.rect(x, -19, 2, 35, m.base);
    b.vline(x, -19, 15, x === 1 ? m.lt : m.dk);
  }
  for (const y of [-4, 14]) {
    b.hline(1, 14, y, m.lt);
    b.hline(1, 14, y + 1, m.dk);
  }
  b.hline(1, 14, -19, m.hi);
  // Galões de água (azuis) em cima e embaixo; torneira no de baixo.
  jerrycan(b, 3, -15, 5, 11, T.water);
  jerrycan(b, 8, -15, 5, 11, ramp(shade(T.water.base, -0.04), 0.07));
  jerrycan(b, 3, 3, 5, 11, T.water);
  jerrycan(b, 8, 3, 5, 11, T.olive);
  b.rect(5, -2, 2, 2, '#c9ced3');
  b.set(5, -2, '#eef1f5');
  b.vline(5, 0, 1, '#9aa1a8');
  // Canecas de lata penduradas.
  b.set(10, -2, T.steel.lt);
  b.set(11, -2, T.steel.lt);
  b.set(10, -1, T.steel.dk);
  b.rect(5, 6, 3, 1, '#f4f2ee');
  b.rect(9, 6, 3, 1, STENCIL);
  b.outline();
  contact(b, 0, 13, 16, 4, 0.22);
  return { base: s };
}
