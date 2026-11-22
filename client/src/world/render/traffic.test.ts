import { describe, expect, it } from 'vitest';
import { bumperGap, canSpawn, spawnSpeed, spriteExtent, stepTraffic, TRAFFIC_GAP, type TrafficVehicle } from './traffic';

const veh = (x: number, dir: 1 | -1, speed: number, y = dir > 0 ? 100 : 140, w = 50, ax = 24): TrafficVehicle => ({ x, y, dir, speed, v: speed, ...spriteExtent(w, ax, dir) });

/** Menor folga entre vizinhos da mesma faixa. */
function minGap(all: TrafficVehicle[]): number {
  let m = Infinity;
  for (const a of all)
    for (const b of all) {
      if (a === b || a.y !== b.y || a.dir !== b.dir) continue;
      if ((b.x - a.x) * a.dir > 0) m = Math.min(m, bumperGap(a, b));
    }
  return m;
}

describe('trânsito', () => {
  it('extensão do sprite cobre a largura inteira nos dois sentidos', () => {
    for (const dir of [1, -1] as const) {
      const e = spriteExtent(56, 26, dir);
      expect(e.ahead + e.behind).toBe(56);
    }
  });

  it('o mais rápido alcança, freia e mantém a folga sem atravessar', () => {
    const slow = veh(300, 1, 20);
    const fast = veh(150, 1, 60, 100, 34, 16);
    const all = [fast, slow];
    for (let i = 0; i < 1200; i++) {
      stepTraffic(all, 1 / 60);
      expect(minGap(all)).toBeGreaterThanOrEqual(TRAFFIC_GAP - 1e-6);
      expect(fast.x).toBeLessThan(slow.x);
    }
    expect(fast.v).toBeCloseTo(slow.v, 0);
  });

  it('comboio de três (líder lento) não se encavala', () => {
    const all = [veh(400, 1, 20), veh(300, 1, 40), veh(200, 1, 60)];
    for (let i = 0; i < 2000; i++) {
      stepTraffic(all, 1 / 30);
      expect(minGap(all)).toBeGreaterThanOrEqual(TRAFFIC_GAP - 1e-6);
    }
  });

  it('sentido contrário: a mesma regra vale andando para a esquerda', () => {
    const slow = veh(100, -1, 22);
    const fast = veh(260, -1, 58);
    const all = [slow, fast];
    for (let i = 0; i < 800; i++) stepTraffic(all, 1 / 60);
    expect(minGap(all)).toBeGreaterThanOrEqual(TRAFFIC_GAP - 1e-6);
    expect(fast.x).toBeGreaterThan(slow.x);
  });

  it('faixas diferentes não interferem', () => {
    const a = veh(200, 1, 40);
    const b = veh(205, -1, 40);
    stepTraffic([a, b], 1);
    expect(a.x).toBeCloseTo(240);
    expect(b.x).toBeCloseTo(165);
  });

  it('dt enorme (aba oculta) não empilha nem teleporta para trás', () => {
    const all = [veh(260, 1, 20), veh(180, 1, 60), veh(100, 1, 60)];
    const before = all.map((c) => c.x);
    const moved = stepTraffic(all, 30);
    all.forEach((c, i) => expect(c.x).toBeGreaterThanOrEqual(before[i]));
    expect(minGap(all)).toBeGreaterThanOrEqual(TRAFFIC_GAP - 1e-6);
    for (const d of moved.values()) expect(d).toBeGreaterThanOrEqual(0);
  });

  it('nascimento só com espaço pelo comprimento real do sprite', () => {
    const tank = veh(0, 1, 20, 100, 56, 26);
    const jeep = spriteExtent(34, 16, 1);
    // traseira do tanque em x-26: precisa de ahead(18) + folga
    tank.x = -100 + 26 + jeep.ahead + TRAFFIC_GAP - 1;
    expect(canSpawn([tank], 100, 1, -100, jeep.ahead)).toBe(false);
    tank.x += 2;
    expect(canSpawn([tank], 100, 1, -100, jeep.ahead)).toBe(true);
    expect(canSpawn([tank], 140, -1, -100, jeep.ahead)).toBe(true);
    // alguém ainda no ponto de nascimento (ou atrás dele) bloqueia
    expect(canSpawn([veh(-100, 1, 20)], 100, 1, -100, jeep.ahead)).toBe(false);
    // quem nasce logo atrás de um lento já sai na velocidade dele
    expect(spawnSpeed([tank], 100, 1, -100, jeep.ahead, 60)).toBe(20);
  });
});
