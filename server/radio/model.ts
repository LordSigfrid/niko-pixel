// Rádio: quais alertas ficam no topo da tela (puro). Um operador que "pede reforço" (status waiting) vira um alerta;
// com um pedido de permissão aberto, o alerta traz Autorizar/Negar; pergunta ou espera sem pedido, só Abrir.
import { tr } from '../../shared/i18n';
import type { AgentInfo, OfficeSnapshot } from '../../shared/types';

export type RadioKind = 'permission' | 'question' | 'waiting';

export interface RadioAlert {
  /** Chave do alerta: muda quando muda o pedido (um pedido novo do mesmo operador é outro alerta). */
  id: string;
  agentId: string;
  /** Pedido de permissão aberto (PermissionRequestInfo.id), quando dá para decidir pelo Rádio. */
  permId?: string;
  kind: RadioKind;
  /** Letra do esquadrão (conta) e sua cor. */
  squad: string;
  color: string;
  name: string;
  /** Zona = sala do projeto. */
  sector: string;
  /** Linha principal: o que ele pede. */
  text: string;
  /** Linha de baixo: detalhe (título do pedido, reforço que pediu...). */
  detail?: string;
  canDecide: boolean;
}

/** Textos fixos da janela (já traduzidos): o script do Windows não tem texto próprio. */
export interface RadioLabels {
  header: string;
  allow: string;
  deny: string;
  open: string;
  dismiss: string;
  kind: Record<RadioKind, string>;
}

export function radioLabels(): RadioLabels {
  return {
    header: tr('RÁDIO'),
    allow: tr('AUTORIZAR'),
    deny: tr('NEGAR'),
    open: tr('ABRIR'),
    dismiss: tr('Dispensar'),
    kind: {
      permission: tr('PEDINDO AUTORIZAÇÃO'),
      question: tr('AGUARDANDO ORDEM'),
      waiting: tr('AGUARDANDO ORDEM'),
    },
  };
}

function oneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function alertOf(a: AgentInfo, snap: OfficeSnapshot): RadioAlert {
  const acc = snap.accounts.find((x) => x.id === a.account);
  const room = snap.rooms.find((r) => r.id === a.roomId);
  const p = a.permission;
  const question = !!p?.questions?.length;
  const kind: RadioKind = p ? (question ? 'question' : 'permission') : 'waiting';
  const text = p
    ? oneLine(question ? (p.questions?.[0]?.question ?? p.text) : p.text, 90)
    : oneLine(a.waitingFor ? tr('Aguardando ordem: {0}', [a.waitingFor]) : tr('Aguardando ordem'), 90);
  const detail = p ? oneLine(p.subagent ? `${p.title} · ${tr('reforço {0}', [p.subagent])}` : p.title, 90) : undefined;
  const alert: RadioAlert = {
    id: `${a.id}#${p?.id ?? 'w'}`,
    agentId: a.id,
    kind,
    squad: acc?.short ?? '?',
    color: acc?.color ?? '#8b98b3',
    name: a.name,
    sector: room?.name ?? '',
    text,
    canDecide: kind === 'permission',
  };
  if (p) alert.permId = p.id;
  if (detail && detail !== text) alert.detail = detail;
  return alert;
}

/** Alertas de um snapshot, do pedido mais antigo para o mais novo (o mais antigo fica em cima). */
export function alertsFrom(snap: OfficeSnapshot): RadioAlert[] {
  return snap.agents
    .filter((a) => a.status === 'waiting')
    .sort((a, b) => (a.permission?.createdAt ?? a.statusSince) - (b.permission?.createdAt ?? b.statusSince))
    .map((a) => alertOf(a, snap));
}

export type RadioCommand = { type: 'show'; alert: RadioAlert } | { type: 'hide'; id: string };

/**
 * O que mandar à janela para ir de `shown` a `next`: some quem saiu, aparece (ou se atualiza) quem entrou ou mudou.
 * `dismissed`: alertas que você fechou no X (não voltam enquanto o mesmo pedido continuar aberto).
 */
export function diffAlerts(shown: ReadonlyMap<string, RadioAlert>, next: readonly RadioAlert[], dismissed: ReadonlySet<string>): RadioCommand[] {
  const out: RadioCommand[] = [];
  const keep = new Set<string>();
  for (const a of next) {
    if (dismissed.has(a.id)) continue;
    keep.add(a.id);
    const prev = shown.get(a.id);
    if (!prev || JSON.stringify(prev) !== JSON.stringify(a)) out.push({ type: 'show', alert: a });
  }
  for (const id of shown.keys()) if (!keep.has(id)) out.push({ type: 'hide', id });
  return out;
}
