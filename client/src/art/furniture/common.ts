// Copa, lounge, banheiro e recepção. Coordenadas de desenho = footprint (base em y = h*TILE).
import { mix, ramp, shade, type Ramp } from '../core/color';
import type { PixelBuf } from '../core/pixbuf';
import { floorSheet, rectAt, type BufFurniture } from '../core/sprite';
import { TACTICAL_THEME } from '../theme';
import { M, contact, foliage, frontFace, glass, monitorBack, mug, papers, pick, pot, rngOf, topFace, underRect, woodGrain } from './kit';
import { SAFETY_ORANGE, SAFETY_YELLOW, STENCIL, STENCIL_DARK, T, hazard, louver, rivets, sandbagWall, stencilMarks } from './tactical-common';

// ------------------------------------------------------------------ copa

const CAB = ramp('#d8b98f', 0.06);
const TOP = ramp('#eceae5', 0.04);

/** Remove o contorno lateral (x = -1 e x = 16) para módulos que se encaixam lado a lado. */
function seamless(b: PixelBuf, w = 16): void {
  for (let y = -b.oy; y < b.h - b.oy; y++) {
    b.clear(-1, y);
    b.clear(w, y);
  }
}

/** Bancada encostada na parede norte: tampo claro e gabinete de madeira. */
function counterBase(b: PixelBuf, kind: 'plain' | 'drawers' | 'doors'): void {
  // Gabinete.
  frontFace(b, 0, 5, 16, 11, CAB);
  b.vline(0, 5, 15, CAB.lt);
  b.vline(15, 5, 13, CAB.dd);
  b.rect(1, 14, 14, 2, '#5a4a3c');
  b.hline(1, 14, 14, '#43372d');
  if (kind === 'drawers') {
    for (const y of [8, 11]) {
      b.hline(1, 14, y, CAB.dd);
      b.hline(1, 14, y + 1, CAB.lt);
    }
    for (const y of [6, 9, 12]) b.rect(6, y, 4, 1, '#8b939f');
  } else if (kind === 'doors') {
    b.vline(7, 6, 13, CAB.dd);
    b.vline(8, 6, 13, CAB.lt);
    b.rect(5, 8, 1, 3, '#8b939f');
    b.rect(10, 8, 1, 3, '#8b939f');
  } else {
    b.rect(12, 8, 1, 3, '#8b939f');
    b.hline(1, 14, 6, CAB.lt);
  }
  // Tampo de pedra clara com borda.
  topFace(b, 0, -3, 16, 7, TOP);
  b.hline(0, 15, 4, TOP.dk);
  b.hline(0, 15, 3, TOP.hi);
  for (const [x, y] of [[3, -1], [11, 1], [7, 0]] as const) b.set(x, y, TOP.base);
}

export function counter(variant: string | undefined): BufFurniture {
  if (TACTICAL_THEME) return tCounter(variant === 'drawers' ? 'drawers' : 'plain');
  const s = floorSheet(1, 1, 6);
  counterBase(s.buf, variant === 'drawers' ? 'drawers' : 'plain');
  s.buf.outline();
  seamless(s.buf);
  contact(s.buf, 0, 14, 16, 3, 0.2);
  return { base: s };
}

export function counterSink(): BufFurniture {
  if (TACTICAL_THEME) return tCounterSink();
  const s = floorSheet(1, 1, 10);
  const b = s.buf;
  counterBase(b, 'doors');
  // Cuba inox embutida.
  b.rect(3, -1, 10, 4, '#aeb6c2');
  b.rect(4, 0, 8, 3, '#7d8592');
  b.hline(4, 11, 0, '#5d6573');
  b.set(8, 2, '#3d4350');
  b.hline(3, 12, -1, '#d3d8df');
  // Torneira (pescoço de ganso).
  b.rect(7, -6, 2, 5, '#c3cad4');
  b.hline(7, 10, -7, '#e3e7ec');
  b.set(10, -6, '#c3cad4');
  b.set(9, -7, '#ffffff');
  b.rect(5, -3, 1, 2, '#c3cad4');
  b.outline();
  seamless(b);
  contact(b, 0, 14, 16, 3, 0.2);
  return { base: s };
}

export function coffeeMachine(state: number): BufFurniture {
  if (TACTICAL_THEME) return tCoffeeUrn(state);
  const s = floorSheet(1, 1, 18);
  const b = s.buf;
  counterBase(b, 'drawers');
  const on = state >= 1;
  const body = ramp('#3a3f4b', 0.06);
  const steel = ramp('#c3cad4', 0.06);
  // Corpo da máquina de espresso.
  topFace(b, 2, -15, 12, 3, steel);
  b.rect(2, -12, 12, 13, body.base);
  b.vline(2, -12, 0, body.lt);
  b.vline(13, -12, 0, body.dd);
  // Painel e luzes.
  b.rect(3, -11, 10, 2, '#22262f');
  b.set(4, -10, on ? '#5fd07a' : '#3b4a3f');
  b.set(6, -10, on ? '#f2c14e' : '#4a4535');
  b.rect(9, -11, 3, 2, on ? '#7fd0ff' : '#2a3a52');
  // Grupo e bico.
  b.rect(5, -7, 6, 2, steel.base);
  b.hline(5, 10, -7, steel.hi);
  b.rect(7, -5, 2, 1, steel.dk);
  // Xícara e bandeja.
  b.rect(4, 0, 8, 1, steel.dk);
  b.hline(4, 11, -1, steel.base);
  b.rect(6, -3, 4, 3, '#f4f2ee');
  b.set(10, -2, '#d6d2c8');
  b.hline(6, 9, -3, on ? '#6b4226' : '#f4f2ee');
  if (on) {
    b.vline(7, -4, -3, '#7a4a2a');
    b.set(8, -4, '#9a6a3e');
  }
  // Grãos no topo.
  b.rect(10, -18, 3, 3, 'rgba(120,80,50,0.9)');
  b.hline(10, 12, -18, 'rgba(240,240,240,0.8)');
  b.outline();
  seamless(b);
  contact(b, 0, 14, 16, 3, 0.2);
  if (on) {
    // Vapor depois do contorno (não recebe borda).
    for (const [x, y, a] of [[12, -17, 0.55], [13, -18, 0.45], [12, -19, 0.35]] as const) b.set(x, y, `rgba(255,255,255,${a})`);
  }
  return { base: s };
}

export function microwave(): BufFurniture {
  if (TACTICAL_THEME) return tRationHeater();
  const s = floorSheet(1, 1, 12);
  const b = s.buf;
  counterBase(b, 'plain');
  const body = ramp('#e8eaee', 0.05);
  topFace(b, 1, -11, 14, 3, body);
  frontFace(b, 1, -8, 14, 9, body);
  b.rect(2, -7, 9, 6, '#2a303c');
  b.hline(2, 10, -7, '#3d4656');
  b.line(4, -7, 8, -2, 'rgba(255,255,255,0.12)');
  b.rect(12, -7, 2, 2, '#1f2a1f');
  b.set(12, -7, '#7be08a');
  b.set(13, -7, '#7be08a');
  b.set(12, -4, '#9aa2ae');
  b.set(13, -4, '#9aa2ae');
  b.set(12, -3, '#9aa2ae');
  b.set(13, -3, '#9aa2ae');
  b.outline();
  seamless(b);
  contact(b, 0, 14, 16, 3, 0.2);
  return { base: s };
}

