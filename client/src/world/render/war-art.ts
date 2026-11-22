// Arte pura (PixelBuf, sem DOM) da área externa no tema tático: veículos militares na rua,
// helicóptero, obstáculos de calçada (barreiras, sacos de areia, ouriços) e poste danificado.
// Tudo original e genérico: silhuetas inventadas, sem insígnias nem modelos reais.
import { PixelBuf } from '../../art/core/pixbuf';
import { parseColor } from '../../art/core/color';
import { h3 } from '../../art/surfaces/floor';

export type VehicleKind = 'tank' | 'apc' | 'truck' | 'jeep';
export const VEHICLE_KINDS: readonly VehicleKind[] = ['tank', 'apc', 'truck', 'jeep'];
/** Quadros da animação de esteiras/rodas e do rotor. */
export const VEHICLE_FRAMES = 4;

export interface VehicleSpec {
  w: number;
  h: number;
  /** Âncora: centro do veículo no chão. */
  ax: number;
  ay: number;
  /** Distância (px) da âncora até a frente / traseira (faróis e lanternas). */
  front: number;
  back: number;
  /** Altura (px acima do chão) dos faróis. */
  ly: number;
  /** Tamanho relativo do facho dos faróis (1 = carro). */
  lights: number;
  speed: readonly [number, number];
  /** Peso no sorteio. */
  weight: number;
}

export const VEHICLE_SPECS: Readonly<Record<VehicleKind, VehicleSpec>> = {
  tank: { w: 56, h: 28, ax: 26, ay: 24, front: 21, back: 23, ly: 12, lights: 0.55, speed: [20, 28], weight: 3 },
  apc: { w: 50, h: 26, ax: 24, ay: 23, front: 22, back: 21, ly: 9, lights: 0.7, speed: [32, 42], weight: 3 },
  truck: { w: 52, h: 28, ax: 25, ay: 25, front: 24, back: 22, ly: 10, lights: 0.85, speed: [30, 40], weight: 2.5 },
  jeep: { w: 34, h: 22, ax: 16, ay: 19, front: 13, back: 14, ly: 8, lights: 0.8, speed: [46, 60], weight: 2 },
};

/** Sorteia um tipo de veículo (r em 0..1) pelos pesos. */
export function pickVehicle(r: number): VehicleKind {
  const total = VEHICLE_KINDS.reduce((s, k) => s + VEHICLE_SPECS[k].weight, 0);
  let acc = 0;
  for (const k of VEHICLE_KINDS) {
    acc += VEHICLE_SPECS[k].weight / total;
    if (r < acc) return k;
  }
  return 'jeep';
}

interface Camo {
  base: string;
  dk: string;
  lt: string;
  spot: string;
}

/** Pinturas: verde-oliva, areia do deserto e cinza urbano. */
const CAMO: readonly Camo[] = [
  { base: '#6b7046', dk: '#4c5032', lt: '#899063', spot: '#4f5236' },
  { base: '#b09766', dk: '#86704a', lt: '#cdb98d', spot: '#8f7752' },
  { base: '#6e7374', dk: '#4e5354', lt: '#8d9293', spot: '#555a5b' },
];
export const CAMO_COUNT = CAMO.length;

const TRACK = '#2f312c';
const TRACK_LT = '#55574f';
const TIRE = '#2a2c29';
const HUB = '#757869';
const GLASS = '#2e3e48';
const GLASS_LT = '#6f93a8';
const HEAD = '#ffe9a8';
const TAIL = '#c8402e';

/** Pinta manchas de camuflagem só onde o pixel ainda tem a cor `base` (blobs de 3px). */
function camo(b: PixelBuf, pal: Camo, seed: number): void {
  const [r, g, bb] = parseColor(pal.base);
  const [sr, sg, sb] = parseColor(pal.spot);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const i = (y * b.w + x) * 4;
      const d = b.data;
      if (d[i + 3] < 255 || d[i] !== r || d[i + 1] !== g || d[i + 2] !== bb) continue;
      const cx = Math.floor((x + (Math.floor(y / 3) % 2) * 2) / 4);
      const cy = Math.floor(y / 3);
      if (h3(cx, cy, 7, seed) % 5 !== 0) continue;
      d[i] = sr;
      d[i + 1] = sg;
      d[i + 2] = sb;
    }
  }
}

