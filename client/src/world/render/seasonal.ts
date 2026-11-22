import { TILE, type CharacterFrameRequest, type FurnitureKind, type Sprite, type WallStyle } from '../../art/api';
import { mix } from '../../art/core/color';
import { hash32 } from '../../../../shared/hash';
import { renderSeasonalProp, type SeasonalProp } from '../../art/seasonal';
import type { SeasonalTheme } from '../api';
import type { AreaLayout, WallSegment } from '../layout/types';
import { drawBrokenGlass } from './destruction-art';

const sprites = new Map<SeasonalProp, Sprite>();
function prop(kind: SeasonalProp): Sprite {
  let sprite = sprites.get(kind);
  if (!sprite) {
    const { buf, ax, ay } = renderSeasonalProp(kind);
    const canvas = document.createElement('canvas');
    canvas.width = buf.w;
    canvas.height = buf.h;
    canvas.getContext('2d')!.putImageData(new ImageData(buf.data, buf.w, buf.h), 0, 0);
    sprites.set(kind, sprite = { canvas, ax, ay });
  }
  return sprite;
}

export function seasonalCostume(theme: SeasonalTheme, seed: number): CharacterFrameRequest['costume'] {
  if (theme === 'christmas') return 'santa';
  if (theme === 'halloween') return (['witch', 'pumpkin', 'vampire'] as const)[(seed >>> 0) % 3];
  return undefined;
}

/** Reutiliza footprints de plantas: nenhuma nova colisão ou mudança de caminhos. */
export function seasonalFurniture(theme: SeasonalTheme, kind: FurnitureKind, area: AreaLayout, seed: number): Sprite | null {
  if (theme === 'none' || theme === 'destruction' || area.kind === 'restroom') return null;
  if (theme === 'war') {
    // Guerra: plantas viram caixotes de munição sob rede de camuflagem e postos de sacos de areia.
    if (kind === 'plant_tall') return prop('ammo_stack');
    if (kind === 'plant_small') return prop('sandbag_post');
    return null;
  }
  if (kind === 'plant_tall') {
    const first = area.furniture.find((f) => f.kind === 'plant_tall');
    if (!first || hash32(first.id) !== seed) return null;
    return prop(theme === 'christmas' ? 'tree' : seed % 3 === 0 ? 'ghost' : 'pumpkin');
  }
  if (kind === 'plant_small') return prop(theme === 'christmas' ? 'gift' : 'pumpkin');
  return null;
}

export function seasonalRugColor(theme: SeasonalTheme, original: string): string {
  if (theme === 'war') return '#55603d';
  if (theme === 'destruction') return mix(original, '#2a2622', 0.3);
  return theme === 'christmas' ? '#a93649' : theme === 'halloween' ? '#60416f' : original;
}

export function seasonalWallStyle(theme: SeasonalTheme, original: WallStyle): WallStyle {
  if (theme === 'none' || original.pattern === 'glass') return original;
  // Guerra: um sopro de vermelho e o rodapé em ferrugem; Destruição: fuligem por igual.
  if (theme === 'war') return { ...original, base: mix(original.base, '#a8442e', 0.08), trim: mix(original.trim ?? original.base, '#6e2a1f', 0.4) };
  if (theme === 'destruction') return { ...original, base: mix(original.base, '#38322c', 0.22), trim: mix(original.trim ?? original.base, '#1e1a17', 0.35) };
  return { ...original, base: mix(original.base, theme === 'christmas' ? '#ffe3b4' : '#bc97d1', 0.18), trim: theme === 'christmas' ? '#4e7756' : '#725486' };
}

/** Lona de camuflagem: manchas deterministas e ilhoses nos cantos (Guerra). */
function camoTarp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const tones = ['#3f4a2d', '#6b6a43', '#2f3824', '#7b7550'];
  for (let i = 0; i < Math.floor((w * h) / 40); i++) {
    const n = hash32(`${x},${y}:${i}`);
    const bx = x + 2 + (n % Math.max(1, w - 8));
    const by = y + 2 + ((n >>> 8) % Math.max(1, h - 6));
    const bw = 3 + ((n >>> 16) % 5);
    const bh = 2 + ((n >>> 20) % 3);
    ctx.fillStyle = tones[(n >>> 24) % tones.length];
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(bx + 1, by - 1, Math.max(1, bw - 2), bh + 2);
  }
  ctx.fillStyle = '#c9b98a';
  for (const [cx, cy] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) ctx.fillRect(cx, cy, 1, 1);
}