export function fridge(): BufFurniture {
  if (TACTICAL_THEME) return tFridge();
  const s = floorSheet(1, 1, 24);
  const b = s.buf;
  const m = ramp('#dfe3e9', 0.05);
  topFace(b, 0, -23, 16, 3, m);
  frontFace(b, 0, -20, 16, 34, m);
  b.vline(0, -20, 13, m.hi);
  b.rect(1, 14, 14, 2, '#4a505c');
  // Divisão congelador / geladeira.
  b.hline(0, 15, -9, m.dd);
  b.hline(0, 15, -8, m.lt);
  // Puxadores.
  b.rect(12, -17, 2, 6, '#9aa2ae');
  b.vline(12, -17, -12, '#c3cad4');
  b.rect(12, -5, 2, 9, '#9aa2ae');
  b.vline(12, -5, 3, '#c3cad4');
  // Ímãs e bilhete.
  b.rect(3, -4, 4, 5, '#fbf4c0');
  b.hline(4, 6, -2, '#c9b77a');
  b.hline(4, 5, 0, '#c9b77a');
  b.set(5, -5, '#e05a5a');
  b.set(8, 4, '#3f7fd8');
  b.set(4, 6, '#4cae6a');
  b.set(3, -15, '#f2c14e');
  b.rect(6, -16, 3, 3, '#e47aa8');
  b.outline();
  contact(b, 0, 13, 16, 4, 0.24);
  return { base: s };
}

export function vendingMachine(): BufFurniture {
  if (TACTICAL_THEME) return tSupplyDispenser();
  const s = floorSheet(1, 1, 24);
  const b = s.buf;
  const m = ramp('#c94a52', 0.07);
  topFace(b, 0, -23, 16, 3, m);
  frontFace(b, 0, -20, 16, 36, m);
  b.vline(0, -20, 15, m.lt);
  // Vitrine iluminada com fileiras de snacks.
  const gx = 2;
  const gy = -18;
  const gw = 9;
  const gh = 22;
  b.rect(gx, gy, gw, gh, '#fff7e0');
  const r = rngOf(7, 61);
  const snacks = ['#e05a5a', '#f2c14e', '#3f7fd8', '#4cae6a', '#ec8a3c', '#8d66cf', '#e47aa8'];
  for (let row = 0; row < 5; row++) {
    const y = gy + 1 + row * 4;
    for (let k = 0; k < 3; k++) {
      const c = pick(r, snacks);
      b.rect(gx + 1 + k * 3, y, 2, 3, c);
      b.set(gx + 1 + k * 3, y, shade(c, 0.2));
    }
    b.hline(gx, gx + gw - 1, y + 3, '#c9b98a');
  }
  glass(b, gx, gy, gw, gh, { alpha: 0.18 });
  // Painel de moedas e botões.
  b.rect(12, -16, 3, 12, '#2f333d');
  b.rect(13, -15, 1, 2, '#7fd0ff');
  for (let i = 0; i < 4; i++) b.set(13, -11 + i * 2, '#d9dde3');
  b.rect(12, -2, 3, 2, '#22262f');
  // Saída de produtos.
  b.rect(2, 7, 9, 4, '#22262f');
  b.hline(2, 10, 7, '#3a3f4b');
  b.outline();
  contact(b, 0, 13, 16, 4, 0.26);
  s.rects = { glow: rectAt(s, gx, gy, gw, gh) };
  return { base: s };
}

export function cafeTable(): BufFurniture {
  if (TACTICAL_THEME) return tMessTable();
  const s = floorSheet(1, 1, 4);
  const b = s.buf;
  b.ellipse(8, 14.5, 3.5, 1.3, '#3a3f4b');
  b.rect(7, 7, 2, 7, '#4a505c');
  b.vline(7, 7, 13, '#6b7282');
  const t = ramp('#f2efe8', 0.05);
  b.ellipse(8, 5.5, 7, 3.5, t.dk);
  b.ellipse(8, 4.8, 7, 3.2, t.lt);
  b.set(4, 3, t.hi);
  b.set(5, 3, t.hi);
  // Vasinho com flor.
  b.rect(7, 2, 2, 2, '#8fc8f0');
  b.set(7, 1, '#4cae6a');
  b.set(8, 0, '#f26d8a');
  b.set(8, 1, '#4cae6a');
  b.outline();
  contact(b, 3, 13, 10, 3, 0.22);
  return { base: s };
}

const CAFE_SEAT = TACTICAL_THEME ? T.olive : ramp('#e0a84a', 0.07);

export function cafeChair(variant: string | undefined): BufFurniture {
  const v = variant ?? 'down';
  const s = floorSheet(1, 1, 10);
  const b = s.buf;
  const legs = TACTICAL_THEME ? '#3e4347' : '#3a3f4b';
  for (const x of [4, 11]) b.vline(x, 9, 15, legs);
  for (const x of [5, 10]) b.vline(x, 9, 13, TACTICAL_THEME ? T.steel.base : '#5a6070');
  // Cadeira dobrável: travessas em X entre as pernas.
  if (TACTICAL_THEME) {
    b.line(5, 10, 10, 14, T.steel.dk);
    b.line(10, 10, 5, 14, T.steel.lt);
  }
  const seat = () => {
    b.rect(3, 5, 10, 4, CAFE_SEAT.lt);
    b.hline(3, 12, 5, CAFE_SEAT.hi);
    b.hline(3, 12, 8, CAFE_SEAT.dk);
    b.hline(3, 12, 9, CAFE_SEAT.dd);
  };
  const backPanel = (x: number, y: number, w: number, h: number, m: Ramp) => {
    b.rect(x, y, w, h, m.base);
    b.hline(x, x + w - 1, y, m.hi);
    b.vline(x, y, y + h - 1, m.lt);
    b.vline(x + w - 1, y, y + h - 1, m.dk);
  };
  if (v === 'down') {
    for (const x of [4, 11]) b.vline(x, -3, 5, legs);
    backPanel(3, -6, 10, 5, CAFE_SEAT);
    if (TACTICAL_THEME) {
      // Encosto de chapa com furo de alça e estêncil.
      b.hline(6, 9, -5, CAFE_SEAT.dd);
      stencilMarks(b, 5, -3, 6, T.khaki.lt, 1);
    }
    seat();
    b.outline();
  contact(b, 2, 13, 12, 3, 0.2);
    return { base: s };
  }
  if (v === 'up') {
    seat();
    b.outline();
    const front = floorSheet(1, 1, 10);
    const f = front.buf;
    for (const x of [4, 11]) f.vline(x, 6, 10, legs);
    f.rect(3, 3, 10, 5, CAFE_SEAT.base);
    f.hline(3, 12, 3, CAFE_SEAT.hi);
    f.hline(3, 12, 7, CAFE_SEAT.dk);
    f.vline(12, 3, 7, CAFE_SEAT.dk);
    f.outline();
    return { base: s, front };
  }
  // left/right: encosto lateral (do lado oposto ao olhar).
  seat();
  const bx = v === 'left' ? 11 : 3;
  b.vline(bx + 1, 0, 8, legs);
  backPanel(bx, -6, 2, 12, CAFE_SEAT);
  b.outline();
  return { base: s };
}

// ------------------------------------------------------------------ lounge

const SOFA = TACTICAL_THEME ? T.canvas : ramp('#5b7fbd', 0.07);
const PILLOW = TACTICAL_THEME ? T.khaki : ramp('#ee8d3e', 0.07);

