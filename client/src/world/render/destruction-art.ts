// Arte da Destruição (tema do quartel-general). Funções puras de desenho em coordenadas de MUNDO (px), deterministas por seed; t em ms anima fogo e fumaça.
//
// Organização: tudo é descrito como uma lista de "ops" (sprites PixelBuf em cache + retângulos
// de 1 cor), geradas por funções puras (sem DOM). As funções draw* só executam as ops no ctx
// (drawImage de canvases em cache + fillRect), então o custo por quadro é mínimo: a parte
// estática de cada área/parede/vidro é um único sprite; só fogo, brasas e fumaça mudam com t.
import type { Rect } from '../../art/api';
import { PixelBuf } from '../../art/core/pixbuf';
import { h3 } from '../../art/surfaces/floor';

// ------------------------------------------------------------------ ops e cache

/** Operação de desenho: sprite em cache ou retângulo de cor sólida. */
export type DmgOp =
  | { k: 'buf'; buf: PixelBuf; x: number; y: number; a: number }
  | { k: 'px'; x: number; y: number; w: number; h: number; c: string; a: number };

const bufCache = new Map<string, PixelBuf>();
function cached(key: string, make: () => PixelBuf): PixelBuf {
  let b = bufCache.get(key);
  if (!b) {
    if (bufCache.size > 400) bufCache.clear();
    b = make();
    bufCache.set(key, b);
  }
  return b;
}

const canvasCache = new WeakMap<PixelBuf, HTMLCanvasElement>();
function canvasOf(buf: PixelBuf): HTMLCanvasElement | null {
  let c = canvasCache.get(buf);
  if (c) return c;
  if (typeof document === 'undefined') return null;
  c = document.createElement('canvas');
  c.width = Math.max(1, buf.w);
  c.height = Math.max(1, buf.h);
  const g = c.getContext('2d');
  if (g && buf.w > 0 && buf.h > 0) g.putImageData(new ImageData(buf.data, buf.w, buf.h), 0, 0);
  canvasCache.set(buf, c);
  return c;
}

/** Executa as ops num contexto 2D (fillRect + drawImage + globalAlpha). */
export function runOps(ctx: CanvasRenderingContext2D, ops: readonly DmgOp[]): void {
  const prev = ctx.globalAlpha;
  for (const o of ops) {
    if (o.a <= 0) continue;
    ctx.globalAlpha = prev * o.a;
    if (o.k === 'px') {
      ctx.fillStyle = o.c;
      ctx.fillRect(o.x, o.y, o.w, o.h);
    } else {
      const c = canvasOf(o.buf);
      if (c) ctx.drawImage(c, o.x, o.y);
    }
  }
  ctx.globalAlpha = prev;
}

/** Gerador determinístico 0..1 a partir de (i, j) e da semente. */
function rng(seed: number) {
  return (i: number, j = 0): number => h3(i, j, 0x5eed, seed) / 4294967296;
}