/** Roda com raio girando conforme o quadro. */
function wheel(b: PixelBuf, cx: number, cy: number, r: number, frame: number, tire = TIRE): void {
  b.ellipse(cx, cy, r, r, tire);
  b.ellipse(cx, cy, Math.max(1, r * 0.55), Math.max(1, r * 0.55), HUB);
  const off = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ][frame % 4];
  const ix = Math.floor(cx);
  const iy = Math.floor(cy);
  b.set(ix + off[0], iy + off[1], '#3c3e37');
  b.set(ix, iy, '#9a9d8e');
}

/** Sprite de veículo virado para a DIREITA (o mundo espelha para a esquerda). */
export function vehicleBuf(kind: VehicleKind, variant: number, frame: number): PixelBuf {
  const pal = CAMO[((variant % CAMO.length) + CAMO.length) % CAMO.length];
  const f = ((frame % VEHICLE_FRAMES) + VEHICLE_FRAMES) % VEHICLE_FRAMES;
  const spec = VEHICLE_SPECS[kind];
  const b = new PixelBuf(spec.w, spec.h);
  switch (kind) {
    case 'tank':
      drawTank(b, pal, f, variant);
      break;
    case 'apc':
      drawApc(b, pal, f, variant);
      break;
    case 'truck':
      drawTruck(b, pal, f, variant);
      break;
    case 'jeep':
      drawJeep(b, pal, f, variant);
      break;
  }
  return b;
}

function drawTank(b: PixelBuf, p: Camo, f: number, seed: number): void {
  // esteira (arredondada nas pontas) com elos correndo
  b.hline(6, 44, 16, TRACK);
  b.hline(6, 44, 23, TRACK);
  b.rect(4, 17, 43, 6, TRACK);
  for (let x = 6; x <= 44; x++) {
    if ((x - f + 8) % 4 === 0) b.set(x, 16, TRACK_LT);
    if ((x + f) % 4 === 0) b.set(x, 23, TRACK_LT);
  }
  for (const wx of [10, 16, 22, 28, 34, 40]) wheel(b, wx, 20, 2.5, f, '#3e403a');
  wheel(b, 6.5, 19.5, 2, f, '#3e403a');
  wheel(b, 44.5, 19, 2, f, '#3e403a');
  // casco: glacis inclinado na frente
  b.hline(7, 41, 10, p.lt);
  b.hline(5, 44, 11, p.base);
  b.hline(4, 46, 12, p.base);
  b.hline(3, 47, 13, p.base);
  // saias laterais cobrindo a parte de cima da esteira, com parafusos
  b.rect(4, 14, 42, 3, p.dk);
  b.hline(4, 45, 14, p.base);
  for (let x = 8; x < 44; x += 6) b.set(x, 15, p.lt);
  // torre
  b.hline(19, 31, 4, p.lt);
  b.hline(17, 33, 5, p.lt);
  b.rect(16, 6, 19, 4, p.base);
  b.hline(17, 34, 10, p.dk);
  b.hline(16, 34, 9, p.dk);
  // cúpula do comandante e escotilha
  b.rect(20, 2, 5, 2, p.dk);
  b.hline(20, 24, 2, p.lt);
  b.set(27, 5, p.dk);
  b.set(28, 5, p.dk);
  // mantelete e canhão (com freio de boca)
  b.rect(35, 6, 2, 3, p.dk);
  b.hline(37, 51, 6, p.lt);
  b.hline(37, 51, 7, p.dk);
  b.rect(44, 5, 3, 4, p.base);
  b.rect(52, 5, 3, 4, p.dk);
  camo(b, p, seed * 13 + 1);
  // luzes pequenas
  b.set(47, 12, HEAD);
  b.set(3, 12, TAIL);
  b.outline();
  // antena (fina, sem contorno)
  b.vline(18, 0, 4, '#30332d');
  b.shadow(26, 24, 25, 3, '#1c2034', 0.3);
}

