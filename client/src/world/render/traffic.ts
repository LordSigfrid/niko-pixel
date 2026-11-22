// Trânsito da rua (puro, sem DOM): espaçamento entre veículos da mesma faixa.
// Regras: na mesma faixa ninguém se sobrepõe; quem alcança o da frente freia, acompanha a
// velocidade dele e mantém uma folga; ninguém anda para trás nem "teleporta"; um veículo novo só
// nasce se couber atrás do último da faixa (comprimento real do sprite + folga).

/** Folga mínima (px) entre o para-choque de um e a traseira do da frente. */
export const TRAFFIC_GAP = 10;
/** Distância extra (px) além da folga em que quem vem atrás começa a frear. */
export const TRAFFIC_BRAKE = 28;
/** Aceleração/frenagem suave (px/s²); o limite de posição garante a folga mesmo assim. */
export const TRAFFIC_ACCEL = 60;

export interface TrafficVehicle {
  x: number;
  /** Faixa (y do chão); a direção é a da faixa. */
  y: number;
  dir: 1 | -1;
  /** Velocidade de cruzeiro (px/s). */
  speed: number;
  /** Velocidade atual (px/s). */
  v: number;
  /** Extensão do sprite (px) à frente e atrás da âncora, no sentido do movimento. */
  ahead: number;
  behind: number;
}

/** Extensão real do sprite (largura `w`, âncora `ax` virado para a direita) no sentido `dir`. */
export function spriteExtent(w: number, ax: number, dir: 1 | -1): { ahead: number; behind: number } {
  // virado para a direita o sprite ocupa [x-ax, x-ax+w); espelhado, a âncora vira w-1-ax.
  return dir > 0 ? { ahead: w - ax, behind: ax } : { ahead: w - 1 - ax, behind: ax + 1 };
}

/** Espaço livre (px) entre a frente de `back` e a traseira de `front` (mesma faixa e direção). */
export function bumperGap(back: TrafficVehicle, front: TrafficVehicle): number {
  return (front.x - back.x) * back.dir - front.behind - back.ahead;
}

/** Veículos da faixa (mesmo y e direção) ordenados do líder (mais adiantado) ao último. */
function laneOrder<T extends TrafficVehicle>(all: readonly T[], y: number, dir: 1 | -1): T[] {
  return all.filter((c) => c.y === y && c.dir === dir).sort((a, b) => (b.x - a.x) * dir);
}

/**
 * Avança o trânsito `dt` segundos. Cada faixa é resolvida do líder para trás, usando a posição já
 * atualizada do da frente, de modo que a folga vale ao fim do passo para qualquer dt (inclusive um
 * dt enorme depois de a aba ficar oculta). Devolve a distância percorrida por veículo (odômetro).
 */
export function stepTraffic<T extends TrafficVehicle>(all: T[], dt: number, gap = TRAFFIC_GAP): Map<T, number> {
  const moved = new Map<T, number>();
  if (!(dt > 0)) return moved;
  const lanes = new Map<string, { y: number; dir: 1 | -1 }>();
  for (const c of all) lanes.set(`${c.y}:${c.dir}`, { y: c.y, dir: c.dir });
  for (const { y, dir } of lanes.values()) {
    let lead: T | null = null;
    for (const c of laneOrder(all, y, dir)) {
      let target = c.speed;
      if (lead) {
        const free = bumperGap(c, lead);
        // perto do da frente: acompanha a velocidade dele; mais perto que a folga: para
        if (free < gap + TRAFFIC_BRAKE) target = Math.min(target, lead.v * Math.max(0, Math.min(1, (free - gap) / TRAFFIC_BRAKE + 0.6)));
      }
      const dv = TRAFFIC_ACCEL * dt;
      let v = c.v < target ? Math.min(target, c.v + dv) : Math.max(target, c.v - dv * 2);
      let d = Math.max(0, v * dt);
      if (lead) {
        // limite duro: nunca entra na folga do da frente (sem andar para trás)
        const room = Math.max(0, bumperGap(c, lead) - gap);
        if (d > room) d = room;
        v = Math.min(v, d / dt);
      }
      c.x += dir * d;
      c.v = v;
      moved.set(c, d);
      lead = c;
    }
  }
  return moved;
}

/**
 * Um veículo com `ahead` px à frente da âncora pode nascer em `x` (fora da tela, no início da faixa)?
 * Só se houver espaço até a traseira do último veículo da faixa (e ninguém atrás dele).
 */
export function canSpawn(all: readonly TrafficVehicle[], y: number, dir: 1 | -1, x: number, ahead: number, gap = TRAFFIC_GAP): boolean {
  for (const c of all) {
    if (c.y !== y || c.dir !== dir) continue;
    const rel = (c.x - x) * dir; // > 0: está à frente do ponto de nascimento
    if (rel <= 0) return false;
    if (rel - c.behind - ahead < gap) return false;
  }
  return true;
}

/** Velocidade inicial de quem nasce: não mais rápido do que o último da faixa, se estiver perto. */
export function spawnSpeed(all: readonly TrafficVehicle[], y: number, dir: 1 | -1, x: number, ahead: number, cruise: number, gap = TRAFFIC_GAP): number {
  let v = cruise;
  for (const c of all) {
    if (c.y !== y || c.dir !== dir) continue;
    const free = (c.x - x) * dir - c.behind - ahead;
    if (free < gap + TRAFFIC_BRAKE * 2) v = Math.min(v, c.v);
  }
  return v;
}