function pillow(b: PixelBuf, x: number, y: number): void {
  b.rect(x, y, 6, 5, PILLOW.base);
  b.hline(x + 1, x + 4, y, PILLOW.hi);
  b.vline(x, y + 1, y + 3, PILLOW.lt);
  b.vline(x + 5, y + 1, y + 4, PILLOW.dk);
  b.hline(x + 1, x + 5, y + 4, PILLOW.dk);
  b.set(x + 2, y + 2, PILLOW.dk);
}

/** Almofada estofada (retângulo com cantos arredondados, topo iluminado e base sombreada). */
function cushion(b: PixelBuf, x: number, y: number, w: number, h: number, m: Ramp, top = 1): void {
  b.rect(x, y, w, h, m.base);
  b.rect(x, y, w, top, m.lt);
  b.hline(x + 1, x + w - 2, y, m.hi);
  b.hline(x, x + w - 1, y + h - 1, m.dk);
  b.vline(x + w - 1, y + 1, y + h - 1, m.dk);
  b.vline(x, y + 1, y + h - 2, m.lt);
  b.set(x, y, m.base);
  b.set(x + w - 1, y, m.dk);
  b.set(x, y + h - 1, m.dk);
}

/** Braço enrolado do sofa/poltrona (topo arredondado + face frontal). */
function rollArm(b: PixelBuf, x: number, top: number, w: number, bottom: number): void {
  if (TACTICAL_THEME) {
    crateBlock(b, x, top, w, bottom - top + 1);
    return;
  }
  b.rect(x, top + 2, w, bottom - top - 2, SOFA.base);
  b.rect(x, top, w, 3, SOFA.lt);
  b.hline(x + 1, x + w - 2, top, SOFA.hi);
  b.hline(x, x + w - 1, top + 3, SOFA.dk);
  b.vline(x, top + 3, bottom, SOFA.lt);
  b.vline(x + w - 1, top + 1, bottom, SOFA.dk);
  b.hline(x, x + w - 1, bottom, SOFA.dd);
  b.clear(x, top);
  b.clear(x + w - 1, top);
}

function legs(b: PixelBuf, xs: readonly number[], y: number): void {
  if (TACTICAL_THEME) {
    // Calços de madeira escura sob os caixotes.
    for (const x of xs) b.rect(x, y, 2, 1, T.coyote.dd);
    return;
  }
  for (const x of xs) {
    b.rect(x, y, 2, 2, '#5a4232');
    b.set(x, y, '#7a5a42');
  }
}

export function sofa(variant: string | undefined): BufFurniture {
  const up = variant === 'up';
  const s = floorSheet(3, 1, 14);
  const b = s.buf;
  if (!up) {
    // Encosto com 3 almofadas (de frente para a câmera).
    b.rect(5, -11, 38, 13, SOFA.dk);
    b.hline(6, 41, -11, SOFA.base);
    for (let i = 0; i < 3; i++) cushion(b, 6 + i * 12, -10, 12, 11, SOFA, 2);
    b.hline(6, 41, 1, SOFA.dd);
    // Assento com 3 almofadas e borda frontal clara.
    for (let i = 0; i < 3; i++) cushion(b, 6 + i * 12, 2, 12, 7, ramp(SOFA.lt, 0.06), 4);
    // Base frontal e pés.
    b.rect(5, 9, 38, 5, SOFA.dk);
    b.hline(5, 42, 9, SOFA.base);
    b.hline(5, 42, 13, SOFA.dd);
    if (TACTICAL_THEME) crateFront(b, 5, 9, 38, 5);
    legs(b, [7, 39], 14);
    rollArm(b, 0, -5, 6, 13);
    rollArm(b, 42, -5, 6, 13);
    legs(b, [1, 45], 14);
    pillow(b, 7, -5);
    pillow(b, 35, -5);
    b.outline();
    contact(b, -1, 13, 50, 4, 0.24);
    return { base: s };
  }
  // De costas (quem senta olha para o norte): base = braços altos + faixa do assento + só o topo
  // das almofadas; front = traseira do encosto (painel contínuo, sem divisões de assento).
  backSeat(b, 5, 42);
  pillowTop(b, 8, -3);
  pillowTop(b, 34, -3);
  rollArm(b, 0, -7, 6, 13);
  rollArm(b, 42, -7, 6, 13);
  b.outline();
  contact(b, -1, 13, 50, 4, 0.24);
  const front = floorSheet(3, 1, 14);
  const f = front.buf;
  backPanel(f, 0, 47);
  darkLegs(f, [2, 23, 44], 14);
  f.outline();
  return { base: s, front };
}

/** Faixa do assento vista por trás do encosto (topo claro, borda de trás mais escura). */
function backSeat(b: PixelBuf, x0: number, x1: number): void {
  const seat = ramp(SOFA.lt, 0.06);
  b.rect(x0, -3, x1 - x0 + 1, 5, seat.base);
  b.hline(x0, x1, -3, SOFA.base);
  b.hline(x0, x1, -2, seat.lt);
}

/** Só a parte de cima da almofada, aparecendo acima do encosto. */
function pillowTop(b: PixelBuf, x: number, y: number): void {
  b.rect(x, y, 6, 4, PILLOW.base);
  b.hline(x + 1, x + 4, y, PILLOW.hi);
  b.vline(x, y + 1, y + 3, PILLOW.lt);
  b.vline(x + 5, y + 1, y + 3, PILLOW.dk);
  b.set(x, y, PILLOW.lt);
  b.set(x + 5, y, PILLOW.dk);
}

/**
 * Traseira do encosto (vista de trás): painel contínuo em 2 tons mais escuros que o assento, com
 * borda superior arredondada (rolo claro + vivo escuro), laterais sombreadas e base mais escura.
 * Ocupa y = 1..13 do footprint (cobre o tronco de quem senta; a cabeça fica à mostra).
 */
function backPanel(f: PixelBuf, x0: number, x1: number): void {
  const back = SOFA.dk;
  const deep = SOFA.dd;
  // Rolo superior arredondado.
  f.hline(x0 + 3, x1 - 3, 1, SOFA.lt);
  f.hline(x0 + 1, x1 - 1, 2, SOFA.base);
  f.hline(x0 + 4, x0 + 9, 2, SOFA.lt);
  f.hline(x0, x1, 3, SOFA.base);
  f.set(x0 + 2, 1, SOFA.base);
  f.set(x1 - 2, 1, SOFA.base);
  // Vivo sob o rolo e face traseira lisa.
  f.hline(x0, x1, 4, deep);
  f.rect(x0, 5, x1 - x0 + 1, 7, back);
  // Leve curvatura: a parte de cima da face pega um pouco mais de luz.
  f.hline(x0, x1, 5, mix(back, SOFA.base, 0.45));
  f.hline(x0, x1, 6, mix(back, SOFA.base, 0.2));
  f.vline(x0, 4, 12, SOFA.base);
  f.vline(x1, 3, 12, deep);
  // Base mais escura (sombra embaixo do estofado).
  f.hline(x0, x1, 12, deep);
  f.hline(x0, x1, 13, shade(deep, -0.05));
}

/** Pés escuros (vistos por trás). */
function darkLegs(b: PixelBuf, xs: readonly number[], y: number): void {
  for (const x of xs) {
    b.rect(x, y, 2, 2, '#3b2d24');
    b.set(x, y, '#54402f');
  }
}