function drawApc(b: PixelBuf, p: Camo, f: number, seed: number): void {
  // casco em cunha: traseira reta, nariz inclinado
  for (let y = 8; y <= 18; y++) {
    const right = Math.min(46, 37 + Math.round((y - 8) * 0.95));
    b.hline(3, right, y, y === 8 ? p.lt : y >= 15 ? p.dk : p.base);
  }
  b.hline(3, 46, 15, p.base);
  // porta traseira e blocos de visão
  b.vline(7, 10, 16, p.dk);
  b.rect(33, 10, 2, 1, GLASS);
  b.rect(36, 11, 2, 1, GLASS);
  b.set(33, 10, GLASS_LT);
  // torreta pequena com canhão automático
  b.hline(20, 27, 4, p.lt);
  b.rect(19, 5, 10, 3, p.base);
  b.hline(29, 43, 5, p.lt);
  b.hline(29, 43, 6, p.dk);
  b.rect(43, 4, 2, 4, p.dk);
  camo(b, p, seed * 17 + 3);
  for (const wx of [10, 18, 30, 38]) wheel(b, wx, 19.5, 3, f);
  b.set(46, 13, HEAD);
  b.set(3, 12, TAIL);
  b.outline();
  b.vline(10, 1, 7, '#30332d');
  b.shadow(24, 23, 23, 3, '#1c2034', 0.3);
}

function drawTruck(b: PixelBuf, p: Camo, f: number, seed: number): void {
  // lona da carroceria (arredondada) com arcos
  const tarp = p.lt;
  b.hline(5, 31, 5, tarp);
  b.rect(4, 6, 29, 8, p.base);
  b.hline(4, 32, 6, tarp);
  for (let x = 9; x < 32; x += 7) b.vline(x, 6, 13, p.dk);
  // laterais da caçamba
  b.rect(3, 14, 31, 6, p.dk);
  b.hline(3, 33, 14, p.base);
  for (let x = 6; x < 33; x += 5) b.set(x, 17, p.base);
  // cabine blindada com visor estreito e capô
  b.rect(35, 8, 9, 12, p.base);
  b.hline(35, 43, 8, p.lt);
  b.rect(40, 10, 4, 2, GLASS);
  b.set(40, 10, GLASS_LT);
  b.rect(44, 13, 5, 7, p.base);
  b.hline(44, 48, 13, p.lt);
  b.rect(44, 18, 6, 2, p.dk);
  // chassi
  b.hline(3, 49, 20, '#3a3c36');
  camo(b, p, seed * 19 + 5);
  for (const wx of [10, 18, 41]) wheel(b, wx, 21.5, 3.5, f);
  b.set(49, 15, HEAD);
  b.set(3, 17, TAIL);
  b.outline();
  b.shadow(26, 25, 24, 3, '#1c2034', 0.3);
}

function drawJeep(b: PixelBuf, p: Camo, f: number, seed: number): void {
  // estepe atrás
  b.ellipse(3.5, 11.5, 2.5, 3.5, TIRE);
  // carroceria aberta e capô
  b.rect(5, 9, 24, 6, p.base);
  b.hline(5, 28, 9, p.lt);
  b.hline(5, 28, 14, p.dk);
  b.rect(19, 8, 10, 1, p.lt);
  // para-brisa (aro) e santantônio
  b.line(18, 8, 17, 3, '#3d4136', 2);
  b.set(18, 4, GLASS_LT);
  b.vline(8, 4, 8, p.dk);
  b.hline(8, 11, 4, p.dk);
  b.vline(11, 4, 8, p.dk);
  // banco
  b.rect(12, 7, 4, 2, '#4a3e30');
  camo(b, p, seed * 23 + 7);
  for (const wx of [9, 24]) wheel(b, wx, 15.5, 3.5, f);
  b.set(29, 11, HEAD);
  b.set(5, 11, TAIL);
  b.outline();
  b.vline(6, 0, 8, '#30332d');
  b.shadow(16, 19, 15, 2, '#1c2034', 0.3);
}

