import { describe, expect, it } from 'vitest';
import { collectZoneSignals, ZONE_HOLD_MS, zoneAlertFor, ZoneThemeState, type ZoneAgent } from './zone-theme';

describe('tema automático por zona (segue os operadores)', () => {
  it('aguardando ordem -> Guerra; falha -> Destruição (vence a espera); senão, limpa', () => {
    expect(zoneAlertFor({ waiting: false, failing: false })).toBe('none');
    expect(zoneAlertFor({ waiting: true, failing: false })).toBe('war');
    expect(zoneAlertFor({ waiting: false, failing: true })).toBe('destruction');
    expect(zoneAlertFor({ waiting: true, failing: true })).toBe('destruction');
  });

  it('junta os sinais por sala: espera, atividade com erro, nuvenzinha de chuva e alarme de CI', () => {
    const now = 50_000;
    const agents: ZoneAgent[] = [
      { roomId: 'a', status: 'waiting' },
      { roomId: 'a', status: 'working', activity: { kind: 'edit' } },
      { roomId: 'b', status: 'working', activity: { kind: 'error' } },
      { roomId: 'c', status: 'idle', activity: { kind: 'run', error: true } },
      { roomId: 'd', status: 'idle', stormUntil: now + 1000 },
      { roomId: 'e', status: 'idle', stormUntil: now - 1 },
      { roomId: 'f', status: 'waiting' },
    ];
    const s = collectZoneSignals(agents, ['f', 'g'], now);
    expect(s.get('a')).toEqual({ waiting: true, failing: false });
    expect(s.get('b')).toEqual({ waiting: false, failing: true });
    expect(s.get('c')).toEqual({ waiting: false, failing: true });
    expect(s.get('d')).toEqual({ waiting: false, failing: true });
    expect(s.get('e')).toEqual({ waiting: false, failing: false });
    expect(zoneAlertFor(s.get('f')!)).toBe('destruction');
    expect(zoneAlertFor(s.get('g')!)).toBe('destruction');
  });

  it('cada zona segura o estado por ~10 s (sem piscar); áreas comuns ficam limpas', () => {
    const z = new ZoneThemeState();
    const sig = (m: Record<string, { waiting?: boolean; failing?: boolean }>) =>
      new Map(Object.entries(m).map(([k, v]) => [k, { waiting: !!v.waiting, failing: !!v.failing }]));
    z.update(['a', 'b'], sig({ a: { waiting: true } }), 0);
    // zona nova entra direto
    expect(z.get('a')).toBe('war');
    expect(z.get('b')).toBe('none');
    expect(z.get('core:recepcao')).toBe('none');
    // o operador foi atendido logo em seguida: a Guerra fica até completar o tempo mínimo
    z.update(['a', 'b'], sig({}), 2_000);
    expect(z.get('a')).toBe('war');
    z.update(['a', 'b'], sig({}), ZONE_HOLD_MS - 1);
    expect(z.get('a')).toBe('war');
    z.update(['a', 'b'], sig({}), ZONE_HOLD_MS);
    expect(z.get('a')).toBe('none');
    // falha volta a acontecer: precisa de outros 10 s desde a última troca
    z.update(['a', 'b'], sig({ a: { failing: true }, b: { failing: true } }), ZONE_HOLD_MS + 3_000);
    expect(z.get('a')).toBe('none');
    expect(z.get('b')).toBe('destruction');
    z.update(['a', 'b'], sig({ a: { failing: true } }), 2 * ZONE_HOLD_MS);
    expect(z.get('a')).toBe('destruction');
    // sinal que vai e volta dentro da janela não troca nada
    z.update(['a', 'b'], sig({ a: { waiting: true } }), 2 * ZONE_HOLD_MS + 1_000);
    z.update(['a', 'b'], sig({ a: { failing: true } }), 3 * ZONE_HOLD_MS + 500);
    expect(z.get('a')).toBe('destruction');
    // sala que sumiu é esquecida
    z.update(['b'], sig({}), 4 * ZONE_HOLD_MS);
    expect(z.get('a')).toBe('none');
  });
});