/** Flâmula de alerta com insígnia inventada: campo bicolor, chevron e estrela de quatro pontas. */
function warBanner(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number): void {
  const field = variant % 2 ? '#6e2a22' : '#3f4a2d';
  const band = variant % 2 ? '#3a2a20' : '#9a3a26';
  ctx.fillStyle = '#2c2a26';
  ctx.fillRect(x - 1, y, 12, 1);
  ctx.fillStyle = field;
  ctx.fillRect(x, y + 1, 10, 13);
  // ponta em rabo de andorinha
  ctx.fillRect(x, y + 14, 4, 2);
  ctx.fillRect(x + 6, y + 14, 4, 2);
  ctx.fillStyle = band;
  ctx.fillRect(x, y + 1, 10, 2);
  // insígnia: chevron amarelo e uma estrela de quatro pontas
  ctx.fillStyle = '#e0b54a';
  ctx.fillRect(x + 2, y + 9, 2, 1);
  ctx.fillRect(x + 4, y + 10, 2, 1);
  ctx.fillRect(x + 6, y + 9, 2, 1);
  ctx.fillRect(x + 4, y + 5, 2, 2);
  ctx.fillRect(x + 5, y + 4, 1, 4);
  ctx.fillRect(x + 3, y + 6, 4, 1);
  ctx.fillStyle = 'rgba(20,18,16,0.25)';
  ctx.fillRect(x + 10, y + 2, 1, 12);
}

/** Motivos de tapete (cacheados junto com o piso). */
export function decorateSeasonalRug(ctx: CanvasRenderingContext2D, theme: SeasonalTheme, rug: { x: number; y: number; w: number; h: number }): void {
  if (theme === 'none' || theme === 'destruction') return;
  const x = Math.round(rug.x), y = Math.round(rug.y), w = Math.floor(rug.w), h = Math.floor(rug.h);
  if (theme === 'war') {
    ctx.save();
    camoTarp(ctx, x, y, w, h);
    ctx.restore();
    return;
  }
  if (w < 25 || h < 16) return;
  ctx.save();
  ctx.fillStyle = theme === 'christmas' ? '#ddb66e' : '#e5a457';
  ctx.fillRect(x + 4, y + 4, w - 8, 1);
  ctx.fillRect(x + 4, y + h - 5, w - 8, 1);
  for (let cx = x + 14; cx < x + w - 10; cx += 28) {
    const cy = Math.round(y + h / 2);
    if (theme === 'christmas') {
      ctx.fillRect(cx - 4, cy, 9, 1);
      ctx.fillRect(cx, cy - 4, 1, 9);
      for (const d of [-2, 2]) {
        ctx.fillRect(cx + d, cy + d, 1, 1);
        ctx.fillRect(cx + d, cy - d, 1, 1);
      }
    } else {
      ctx.fillRect(cx - 3, cy - 2, 7, 5);
      ctx.fillRect(cx, cy - 4, 1, 2);
      ctx.fillStyle = '#60416f';
      ctx.fillRect(cx - 2, cy - 1, 1, 1);
      ctx.fillRect(cx + 2, cy - 1, 1, 1);
      ctx.fillStyle = '#e5a457';
    }
  }
  ctx.restore();
}