// ------------------------------------------------------------------ helicóptero

export const HELI = {
  w: 82,
  h: 34,
  /** Âncora: centro da fuselagem, na linha dos esquis. */
  ax: 44,
  ay: 29,
  /** Pontos (relativos à âncora, virado para a direita): farol rotativo vermelho, luz verde, holofote. */
  beacon: [-36, -22] as const,
  nav: [15, -6] as const,
  search: [8, -3] as const,
  speed: [85, 125] as const,
};
const HELI_CAMO: readonly Camo[] = [
  { base: '#5c6341', dk: '#41462e', lt: '#7a8259', spot: '#4a5034' },
  { base: '#5d6266', dk: '#43474b', lt: '#7c8186', spot: '#4e5256' },
];

/** Helicóptero de perfil virado para a direita; `frame` gira os rotores. */
export function heliBuf(variant: number, frame: number): PixelBuf {
  const p = HELI_CAMO[((variant % HELI_CAMO.length) + HELI_CAMO.length) % HELI_CAMO.length];
  const f = ((frame % VEHICLE_FRAMES) + VEHICLE_FRAMES) % VEHICLE_FRAMES;
  const b = new PixelBuf(HELI.w, HELI.h);
  // esquis
  b.hline(36, 57, 28, '#33362f');
  b.set(58, 27, '#33362f');
  b.vline(40, 25, 27, '#3c3f37');
  b.vline(52, 25, 27, '#3c3f37');
  // cauda: cone afinando, deriva e estabilizador
  for (let x = 10; x <= 34; x++) {
    const t = (x - 10) / 24;
    const top = Math.round(16 - t * 1.5);
    const bot = Math.round(17 + t * 1.5);
    b.vline(x, top, bot, x < 30 ? p.base : p.dk);
    b.set(x, top, p.lt);
  }
  b.line(7, 7, 11, 16, p.base, 2);
  b.line(6, 7, 9, 7, p.dk);
  b.rect(13, 18, 5, 1, p.dk);
  // fuselagem
  b.ellipse(46, 18, 14, 7, p.base);
  b.hline(36, 56, 11, p.lt);
  b.rect(34, 20, 22, 4, p.dk);
  b.hline(36, 56, 24, p.dk);
  // motor e escapes no dorso
  b.rect(37, 8, 15, 4, p.dk);
  b.hline(38, 51, 8, p.lt);
  b.rect(35, 9, 2, 2, '#3a3c36');
  // cabine (vidros na frente)
  b.ellipse(55, 16, 5.5, 4.5, GLASS);
  b.rect(52, 13, 2, 1, GLASS_LT);
  b.set(57, 14, GLASS_LT);
  b.vline(51, 12, 19, p.dk);
  // porta lateral
  b.vline(44, 14, 22, p.dk);
  camo(b, p, 29 + variant);
  b.set(60, 23, '#3fd06a');
  b.set(8, 7, '#ff4a3a');
  b.outline();
  // mastro e rotor principal (pás finas sem contorno, disco translúcido)
  b.vline(45, 4, 7, '#2e312b');
  b.ellipse(45, 4, 37, 2.5, 'rgba(46,50,44,0.16)');
  for (let i = 0; i < 4; i++) {
    const a = (f * Math.PI) / 8 + (i * Math.PI) / 2;
    b.line(45, 4, 45 + Math.cos(a) * 37, 4 + Math.sin(a) * 2.5, 'rgba(34,37,33,0.85)');
  }
  b.rect(44, 3, 3, 2, '#2e312b');
  // rotor de cauda
  b.ellipse(7, 12, 4, 4, 'rgba(46,50,44,0.18)');
  const ta = (f * Math.PI) / 4;
  b.line(7 - Math.cos(ta) * 4, 12 - Math.sin(ta) * 4, 7 + Math.cos(ta) * 4, 12 + Math.sin(ta) * 4, 'rgba(34,37,33,0.9)');
  b.set(7, 12, '#2e312b');
  return b;
}

