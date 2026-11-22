// Fontes "só de leitura" (AgentSource, ver sources/source.ts) para as ferramentas que não têm hooks nem registro de
// sessões abertas: OpenCode (sources/opencode.ts), Gemini CLI e Qwen Code (sources/gemini.ts). Cada pasta de dados
// vira uma conta; um SessionReader por conta lê, a cada ciclo, as sessões com atividade recente e as devolve já no
// formato do escritório (PolledSession). Esta classe só faz a ponte com o Office: entra, atualiza, sai.
//
// Presença (nenhuma dessas ferramentas diz se o processo continua aberto): a sessão está no escritório enquanto
// trabalha ou espera (até STALE_WORKING_MS sem nada novo: o processo morreu no meio do turno) e, ociosa, até
// RECENT_MS depois da última atividade. Sem terminal, histórico, mensagens nem aprovações pelo escritório: só lê.
//
// Privacidade: os leitores só abrem os arquivos da conversa (nunca credenciais) e nunca escrevem nas pastas delas.
import type { Activity, AgentStats, AgentStatus, Provider, SourceInfo } from '../../shared/types';
import { describeTool, SPECIAL, describePrompt, truncate, type ActivityDescription } from '../../shared/activity';
import { modelFamily } from '../../shared/models';
import { tr } from '../../shared/i18n';
import type { DetectedAccount } from '../accounts/detect';
import type { AccountsService } from '../accounts/service';
import { errMsg, log } from '../log';
import type { Office } from '../model/office';
import type { AgentSource } from './source';

/** Sessão ociosa continua no escritório por este tempo depois da última atividade. */
export const RECENT_MS = 30 * 60_000;
/** Trabalhando sem nada novo por este tempo: o processo morreu no meio do turno. */
export const STALE_WORKING_MS = 30 * 60_000;
/** Atividades lidas de cada sessão (as mais recentes). */
export const ACTIVITY_WINDOW = 120;

export type PolledProvider = Exclude<Provider, 'claude' | 'codex'>;

/** Uma sessão como o leitor a vê agora. */
export interface PolledSession {
  /** Id da sessão na ferramenta (único na conta). */
  id: string;
  /** Pasta do projeto (sem ela não há sala: a sessão fica de fora). */
  cwd?: string;
  /** Sessão-mãe (subagente). */
  parentId?: string;
  title?: string;
  /** Id do modelo como a ferramenta grava ("deepseek-v4-flash"). */
  model?: string;
  /** Provedor do modelo, quando a ferramenta diz ("opencode", "google"...). */
  modelProvider?: string;
  startedAt: number;
  /** Última atividade (epoch ms). */
  lastAt: number;
  status: Extract<AgentStatus, 'working' | 'waiting' | 'idle'>;
  waitingFor?: string;
  /** Atividades em ordem cronológica, com ids estáveis entre leituras. */
  activities: Activity[];
  stats: AgentStats;
}

export interface SessionReader {
  /** Sessões com atividade desde `since` (epoch ms) ou ainda trabalhando. Lança se a pasta ficou ilegível. */
  read(now: number, since: number): PolledSession[];
  close?(): void;
}

// ------------------------------------------------------------------ modelo comum das conversas

/** Item de uma resposta do modelo, já normalizado (OpenCode, Gemini CLI e Qwen Code). */
export interface ConvItem {
  type: 'think' | 'text' | 'tool';
  /** Id estável do item (call id da ferramenta ou posição). */
  key: string;
  name?: string;
  input?: unknown;
  /** Estado da ferramenta: 'pending' | 'running' | 'completed' | 'error' | 'awaiting' (aprovação). */
  status?: 'pending' | 'running' | 'completed' | 'error' | 'awaiting';
}