/** Enfeites no alto da parede, longe das telas e placas. Os vãos ficam livres. */
export function decorateSeasonalWall(ctx: CanvasRenderingContext2D, theme: SeasonalTheme, wall: WallSegment, items: readonly FaceItem[] = []): void {
  if (theme === 'none' || theme === 'destruction' || wall.kind !== 'face') return;
  if (theme === 'war') {
    decorateWarWall(ctx, wall, items);
    return;
  }
  ctx.save();
  const x0 = Math.round(wall.x + 3), end = Math.floor(wall.x + wall.w - 3), y = Math.round(wall.y + 5);
  for (let x = x0; x < end; x++) {
    if (wall.doorways?.some((d) => x >= d.x - 1 && x < d.x + d.w + 1)) continue;
    const sag = Math.round(Math.sin(((x - x0) % 48) / 48 * Math.PI) * 3);
    ctx.fillStyle = theme === 'christmas' ? '#347653' : '#584068';
    ctx.fillRect(x, y + sag, 1, theme === 'christmas' ? 3 : 1);
    if ((x - x0) % 12 === 6) {
      ctx.fillStyle = theme === 'christmas' ? '#f5d491' : '#eea24d';
      ctx.fillRect(x, y + sag + 3, 2, 3);
      ctx.fillStyle = theme === 'christmas' ? '#fff0be' : '#ffd78a';
      ctx.fillRect(x, y + sag + 3, 1, 1);
    }
  }
  if (theme === 'halloween') {
    // Teias pequenas nos cantos; não cobrem os equipamentos.
    ctx.strokeStyle = '#d6bfdd';
    ctx.lineWidth = 1;
    for (const side of [1, -1]) {
      const x = side === 1 ? x0 : end;
      ctx.beginPath();
      for (const [dx, dy] of [[15, 0], [13, 7], [7, 13], [0, 15]]) {
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + side * dx, y + 2 + dy);
      }
      for (const r of [5, 10, 15]) {
        ctx.moveTo(x + side * r, y + 2);
        ctx.lineTo(x + side * Math.round(r * 0.7), y + 2 + Math.round(r * 0.7));
        ctx.lineTo(x, y + 2 + r);
      }
      ctx.stroke();
    }
    if (wall.w > 90) {
      const bat = prop('bat');
      ctx.drawImage(bat.canvas, Math.round(wall.x + wall.w / 2 - bat.ax), y + 18 - bat.ay);
    }
  }
  ctx.restore();
}

/** Espaço livre na face (longe das portas e dos itens de parede) para algo de `w` px começando em `x`. */
type FaceItem = { cx: number; on: 'face' | 'south'; kind?: FurnitureKind; variant?: string };

/** Meia largura aproximada (px) de um item de parede, para as flâmulas não o cobrirem. */
function halfWidth(it: FaceItem): number {
  if (it.variant === 'wide' || it.kind === 'whiteboard' || it.kind === 'tv') return 34;
  if (it.kind === 'window' || it.kind === 'painting' || it.kind === 'elevator' || it.kind === 'sign') return 20;
  return 10;
}

function freeOnFace(wall: WallSegment, items: readonly FaceItem[], x: number, w: number): boolean {
  if (wall.kind === 'cap') return false;
  if (wall.doorways?.some((d) => x < d.x + d.w + 2 && x + w > d.x - 2)) return false;
  return !items.some((it) => it.on === 'face' && Math.abs(it.cx - (x + w / 2)) < halfWidth(it) + w / 2 + 2);
}

/** Guerra: arame farpado no alto da parede e flâmulas de alerta nos vãos livres (cacheado). */
function decorateWarWall(ctx: CanvasRenderingContext2D, wall: Extract<WallSegment, { kind: 'face' }>, items: readonly FaceItem[]): void {
  ctx.save();
  const x0 = Math.round(wall.x + 2), end = Math.floor(wall.x + wall.w - 2), y = Math.round(wall.y + 2);
  // arame: dois fios torcidos com farpas a cada 5 px
  for (let x = x0; x < end; x++) {
    if (wall.doorways?.some((d) => x >= d.x - 1 && x < d.x + d.w + 1)) continue;
    const k = (x - x0) % 5;
    ctx.fillStyle = '#4a4c4a';
    ctx.fillRect(x, y + (k < 3 ? 0 : 1), 1, 1);
    ctx.fillStyle = '#7d817d';
    ctx.fillRect(x, y + (k < 3 ? 1 : 0), 1, 1);
    if (k === 2) {
      ctx.fillStyle = '#5c5f5c';
      ctx.fillRect(x - 1, y - 1, 1, 1);
      ctx.fillRect(x + 1, y + 2, 1, 1);
    }
  }
  // bandeirolas triangulares penduradas no arame (no alto, por cima dos itens, como a guirlanda do Natal)
  const pennant = ['#9a3a26', '#5d6a3a', '#d0a640'];
  for (let x = x0 + 3, i = 0; x + 5 < end; x += 9, i++) {
    if (wall.doorways?.some((d) => x + 5 >= d.x - 1 && x < d.x + d.w + 1)) continue;
    ctx.fillStyle = pennant[i % 3];
    ctx.fillRect(x, y + 2, 5, 1);
    ctx.fillRect(x + 1, y + 3, 3, 1);
    ctx.fillRect(x + 2, y + 4, 1, 1);
  }
  // flâmulas nos vãos livres da face, a pelo menos 44 px uma da outra
  let n = 0;
  let last = -Infinity;
  for (let x = x0 + 6; x + 12 < end; x += 2) {
    if (x - last < 44 || !freeOnFace(wall, items, x, 10)) continue;
    warBanner(ctx, x, y + 6, n++ + Math.floor(wall.x / 16));
    last = x;
  }
  ctx.restore();
}