/** Sombra do helicóptero no chão (silhueta difusa + disco do rotor). */
export function heliShadowBuf(): PixelBuf {
  const b = new PixelBuf(HELI.w, 18);
  const c = 'rgba(20,26,22,0.3)';
  b.ellipse(46, 9, 15, 5, c);
  b.rect(10, 8, 26, 3, c);
  b.ellipse(45, 9, 37, 7, 'rgba(20,26,22,0.1)');
  return b;
}
/** Âncora da sombra (mesmo x da fuselagem). */
export const HELI_SHADOW = { ax: 44, ay: 9 };

// ------------------------------------------------------------------ obstáculos da rua

export type StreetPropKind = 'barrier' | 'sandbags' | 'hedgehog' | 'rubble';

/** Obstáculo de rua (âncora no chão): retorna [buffer, ax, ay]. */
export function streetPropBuf(kind: StreetPropKind | 'lamp_broken', seed: number): [PixelBuf, number, number] {
  switch (kind) {
    case 'barrier':
      return [barrier(seed), 16, 14];
    case 'sandbags':
      return [sandbags(seed), 15, 14];
    case 'hedgehog':
      return [hedgehog(seed), 9, 17];
    case 'rubble':
      return [rubble(seed), 11, 9];
    case 'lamp_broken':
      return [brokenLamp(seed), 5, 34];
  }
}

/** Barreira de concreto (tipo New Jersey), lascada. */
function barrier(seed: number): PixelBuf {
  const b = new PixelBuf(34, 16);
  const top = '#bdb8ac';
  const face = '#a29d91';
  const dk = '#837e73';
  b.rect(4, 3, 26, 2, top);
  b.rect(3, 5, 28, 4, face);
  b.rect(1, 9, 32, 4, face);
  b.hline(1, 32, 12, dk);
  b.hline(3, 30, 8, dk);
  // lascas e marca de tinta gasta
  for (let i = 0; i < 4; i++) {
    const h = h3(seed, i, 3);
    const x = 3 + (h % 28);
    const y = 4 + ((h >>> 8) % 8);
    b.set(x, y, dk);
    b.set(x + 1, y, '#6f6a60');
  }
  if (seed % 3 === 0) for (let x = 6; x < 28; x += 6) b.rect(x, 10, 3, 2, '#c9a23a');
  const notch = 4 + (h3(seed, 9) % 24);
  b.clear(notch, 3);
  b.clear(notch + 1, 3);
  b.outline();
  b.shadow(17, 14, 16, 2, '#1c2034', 0.28);
  return b;
}

/** Trincheira de sacos de areia (duas fileiras). */
function sandbags(seed: number): PixelBuf {
  const b = new PixelBuf(30, 16);
  const tones = ['#b39d6e', '#a89262', '#bca777'];
  const bag = (cx: number, cy: number, i: number) => {
    const t = tones[h3(seed, i) % 3];
    b.ellipse(cx, cy, 3.5, 2, t);
    b.hline(cx - 2, cx + 1, cy - 1, '#cfbc8f');
    b.set(cx + 2, cy + 1, '#8a7650');
  };
  for (let i = 0; i < 4; i++) bag(5 + i * 7, 11, i);
  for (let i = 0; i < 3; i++) bag(8.5 + i * 7, 7.5, i + 4);
  if (seed % 2) bag(12 + (seed % 3) * 3, 4, 9);
  b.outline();
  b.shadow(15, 14, 14, 2, '#1c2034', 0.28);
  return b;
}

/** Ouriço tcheco: três vigas de aço cruzadas, enferrujadas. */
function hedgehog(seed: number): PixelBuf {
  const b = new PixelBuf(18, 19);
  const steel = seed % 2 ? '#5a4f45' : '#4f5250';
  const lt = seed % 2 ? '#8a7158' : '#7c807d';
  b.line(2, 16, 15, 3, steel, 2);
  b.line(15, 16, 2, 3, steel, 2);
  b.line(9, 1, 9, 16, steel, 2);
  b.line(3, 15, 15, 3, lt);
  b.set(9, 1, lt);
  b.set(9, 2, lt);
  b.outline();
  b.shadow(9, 17, 8, 2, '#1c2034', 0.26);
  return b;
}