export function armchair(variant: string | undefined): BufFurniture {
  const v = variant ?? 'down';
  const s = floorSheet(1, 1, 14);
  const b = s.buf;
  if (v === 'down' || v === 'up') {
    if (v === 'down') {
      b.rect(3, -10, 10, 12, SOFA.dk);
      cushion(b, 3, -9, 10, 10, SOFA, 2);
      cushion(b, 3, 2, 10, 7, ramp(SOFA.lt, 0.06), 4);
      b.rect(3, 9, 10, 5, SOFA.dk);
      b.hline(3, 12, 9, SOFA.base);
      if (TACTICAL_THEME) crateFront(b, 3, 9, 10, 5);
      rollArm(b, 0, -4, 4, 13);
      rollArm(b, 12, -4, 4, 13);
      legs(b, [1, 13], 14);
      b.outline();
      contact(b, -1, 13, 18, 4, 0.24);
      return { base: s };
    }
    // De costas: mesma leitura do sofá (braços altos, assento atrás do encosto, encosto contínuo).
    backSeat(b, 3, 12);
    rollArm(b, 0, -6, 4, 13);
    rollArm(b, 12, -6, 4, 13);
    b.outline();
    contact(b, -1, 13, 18, 4, 0.24);
    const front = floorSheet(1, 1, 14);
    const f = front.buf;
    backPanel(f, 0, 15);
    darkLegs(f, [1, 13], 14);
    f.outline();
    return { base: s, front };
  }
  // Lateral: encosto do lado oposto ao olhar, braço baixo na frente.
  const left = v === 'left';
  const bx = left ? 11 : 0;
  cushion(b, 1, 2, 14, 8, ramp(SOFA.lt, 0.06), 5);
  b.rect(1, 9, 14, 5, SOFA.dk);
  b.hline(1, 14, 9, SOFA.base);
  if (TACTICAL_THEME) crateFront(b, 1, 9, 14, 5);
  b.rect(bx, -10, 5, 24, SOFA.base);
  b.rect(bx, -10, 5, 2, SOFA.lt);
  b.hline(bx + 1, bx + 3, -10, SOFA.hi);
  b.vline(bx, -8, 13, SOFA.lt);
  b.vline(bx + 4, -8, 13, SOFA.dk);
  b.clear(bx, -10);
  b.clear(bx + 4, -10);
  b.hline(bx, bx + 4, 13, SOFA.dd);
  legs(b, [1, 13], 14);
  b.outline();
  contact(b, -1, 13, 18, 4, 0.24);
  return { base: s };
}

export function coffeeTable(seed: number): BufFurniture {
  if (TACTICAL_THEME) return tCrateTable(seed);
  const s = floorSheet(2, 1, 6);
  const b = s.buf;
  const w = ramp('#5d4637', 0.06);
  for (const x of [2, 28]) {
    b.rect(x, 9, 2, 5, w.dd);
  }
  topFace(b, 1, 1, 30, 8, w);
  woodGrain(b, 2, 2, 28, 6, w, seed);
  b.hline(1, 30, 9, w.base);
  b.hline(1, 30, 10, w.dk);
  // Fruteira.
  b.ellipse(11, 4, 4, 2, '#f4f2ee');
  b.ellipse(11, 4.6, 3, 1.3, '#d6d2c8');
  for (const [x, y, c] of [[9, 2, '#ee8d3e'], [11, 2, '#e05a5a'], [13, 3, '#ee8d3e'], [10, 3, '#7cc45a']] as const) {
    b.rect(x, y, 2, 2, c);
    b.set(x, y, shade(c, 0.2));
  }
  // Revistas.
  b.rect(19, 3, 8, 5, '#3f7fd8');
  b.rect(20, 2, 7, 5, '#f4f2ee');
  b.rect(21, 3, 4, 2, '#e05a5a');
  b.hline(21, 25, 6, '#b9c2d0');
  if (seed % 2) mug(b, 4, 4, '#f2c14e');
  b.outline();
  contact(b, 0, 12, 32, 4, 0.22);
  return { base: s };
}

export function pingpongTable(): BufFurniture {
  const s = floorSheet(3, 2, 8);
  const b = s.buf;
  const t = TACTICAL_THEME ? ramp('#556a3a', 0.07) : ramp('#2f72b8', 0.07);
  // Pernas.
  for (const x of [4, 42]) {
    b.rect(x, 22, 2, 9, '#3a3f4b');
    b.vline(x, 22, 30, '#5a6070');
  }
  b.rect(22, 22, 4, 7, '#3a3f4b');
  // Tampo.
  b.rect(0, -4, 48, 25, t.lt);
  b.hline(0, 47, 20, TACTICAL_THEME ? T.plywood.base : t.dk);
  b.hline(0, 47, 21, TACTICAL_THEME ? T.plywood.dk : t.dd);
  b.rect(0, 22, 48, 1, '#2a2e38');
  // Linhas brancas: borda e linha central (ao longo do comprimento).
  b.hline(0, 47, -4, '#f4f6f8');
  b.hline(0, 47, 19, '#f4f6f8');
  b.vline(0, -4, 19, '#f4f6f8');
  b.vline(47, -4, 19, '#f4f6f8');
  b.hline(1, 46, 7, 'rgba(244,246,248,0.8)');
  // Rede (corre norte-sul no meio), com altura.
  for (let y = -8; y <= 18; y++) {
    b.set(23, y, y % 2 ? 'rgba(240,244,248,0.55)' : 'rgba(40,46,60,0.45)');
    b.set(24, y, 'rgba(40,46,60,0.35)');
  }
  b.hline(22, 25, -9, '#3a3f4b');
  b.hline(22, 25, 19, '#3a3f4b');
  b.vline(22, -9, 15, '#f4f6f8');
  if (TACTICAL_THEME) {
    // Compensado com marca de estêncil nas pontas.
    stencilMarks(b, 3, 21, 8, T.plywood.dd, 2);
    stencilMarks(b, 37, 21, 8, T.plywood.dd, 4);
    for (const [x, y] of [[2, -2], [44, -2], [2, 17], [44, 17]] as const) b.set(x, y, t.dk);
  }
  b.outline();
  contact(b, 0, 27, 48, 5, 0.22);
  return { base: s };
}

const BEANBAG: Readonly<Record<string, string>> = TACTICAL_THEME
  ? // Sacos de lona: coiote, preto, cáqui e oliva (os nomes das variantes vêm do contrato).
    { red: '#8a6a4c', blue: '#3f4442', yellow: '#b39a6a', green: '#5f6b3d' }
  : { red: '#d65454', blue: '#4f78c8', yellow: '#e8b83f', green: '#4fae6a' };

export function beanbag(variant: string | undefined): BufFurniture {
  const m = ramp(BEANBAG[variant ?? 'red'] ?? BEANBAG.red, 0.08);
  const s = floorSheet(1, 1, 6);
  const b = s.buf;
  b.ellipse(8, 9, 7.5, 6, m.dk);
  b.ellipse(7.6, 8, 7, 5.5, m.base);
  b.ellipse(7.2, 6.5, 5, 3.5, m.lt);
  b.ellipse(8, 7.5, 3.5, 2, m.base);
  b.set(4, 4, m.hi);
  b.set(5, 3, m.hi);
  b.set(6, 3, m.hi);
  b.hline(4, 12, 14, m.dd);
  if (TACTICAL_THEME) {
    // Saco de transporte: duas cintas, alça no topo e costura.
    for (const x of [4, 11]) for (let y = 2; y <= 14; y++) if (b.alpha(x, y) > 0) b.set(x, y, shade(m.dd, -0.06));
    b.hline(6, 9, 1, m.dd);
    b.set(5, 2, m.dd);
    b.set(10, 2, m.dd);
    for (let x = 6; x <= 9; x += 2) b.set(x, 11, m.dk);
  }
  b.outline();
  contact(b, 0, 12, 16, 4, 0.24);
  return { base: s };
}

