// Uniforme tático (tema "tático", original): aplicado SÓ na hora de desenhar o personagem. A aparência
// sorteada (shared/world/appearance-flat.ts) continua intacta; daqui sai uma cópia recolorida + o que o
// render.ts precisa para desenhar colete, capacete/gorro/balaclava, braçadeira e cinto.
// Tudo é determinístico a partir da aparência original (mesma aparência => mesmo uniforme), então a
// chave do cache de sprites (que já inclui a aparência) continua correta.
import type { Appearance } from '../api';
import { ramp, shade, type Ramp } from '../core/color';
import type { PixelBuf } from '../core/pixbuf';

/** Liga/desliga o uniforme tático de todos os personagens. */
export const TACTICAL_UNIFORMS = true;

export type Team = 'a' | 'b';
export type Headgear = 'helmet' | 'beanie' | 'balaclava';

export interface TacticalLook {
  team: Team;
  headgear: Headgear;
  /** Aparência recolorida (camisa, calça, botas; acessórios de cabeça trocados). */
  appearance: Appearance;
  vest: Ramp;
  pouch: Ramp;
  gear: Ramp;
  band: string;
  belt: string;
}

/** Equipe A: marinho/preto, braçadeira azul. Equipe B: cáqui-deserto/oliva, braçadeira laranja. */
const TEAMS = {
  a: {
    shirts: ['#2c3548', '#262b36', '#34405a'],
    pants: ['#232936', '#1f2229', '#2b3242'],
    vests: ['#1c2029', '#252c3b'],
    pouch: '#2f3646',
    gear: ['#2a3140', '#1e232c'],
    band: '#3d86e0',
    boots: ['#1b1c20', '#24232a'],
  },
  b: {
    shirts: ['#b49c72', '#a8946b', '#8c8a5e'],
    pants: ['#8a7a58', '#6f6c4a', '#7d6f50'],
    vests: ['#66663f', '#7a6e48'],
    pouch: '#857a52',
    gear: ['#7b7252', '#5f6142'],
    band: '#ec832f',
    boots: ['#2e2721', '#3a3027'],
  },
} as const;

/** Cabelos que caem nos ombros: com eles a balaclava ficaria estranha (usa capacete/gorro). */
const LONG_HAIR: ReadonlySet<string> = new Set(['long', 'wavy', 'pigtails', 'ponytail', 'bob', 'afro', 'bun', 'curly']);

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

const pick = <T>(list: readonly T[], n: number): T => list[n % list.length];

const lookCache = new WeakMap<Appearance, TacticalLook>();

/** Uniforme de uma aparência, ou null com o tema desligado. */
export function tacticalLook(a: Appearance): TacticalLook | null {
  if (!TACTICAL_UNIFORMS) return null;
  let t = lookCache.get(a);
  if (t) return t;
  const h = hash(`${a.top}|${a.topAccent}|${a.hair}|${a.skin}|${a.hairStyle}|${a.eyes}|${a.bottom}`);
  const team: Team = h & 1 ? 'b' : 'a';
  const P = TEAMS[team];
  const roll = (h >>> 1) % 100;
  const canBalaclava = !LONG_HAIR.has(a.hairStyle);
  const headgear: Headgear = roll < 50 ? 'helmet' : roll < 74 ? 'beanie' : canBalaclava ? 'balaclava' : 'helmet';
  const shirt = pick(P.shirts, h >>> 8);
  const gear = pick(P.gear, h >>> 12);
  // Mantém óculos (de sol) e fone (vira abafador escuro); boné/gorro/laço/brinco dão lugar ao equipamento.
  const keep = a.accessory === 'glasses' || a.accessory === 'sunglasses' || a.accessory === 'headphones';
  const appearance: Appearance = {
    ...a,
    top: shirt,
    topAccent: shade(shirt, -0.12),
    bottom: pick(P.pants, h >>> 16),
    bottomStyle: 'pants',
    shoes: pick(P.boots, h >>> 20),
    accessory: keep ? a.accessory : 'none',
    accessoryColor: a.accessory === 'headphones' ? '#3a3d38' : a.accessoryColor,
  };
  t = {
    team,
    headgear,
    appearance,
    vest: ramp(pick(P.vests, h >>> 24), 0.08),
    pouch: ramp(P.pouch, 0.08),
    gear: ramp(gear, 0.08),
    band: P.band,
    belt: '#16171b',
  };
  lookCache.set(a, t);
  return t;
}