/** Mensagem normalizada. */
export interface ConvMessage {
  id: string;
  role: 'user' | 'assistant' | 'compaction' | 'error';
  at: number;
  /** Texto do usuário (role 'user') ou detalhe do erro. */
  text?: string;
  items: ConvItem[];
  model?: string;
  modelProvider?: string;
  /** Resposta terminada (o modelo parou de escrever esta mensagem). */
  done?: boolean;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function s(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/**
 * Descreve uma chamada de ferramenta do OpenCode, do Gemini CLI ou do Qwen Code (os nomes delas, traduzidos para as
 * ferramentas do Claude Code que o describeTool já conhece).
 */
export function describeAgentTool(rawName: string, rawInput: unknown): { desc: ActivityDescription; tool: string } {
  const input = rec(rawInput);
  const path = s(input.filePath) ?? s(input.file_path) ?? s(input.absolute_path) ?? s(input.path);
  const name = rawName.trim();
  const as = (tool: string, inp: Record<string, unknown>) => ({ desc: describeTool(tool, inp), tool });
  switch (name.toLowerCase()) {
    case 'read':
    case 'read_file':
    case 'view':
      return as('Read', { file_path: path });
    case 'read_many_files': {
      const paths = Array.isArray(input.paths) ? input.paths.filter((p): p is string => typeof p === 'string') : [];
      const d = describeTool('Read', { file_path: paths[0] });
      if (paths.length > 1) d.detail = truncate(paths.join(', '), 300);
      return { desc: d, tool: 'Read' };
    }
    case 'write':
    case 'write_file':
    case 'create':
      return as('Write', { file_path: path });
    case 'edit':
    case 'multiedit':
    case 'replace':
    case 'edit_file':
    case 'str_replace':
      return as('Edit', { file_path: path });
    case 'patch':
    case 'apply_patch': {
      const text = s(input.patchText) ?? s(input.patch) ?? s(input.input) ?? '';
      const file = /^\*\*\* (?:Update|Add|Delete) File: (.+)$/m.exec(text)?.[1]?.trim();
      return as('Edit', { file_path: file });
    }
    case 'glob':
      return as('Glob', { pattern: input.pattern });
    case 'grep':
    case 'search_file_content':
    case 'search':
      return as('Grep', { pattern: input.pattern ?? input.query });
    case 'list':
    case 'ls':
    case 'list_directory':
      return as('LS', { path: path ?? s(input.dir_path) });
    case 'bash':
    case 'shell':
    case 'run_shell_command':
      return as('Bash', { command: input.command, description: input.description });
    case 'webfetch':
    case 'web_fetch': {
      const url = s(input.url) ?? /https?:\/\/\S+/.exec(s(input.prompt) ?? '')?.[0];
      return as('WebFetch', { url });
    }
    case 'websearch':
    case 'web_search':
    case 'google_web_search':
    case 'codesearch':
      return as('WebSearch', { query: input.query });
    case 'todowrite':
    case 'todo_write':
    case 'write_todos':
      return as('TodoWrite', { todos: input.todos });
    case 'todoread':
    case 'todo_read':
      return as('TaskList', {});
    case 'task':
    case 'agent':
      return as('Agent', { description: input.description, subagent_type: input.subagent_type ?? input.subagentType, prompt: input.prompt });
    case 'question':
    case 'ask_user':
    case 'ask_user_question':
      return as('AskUserQuestion', { questions: input.questions });
    case 'skill':
      return as('Skill', { skill: input.name ?? input.id ?? input.skill });
    case 'save_memory':
      return { desc: { kind: 'other', icon: '🧠', text: tr('Guardando na memória') }, tool: name };
    case 'execute':
      return { desc: { kind: 'run', icon: '⚙️', text: tr('Executando código') }, tool: name };
    default:
      return as(name, input);
  }
}

/**
 * Atividades das mensagens (ordem cronológica): instrução do usuário, raciocínio, resposta, cada ferramenta,
 * compactação e erros. Ids estáveis: `<sessão>:<mensagem>[:<item>]`.
 */
export function activitiesOf(sessionId: string, msgs: readonly ConvMessage[]): Activity[] {
  const out: Activity[] = [];
  const push = (id: string, at: number, d: ActivityDescription, extra: Partial<Activity> = {}) => out.push({ id: `${sessionId}:${id}`, at, ...d, ...extra });
  for (const m of msgs) {
    if (m.role === 'user') {
      if (m.text?.trim()) push(m.id, m.at, describePrompt(m.text));
      continue;
    }
    if (m.role === 'compaction') {
      push(m.id, m.at, SPECIAL.compact());
      continue;
    }
    if (m.role === 'error') {
      push(m.id, m.at, SPECIAL.error(undefined, m.text ? truncate(m.text, 300) : undefined));
      continue;
    }
    for (const it of m.items) {
      const id = `${m.id}:${it.key}`;
      if (it.type === 'think') push(id, m.at, SPECIAL.think());
      else if (it.type === 'text') push(id, m.at, SPECIAL.respond());
      else if (it.name) {
        const { desc, tool } = describeAgentTool(it.name, it.input);
        push(id, m.at, desc, { tool, ...(it.status === 'error' ? { error: true } : {}) });
      }
    }
  }
  return out.slice(-ACTIVITY_WINDOW);
}

/** Ferramentas que são perguntas ao usuário (esperando a resposta = 'waiting'). */
const QUESTION_TOOLS = new Set(['question', 'ask_user', 'ask_user_question', 'askuserquestion']);

/**
 * Status pela conversa, para quem não grava o estado da sessão: ferramenta esperando aprovação ou pergunta em aberto
 * = esperando você; resposta em andamento (ou a última palavra é do usuário, ou de uma ferramenta) = trabalhando.
 * `quietWorkingMs`: sem escrita nova por mais que isto, uma resposta "em aberto" vale como terminada.
 */
export function statusOf(msgs: readonly ConvMessage[], lastAt: number, now: number, quietWorkingMs = 2 * 60_000): Pick<PolledSession, 'status' | 'waitingFor'> {
  const last = [...msgs].reverse().find((m) => m.role === 'user' || m.role === 'assistant');
  if (!last) return { status: 'idle' };
  const open = last.role === 'assistant' ? last.items.filter((i) => i.type === 'tool' && i.status !== 'completed' && i.status !== 'error') : [];
  if (open.some((i) => i.status === 'awaiting')) return { status: 'waiting', waitingFor: tr('aprovar uma permissão') };
  if (open.some((i) => QUESTION_TOOLS.has((i.name ?? '').toLowerCase()))) return { status: 'waiting', waitingFor: tr('responder uma pergunta') };
  if (now - lastAt > quietWorkingMs) return { status: 'idle' };
  if (last.role === 'user' || open.length || last.done === false) return { status: 'working' };
  return { status: 'idle' };
}

// ------------------------------------------------------------------ a fonte

export interface PolledSourceOptions {
  provider: PolledProvider;
  /** Nome da ferramenta ("OpenCode"): nome da conta e do papel dos agentes. */
  name: string;
  /** Letra preferida do chip da conta e cor (a paleta das outras contas fica de fora). */
  short: string;
  color: string;
  accounts: AccountsService;
  office: Office;
  dirs: string[];
  createReader: (dir: string) => SessionReader;
  now?: () => number;
  pollMs?: number;
  /** Quanto uma sessão ociosa fica no escritório (padrão RECENT_MS; NIKO_PIXEL_RECENT_MIN no index.ts). */
  recentMs?: number;
}

/** NIKO_PIXEL_RECENT_MIN (minutos, > 0) em ms; inválido ou ausente = RECENT_MS. */
export function recentMsFrom(env: NodeJS.ProcessEnv): number {
  const n = Number(env.NIKO_PIXEL_RECENT_MIN?.trim());
  return Number.isFinite(n) && n > 0 ? n * 60_000 : RECENT_MS;
}

interface PolledAccount {
  id: string;
  dir: string;
  configDir: string;
  reader?: SessionReader;
  error?: string;
}

interface Tracker {
  key: string;
  acc: PolledAccount;
  sessionId: string;
  kind: 'main' | 'sub';
  inOffice: boolean;
  subDone: boolean;
  seen: Set<string>;
}

export class PolledSource implements AgentSource {
  readonly provider: PolledProvider;
  private accs: PolledAccount[] = [];
  private readonly trackers = new Map<string, Tracker>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly now: () => number;
  private readonly recentMs: number;

  constructor(private readonly opts: PolledSourceOptions) {
    this.provider = opts.provider;
    this.now = opts.now ?? Date.now;
    this.recentMs = opts.recentMs ?? RECENT_MS;
    const taken = new Set(opts.accounts.allEntries().map((e) => e.detected.short.toUpperCase()));
    const letters = [opts.short, ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter((l, i, a) => a.indexOf(l) === i && !taken.has(l));
    const many = opts.dirs.length > 1;
    const entries = opts.accounts.setProviderAccounts(
      opts.provider,
      opts.dirs.map((dir, i) => {
        const short = letters[i] ?? '?';
        const detected: DetectedAccount = { id: opts.provider, provider: opts.provider, configDir: dir, short, name: many ? `${opts.name} ${short}` : opts.name, color: opts.color };
        return { dir, detected };
      }),
    );
    this.accs = entries.map((e) => ({ id: e.id, dir: e.dir, configDir: e.detected.configDir }));
  }

  start(): void {
    this.opts.office.beginBoot();
    try {
      this.poll(true);
    } finally {
      this.opts.office.endBoot();
    }
    this.timer = setInterval(() => {
      try {
        this.poll(false);
      } catch (err) {
        log.warnOnce(`${this.provider}-poll:${errMsg(err)}`, tr('{0}: falha no ciclo de leitura: {1}', [this.opts.name, errMsg(err)]));
      }
    }, this.opts.pollMs ?? 1_500);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const acc of this.accs) {
      try {
        acc.reader?.close?.();
      } catch {
        // já fechado
      }
      delete acc.reader;
    }
  }

  sources(): SourceInfo[] {
    return this.accs.map((acc) => {
      let sessions = 0;
      for (const t of this.trackers.values()) if (t.acc === acc && t.kind === 'main' && t.inOffice) sessions++;
      const info: SourceInfo = { label: acc.id, provider: this.provider, path: acc.configDir, sessions, ok: !acc.error };
      if (acc.error) info.error = acc.error;
      return info;
    });
  }

  /** Sem terminal: a conversa não fica num arquivo no formato que o terminal sabe ler. */
  transcriptPathOf(): string | undefined {
    return undefined;
  }

  poll(boot = false): void {
    const now = this.now();
    const since = now - Math.max(this.recentMs, STALE_WORKING_MS);
    const seen = new Set<string>();
    for (const acc of this.accs) {
      let list: PolledSession[];
      try {
        acc.reader ??= this.opts.createReader(acc.dir);
        list = acc.reader.read(now, since);
        delete acc.error;
      } catch (err) {
        acc.error = errMsg(err);
        log.warnOnce(`${this.provider}-read:${acc.id}:${acc.error}`, tr('{0}: não foi possível ler {1} ({2}).', [this.opts.name, acc.dir, acc.error]));
        // Mantém quem já estava (uma leitura que falhou não fecha as sessões).
        for (const t of this.trackers.values()) if (t.acc === acc) seen.add(t.key);
        continue;
      }
      const byId = new Map(list.map((x) => [x.id, x]));
      // Principais primeiro: o subagente só entra com o pai no escritório.
      const ordered = [...list].sort((a, b) => (a.parentId && byId.has(a.parentId) ? 1 : 0) - (b.parentId && byId.has(b.parentId) ? 1 : 0));
      for (const ses of ordered) {
        const key = `${acc.id}:${ses.id}`;
        if (!this.present(ses, now)) continue;
        const parentKey = ses.parentId ? `${acc.id}:${ses.parentId}` : undefined;
        const kind = parentKey && byId.has(ses.parentId!) ? 'sub' : 'main';
        let t = this.trackers.get(key);
        if (!t) {
          t = { key, acc, sessionId: ses.id, kind, inOffice: false, subDone: false, seen: new Set() };
          this.trackers.set(key, t);
        }
        seen.add(key);
        try {
          this.sync(t, ses, parentKey, boot);
        } catch (err) {
          log.warnOnce(`${this.provider}-session:${key}:${errMsg(err)}`, tr('{0}: sessão {1}: {2}', [this.opts.name, key, errMsg(err)]));
        }
      }
    }
    for (const [key, t] of [...this.trackers]) {
      if (seen.has(key)) continue;
      this.leave(t);
      this.trackers.delete(key);
    }
  }

  private present(ses: PolledSession, now: number): boolean {
    if (!ses.cwd) return false;
    const quiet = now - ses.lastAt;
    return ses.status === 'idle' ? quiet <= this.recentMs : quiet <= STALE_WORKING_MS;
  }

  private role(kind: 'main' | 'sub', ses: PolledSession): string {
    const family = modelFamily(ses.model, ses.modelProvider);
    if (kind === 'sub') return family ? tr('Subagente ({0} · {1})', [this.opts.name, family]) : tr('Subagente ({0})', [this.opts.name]);
    return family ? tr('Agente principal ({0} · {1})', [this.opts.name, family]) : tr('Agente principal ({0})', [this.opts.name]);
  }

  private sync(t: Tracker, ses: PolledSession, parentKey: string | undefined, boot: boolean): void {
    const office = this.opts.office;
    if (t.inOffice && !office.has(t.key)) t.inOffice = false;
    const firstSight = !t.inOffice;
    if (!t.inOffice) {
      if (t.kind === 'main') {
        office.addMain({
          id: t.key,
          provider: this.provider,
          account: t.acc.id,
          sessionId: ses.id,
          cwd: ses.cwd!,
          role: this.role('main', ses),
          startedAt: ses.startedAt,
          status: ses.status,
          waitingFor: ses.waitingFor,
        });
        t.inOffice = office.has(t.key);
      } else {
        // Subagente: entra só trabalhando, com o pai presente; depois de entregar, só volta se trabalhar de novo.
        if (!parentKey || !office.has(parentKey) || office.get(parentKey)?.status === 'offline') return;
        if (ses.status === 'idle') return;
        t.inOffice = office.addSub({ id: t.key, parentId: parentKey, sessionId: ses.id, role: this.role('sub', ses), title: ses.title, background: false, startedAt: ses.startedAt });
        t.subDone = false;
      }
      if (!t.inOffice) return;
    }
    // Atividades novas (as já vistas não se repetem; as da primeira leitura entram só no histórico).
    const fresh = ses.activities.filter((a) => !t.seen.has(a.id));
    fresh.forEach((a, i) => {
      t.seen.add(a.id);
      office.addActivity(t.key, a, i === fresh.length - 1, { feed: !boot && !firstSight });
    });
    if (t.seen.size > 4 * ACTIVITY_WINDOW) t.seen = new Set(ses.activities.map((a) => a.id));
    office.applyTranscript(t.key, {
      title: ses.title,
      tasks: [],
      stats: ses.stats,
      model: ses.model,
      firstAt: ses.startedAt,
      lastAt: ses.lastAt,
      role: this.role(t.kind, ses),
    });
    if (t.kind === 'main') {
      office.setStatus(t.key, ses.status, ses.waitingFor);
      office.fillWorkingActivity(t.key);
      return;
    }
    if (ses.status === 'idle') {
      if (!t.subDone) office.completeSub(t.key);
      t.subDone = true;
      return;
    }
    if (t.subDone) {
      office.reactivateSub(t.key);
      t.subDone = office.isSubDone(t.key);
    }
    if (!t.subDone) office.setStatus(t.key, ses.status, ses.waitingFor);
  }

  private leave(t: Tracker): void {
    if (!t.inOffice) return;
    if (t.kind === 'sub') {
      if (!t.subDone) this.opts.office.completeSub(t.key);
    } else this.opts.office.closeMain(t.key);
    t.inOffice = false;
  }
}

/** Soma de tokens no formato do escritório (entrada = input + cache). */
export function statsOf(p: { toolCalls: number; input?: number; output?: number; reasoning?: number; cacheRead?: number; cacheWrite?: number; cost?: number; added?: number; removed?: number; subagents?: number }): AgentStats {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  const st: AgentStats = {
    toolCalls: p.toolCalls,
    tokensIn: n(p.input) + n(p.cacheRead) + n(p.cacheWrite),
    tokensOut: n(p.output) + n(p.reasoning),
    subagents: n(p.subagents),
  };
  if (n(p.cost)) st.costUSD = n(p.cost);
  if (n(p.added)) st.linesAdded = n(p.added);
  if (n(p.removed)) st.linesRemoved = n(p.removed);
  return st;
}
