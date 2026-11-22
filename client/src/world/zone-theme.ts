// Tema automático do quartel-general (visual tático): cada zona (sala de projeto) segue os seus operadores.
// Alguém aguardando ordem -> Guerra (a base em alerta); algo falhou -> Destruição (a falha vence a espera);
// senão, a base limpa. As áreas comuns (checkpoint, rancho, recreação, vestiário, corredor) ficam limpas.
// Puro (sem DOM), testável.
import type { AgentStatus, Activity } from '../../../shared/types';
import type { SeasonalTheme } from './api';

export type ZoneAlert = Extract<SeasonalTheme, 'none' | 'war' | 'destruction'>;

/** O que importa de uma zona para o tema automático. */
export interface ZoneSignals {
  /** Algum operador aguardando ordem (status 'waiting'). */
  waiting: boolean;
  /** Falha recente: alarme de CI da sala, operador com a última atividade em erro ou com a nuvenzinha de chuva. */
  failing: boolean;
}

/** Tempo mínimo (ms) que uma zona fica num estado antes de trocar: nada de piscar entre temas. */
export const ZONE_HOLD_MS = 10_000;

/** Decisão de uma zona. A falha vence a espera. */
export function zoneAlertFor(s: ZoneSignals): ZoneAlert {
  if (s.failing) return 'destruction';
  if (s.waiting) return 'war';
  return 'none';
}

/** Operador visto pelo tema automático (subconjunto do personagem da simulação). */
export interface ZoneAgent {
  roomId: string;
  status: AgentStatus;
  activity?: Pick<Activity, 'kind' | 'error'>;
  /** Até quando a nuvenzinha de chuva ('storm': um shell falhou) fica sobre a cabeça; 0 = sem. */
  stormUntil?: number;
}

/** Junta os sinais por sala: operadores e salas com alarme de CI ligado. */
export function collectZoneSignals(agents: Iterable<ZoneAgent>, alarmRooms: Iterable<string>, now: number): Map<string, ZoneSignals> {
  const out = new Map<string, ZoneSignals>();
  const of = (id: string) => {
    let s = out.get(id);
    if (!s) out.set(id, (s = { waiting: false, failing: false }));
    return s;
  };
  for (const id of alarmRooms) of(id).failing = true;
  for (const a of agents) {
    if (!a.roomId) continue;
    const s = of(a.roomId);
    if (a.status === 'waiting') s.waiting = true;
    if (a.activity && (a.activity.kind === 'error' || a.activity.error)) s.failing = true;
    if (a.stormUntil && now < a.stormUntil) s.failing = true;
  }
  return out;
}

/** Estado das zonas com histerese: cada zona segura o estado por ZONE_HOLD_MS antes de trocar. */
export class ZoneThemeState {
  private readonly zones = new Map<string, { alert: ZoneAlert; since: number }>();

  constructor(private readonly holdMs = ZONE_HOLD_MS) {}

  /** Aplica os sinais do momento. `rooms` = salas existentes (as que sumiram são esquecidas). */
  update(rooms: Iterable<string>, signals: ReadonlyMap<string, ZoneSignals>, now: number): void {
    const seen = new Set<string>();
    for (const id of rooms) {
      seen.add(id);
      const want = zoneAlertFor(signals.get(id) ?? { waiting: false, failing: false });
      const cur = this.zones.get(id);
      if (!cur) {
        // zona nova: entra direto (limpa, sem histerese, se nada acontece nela)
        this.zones.set(id, { alert: want, since: now });
        continue;
      }
      // relógio voltou (timelapse recriado): conta como tempo cumprido
      if (cur.alert !== want && (now - cur.since >= this.holdMs || now < cur.since)) {
        cur.alert = want;
        cur.since = now;
      }
    }
    for (const id of [...this.zones.keys()]) if (!seen.has(id)) this.zones.delete(id);
  }

  /** Tema da zona agora; áreas comuns e salas desconhecidas ficam limpas. */
  get(roomId: string): ZoneAlert {
    return this.zones.get(roomId)?.alert ?? 'none';
  }
}