// ---------------------------------------------------------------- desenho

type View = 'down' | 'up' | 'side';

/**
 * Colete (plate carrier) sobre o tronco + cinto. `y` = topo do tronco; `lx` = inclinação (perfil).
 * Chamado ANTES do crachá, que fica por cima e legível. Sem crachá, a frente ganha um bolso central.
 */
export function drawVest(b: PixelBuf, t: TacticalLook, view: View, y: number, lx: number, lanyard: boolean): void {
  const v = t.vest;
  const pc = t.pouch;
  if (view === 'side') {
    // Placa da frente e das costas, alças por cima do ombro; frente à esquerda.
    b.rect(8 + lx, y + 1, 7, 5, v.base);
    b.vline(8 + lx, y + 1, y + 5, v.lt);
    b.vline(14 + lx, y + 1, y + 5, v.dk);
    b.rect(9 + lx, y, 2, 1, v.dk);
    b.rect(13 + lx, y, 2, 1, v.dk);
    b.hline(9 + lx, 13 + lx, y + 2, v.dk);
    // Bolso na frente (some sob o crachá dos subagentes) e outro nas costas.
    b.rect(8 + lx, y + 3, 2, 2, pc.base);
    b.set(8 + lx, y + 3, pc.lt);
    b.rect(13 + lx, y + 3, 2, 2, pc.dk);
    b.hline(8 + lx, 14 + lx, y + 6, t.belt);
    b.set(10 + lx, y + 6, '#6d6a5e');
    return;
  }
  // Frente / costas (x 8..15): alças nos ombros, gola da camisa à mostra no meio.
  b.rect(8, y, 2, 1, v.dk);
  b.rect(14, y, 2, 1, v.dk);
  b.rect(8, y + 1, 8, 5, v.base);
  b.vline(8, y + 1, y + 5, v.lt);
  b.vline(15, y + 1, y + 5, v.dk);
  b.hline(9, 14, y + 1, v.lt);
  if (view === 'down') {
    // Bolsos de carregador nas laterais (abas mais claras) e um no centro quando não há crachá.
    for (const x of [8, 14]) {
      b.rect(x, y + 3, 2, 3, pc.base);
      b.hline(x, x + 1, y + 3, pc.lt);
      b.set(x + 1, y + 5, pc.dk);
    }
    if (!lanyard) {
      b.rect(10, y + 3, 4, 2, pc.base);
      b.hline(10, 13, y + 3, pc.lt);
      b.set(13, y + 4, pc.dk);
    }
    b.rect(8, y + 6, 8, 1, t.belt);
    b.rect(11, y + 6, 2, 1, '#6d6a5e');
  } else {
    // Costas: alça de resgate no topo e painel com mochila de hidratação.
    b.rect(11, y + 1, 2, 1, v.dd);
    b.rect(10, y + 2, 4, 3, pc.dk);
    b.hline(10, 13, y + 2, pc.base);
    b.rect(8, y + 6, 8, 1, t.belt);
  }
}

/** Braçadeira da equipe: 1 linha no braço (cor por cima da manga). */
export function bandColor(t: TacticalLook, dim: number): string {
  return dim ? shade(t.band, -dim) : t.band;
}

/** Linha de corte do cabelo (na grade da cabeça): acima dela, o cabelo some sob o equipamento. */
export function hairCutRow(t: TacticalLook): number {
  return t.headgear === 'balaclava' ? 3 : 2;
}