const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a.toFixed(3)})`;

// ------------------------------------------------------------------ paleta

const CONC_TOP = ['#b4afa5', '#a29d93', '#c3beb3'];
const CONC_FRONT = ['#7a756c', '#6c675f', '#857f75'];
const BRICK = ['#9a4c39', '#86402f', '#a85a44'];
const BRICK_DK = '#5e2c21';
const MORTAR = '#b8ab97';
const REBAR = '#6e4430';
const REBAR_LT = '#a8693f';
const SOOT = '#17130f';
const HOLE = '#120f0d';

// ------------------------------------------------------------------ layout da área

interface Pile {
  x: number;
  y: number;
  r: number;
}
interface AreaLayout {
  piles: Pile[];
  scorch: Pile[];
  fires: { x: number; y: number; v: number }[];
}

const layoutCache = new Map<string, AreaLayout>();

/** Ponto perto das bordas/cantos (deixa o centro andável legível). */
function edgePoint(r: (i: number, j?: number) => number, i: number, w: number, h: number, margin: number): [number, number] {
  const depthMax = Math.min(w, h) * 0.26;
  const d = margin + Math.pow(r(i, 2), 1.6) * depthMax;
  const along = r(i, 1);
  if (r(i, 3) < 0.35) {
    // canto
    const c = Math.floor(r(i, 4) * 4);
    const e = margin + r(i, 5) * depthMax;
    const x = c & 1 ? w - 1 - d : d;
    const y = c & 2 ? h - 1 - e : e;
    return [Math.round(x), Math.round(y)];
  }
  const side = Math.floor(r(i, 0) * 4);
  if (side === 0) return [Math.round(margin + along * (w - 2 * margin)), Math.round(d)];
  if (side === 1) return [Math.round(margin + along * (w - 2 * margin)), Math.round(h - 1 - d)];
  if (side === 2) return [Math.round(d), Math.round(margin + along * (h - 2 * margin))];
  return [Math.round(w - 1 - d), Math.round(margin + along * (h - 2 * margin))];
}

function areaLayout(w: number, h: number, seed: number, iq: number): AreaLayout {
  const key = `${w}x${h}|${seed}|${iq}`;
  const hit = layoutCache.get(key);
  if (hit) return hit;
  const I = iq / 10;
  const r = rng(seed);
  const scale = Math.sqrt((w * h) / (16 * 12 * 256));
  const piles: Pile[] = [];
  const nP = Math.max(1, Math.round((1.5 + 6 * I) * scale));
  for (let i = 0; i < nP; i++) {
    const rad = 6 + Math.round(r(100 + i, 9) * (4 + 8 * I));
    const [x, y] = edgePoint(r, 100 + i, w, h, rad + 2);
    piles.push({ x, y, r: rad });
  }
  const scorch: Pile[] = [];
  const nS = Math.max(1, Math.round((1 + 3 * I) * scale));
  for (let i = 0; i < nS; i++) {
    const rad = 7 + Math.round(r(200 + i, 9) * (5 + 8 * I));
    // metade dos queimados fica junto de um monte de entulho
    if (i % 2 === 0 && piles[i % piles.length]) {
      const p = piles[i % piles.length];
      scorch.push({ x: p.x + Math.round((r(200 + i, 7) - 0.5) * 8), y: p.y + Math.round((r(200 + i, 8) - 0.5) * 6), r: rad });
    } else {
      const [x, y] = edgePoint(r, 200 + i, w, h, 4);
      scorch.push({ x, y, r: rad });
    }
  }
  const fires: AreaLayout['fires'] = [];
  if (I > 0.5) {
    const nF = I >= 0.85 ? 2 : 1;
    for (let i = 0; i < nF && i < piles.length; i++) {
      const p = piles[(i * 2) % piles.length];
      const fx = Math.max(5, Math.min(w - 6, p.x + Math.round((r(300 + i, 1) - 0.5) * p.r)));
      const fy = Math.max(14, Math.min(h - 2, p.y + 1));
      fires.push({ x: fx, y: fy, v: i });
    }
  }
  const out = { piles, scorch, fires };
  if (layoutCache.size > 200) layoutCache.clear();
  layoutCache.set(key, out);
  return out;
}

// ------------------------------------------------------------------ peças estáticas

/** Marca de queimado: mancha radial escura com borda irregular (ruído por ângulo) e cinzas. */
function paintScorch(b: PixelBuf, s: Pile, r: (i: number, j?: number) => number, id: number): void {
  const lobes: number[] = [];
  for (let k = 0; k < 12; k++) lobes.push(0.7 + 0.45 * r(id, 10 + k));
  for (let y = s.y - s.r - 4; y <= s.y + s.r + 4; y++) {
    for (let x = s.x - s.r - 6; x <= s.x + s.r + 6; x++) {
      const dx = (x - s.x) / 1.25;
      const dy = y - s.y;
      const ang = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) * 12;
      const a0 = Math.floor(ang) % 12;
      const f = ang - Math.floor(ang);
      const lobe = lobes[a0] * (1 - f) + lobes[(a0 + 1) % 12] * f;
      const d = Math.sqrt(dx * dx + dy * dy) / (s.r * lobe);
      if (d > 1) continue;
      const jit = h3(x, y, id, 77) / 4294967296;
      if (d > 0.75 && jit < (d - 0.75) * 3) continue; // borda pontilhada
      const a = Math.min(0.85, 0.85 * Math.pow(1 - d, 0.55) + 0.12);
      if (d < 0.35 && jit < 0.18) b.set(x, y, rgba(70, 66, 62, 0.9)); // cinza
      else if (jit > 0.97) b.set(x, y, rgba(150, 142, 132, 0.7)); // floco de cinza claro
      else b.set(x, y, rgba(24, 19, 15, a));
    }
  }
}

/** Rachadura: passeio aleatório fino e escuro, com ramificações e um fio de luz embaixo. */
function paintCrack(b: PixelBuf, x0: number, y0: number, ang: number, len: number, r: (i: number, j?: number) => number, id: number, depth = 0): void {
  let x = x0;
  let y = y0;
  let a = ang;
  for (let s = 0; s < len; s++) {
    a += (r(id, s) - 0.5) * 0.9;
    x += Math.cos(a);
    y += Math.sin(a) * 0.8;
    const px = Math.round(x);
    const py = Math.round(y);
    b.set(px, py, rgba(22, 19, 17, 0.85 - (s / len) * 0.35));
    b.set(px, py + 1, rgba(255, 250, 240, 0.12));
    if (s < len * 0.3 && depth === 0 && r(id, 500 + s) < 0.25) b.set(px + 1, py, rgba(22, 19, 17, 0.5));
    if (depth < 2 && s > 3 && r(id, 900 + s) < 0.07) {
      paintCrack(b, x, y, a + (r(id, 950 + s) < 0.5 ? -1 : 1) * (0.6 + r(id, 970 + s)), Math.round(len * 0.45), r, id * 31 + s, depth + 1);
    }
  }
}

/** Pedaço de concreto/tijolo: topo claro, face frontal escura, canto quebrado. */
function paintChunk(b: PixelBuf, x: number, y: number, s: number, r: (i: number, j?: number) => number, id: number): void {
  const brick = r(id, 1) < 0.22;
  const v = Math.floor(r(id, 2) * 3);
  const top = brick ? BRICK[v] : CONC_TOP[v];
  const front = brick ? BRICK_DK : CONC_FRONT[v];
  const w = s + Math.round(r(id, 3) * 2);
  const hTop = Math.max(1, s - 1);
  const cut = Math.floor(r(id, 4) * 4);
  for (let yy = 0; yy < hTop + 1; yy++) {
    for (let xx = 0; xx < w; xx++) {
      // canto cortado (pedaço irregular)
      if (cut === 0 && xx === 0 && yy === 0) continue;
      if (cut === 1 && xx === w - 1 && yy === 0) continue;
      if (cut === 2 && xx === w - 1 && yy === hTop) continue;
      const c = yy === hTop ? front : xx === 0 && yy === 0 ? '#d4cfc4' : top;
      b.set(x + xx, y + yy, c);
    }
  }
  if (brick && w >= 3) b.set(x + 1, y + Math.floor(hTop / 2), MORTAR);
  else if (w >= 3 && r(id, 5) < 0.5) b.set(x + 1 + Math.floor(r(id, 6) * (w - 2)), y + 1, '#8c877e');
}

/** Monte de entulho: cascalho, pedaços de concreto/tijolo ordenados por y, vergalhões tortos. */
function paintPile(b: PixelBuf, p: Pile, r: (i: number, j?: number) => number, id: number): void {
  // sombra / base de cascalho
  b.shadow(p.x, p.y + 2, p.r + 2, p.r * 0.55 + 1.5, '#15120f', 0.35);
  for (let k = 0; k < p.r * 7; k++) {
    const a = r(id, 10 + k) * Math.PI * 2;
    const d = Math.sqrt(r(id, 400 + k)) * (p.r + 2);
    const gx = Math.round(p.x + Math.cos(a) * d);
    const gy = Math.round(p.y + 1 + Math.sin(a) * d * 0.55);
    b.set(gx, gy, r(id, 800 + k) < 0.5 ? '#8a857b' : '#6d685f');
  }
  const layer = new PixelBuf(b.w, b.h);
  const n = 6 + p.r * 3;
  const parts: { x: number; y: number; s: number; i: number }[] = [];
  for (let k = 0; k < n; k++) {
    const a = r(id, 1000 + k) * Math.PI * 2;
    const d = Math.pow(r(id, 1100 + k), 0.7) * p.r * 1.1;
    const s = Math.max(2, Math.round(Math.max(0, 1 - d / p.r) * 3 + 1 + r(id, 1200 + k) * 2.5));
    // monte: pedaços do centro ficam mais altos (y menor)
    const lift = Math.round(Math.max(0, 1 - d / p.r) * p.r * 0.5);
    parts.push({ x: Math.round(p.x + Math.cos(a) * d - s / 2), y: Math.round(p.y + Math.sin(a) * d * 0.6 - lift - s / 2), s, i: k });
  }
  parts.sort((a, c) => a.y - c.y);
  // vergalhões atrás dos pedaços
  const nR = 1 + Math.floor(r(id, 3) * (p.r > 8 ? 3 : 2));
  for (let k = 0; k < nR; k++) {
    const sx = p.x + Math.round((r(id, 1300 + k) - 0.5) * p.r);
    const sy = p.y - Math.round(p.r * 0.3);
    const ang = -Math.PI / 2 + (r(id, 1400 + k) - 0.5) * 2.2;
    const len = 5 + Math.round(r(id, 1500 + k) * 5);
    const ex = sx + Math.round(Math.cos(ang) * len);
    const ey = sy + Math.round(Math.sin(ang) * len * 0.8);
    layer.line(sx, sy, ex, ey, REBAR);
    layer.set(ex, ey, REBAR_LT);
    if (r(id, 1600 + k) < 0.5) layer.set(ex + (ex > sx ? 1 : -1), ey + 1, REBAR); // ponta dobrada
  }
  for (const c of parts) paintChunk(layer, c.x, c.y, c.s, r, id * 97 + c.i);
  layer.outline();
  b.draw(layer, 0, 0);
}

/** Camada estática da área (piso danificado) em coordenadas locais. */
export function areaDamageBuf(w: number, h: number, seed: number, intensity: number): PixelBuf {
  const iq = Math.round(Math.max(0, Math.min(1, intensity)) * 10);
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  return cached(`area|${W}x${H}|${seed}|${iq}`, () => {
    const I = iq / 10;
    const L = areaLayout(W, H, seed, iq);
    const r = rng(seed);
    const b = new PixelBuf(W, H);
    const scale = Math.sqrt((W * H) / (16 * 12 * 256));
    // poeira assentada (manchas claras pontilhadas, mais nas bordas)
    const nDust = Math.round((60 + 260 * I) * scale);
    for (let k = 0; k < nDust; k++) {
      const [x, y] = edgePoint(r, 3000 + k, W, H, 1);
      b.set(x, y, rgba(214, 204, 184, 0.28));
      if (r(3000 + k, 7) < 0.4) b.set(x + 1, y, rgba(214, 204, 184, 0.2));
    }
    L.scorch.forEach((s, i) => paintScorch(b, s, r, 4000 + i));
    // rachaduras: começam nas bordas/montes e correm para dentro
    const nC = Math.round((2 + 7 * I) * scale);
    for (let k = 0; k < nC; k++) {
      let x: number;
      let y: number;
      if (k < L.piles.length && r(5000 + k, 1) < 0.7) {
        x = L.piles[k].x;
        y = L.piles[k].y;
      } else [x, y] = edgePoint(r, 5000 + k, W, H, 2);
      const toward = Math.atan2(H / 2 - y, W / 2 - x) + (r(5000 + k, 2) - 0.5) * 1.6;
      paintCrack(b, x, y, toward, 10 + Math.round(r(5000 + k, 3) * (12 + 22 * I)), r, 5000 + k);
    }
    // crateras de impacto: buraco escuro, borda norte em sombra, borda sul iluminada, lascas em volta
    const nT = Math.round((0.6 + 2.5 * I) * scale);
    for (let k = 0; k < nT; k++) {
      const [x, y] = edgePoint(r, 5500 + k, W, H, 10);
      const rx = 4 + Math.floor(r(5500 + k, 3) * (2 + 3 * I));
      const ry = Math.max(2, Math.round(rx * 0.6));
      paintScorch(b, { x, y, r: rx + 5 }, r, 5600 + k);
      b.ellipse(x, y, rx + 1, ry + 1, rgba(60, 54, 48, 0.85));
      b.ellipse(x, y + 0.5, rx, ry, '#1f1a16');
      b.ellipse(x, y + 1, rx - 1.5, ry - 1, '#2e2722');
      for (let xx = x - rx + 1; xx <= x + rx - 1; xx++) b.set(xx, y + ry + 1, rgba(225, 218, 205, 0.6));
      for (let j = 0; j < rx * 3; j++) {
        const a = r(5700 + k, j) * Math.PI * 2;
        const d = rx + 2 + r(5800 + k, j) * rx;
        const v = Math.floor(r(5900 + k, j) * 3);
        b.set(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d * 0.6), CONC_FRONT[v]);
      }
    }
    // carvão sob os focos de fogo
    for (const f of L.fires) {
      b.shadow(f.x, f.y, 6, 2.5, '#120d09', 0.6);
      b.hline(f.x - 3, f.x + 2, f.y, '#2b221c');
      b.hline(f.x - 2, f.x + 3, f.y - 1, '#3a2c22');
      b.set(f.x - 1, f.y - 1, '#7a2c14');
      b.set(f.x + 2, f.y, '#5a2410');
    }
    L.piles.forEach((p, i) => paintPile(b, p, r, 6000 + i));
    // entulho miúdo espalhado + papéis
    const nD = Math.round((14 + 60 * I) * scale);
    for (let k = 0; k < nD; k++) {
      let x: number;
      let y: number;
      if (r(7000 + k, 9) < 0.55 && L.piles.length) {
        const p = L.piles[k % L.piles.length];
        const a = r(7000 + k, 1) * Math.PI * 2;
        const d = p.r + 2 + r(7000 + k, 2) * p.r * 1.6;
        x = Math.round(p.x + Math.cos(a) * d);
        y = Math.round(p.y + Math.sin(a) * d * 0.6);
      } else [x, y] = edgePoint(r, 7000 + k, W, H, 1);
      const v = Math.floor(r(7000 + k, 3) * 3);
      b.set(x, y, CONC_TOP[v]);
      if (r(7000 + k, 4) < 0.45) b.set(x + 1, y, CONC_FRONT[v]);
      b.set(x, y + 1, rgba(20, 16, 12, 0.4));
    }
    const nPaper = Math.round((3 + 10 * I) * scale);
    for (let k = 0; k < nPaper; k++) {
      const [x, y] = edgePoint(r, 8000 + k, W, H, 3);
      const wide = r(8000 + k, 1) < 0.5;
      const pw = wide ? 3 : 2;
      const ph = wide ? 2 : 3;
      b.rect(x, y, pw, ph, '#e9e5da');
      b.set(x + pw - 1, y, '#cfcabe');
      b.hline(x, x + pw - 1, y + ph, rgba(20, 16, 12, 0.35));
      if (r(8000 + k, 2) < 0.4) b.set(x, y + ph - 1, '#6a4a2c'); // borda queimada
      if (wide && r(8000 + k, 3) < 0.6) b.set(x + 1, y + 1, '#9aa4b0'); // linha de texto
    }
    return b;
  });
}

// ------------------------------------------------------------------ fogo

const FIRE_W = 9;
const FIRE_H = 14;

/** Quadro (0..3) de uma chama pequena; variante v muda o desenho. */
export function fireFrameBuf(frame: number, v: number): PixelBuf {
  const f = ((frame % 4) + 4) % 4;
  return cached(`fire|${f}|${v}`, () => {
    const b = new PixelBuf(FIRE_W, FIRE_H);
    const cx = (FIRE_W - 1) / 2;
    for (let x = 0; x < FIRE_W; x++) {
      const dx = (x - cx) / (cx + 0.6);
      const prof = Math.max(0, 1 - dx * dx);
      const jit = h3(f, x, v, 911) / 4294967296;
      const hgt = Math.round((3 + 9 * Math.sqrt(prof)) * (0.72 + 0.28 * jit));
      for (let k = 0; k < hgt; k++) {
        const fr = k / hgt;
        const core = Math.abs(x - cx) <= 1 && fr < 0.4;
        const c = core ? '#fff3b8' : fr > 0.82 ? '#b2301a' : fr > 0.58 ? '#ec5a1c' : fr > 0.3 ? '#ff9a2c' : '#ffd451';
        b.set(x, FIRE_H - 1 - k, c);
      }
    }
    // lingua de fogo solta acima
    const lx = 2 + Math.floor((h3(f, 7, v, 913) / 4294967296) * (FIRE_W - 4));
    const ly = 1 + (f % 2);
    b.set(lx, ly, '#ec5a1c');
    b.set(lx, ly + 1, '#ff9a2c');
    return b;
  });
}

/** Brilho do fogo no chão (laranja, pontilhado). */
function glowBuf(): PixelBuf {
  return cached('glow', () => {
    const b = new PixelBuf(26, 12);
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 26; x++) {
        const dx = (x + 0.5 - 13) / 13;
        const dy = (y + 0.5 - 6) / 6;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        if (d > 0.55 && (x + y) % 2) continue;
        b.set(x, y, rgba(255, 140, 50, d < 0.3 ? 0.4 : 0.22));
      }
    }
    return b;
  });
}

function fireOps(ops: DmgOp[], fx: number, fy: number, t: number, id: number): void {
  const off = (h3(id, 1, 0, 3) % 1000) / 1000;
  const fr = Math.floor(t / 120 + off * 4) % 4;
  const flick = 0.75 + 0.25 * Math.sin(t / 90 + id * 2.1) * Math.sin(t / 37 + id);
  ops.push({ k: 'buf', buf: glowBuf(), x: fx - 13, y: fy - 7, a: flick });
  ops.push({ k: 'buf', buf: fireFrameBuf(fr, id & 1), x: fx - 4, y: fy - FIRE_H + 1, a: 1 });
  // brasas subindo
  for (let j = 0; j < 5; j++) {
    const seedj = h3(id, j, 0, 17) / 4294967296;
    const ph = (t / (1300 + seedj * 700) + seedj) % 1;
    const ex = Math.round(fx + Math.sin(ph * 7 + j * 1.7) * 2.5 + (seedj - 0.5) * 10 * ph);
    const ey = Math.round(fy - 8 - ph * 26);
    ops.push({ k: 'px', x: ex, y: ey, w: 1, h: 1, c: ph < 0.45 ? '#ffe486' : '#ff7a2a', a: Math.min(1, (1 - ph) * 1.6) });
  }
}

// ------------------------------------------------------------------ fumaça

const SMOKE_TONES = ['#2a2725', '#3b3734', '#504b46', '#67615b', '#817b74', '#9c968e', '#b3ada5'];

/** Baforada de fumaça: disco pixelado com topo-esquerda claro, base escura e borda pontilhada. */
function puffBuf(rad: number, tone: number): PixelBuf {
  return cached(`puff|${rad}|${tone}`, () => {
    const s = rad * 2 + 1;
    const b = new PixelBuf(s, s);
    const base = SMOKE_TONES[tone];
    const lt = SMOKE_TONES[Math.min(SMOKE_TONES.length - 1, tone + 1)];
    const dk = SMOKE_TONES[Math.max(0, tone - 1)];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = x - rad;
        const dy = y - rad;
        const d = Math.sqrt(dx * dx + dy * dy) / (rad + 0.5);
        if (d > 1) continue;
        if (d > 0.8 && (x + y) % 2) continue;
        const lit = (dx + dy) / (rad + 0.5);
        b.set(x, y, lit < -0.45 ? lt : lit > 0.5 ? dk : base);
      }
    }
    return b;
  });
}

/** Ops da coluna de fumaça (sem ctx). Período ~5 s. */
export function smokeOps(x: number, y: number, t: number, seed: number, scale = 1): DmgOp[] {
  const r = rng(seed);
  const N = 12;
  const period = 4600 + r(1) * 1400;
  const wind = (r(2) - 0.35) * 1.4; // leve inclinação, varia por coluna
  const H = 64 * scale;
  const puffs: { ph: number; i: number }[] = [];
  for (let i = 0; i < N; i++) puffs.push({ ph: (t / period + i / N + r(3)) % 1, i });
  puffs.sort((a, b) => b.ph - a.ph); // mais altas (velhas) primeiro; base escura por cima
  const ops: DmgOp[] = [];
  for (const { ph, i } of puffs) {
    const rise = Math.pow(ph, 0.85) * H;
    const sway = Math.sin(ph * Math.PI * 2 + i * 1.9) * 2.5 * scale * (0.3 + ph);
    const px = x + sway + wind * ph * ph * 22 * scale + (r(10 + i) - 0.5) * 3 * scale;
    const rad = Math.max(1, Math.round((2 + ph * 9 + r(20 + i) * 1.5) * scale));
    const tone = Math.min(SMOKE_TONES.length - 1, Math.floor(ph * SMOKE_TONES.length * 0.95));
    const a = ph < 0.08 ? ph / 0.08 : Math.pow(1 - (ph - 0.08) / 0.92, 1.3);
    const aq = Math.round(Math.min(1, a * 0.95) * 10) / 10;
    ops.push({ k: 'buf', buf: puffBuf(rad, tone), x: Math.round(px - rad), y: Math.round(y - rise - rad), a: aq });
  }
  return ops;
}

// ------------------------------------------------------------------ área (ops)

export function areaDamageOps(area: Rect, seed: number, t: number, intensity: number): DmgOp[] {
  const I = Math.max(0, Math.min(1, intensity));
  if (I <= 0) return [];
  const W = Math.round(area.w);
  const H = Math.round(area.h);
  const ax = Math.round(area.x);
  const ay = Math.round(area.y);
  const ops: DmgOp[] = [{ k: 'buf', buf: areaDamageBuf(W, H, seed, I), x: ax, y: ay, a: 1 }];
  const L = areaLayout(W, H, seed, Math.round(I * 10));
  L.fires.forEach((f, i) => {
    fireOps(ops, ax + f.x, ay + f.y, t, seed * 7 + i);
    for (const o of smokeOps(ax + f.x, ay + f.y - 12, t, seed * 13 + i, 0.55)) ops.push(o);
  });
  return ops;
}

// ------------------------------------------------------------------ parede

interface Hole {
  x: number;
  y: number;
  rx: number;
  ry: number;
  lobes: number[];
}

function wallHoles(w: number, seed: number): Hole[] {
  const r = rng(seed);
  const n = w < 40 ? 1 : Math.max(1, Math.min(4, Math.round(w / 90 + r(1) * 1.2)));
  const holes: Hole[] = [];
  for (let i = 0; i < n; i++) {
    const slot = w / n;
    const rx = 6 + Math.round(r(10 + i) * Math.min(8, slot / 5));
    const ry = 4 + Math.round(r(20 + i) * 4);
    const x = Math.round(slot * i + rx + 3 + r(30 + i) * Math.max(0, slot - 2 * rx - 6));
    const y = Math.round(14 + r(40 + i) * 6);
    const lobes: number[] = [];
    for (let k = 0; k < 10; k++) lobes.push(0.65 + 0.5 * r(50 + i * 10 + k));
    holes.push({ x, y, rx, ry, lobes });
  }
  return holes;
}

function holeDist(hl: Hole, x: number, y: number): number {
  const dx = (x - hl.x) / hl.rx;
  const dy = (y - hl.y) / hl.ry;
  const ang = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) * 10;
  const a0 = Math.floor(ang) % 10;
  const f = ang - Math.floor(ang);
  const lobe = hl.lobes[a0] * (1 - f) + hl.lobes[(a0 + 1) % 10] * f;
  return Math.sqrt(dx * dx + dy * dy) / lobe;
}

/** Camada estática do dano da face norte (w x 32). */
export function wallDamageBuf(w: number, seed: number): PixelBuf {
  const W = Math.max(1, Math.round(w));
  return cached(`wall|${W}|${seed}`, () => {
    const Hh = 32;
    const b = new PixelBuf(W, Hh);
    const r = rng(seed);
    const holes = wallHoles(W, seed);
    // fuligem subindo dos buracos (pluma que abre para cima)
    holes.forEach((hl, i) => {
      const top = hl.y - hl.ry;
      for (let y = top + 2; y >= 0; y--) {
        const up = (top + 2 - y) / Math.max(1, top + 2);
        const half = hl.rx * (0.8 + up * 0.9);
        for (let x = Math.floor(hl.x - half); x <= Math.ceil(hl.x + half); x++) {
          const e = Math.abs(x - hl.x) / half;
          const a = 0.7 * (1 - up * 0.55) * (1 - e * e);
          if (a <= 0.05) continue;
          const jit = h3(x, y, i, 55) / 4294967296;
          if (jit > 0.35 + a) continue;
          b.set(x, y, rgba(23, 19, 15, Math.min(0.8, a)));
        }
      }
    });
    // rachaduras irradiando dos buracos + algumas soltas
    holes.forEach((hl, i) => {
      const n = 3 + Math.floor(r(60 + i) * 3);
      for (let k = 0; k < n; k++) {
        const a = r(70 + i * 10 + k) * Math.PI * 2;
        let x = hl.x + Math.cos(a) * hl.rx;
        let y = hl.y + Math.sin(a) * hl.ry;
        let dir = a;
        const len = 5 + Math.round(r(90 + i * 10 + k) * 10);
        for (let s = 0; s < len; s++) {
          dir += (r(1000 + i * 100 + k * 20 + s) - 0.5) * 0.9;
          x += Math.cos(dir);
          y += Math.sin(dir);
          b.set(Math.round(x), Math.round(y), rgba(30, 24, 20, 0.85 - (s / len) * 0.4));
        }
      }
    });
    const nLoose = Math.round(W / 40);
    for (let k = 0; k < nLoose; k++) {
      let x = r(200 + k) * W;
      let y = 2 + r(210 + k) * 6;
      let dir = Math.PI / 2 + (r(220 + k) - 0.5);
      const len = 6 + Math.round(r(230 + k) * 12);
      for (let s = 0; s < len; s++) {
        dir += (r(2000 + k * 40 + s) - 0.5) * 0.8;
        x += Math.cos(dir) * 0.8;
        y += Math.sin(dir);
        b.set(Math.round(x), Math.round(y), rgba(30, 24, 20, 0.7));
      }
    }
    // reboco descascado mostrando tijolo
    const nChip = Math.round(W / 30);
    for (let k = 0; k < nChip; k++) {
      const cx = Math.round(r(300 + k) * (W - 6));
      const cy = Math.round(4 + r(310 + k) * 20);
      const cw = 4 + Math.round(r(320 + k) * 4);
      const ch = 3 + Math.round(r(330 + k) * 2);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if ((x === 0 || x === cw - 1) && (y === 0 || y === ch - 1)) continue;
          const mortar = y % 3 === 2 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 3;
          b.set(cx + x, cy + y, mortar ? MORTAR : BRICK[(x + y) % 3]);
        }
      }
      b.hline(cx + 1, cx + cw - 2, cy - 1, rgba(40, 30, 25, 0.5));
    }
    // buracos: anel de tijolo quebrado, interior escuro, vergalhão atravessando
    holes.forEach((hl, i) => {
      for (let y = hl.y - hl.ry - 4; y <= hl.y + hl.ry + 4; y++) {
        for (let x = hl.x - hl.rx - 4; x <= hl.x + hl.rx + 4; x++) {
          if (y < 0 || y >= Hh) continue;
          const d = holeDist(hl, x, y);
          if (d <= 1) {
            const depth = (y - (hl.y - hl.ry)) / (2 * hl.ry);
            // topo do buraco mais escuro (sombra da borda), fundo com um tom de sala escura
            b.set(x, y, depth < 0.35 ? HOLE : depth < 0.75 ? '#1d1916' : '#2a2420');
          } else if (d <= 1.3) {
            const jit = h3(x, y, i, 66) / 4294967296;
            if (jit < (d - 1) * 2.4) continue;
            const mortar = y % 3 === 0 || (x + (Math.floor(y / 3) % 2) * 2) % 4 === 0;
            b.set(x, y, mortar ? '#8f846f' : BRICK[(x * 3 + y) % 3]);
          }
        }
      }
      // borda inferior iluminada (quina quebrada recebe luz de cima)
      for (let x = hl.x - hl.rx; x <= hl.x + hl.rx; x++) {
        for (let y = hl.y + hl.ry + 2; y >= hl.y; y--) {
          if (holeDist(hl, x, y) <= 1) {
            b.set(x, y + 1, '#cbbfae');
            break;
          }
        }
      }
      // vergalhões expostos atravessando o buraco
      const nR = 1 + Math.floor(r(400 + i) * 2);
      for (let k = 0; k < nR; k++) {
        const ry = hl.y - Math.round(hl.ry * 0.4) + k * Math.max(2, Math.round(hl.ry * 0.8));
        const x0 = hl.x - hl.rx - 1;
        const x1 = hl.x + Math.round((r(410 + i * 3 + k) - 0.2) * hl.rx);
        b.line(x0, ry, x1, ry + (r(420 + k) < 0.5 ? 1 : 2), REBAR);
        b.set(x1, ry + 1, REBAR_LT);
      }
      if (r(430 + i) < 0.7) {
        const vx = hl.x + Math.round((r(440 + i) - 0.5) * hl.rx);
        b.line(vx, hl.y - hl.ry - 1, vx + 1, hl.y + Math.round(hl.ry * 0.3), REBAR);
        b.set(vx + 1, hl.y + Math.round(hl.ry * 0.3), REBAR_LT);
      }
      // entulho caído ao pé da parede
      for (let k = 0; k < hl.rx + 3; k++) {
        const dx = Math.round((r(500 + i * 30 + k) - 0.5) * hl.rx * 2.4);
        const yy = Hh - 1 - Math.floor(r(600 + i * 30 + k) * 3);
        const v = Math.floor(r(700 + i * 30 + k) * 3);
        b.set(hl.x + dx, yy, r(800 + k) < 0.3 ? BRICK[v] : CONC_TOP[v]);
        b.set(hl.x + dx + 1, yy, CONC_FRONT[v]);
      }
    });
    // marcas de estilhaço (furinhos escuros)
    const nShr = Math.round(W / 6);
    for (let k = 0; k < nShr; k++) {
      const x = Math.round(r(900 + k) * W);
      const y = Math.round(2 + r(910 + k) * 26);
      b.set(x, y, rgba(25, 20, 16, 0.85));
      b.set(x, y + 1, rgba(255, 250, 240, 0.25));
    }
    return b;
  });
}

export function wallDamageOps(x: number, y: number, w: number, seed: number, t: number): DmgOp[] {
  const X = Math.round(x);
  const Y = Math.round(y);
  const ops: DmgOp[] = [{ k: 'buf', buf: wallDamageBuf(w, seed), x: X, y: Y, a: 1 }];
  // brasas no fundo de alguns buracos (brilho pulsando)
  wallHoles(Math.round(w), seed).forEach((hl, i) => {
    if (h3(i, 3, 0, seed) % 3 === 2) return;
    for (let j = 0; j < 3; j++) {
      const p = Math.sin(t / (260 + j * 90) + i * 3 + j * 1.3);
      const ex = X + hl.x - Math.round(hl.rx * 0.5) + j * Math.max(1, Math.round(hl.rx * 0.5));
      const ey = Y + hl.y + Math.max(1, hl.ry - 2);
      ops.push({ k: 'px', x: ex, y: ey, w: 2, h: 1, c: p > 0.3 ? '#ff8a2c' : '#b33a16', a: 0.6 + 0.4 * Math.max(0, p) });
    }
  });
  return ops;
}

// ------------------------------------------------------------------ vidro

/** Camada do vidro quebrado (w x h): trincas radiais + anéis a partir do ponto de impacto, cacos faltando. */
export function brokenGlassBuf(w: number, h: number, seed: number): PixelBuf {
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  return cached(`glass|${W}x${H}|${seed}`, () => {
    const b = new PixelBuf(W, H);
    const r = rng(seed);
    const nImp = W > 56 || H > 56 ? 2 : 1;
    const imps: { x: number; y: number; rays: number[]; rings: number[] }[] = [];
    for (let i = 0; i < nImp; i++) {
      const sx = nImp === 1 ? 0.25 + r(i, 1) * 0.5 : (i + 0.25 + r(i, 1) * 0.5) / nImp;
      const x = Math.round(sx * (W - 1));
      const y = Math.round((0.25 + r(i, 2) * 0.5) * (H - 1));
      const nr = 7 + Math.floor(r(i, 3) * 4);
      const rays: number[] = [];
      for (let k = 0; k < nr; k++) rays.push(((k + 0.2 + r(i, 10 + k) * 0.6) / nr) * Math.PI * 2);
      const rings: number[] = [];
      const maxR = Math.max(W, H);
      for (let rr = 3 + r(i, 4) * 2; rr < maxR; rr += 4 + r(i, 30 + rings.length) * 6) rings.push(rr);
      imps.push({ x, y, rays, rings });
    }
    const cellOf = (x: number, y: number) => {
      let best = 0;
      let bd = 1e9;
      imps.forEach((im, i) => {
        const d = (x - im.x) ** 2 + (y - im.y) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      const im = imps[best];
      const ang = (Math.atan2(y - im.y, x - im.x) + Math.PI * 2) % (Math.PI * 2);
      let s = im.rays.findIndex((a) => a > ang);
      if (s < 0) s = 0;
      const rad = Math.sqrt(bd);
      let ring = im.rings.findIndex((q) => q > rad);
      if (ring < 0) ring = im.rings.length;
      return { i: best, s, ring, rad };
    };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = cellOf(x, y);
        const cr = h3(c.i, c.s, c.ring, seed) / 4294967296;
        // perto do impacto falta mais vidro
        const missP = c.ring === 0 ? 0.85 : c.ring === 1 ? 0.4 : c.ring === 2 ? 0.18 : 0.05;
        if (cr < missP) b.set(x, y, rgba(8, 12, 18, 0.78));
        else if (cr > 0.7) b.set(x, y, rgba(235, 245, 255, 0.16)); // faceta refletindo
        else if (cr > 0.45) b.set(x, y, rgba(10, 20, 30, 0.12));
      }
    }
    // trincas: raios e segmentos de anel
    for (const im of imps) {
      for (let k = 0; k < im.rays.length; k++) {
        const a = im.rays[k];
        const len = Math.max(W, H) * (0.5 + r(k, 700) * 0.7);
        b.line(im.x, im.y, im.x + Math.cos(a) * len, im.y + Math.sin(a) * len, rgba(230, 242, 255, 0.85));
      }
      im.rings.forEach((q, ri) => {
        for (let k = 0; k < im.rays.length; k++) {
          if (h3(k, ri, 9, seed) % 3 === 0 && ri > 0) continue; // anel incompleto
          const a0 = im.rays[k];
          const a1 = im.rays[(k + 1) % im.rays.length] + (k + 1 === im.rays.length ? Math.PI * 2 : 0);
          const qq = q * (0.85 + (h3(k, ri, 8, seed) % 100) / 300);
          b.line(im.x + Math.cos(a0) * qq, im.y + Math.sin(a0) * qq, im.x + Math.cos(a1) * qq, im.y + Math.sin(a1) * qq, rgba(225, 238, 252, 0.7));
        }
      });
      // ponto de impacto: furo escuro com borda branca
      b.rect(im.x - 1, im.y - 1, 3, 3, rgba(6, 8, 12, 0.9));
      b.set(im.x - 2, im.y, rgba(245, 250, 255, 0.9));
      b.set(im.x, im.y - 2, rgba(245, 250, 255, 0.9));
      b.set(im.x + 2, im.y + 1, rgba(245, 250, 255, 0.9));
    }
    // cacos no batente inferior
    for (let k = 0; k < Math.round(W / 5); k++) {
      const x = Math.round(r(k, 800) * (W - 1));
      b.set(x, H - 1, rgba(230, 242, 255, 0.9));
    }
    return b;
  });
}

// ------------------------------------------------------------------ API pública

/** Dano no piso de uma área: rachaduras, entulho, marcas de queimado, pequenos focos de fogo/fumaça. intensity 0..1. */
export function drawAreaDamage(ctx: CanvasRenderingContext2D, area: Rect, seed: number, t: number, intensity: number): void {
  runOps(ctx, areaDamageOps(area, seed, t, intensity));
}
/** Dano na face da parede norte (altura 2*TILE a partir de y): buracos, rachaduras, fuligem. */
export function drawWallDamage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, seed: number, t: number): void {
  runOps(ctx, wallDamageOps(x, y, w, seed, t));
}
/** Vidro quebrado por cima de uma janela/vidro (rect da área de vidro). */
export function drawBrokenGlass(ctx: CanvasRenderingContext2D, r: Rect, seed: number): void {
  runOps(ctx, [{ k: 'buf', buf: brokenGlassBuf(r.w, r.h, seed), x: Math.round(r.x), y: Math.round(r.y), a: 1 }]);
}
/** Coluna de fumaça animada saindo de (x, y) para cima (desenhar por último, por cima de tudo). */
export function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, seed: number, scale?: number): void {
  runOps(ctx, smokeOps(x, y, t, seed, scale ?? 1));
}