export function arcade(): BufFurniture {
  if (TACTICAL_THEME) return tArcade();
  const s = floorSheet(1, 1, 24);
  const b = s.buf;
  const m = ramp('#5b3f9a', 0.07);
  frontFace(b, 1, -20, 14, 36, m);
  b.vline(1, -20, 15, m.lt);
  // Letreiro aceso.
  b.rect(1, -22, 14, 4, '#f2c14e');
  b.hline(1, 14, -22, '#fff2b0');
  for (const x of [3, 5, 8, 10, 12]) b.set(x, -20, '#e05a5a');
  // Tela.
  b.rect(2, -17, 12, 9, '#1a1f2e');
  const screen = { x: 3, y: -16, w: 10, h: 7 };
  b.rect(screen.x, screen.y, screen.w, screen.h, '#14213d');
  b.rect(5, -13, 2, 2, '#7be08a');
  b.rect(9, -15, 2, 1, '#ff79c6');
  b.set(8, -11, '#f2c14e');
  // Painel de controle inclinado.
  b.rect(1, -7, 14, 4, m.hi);
  b.hline(1, 14, -4, m.dk);
  b.rect(4, -7, 2, 2, '#e05a5a');
  b.set(4, -7, '#ff9a9a');
  b.vline(5, -5, -4, '#2a2e38');
  for (const [x, c] of [[9, '#3f7fd8'], [11, '#f2c14e'], [13, '#4cae6a']] as const) b.set(x, -6, c);
  // Porta de fichas.
  b.rect(5, 2, 6, 6, m.dd);
  b.set(6, 4, '#f2a03d');
  b.set(9, 4, '#f2a03d');
  // Arte lateral.
  b.line(2, 13, 6, 9, '#e47aa8');
  b.line(3, 13, 7, 9, '#36b0b0');
  b.outline();
  contact(b, 0, 13, 16, 4, 0.26);
  s.rects = { screen: rectAt(s, screen.x, screen.y, screen.w, screen.h) };
  return { base: s };
}

// ------------------------------------------------------------------ banheiro

export function toiletStall(state: number): BufFurniture {
  const occupied = state >= 1;
  const panel = TACTICAL_THEME ? T.steel : ramp('#a9c4cf', 0.06);
  const rail = TACTICAL_THEME ? T.steelLight : ramp('#c3cad4', 0.06);
  const s = floorSheet(2, 2, 26, 3, 4);
  const b = s.buf;
  // Interior: sombra no piso e vaso ao fundo.
  const c = TACTICAL_THEME ? T.stainless : ramp('#f6f6f3', 0.045);
  b.rect(11, -7, 10, 6, c.base);
  b.hline(11, 20, -7, c.hi);
  b.hline(11, 20, -2, c.dk);
  b.rect(14, -6, 4, 1, '#c9ced6');
  b.ellipse(16, 3, 5.5, 4, c.dk);
  b.ellipse(16, 2.5, 5, 3.6, c.lt);
  b.ellipse(16, 3, 3, 2.2, '#cfd8e0');
  b.ellipse(16, 3.2, 2, 1.4, '#a9c9de');
  // Papel higiênico na divisória esquerda.
  b.rect(3, 2, 3, 3, '#ffffff');
  b.set(5, 4, '#d9dde3');
  b.vline(3, 2, 4, '#9aa2ae');
  // Divisórias laterais (topo visto de cima, de y=-22 até a frente).
  for (const x of [0, 29]) {
    b.rect(x, -22, 3, 34, panel.base);
    b.vline(x, -22, 11, panel.lt);
    b.vline(x + 2, -22, 11, panel.dk);
    b.hline(x, x + 2, -22, rail.hi);
  }
  b.outline();
  underRect(b, 2, 0, 28, 12, 'rgba(30,34,52,0.12)');
  // Frente: painel com porta (cobre o interior).
  const front = floorSheet(2, 2, 26, 3, 4);
  const f = front.buf;
  f.rect(0, 10, 32, 20, panel.base);
  f.rect(0, 9, 32, 2, rail.lt);
  f.hline(0, 31, 9, rail.hi);
  f.vline(0, 11, 29, panel.lt);
  f.vline(31, 11, 29, panel.dk);
  f.hline(0, 31, 29, panel.dk);
  // Pés metálicos (vão inferior).
  for (const x of [1, 30]) f.rect(x, 30, 1, 2, '#9aa2ae');
  if (TACTICAL_THEME) rivets(f, [[2, 11], [28, 11], [2, 27], [28, 27]], panel);
  if (occupied) {
    f.rect(7, 12, 18, 17, panel.lt);
    f.vline(7, 12, 28, panel.dk);
    f.vline(24, 12, 28, panel.dd);
    f.hline(7, 24, 12, panel.hi);
    f.rect(21, 18, 2, 3, '#5a6070');
    f.rect(21, 15, 2, 2, '#e05a5a');
    if (TACTICAL_THEME) louver(f, 10, 14, 9, 3, panel);
  } else {
    // Porta entreaberta: vão escuro à direita e folha estreita em perspectiva.
    f.rect(19, 12, 6, 17, '#3a4250');
    f.rect(20, 13, 4, 15, '#5a6577');
    f.rect(7, 12, 12, 17, panel.lt);
    f.vline(7, 12, 28, panel.dk);
    f.vline(18, 12, 28, panel.dk);
    f.hline(7, 18, 12, panel.hi);
    f.rect(16, 18, 2, 3, '#5a6070');
    f.rect(21, 15, 2, 2, '#5fd07a');
    if (TACTICAL_THEME) louver(f, 9, 14, 7, 3, panel);
  }
  f.outline();
  return { base: s, front };
}

export function sink(): BufFurniture {
  const s = floorSheet(1, 1, 10);
  const b = s.buf;
  const cab = TACTICAL_THEME ? T.steelLight : ramp('#e9e8e4', 0.05);
  frontFace(b, 1, 4, 14, 12, cab);
  b.vline(7, 5, 14, cab.dd);
  b.vline(8, 5, 14, cab.lt);
  b.rect(5, 8, 1, 3, '#9aa2ae');
  b.rect(10, 8, 1, 3, '#9aa2ae');
  topFace(b, 0, -3, 16, 7, TACTICAL_THEME ? T.stainless : ramp('#d7dbe1', 0.04));
  // Cuba de louça (no tático: cuba funda de inox).
  b.ellipse(8, 0.5, 5, 2.6, TACTICAL_THEME ? '#9aa2aa' : '#f8f8f6');
  b.ellipse(8, 0.8, 4, 1.8, TACTICAL_THEME ? '#6f777f' : '#dfe5ea');
  if (TACTICAL_THEME) rivets(b, [[2, 6], [12, 6]], cab);
  b.set(8, 1, '#7d8592');
  // Torneira e saboneteira.
  b.rect(7, -5, 2, 3, '#c3cad4');
  b.set(7, -5, '#ffffff');
  b.hline(7, 9, -6, '#d3d8df');
  b.rect(12, -4, 2, 3, TACTICAL_THEME ? T.khaki.base : '#f2c14e');
  b.set(12, -5, '#5a6070');
  b.outline();
  contact(b, 0, 14, 16, 3, 0.2);
  return { base: s };
}