/** Guirlandas nas molduras dos elevadores (sem cobrir a porta animada). */
export function decorateElevator(ctx: CanvasRenderingContext2D, theme: SeasonalTheme, x: number, y: number): void {
  if (theme === 'none' || theme === 'destruction') return;
  const sprite = prop(theme === 'christmas' ? 'wreath' : theme === 'war' ? 'beacon' : 'bat');
  ctx.drawImage(sprite.canvas, Math.round(x - sprite.ax), Math.round(y - 19 - sprite.ay));
}

const glows = new Map<SeasonalTheme, HTMLCanvasElement>();
function glowSprite(theme: SeasonalTheme): HTMLCanvasElement {
  let canvas = glows.get(theme);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = canvas.height = 34;
    const ctx = canvas.getContext('2d')!;
    const glow = ctx.createRadialGradient(17, 17, 1, 17, 17, 17);
    glow.addColorStop(0, theme === 'christmas' ? '#ffd58b' : '#d8a5ed');
    glow.addColorStop(1, 'rgba(255,220,180,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 34, 34);
    glows.set(theme, canvas);
  }
  return canvas;
}

/** Luz decorativa suave, limitada à face da parede. Não interfere com salas apagadas. */
export function drawSeasonalLights(ctx: CanvasRenderingContext2D, theme: SeasonalTheme, layout: AreaLayout, light: number, now = 0, night = 0, still = false): void {
  if (theme === 'war') {
    drawWarAlert(ctx, layout, light, now, night, still);
    return;
  }
  if (theme === 'none' || theme === 'destruction' || light <= 0.01) return;
  ctx.save();
  for (const wall of layout.walls) {
    if (wall.kind !== 'face') continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wall.x, wall.y + 4, wall.w, 27);
    ctx.clip();
    for (let x = wall.x + 14; x < wall.x + wall.w - 6; x += 24) {
      if (wall.doorways?.some((d) => x >= d.x - 10 && x <= d.x + d.w + 10)) continue;
      ctx.globalAlpha = light * 0.3;
      ctx.drawImage(glowSprite(theme), Math.round(x - 17), wall.y - 8);
      ctx.globalAlpha = light * 0.85;
      ctx.fillStyle = theme === 'christmas' ? '#ffe4a9' : '#ffd181';
      ctx.fillRect(Math.round(x), wall.y + 9, 2, 2);
    }
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Guerra, por cima da escuridão: tom vermelho/âmbar de alerta pulsando na zona, sirenes giratórias na face da
 * parede norte e, à noite, holofotes varrendo o piso a partir dos cantos de cima. Com prefers-reduced-motion
 * fica tudo parado (tom fixo, sirenes acesas, holofotes num ângulo só).
 */
function drawWarAlert(ctx: CanvasRenderingContext2D, layout: AreaLayout, light: number, now: number, night: number, still: boolean): void {
  const r = layout.rect;
  const px = { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE };
  const seed = hash32(layout.id);
  const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(now / 520 + (seed % 7));
  ctx.save();
  // tom de alerta (multiplica: escurece um pouco e puxa para o vermelho, sem lavar o desenho)
  ctx.globalAlpha = 0.1 + 0.07 * pulse;
  ctx.fillStyle = '#c8402e';
  ctx.fillRect(px.x, px.y, px.w, px.h);
  // holofotes à noite
  if (night > 0.15) {
    ctx.beginPath();
    ctx.rect(px.x, px.y, px.w, px.h);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const face = layout.walls.find((w) => w.kind === 'face');
    const fx0 = face ? face.x : px.x, fx1 = face ? face.x + face.w : px.x + px.w, fy = face ? face.y : px.y;
    const len = Math.max(px.h, 90) * 0.85;
    for (const side of [0, 1]) {
      const ox = side ? fx1 - 14 : fx0 + 14;
      const oy = fy + 2 * TILE - 4;
      const base = side ? Math.PI * 0.72 : Math.PI * 0.28;
      const a = base + (still ? 0 : Math.sin(now / 2300 + side * 2.1 + (seed % 11)) * 0.42);
      const spread = 0.12;
      const g = ctx.createRadialGradient(ox, oy, 2, ox, oy, len);
      g.addColorStop(0, `rgba(255,244,200,${0.3 * night})`);
      g.addColorStop(0.7, `rgba(255,236,180,${0.1 * night})`);
      g.addColorStop(1, 'rgba(255,236,180,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
      ctx.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
      ctx.closePath();
      ctx.fill();
      // o próprio holofote: lente acesa
      ctx.fillStyle = `rgba(255,250,225,${0.9 * night})`;
      ctx.fillRect(Math.round(ox) - 1, Math.round(oy) - 1, 3, 3);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // sirenes na face norte (com a luz da sala apagada, só a cúpula)
  ctx.save();
  for (const wall of layout.walls) {
    if (wall.kind !== 'face') continue;
    for (let x = wall.x + 30; x < wall.x + wall.w - 20; x += 72) {
      if (wall.doorways?.some((d) => x >= d.x - 10 && x <= d.x + d.w + 10)) continue;
      const bx = Math.round(x), by = wall.y + 20;
      const phase = still ? 1 : (Math.sin(now / 160 + x * 0.05) + 1) / 2;
      const on = still || phase > 0.35;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2f3332';
      ctx.fillRect(bx - 3, by + 3, 7, 2);
      ctx.fillStyle = on ? '#ff6a3c' : '#8c2f22';
      ctx.fillRect(bx - 2, by - 1, 5, 4);
      ctx.fillStyle = on ? '#ffd2a0' : '#b8483a';
      ctx.fillRect(bx - 1, by, 2, 1);
      if (on) {
        ctx.globalAlpha = (0.35 + 0.25 * Math.max(light, night)) * phase;
        ctx.drawImage(alertGlow(), bx - 17, by - 16);
      }
    }
  }
  ctx.restore();
}

let alertGlowCanvas: HTMLCanvasElement | null = null;
function alertGlow(): HTMLCanvasElement {
  if (!alertGlowCanvas) {
    const c = (alertGlowCanvas = document.createElement('canvas'));
    c.width = c.height = 34;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(17, 17, 1, 17, 17, 17);
    grad.addColorStop(0, 'rgba(255,110,60,0.95)');
    grad.addColorStop(1, 'rgba(255,80,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 34, 34);
  }
  return alertGlowCanvas;
}

export function drawSeasonalWindow(ctx: CanvasRenderingContext2D, theme: SeasonalTheme, glass: { x: number; y: number; w: number; h: number }, now: number, seed: number): void {
  if (theme === 'war') {
    // fita adesiva em X contra estilhaços
    ctx.save();
    ctx.beginPath();
    ctx.rect(glass.x, glass.y, glass.w, glass.h);
    ctx.clip();
    ctx.fillStyle = '#d8cca0';
    ctx.globalAlpha *= 0.85;
    const steps = Math.max(glass.w, glass.h);
    for (let i = 0; i <= steps; i++) {
      const fx = glass.x + (i / steps) * glass.w;
      const fy = glass.y + (i / steps) * glass.h;
      ctx.fillRect(Math.floor(fx), Math.floor(fy), 2, 1);
      ctx.fillRect(Math.floor(glass.x + glass.w - (i / steps) * glass.w) - 1, Math.floor(fy), 2, 1);
    }
    ctx.restore();
    return;
  }
  if (theme === 'destruction') {
    drawBrokenGlass(ctx, glass, seed);
    return;
  }
  if (theme !== 'christmas') return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(glass.x, glass.y, glass.w, glass.h);
  ctx.clip();
  ctx.fillStyle = '#edf3f3';
  ctx.globalAlpha *= 0.7;
  ctx.fillRect(glass.x, glass.y + glass.h - 2, glass.w, 2);
  for (let i = 0; i < 12; i++) {
    const x = ((seed >>> 0) + i * 17) % Math.max(1, Math.floor(glass.w));
    const y = (Math.floor(now / 180) + i * 11) % Math.max(1, Math.floor(glass.h));
    ctx.fillRect(Math.floor(glass.x + x), Math.floor(glass.y + y), 1, 1);
  }
  ctx.restore();
}