/** Monte de entulho: blocos de concreto e vergalhões. */
function rubble(seed: number): PixelBuf {
  const b = new PixelBuf(22, 11);
  const tones = ['#9a958a', '#878276', '#aaa598', '#6f6b62'];
  for (let i = 0; i < 9; i++) {
    const h = h3(seed, i, 5);
    const x = 3 + (h % 15);
    const y = 4 + ((h >>> 6) % 5);
    const w = 2 + ((h >>> 12) % 3);
    b.rect(x, y, w, 2, tones[(h >>> 16) % 4]);
    b.set(x, y, '#b8b3a6');
  }
  b.line(6, 6, 4, 1, '#6b4b36');
  b.line(15, 6, 18, 2, '#6b4b36');
  b.outline();
  b.shadow(11, 9, 10, 2, '#1c2034', 0.24);
  return b;
}

/** Poste atingido: haste entortada, luminária pendurada e vidro quebrado (apagado). */
function brokenLamp(seed: number): PixelBuf {
  const b = new PixelBuf(18, 36);
  b.shadow(5, 34, 4, 1, '#1c2034', 0.25);
  b.rect(4, 15, 2, 19, '#2e3648');
  b.vline(4, 15, 33, '#4a5468');
  b.line(5, 15, 10, 7, '#2e3648', 2);
  // luminária torta
  b.rect(9, 6, 7, 4, '#2e3648');
  b.rect(10, 9, 5, 2, '#3a3f48');
  b.set(11, 10, '#8a93a0');
  b.set(13, 9, '#56606e');
  if (seed % 2) b.line(15, 10, 16, 13, '#2e3648');
  b.rect(3, 32, 4, 2, '#3a4152');
  // marcas de estilhaço na base
  b.set(5, 26, '#1f242f');
  b.set(4, 21, '#1f242f');
  return b;
}

// ------------------------------------------------------------------ avião (alta altitude)

/**
 * Avião de transporte militar genérico (asa alta enflechada, dois motores, cauda em T), visto de
 * lado em 3/4 de cima, virado para a direita. Voa bem mais alto que o helicóptero: sombra longe e
 * pálida, rastro de condensação e cruzamento rápido (o tempo de travessia define a velocidade).
 */
export const PLANE = {
  w: 78,
  h: 30,
  /** Âncora: centro da fuselagem. */
  ax: 40,
  ay: 15,
  /** Luzes (relativas à âncora, virado para a direita): ponta da asa de trás (vermelha), da asa da frente (verde), estrobo da cauda e farol do ventre. */
  navFar: [-11, -12] as const,
  navNear: [-14, 10] as const,
  strobe: [-34, -14] as const,
  beacon: [2, 3] as const,
  /** Bocais dos motores (início do rastro), relativos à âncora. */
  exhaust: [[-4, 3], [-11, 7]] as const,
  /** Altura (px) desenhada acima do chão: a sombra fica a esta distância abaixo. */
  alt: [118, 150] as const,
  /** Duração da travessia (s) e intervalo entre aviões (s). */
  cross: [3.2, 4.6] as const,
  every: [45, 120] as const,
};
const PLANE_PAL: readonly { base: string; dk: string; lt: string; stripe: string }[] = [
  { base: '#8f979a', dk: '#687074', lt: '#b6bdbf', stripe: '#5d6468' },
  { base: '#7c8468', dk: '#5b624a', lt: '#a0a88a', stripe: '#4e543e' },
];

/** Preenche um polígono (pontos inteiros) por linhas de varredura. */
function fillPoly(b: PixelBuf, pts: readonly (readonly [number, number])[], c: string): void {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [, y] of pts) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if (ay === by) continue;
      const yc = y + 0.5;
      if ((yc >= ay && yc < by) || (yc >= by && yc < ay)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) b.hline(Math.round(xs[i]), Math.round(xs[i + 1]) - 1, y, c);
  }
}