// ------------------------------------------------------------------ recepção

export function receptionDesk(seed: number): BufFurniture {
  if (TACTICAL_THEME) return tCheckpointDesk(seed);
  const s = floorSheet(3, 1, 16);
  const b = s.buf;
  const wood = M.oak;
  const stone = ramp('#efede8', 0.04);
  // Área de trabalho (atrás) com monitor de costas e planta.
  topFace(b, 1, -10, 46, 6, M.white);
  monitorBack(b, 8, -15, 13, 7);
  pot(b, 38, -13, 5, 4, M.ceramic);
  foliage(b, 40.5, -16, 3.5, 3, M.leaf, seed + 1);
  // Balcão frontal com faixa de acento.
  frontFace(b, 0, -2, 48, 18, wood);
  woodGrain(b, 1, -1, 46, 14, wood, seed, true);
  b.rect(0, 5, 48, 3, '#3f7fd8');
  b.hline(0, 47, 5, '#6aa0ec');
  b.hline(0, 47, 7, '#2d62b3');
  b.rect(0, 14, 48, 2, wood.dd);
  // Tampo (prateleira de atendimento).
  topFace(b, -1, -6, 50, 5, stone);
  b.hline(-1, 48, -2, stone.dk);
  // Campainha, folhetos e caneta.
  b.rect(30, -6, 4, 2, '#d9a42e');
  b.set(31, -7, '#f2c14e');
  b.set(32, -7, '#f2c14e');
  papers(b, 4, -5, 7, 3);
  b.line(14, -4, 18, -5, '#3a3f4b');
  b.outline();
  contact(b, -1, 13, 50, 4, 0.24);
  return { base: s };
}

export function bench(): BufFurniture {
  const s = floorSheet(2, 1, 10);
  const b = s.buf;
  const w = TACTICAL_THEME ? T.steelLight : M.oak;
  const frame = TACTICAL_THEME ? '#2f3336' : '#3a3f4b';
  // Estrutura metálica.
  for (const x of [2, 29]) {
    b.vline(x, -6, 15, frame);
    b.vline(x + 1, 8, 15, '#5a6070');
  }
  b.hline(2, 30, 13, frame);
  // Encosto em ripas.
  for (const y of [-6, -3]) {
    b.rect(1, y, 30, 2, w.base);
    b.hline(1, 30, y, w.lt);
  }
  // Assento em ripas.
  for (const y of [2, 5]) {
    b.rect(0, y, 32, 3, w.lt);
    b.hline(0, 31, y, w.hi);
    b.hline(0, 31, y + 2, w.dk);
  }
  b.rect(0, 8, 32, 1, w.dd);
  if (TACTICAL_THEME) {
    // Chapa perfurada.
    for (let x = 3; x < 30; x += 3) {
      b.set(x, 3, w.dd);
      b.set(x + 1, 6, w.dd);
      b.set(x, -5, w.dd);
    }
  }
  b.outline();
  contact(b, 0, 13, 32, 3, 0.22);
  return { base: s };
}

// ================================================================== tema tático (base de operações)
// Mesmos footprints, folhas, âncoras e `rects` das versões de escritório: só muda o desenho.

/** Caixote de madeira (braço do sofá de caixotes): ripas horizontais, cantoneiras e estêncil. */
function crateBlock(b: PixelBuf, x: number, y: number, w: number, h: number): void {
  const m = T.plywood;
  b.rect(x, y, w, h, m.base);
  b.rect(x, y, w, 2, m.lt);
  b.hline(x, x + w - 1, y, m.hi);
  for (let yy = y + 5; yy < y + h - 1; yy += 4) b.hline(x, x + w - 1, yy, m.dk);
  b.vline(x, y + 2, y + h - 1, m.lt);
  b.vline(x + w - 1, y + 1, y + h - 1, m.dd);
  b.hline(x, x + w - 1, y + h - 1, m.dd);
  if (w >= 5) b.hline(x + 1, x + w - 3, y + Math.floor(h / 2) + 1, STENCIL_DARK);
}

/** Frente de caixote sob o assento (ripas + marcas de estêncil). */
function crateFront(b: PixelBuf, x: number, y: number, w: number, h: number): void {
  const m = T.plywood;
  b.rect(x, y, w, h, m.dk);
  b.hline(x, x + w - 1, y, m.base);
  b.hline(x, x + w - 1, y + 2, m.dd);
  b.hline(x, x + w - 1, y + h - 1, m.dd);
  for (let xx = x + 11; xx < x + w - 2; xx += 12) b.vline(xx, y, y + h - 1, m.dd);
  if (w >= 12) stencilMarks(b, x + 2, y + 3, Math.min(8, w - 4), STENCIL_DARK, w);
}

/** Bancada de cozinha de campanha: gabinete e tampo de inox, rodapé de chapa preta. */
function tCounterBase(b: PixelBuf, kind: 'plain' | 'drawers' | 'doors'): void {
  const cab = T.steelLight;
  const top = T.stainless;
  frontFace(b, 0, 5, 16, 11, cab);
  b.vline(0, 5, 15, cab.lt);
  b.vline(15, 5, 13, cab.dd);
  b.rect(1, 14, 14, 2, '#2f3336');
  b.hline(1, 14, 14, '#454a4e');
  if (kind === 'drawers') {
    for (const y of [8, 11]) {
      b.hline(1, 14, y, cab.dd);
      b.hline(1, 14, y + 1, cab.lt);
    }
    for (const y of [6, 9, 12]) b.rect(5, y, 6, 1, '#3e4347');
  } else if (kind === 'doors') {
    b.vline(7, 6, 13, cab.dd);
    b.vline(8, 6, 13, cab.lt);
    b.rect(5, 8, 1, 3, '#3e4347');
    b.rect(10, 8, 1, 3, '#3e4347');
  } else {
    louver(b, 3, 7, 7, 3, cab);
    b.rect(12, 8, 1, 3, '#3e4347');
  }
  rivets(b, [[1, 6], [13, 6]], cab);
  // Tampo de inox escovado com borda dobrada.
  topFace(b, 0, -3, 16, 7, top);
  b.hline(2, 7, -1, top.base);
  b.hline(9, 13, 1, top.base);
  b.hline(0, 15, 3, top.hi);
  b.hline(0, 15, 4, '#6d747b');
}

function tCounter(kind: 'plain' | 'drawers'): BufFurniture {
  const s = floorSheet(1, 1, 6);
  tCounterBase(s.buf, kind);
  s.buf.outline();
  seamless(s.buf);
  contact(s.buf, 0, 14, 16, 3, 0.2);
  return { base: s };
}

function tCounterSink(): BufFurniture {
  const s = floorSheet(1, 1, 10);
  const b = s.buf;
  tCounterBase(b, 'doors');
  // Cuba funda de inox.
  b.rect(2, -2, 12, 5, '#9aa2aa');
  b.rect(3, -1, 10, 4, '#666e76');
  b.hline(3, 12, -1, '#4c535a');
  b.set(8, 2, '#2d3237');
  b.hline(2, 13, -2, '#d6dbdf');
  // Torneira industrial de alavanca.
  b.rect(7, -7, 2, 6, '#8d959c');
  b.hline(7, 11, -8, '#b5bcc2');
  b.vline(11, -8, -6, '#8d959c');
  b.set(8, -8, '#e1e5e8');
  b.rect(4, -5, 3, 1, SAFETY_ORANGE);
  b.set(6, -4, '#3e4347');
  b.outline();
  seamless(b);
  contact(b, 0, 14, 16, 3, 0.2);
  return { base: s };
}