const HELMET: Readonly<Record<View, readonly string[]>> = {
  down: [
    '....oooooo....',
    '..oohhhooooo..',
    '.ohhHhmmooood.',
    '.ohhhhmmooood.',
    'ooohoooooooodd',
    'oooooooooooodd',
    'rrrrrrrrrrrrrr',
    'oo..........dd',
    'o............d',
  ],
  up: [
    '....oooooo....',
    '..oohhhooooo..',
    '.ohhHhooooood.',
    '.ohhhpppooood.',
    'ooohopppoooodd',
    'oooooooooooodd',
    'oooooooooooodd',
    'rrrrrrrrrrrrrr',
    '.d..........d.',
  ],
  side: [
    '.....oooooo...',
    '...oohhhoooo..',
    '..mhHhhooooood',
    '.ommhhoooooodd',
    '.ohhooooooootd',
    'oooooooooooodd',
    'rrrrrroooooodd',
    '......orrrrrdd',
    '.........d.d..',
  ],
};

/** Gorro de lã justo (sem pompom), com a barra dobrada canelada. */
const BEANIE: Readonly<Record<View, readonly string[]>> = {
  down: ['....oooooo....', '..oohhhooooo..', '.ohhHhhoooood.', '.ohhhhooooood.', 'rRrRrRrRrRrRrR'],
  up: ['....oooooo....', '..oohhhooooo..', '.ohhHhhoooood.', '.ohhhhooooood.', 'rRrRrRrRrRrRrR'],
  side: ['....oooooo....', '..oohhhooooo..', '.ohhHhhoooood.', '.ohhhhooooood.', '.rRrRrRrRrRrR.'],
};

/**
 * Capacete, gorro ou balaclava. `ox/oy` = origem da grade da
 * cabeça já com inclinação, respiração e cochilo. Rosto (olhos e boca) sempre à mostra.
 */
export function drawHeadgear(b: PixelBuf, t: TacticalLook, view: View, ox: number, oy: number): void {
  const g = t.gear;
  if (t.headgear === 'helmet') {
    b.stamp(HELMET[view], ox, oy + 1, {
      o: g.base,
      h: g.lt,
      H: g.hi,
      d: g.dk,
      r: g.dd,
      m: '#15171c', // suporte frontal
      p: t.band, // patch da equipe nas costas
      t: t.band, // patch na lateral
    });
    return;
  }
  if (t.headgear === 'beanie') {
    b.stamp(BEANIE[view], ox, oy + 2, { o: g.base, h: g.lt, H: g.hi, d: g.dk, r: g.dk, R: g.dd });
    return;
  }
  // Balaclava de rosto aberto: cobre topo, testa, laterais e pescoço; janela do rosto nas colunas 2..11.
  const put = (c: number, r: number, col: string) => b.set(ox + c, oy + r, col);
  const row = (c0: number, c1: number, r: number, hiTo = -1) => {
    for (let c = c0; c <= c1; c++) put(c, r, c <= hiTo ? g.lt : c >= c1 - 1 ? g.dk : g.base);
  };
  if (view === 'side') {
    row(3, 10, 3, 5);
    row(2, 11, 4, 4);
    for (let r = 5; r <= 9; r++) row(1, 12, r, 3);
    // Janela do rosto à esquerda (colunas 1..6 abaixo da testa); o resto da cabeça coberto.
    for (let r = 10; r <= 14; r++) row(7, 12, r);
    put(1, 9, g.dk);
    row(3, 9, 15);
    return;
  }
  row(3, 10, 3, 5);
  row(2, 11, 4, 4);
  for (let r = 5; r <= 9; r++) row(1, 12, r, 3);
  if (view === 'up') {
    for (let r = 10; r <= 15; r++) row(1, 12, r);
    return;
  }
  for (let r = 10; r <= 14; r++) {
    put(0, r, g.base);
    put(1, r, g.base);
    put(12, r, g.dk);
    put(13, r, g.dk);
  }
  b.hline(ox + 2, ox + 11, oy + 9, g.dk); // borda da janela
  row(3, 10, 15);
}