/** O avião (sem animação: os motores são a jato). */
export function planeBuf(variant: number): PixelBuf {
  const p = PLANE_PAL[((variant % PLANE_PAL.length) + PLANE_PAL.length) % PLANE_PAL.length];
  const b = new PixelBuf(PLANE.w, PLANE.h);
  // asa de trás (do outro lado da fuselagem): sobe para trás, mais escura
  fillPoly(b, [[36, 12], [50, 12], [33, 3], [27, 3]], p.dk);
  b.hline(28, 33, 3, p.base);
  // estabilizador de trás, no alto da deriva (cauda em T)
  fillPoly(b, [[5, 3], [13, 3], [8, 0], [4, 0]], p.dk);
  // deriva
  fillPoly(b, [[6, 13], [19, 13], [11, 2], [5, 2]], p.base);
  b.line(6, 3, 10, 12, p.lt);
  // fuselagem: tubo com nariz arredondado e cone de cauda subindo
  fillPoly(b, [[4, 11], [64, 11], [64, 18], [16, 18], [8, 15]], p.base);
  b.ellipse(66, 14.5, 9, 3.6, p.base);
  b.hline(10, 70, 11, p.lt);
  b.hline(14, 68, 12, p.lt);
  b.hline(18, 66, 17, p.dk);
  b.hline(20, 64, 18, p.dk);
  b.hline(22, 62, 15, p.stripe);
  // janelas da cabine e portinholas
  b.rect(68, 12, 4, 2, GLASS);
  b.set(70, 12, GLASS_LT);
  b.set(73, 13, GLASS);
  for (let x = 26; x <= 58; x += 4) b.set(x, 13, '#4a5258');
  b.vline(58, 12, 17, p.dk);
  // asa da frente: desce para trás, por cima da fuselagem
  fillPoly(b, [[34, 14], [50, 14], [30, 25], [23, 25]], p.base);
  b.line(34, 14, 23, 25, p.lt);
  b.hline(24, 29, 25, p.dk);
  // motores sob a asa da frente, saindo à frente do bordo de ataque
  for (const [ex, ey] of [[37, 17], [30, 21]] as const) {
    b.rect(ex, ey, 9, 3, '#4d5356');
    b.hline(ex + 1, ex + 7, ey, '#6c7376');
    b.vline(ex + 8, ey, ey + 2, '#2b2f31');
    b.set(ex, ey + 1, '#3a3f42');
  }
  // estabilizador da frente
  fillPoly(b, [[6, 14], [15, 14], [8, 19], [4, 19]], p.base);
  b.outline();
  // pontas das luzes (as luzes acesas ficam por conta da iluminação)
  b.set(PLANE.ax + PLANE.navFar[0], PLANE.ay + PLANE.navFar[1], '#c0392e');
  b.set(PLANE.ax + PLANE.navNear[0], PLANE.ay + PLANE.navNear[1], '#2fa055');
  b.set(PLANE.ax + PLANE.strobe[0], PLANE.ay + PLANE.strobe[1], '#e8ecec');
  return b;
}

/** Sombra do avião: silhueta vista de cima, pálida (está muito alto). */
export function planeShadowBuf(): PixelBuf {
  const b = new PixelBuf(PLANE.w, 30);
  const c = 'rgba(20,26,22,0.16)';
  fillPoly(b, [[4, 13], [72, 13], [76, 15], [72, 17], [4, 17]], c);
  fillPoly(b, [[36, 13], [50, 13], [32, 2], [26, 2]], c);
  fillPoly(b, [[36, 17], [50, 17], [32, 28], [26, 28]], c);
  fillPoly(b, [[3, 13], [12, 13], [6, 8], [3, 8]], c);
  fillPoly(b, [[3, 17], [12, 17], [6, 22], [3, 22]], c);
  return b;
}
/** Âncora da sombra (mesmo x da fuselagem). */
export const PLANE_SHADOW = { ax: 40, ay: 15 };