/** Garrafão térmico de campanha (urna de café com torneira e visor de nível). */
function tCoffeeUrn(state: number): BufFurniture {
  const s = floorSheet(1, 1, 18);
  const b = s.buf;
  tCounterBase(b, 'drawers');
  const on = state >= 1;
  const st = T.steelLight;
  // Corpo cilíndrico.
  b.rect(3, -14, 10, 14, st.base);
  b.vline(3, -14, -1, st.lt);
  b.vline(4, -14, -1, st.hi);
  b.vline(11, -14, -1, st.dk);
  b.vline(12, -14, -1, st.dd);
  b.hline(3, 12, -11, st.dk);
  b.hline(3, 12, -1, st.dd);
  // Tampa em domo e pegador.
  b.hline(4, 11, -15, st.lt);
  b.hline(5, 10, -16, st.hi);
  b.rect(7, -18, 2, 2, '#2f3336');
  // Alças laterais.
  b.vline(2, -10, -7, '#2f3336');
  b.vline(13, -10, -7, '#2f3336');
  // Etiqueta de estêncil oliva.
  b.rect(5, -10, 5, 4, T.olive.base);
  stencilMarks(b, 6, -9, 3, STENCIL, 1);
  // Visor de nível (tubo de vidro) com café.
  b.vline(11, -10, -3, '#2a2f33');
  for (let y = on ? -8 : -5; y <= -3; y++) b.set(11, y, '#7a4a2a');
  // Luz de aquecimento.
  b.set(10, -13, on ? '#5fd07a' : '#3b4a3f');
  // Torneira e caneca esmaltada.
  b.rect(6, -5, 4, 1, '#2f3336');
  b.set(7, -4, '#2f3336');
  b.rect(6, -2, 4, 3, '#d8d2bf');
  b.hline(6, 9, -2, on ? '#6b4226' : '#b9b29c');
  b.set(10, -1, '#b9b29c');
  if (on) b.set(7, -3, '#7a4a2a');
  b.outline();
  seamless(b);
  contact(b, 0, 14, 16, 3, 0.2);
  if (on) {
    for (const [x, y, a] of [[10, -17, 0.55], [11, -18, 0.45], [10, -18, 0.3]] as const) b.set(x, y, `rgba(255,255,255,${a})`);
  }
  return { base: s };
}

/** Aquecedor de rações: caixa oliva com tampa de grelha, visor e botão giratório. */
function tRationHeater(): BufFurniture {
  const s = floorSheet(1, 1, 12);
  const b = s.buf;
  tCounterBase(b, 'plain');
  const m = T.olive;
  topFace(b, 1, -11, 14, 3, m);
  stencilMarks(b, 3, -10, 9, T.khaki.lt, 3);
  frontFace(b, 1, -8, 14, 9, m);
  // Porta de chapa com grelha e trinco.
  b.rect(2, -7, 9, 7, T.oliveDark.base);
  b.hline(2, 10, -7, T.oliveDark.hi);
  louver(b, 3, -6, 7, 3, T.oliveDark);
  b.rect(9, -4, 2, 2, '#2f3336');
  b.set(9, -4, T.steel.hi);
  // Visor de temperatura e botão.
  b.rect(12, -7, 2, 2, '#1b1f1b');
  b.set(12, -7, SAFETY_ORANGE);
  b.set(13, -7, SAFETY_ORANGE);
  b.rect(12, -4, 2, 2, '#2f3336');
  b.set(12, -4, T.steel.hi);
  rivets(b, [[1, -2], [13, -2]], m);
  b.outline();
  seamless(b);
  contact(b, 0, 14, 16, 3, 0.2);
  return { base: s };
}

/** Geladeira militar oliva: duas portas, travas de alavanca, dobradiças e placa de estêncil. */
function tFridge(): BufFurniture {
  const s = floorSheet(1, 1, 24);
  const b = s.buf;
  const m = T.olive;
  topFace(b, 0, -23, 16, 3, m);
  frontFace(b, 0, -20, 16, 34, m);
  b.vline(0, -20, 13, m.hi);
  b.rect(1, 14, 14, 2, '#2a2e2a');
  // Divisão congelador / geladeira.
  b.hline(0, 15, -9, m.dd);
  b.hline(0, 15, -8, m.lt);
  // Dobradiças.
  for (const y of [-18, -12, -6, 9]) b.rect(0, y, 1, 2, T.steel.base);
  // Travas de alavanca.
  for (const [y0, y1] of [[-17, -12], [-5, 3]] as const) {
    b.rect(12, y0, 2, y1 - y0 + 1, '#2f3336');
    b.vline(12, y0, y1, '#4a5054');
    b.set(13, y0 + 1, T.steel.hi);
  }
  // Placa de identificação e estêncil.
  b.rect(3, -17, 7, 4, T.khaki.base);
  b.hline(3, 9, -17, T.khaki.lt);
  stencilMarks(b, 4, -16, 5, STENCIL_DARK, 2);
  stencilMarks(b, 3, -4, 7, STENCIL, 5);
  // Termômetro de mostrador.
  b.rect(3, 1, 4, 4, '#d8d2bf');
  b.vline(5, 2, 3, '#c04a3a');
  b.set(4, 4, '#2f3336');
  // Grelha de ventilação.
  louver(b, 2, 9, 12, 2, m);
  rivets(b, [[2, -19], [13, -19]], m);
  b.outline();
  contact(b, 0, 13, 16, 4, 0.24);
  return { base: s };
}

/** Dispensador de suprimentos: corpo oliva, vitrine iluminada com rações, água e baterias. */
function tSupplyDispenser(): BufFurniture {
  const s = floorSheet(1, 1, 24);
  const b = s.buf;
  const m = T.olive;
  topFace(b, 0, -23, 16, 3, m);
  frontFace(b, 0, -20, 16, 36, m);
  b.vline(0, -20, 15, m.lt);
  // Faixa de estêncil no topo.
  stencilMarks(b, 2, -20, 12, STENCIL, 0);
  const gx = 2;
  const gy = -18;
  const gw = 9;
  const gh = 22;
  b.rect(gx, gy, gw, gh, '#eae6d2');
  const r = rngOf(7, 61);
  const goods = [T.khaki.base, T.coyote.base, '#7a8a4a', '#6fa8c8', SAFETY_YELLOW, '#4a5054'];
  for (let row = 0; row < 5; row++) {
    const y = gy + 1 + row * 4;
    for (let k = 0; k < 3; k++) {
      const c = pick(r, goods);
      b.rect(gx + 1 + k * 3, y, 2, 3, c);
      b.set(gx + 1 + k * 3, y, shade(c, 0.2));
      if (c === SAFETY_YELLOW) b.hline(gx + 1 + k * 3, gx + 2 + k * 3, y + 2, '#2f3336');
    }
    b.hline(gx, gx + gw - 1, y + 3, T.steel.base);
  }
  glass(b, gx, gy, gw, gh, { alpha: 0.16 });
  // Teclado de código e leitor.
  b.rect(12, -16, 3, 12, '#2a2e2a');
  b.rect(13, -15, 1, 2, '#7be08a');
  for (let i = 0; i < 4; i++) b.set(13, -11 + i * 2, T.khaki.lt);
  b.rect(12, -2, 3, 2, '#1b1f1b');
  // Saída e faixa de alerta.
  b.rect(2, 7, 9, 4, '#1f2320');
  b.hline(2, 10, 7, '#3a3f3a');
  hazard(b, 1, 12, 14, 2, 4);
  rivets(b, [[12, -19], [12, 5]], m);
  b.outline();
  contact(b, 0, 13, 16, 4, 0.26);
  s.rects = { glow: rectAt(s, gx, gy, gw, gh) };
  return { base: s };
}

