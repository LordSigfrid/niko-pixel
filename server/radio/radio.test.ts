import { describe, expect, it } from 'vitest';
import type { AccountInfo, AgentInfo, OfficeSnapshot, PermissionRequestInfo } from '../../shared/types';
import { alertsFrom, diffAlerts, type RadioAlert } from './model';
import { Radio, type RadioHost } from './radio';

function agent(over: Partial<AgentInfo>): AgentInfo {
  return { id: 'a1', roomId: 'r1', name: 'Nina', look: 'f', account: '.claude', status: 'working', statusSince: 0, seed: 1, ...over } as AgentInfo;
}

function perm(over: Partial<PermissionRequestInfo> = {}): PermissionRequestInfo {
  return { id: 'p1', tool: 'Bash', title: 'Rodar comando', text: 'npm test', icon: '⌨️', createdAt: 10, expiresAt: 999, ...over } as PermissionRequestInfo;
}

function snap(agents: AgentInfo[]): OfficeSnapshot {
  return {
    rev: 1,
    serverTime: 0,
    rooms: [{ id: 'r1', name: 'loja-virtual', path: '/x', slot: 0 }],
    agents,
    accounts: [{ id: '.claude', short: 'A', name: 'Equipe A', color: '#ff8a3c', configDir: '/c', sessions: 1 } as AccountInfo],
    meta: { demo: false, sources: [], startedAt: 0, version: '1' },
  } as unknown as OfficeSnapshot;
}

describe('rádio: alertas', () => {
  it('só quem aguarda ordem; pedido de permissão traz Autorizar/Negar', () => {
    const list = alertsFrom(snap([agent({ id: 'a1', status: 'waiting', permission: perm() }), agent({ id: 'a2', status: 'working' })]));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'a1#p1', agentId: 'a1', permId: 'p1', kind: 'permission', squad: 'A', color: '#ff8a3c', sector: 'loja-virtual', text: 'npm test', detail: 'Rodar comando', canDecide: true });
  });

  it('pergunta e espera sem pedido: só Abrir', () => {
    const q = perm({ id: 'p2', questions: [{ question: 'Qual banco?', header: 'BD', multiSelect: false, options: [], index: 0 }] as unknown as PermissionRequestInfo['questions'] });
    const list = alertsFrom(snap([agent({ id: 'a1', status: 'waiting', permission: q }), agent({ id: 'a2', status: 'waiting', waitingFor: 'revisar o plano', statusSince: 50 })]));
    expect(list.map((a) => [a.kind, a.canDecide, a.text])).toEqual([
      ['question', false, 'Qual banco?'],
      ['waiting', false, 'Aguardando ordem: revisar o plano'],
    ]);
  });

  it('diff: aparece, atualiza, some e respeita os dispensados', () => {
    const a: RadioAlert = { id: 'x#p1', agentId: 'x', kind: 'permission', squad: 'A', color: '#fff', name: 'N', sector: 's', text: 't', canDecide: true };
    expect(diffAlerts(new Map(), [a], new Set())).toEqual([{ type: 'show', alert: a }]);
    expect(diffAlerts(new Map([[a.id, a]]), [a], new Set())).toEqual([]);
    expect(diffAlerts(new Map([[a.id, a]]), [{ ...a, text: 'u' }], new Set())).toEqual([{ type: 'show', alert: { ...a, text: 'u' } }]);
    expect(diffAlerts(new Map([[a.id, a]]), [], new Set())).toEqual([{ type: 'hide', id: a.id }]);
    expect(diffAlerts(new Map(), [a], new Set([a.id]))).toEqual([]);
  });
});

describe('rádio: serviço', () => {
  function fakeHost() {
    const sent: unknown[] = [];
    let act: (action: string, id: string) => void = () => {};
    const host: RadioHost = { send: (c) => sent.push(c), onAction: (cb) => (act = cb), onExit: () => {}, kill: () => {} };
    return { host, sent, act: (a: string, id: string) => act(a, id) };
  }

  it('mostra o alerta, autoriza pelo botão e esconde na hora', () => {
    const f = fakeHost();
    const decisions: unknown[] = [];
    const r = new Radio({ createHost: () => f.host, open: () => {}, decide: (id, d) => (decisions.push([id, d.behavior]), 'ok') });
    r.start();
    expect(r.active).toBe(true);
    r.update(snap([agent({ status: 'waiting', permission: perm() })]));
    expect(f.sent.map((c) => (c as { type: string }).type)).toEqual(['labels', 'show']);
    f.act('allow', 'a1#p1');
    expect(decisions).toEqual([['p1', 'allow']]);
    expect(f.sent.at(-1)).toEqual({ type: 'hide', id: 'a1#p1' });
    // O mesmo pedido ainda no snapshot seguinte não volta a aparecer.
    r.update(snap([agent({ status: 'waiting', permission: perm() })]));
    expect(f.sent.at(-1)).toEqual({ type: 'hide', id: 'a1#p1' });
  });

  it('Abrir chama o navegador; pergunta não aceita Autorizar', () => {
    const f = fakeHost();
    const opened: string[] = [];
    const decisions: unknown[] = [];
    const q = perm({ questions: [{ question: 'Qual?', header: 'h', multiSelect: false, options: [], index: 0 }] as unknown as PermissionRequestInfo['questions'] });
    const r = new Radio({ createHost: () => f.host, open: (id) => opened.push(id), decide: (id) => (decisions.push(id), 'ok') });
    r.start();
    r.update(snap([agent({ status: 'waiting', permission: q })]));
    f.act('allow', 'a1#p1');
    f.act('open', 'a1#p1');
    expect(decisions).toEqual([]);
    expect(opened).toEqual(['a1']);
  });
});