/** Mesa dobrável de rancho: tampo oliva com borda de aço e pernas em A; bandeja e caneca. */
function tMessTable(): BufFurniture {
  const s = floorSheet(1, 1, 4);
  const b = s.buf;
  const leg = '#3e4347';
  b.line(3, 9, 1, 14, leg);
  b.line(12, 9, 14, 14, leg);
  b.line(4, 9, 3, 14, T.steel.base);
  b.line(11, 9, 12, 14, T.steel.dk);
  b.hline(3, 12, 12, leg);
  topFace(b, 1, 1, 14, 7, T.olive);
  b.rect(1, 8, 14, 2, T.steel.base);
  b.hline(1, 14, 8, T.steel.lt);
  b.hline(1, 14, 9, T.steel.dk);
  // Bandeja de inox com comida e caneca.
  b.rect(3, 2, 7, 4, T.stainless.base);
  b.hline(3, 9, 2, T.stainless.hi);
  b.rect(4, 3, 2, 2, T.khaki.base);
  b.rect(7, 3, 2, 2, '#7a8a4a');
  mug(b, 10, 2, T.steel.base);
  b.outline();
  contact(b, 0, 13, 16, 3, 0.22);
  return { base: s };
}

/** Mesa de centro de caixote: tampo de ripas e face com estêncil; mapa e rádio. */
function tCrateTable(seed: number): BufFurniture {
  const s = floorSheet(2, 1, 6);
  const b = s.buf;
  const w = T.plywood;
  topFace(b, 1, 1, 30, 8, w);
  for (const y of [3, 6]) b.hline(1, 30, y, w.base);
  woodGrain(b, 2, 2, 28, 6, w, seed);
  // Face frontal do caixote.
  b.rect(1, 9, 30, 5, w.dk);
  b.hline(1, 30, 9, w.base);
  b.hline(1, 30, 11, w.dd);
  b.hline(1, 30, 13, w.dd);
  for (const x of [1, 30]) b.vline(x, 9, 13, T.coyote.dd);
  stencilMarks(b, 5, 12, 9, STENCIL_DARK, seed);
  b.rect(22, 10, 4, 1, T.khaki.lt);
  // Mapa dobrado com rota.
  b.rect(4, 2, 9, 5, '#d9cfa8');
  b.vline(8, 2, 6, '#bfb38a');
  b.line(5, 5, 11, 3, '#b94a3a');
  b.set(11, 3, SAFETY_ORANGE);
  // Rádio portátil.
  b.rect(18, 3, 4, 5, '#2f3336');
  b.vline(21, 0, 3, '#2f3336');
  b.set(19, 4, '#7be08a');
  b.hline(19, 20, 6, '#4a5054');
  if (seed % 2) mug(b, 25, 3, T.olive.base);
  b.outline();
  contact(b, 0, 12, 32, 4, 0.22);
  return { base: s };
}

/** Fliperama de excedente militar: gabinete oliva rebitado, letreiro de estêncil, faixa de alerta. */
function tArcade(): BufFurniture {
  const s = floorSheet(1, 1, 24);
  const b = s.buf;
  const m = T.olive;
  frontFace(b, 1, -20, 14, 36, m);
  b.vline(1, -20, 15, m.lt);
  // Letreiro: chapa cáqui com estêncil e luz âmbar.
  b.rect(1, -22, 14, 4, T.khaki.base);
  b.hline(1, 14, -22, T.khaki.hi);
  stencilMarks(b, 3, -21, 10, STENCIL_DARK, 2);
  b.set(13, -20, SAFETY_ORANGE);
  // Tela.
  b.rect(2, -17, 12, 9, '#1b1f1b');
  const screen = { x: 3, y: -16, w: 10, h: 7 };
  b.rect(screen.x, screen.y, screen.w, screen.h, '#16241a');
  b.rect(5, -13, 2, 2, '#7be08a');
  b.rect(9, -15, 2, 1, SAFETY_YELLOW);
  b.set(8, -11, '#7be08a');
  // Painel de controle de chapa.
  b.rect(1, -7, 14, 4, T.steel.lt);
  b.hline(1, 14, -4, T.steel.dk);
  b.rect(4, -7, 2, 2, '#2f3336');
  b.set(4, -7, T.steel.hi);
  b.vline(5, -5, -4, '#2a2e38');
  for (const [x, c] of [[9, SAFETY_ORANGE], [11, SAFETY_YELLOW], [13, '#7be08a']] as const) b.set(x, -6, c);
  // Porta de fichas e rebites.
  b.rect(5, 2, 6, 6, T.oliveDark.dd);
  b.set(6, 4, SAFETY_YELLOW);
  b.set(9, 4, SAFETY_YELLOW);
  rivets(b, [[2, -1], [13, -1], [2, 9], [13, 9]], m);
  hazard(b, 2, 11, 12, 2, 4);
  b.outline();
  contact(b, 0, 13, 16, 4, 0.26);
  s.rects = { screen: rectAt(s, screen.x, screen.y, screen.w, screen.h) };
  return { base: s };
}

/** Posto de controle da guarda: balcão de chapa sobre sacos de areia, monitor pequeno e rádio. */
function tCheckpointDesk(seed: number): BufFurniture {
  const s = floorSheet(3, 1, 16);
  const b = s.buf;
  // Área de trabalho (atrás): mesa de aço, monitor de costas, rádio com antena.
  topFace(b, 1, -10, 46, 6, T.steel);
  monitorBack(b, 8, -15, 13, 7, 'mid');
  b.rect(36, -13, 6, 5, '#2f3336');
  b.hline(36, 41, -13, '#4a5054');
  b.vline(41, -16, -13, '#2f3336');
  b.set(37, -11, seed % 2 ? '#7be08a' : SAFETY_ORANGE);
  // Muro de sacos de areia na frente.
  sandbagWall(b, 0, -2, 48, 16, 8, 5);
  b.rect(0, 14, 48, 2, T.coyote.dd);
  // Placa de controle com faixa de alerta.
  b.rect(18, 2, 12, 6, T.steel.base);
  b.hline(18, 29, 2, T.steel.hi);
  hazard(b, 19, 3, 10, 2, 4);
  stencilMarks(b, 20, 6, 8, STENCIL, 1);
  // Tampo: chapa de aço rebitada.
  topFace(b, -1, -6, 50, 5, T.steelLight);
  b.hline(-1, 48, -2, T.steelLight.dk);
  rivets(b, [[1, -4], [23, -4], [45, -4]], T.steelLight);
  // Prancheta e caneta.
  papers(b, 4, -5, 7, 3);
  b.hline(5, 9, -6, '#3e4347');
  b.line(14, -4, 18, -5, '#2f3336');
  b.outline();
  contact(b, -1, 13, 50, 4, 0.24);
  return { base: s };
}
