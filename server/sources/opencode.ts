// OpenCode (sst/opencode): sessões lidas da pasta de dados (padrão ~/.local/share/opencode, ou $XDG_DATA_HOME/opencode;
// NIKO_PIXEL_OPENCODE_DIRS escolhe as pastas, separadas por vírgula; NIKO_PIXEL_OPENCODE=0 desliga). Só leitura.
//
// Formatos (do mais novo para o mais antigo):
// - opencode.db (SQLite) com `session_v2` + `session_message` (OpenCode 2.x; conferido com dados reais): a sessão
//   grava o projeto (`directory`), o título, o modelo, tokens/custo e quando ficou ocupada/ociosa (`time_busy`,
//   `time_idle`); cada mensagem é um JSON (`user`, `assistant` com `content` = raciocínio, texto e ferramentas,
//   `compaction`, `idle`, `model-switched`...);
// - opencode.db com `session` + `message` + `part` (OpenCode 1.x com SQLite; não testado com dados reais);
// - storage/session/<projeto>/<sessão>.json, storage/message/<sessão>/*.json e storage/part/<mensagem>/*.json
//   (OpenCode 0.x/1.x; não testado com dados reais).
// O SQLite é lido com o `node:sqlite` embutido no Node (22.13+; no 22.12 só com --experimental-sqlite): sem ele, a
// conta aparece com erro e o resto do Niko-Pixel segue. A conexão é só leitura (o modo WAL do OpenCode deixa o
// leitor ver o que ainda não foi para o arquivo principal). Tabelas de contas e credenciais nunca são lidas.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { tr } from '../../shared/i18n';
import { expandHome } from '../accounts/detect';
import { activitiesOf, statsOf, statusOf, type ConvItem, type ConvMessage, type PolledSession, type SessionReader } from './polled';

/** Mensagens mais recentes lidas de cada sessão. */
const MESSAGE_WINDOW = 200;

function splitList(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function parse(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string') return rec(raw);
  try {
    return rec(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Pasta com cara de dados do OpenCode (o banco ou a pasta storage/). */
export function isOpencodeDir(dir: string): boolean {
  return existsSync(join(dir, 'opencode.db')) || isDir(join(dir, 'storage', 'session'));
}

/** Pastas do OpenCode: NIKO_PIXEL_OPENCODE_DIRS (substitui tudo) ou a pasta padrão, se existir. */
export function discoverOpencodeDirs(env: NodeJS.ProcessEnv = process.env, home: string = env.HOME || homedir()): string[] {
  const override = splitList(env.NIKO_PIXEL_OPENCODE_DIRS);
  if (override.length) return [...new Set(override.map((p) => expandHome(p, home)))].filter(isDir);
  const xdg = env.XDG_DATA_HOME?.trim();
  const candidates = [xdg ? join(expandHome(xdg, home), 'opencode') : undefined, join(home, '.local', 'share', 'opencode')].filter((p): p is string => !!p);
  return [...new Set(candidates)].filter(isOpencodeDir).slice(0, 1);
}

// ------------------------------------------------------------------ normalização

const TOOL_STATUS = new Set(['pending', 'running', 'completed', 'error']);

function toolStatus(v: unknown): ConvItem['status'] {
  const st = str(v);
  return st && TOOL_STATUS.has(st) ? (st as ConvItem['status']) : undefined;
}

/** Mensagem do OpenCode 2.x (`session_message.data`) no formato comum. */
export function v2Message(id: string, type: string, createdAt: number, raw: unknown): ConvMessage | undefined {
  const d = parse(raw);
  const at = num(rec(d.time).created) ?? createdAt;
  const model = rec(d.model);
  switch (type) {
    case 'user':
      return { id, role: 'user', at, text: str(d.text) ?? str(rec(d.metadata).displayText), items: [] };
    case 'assistant': {
      const content = Array.isArray(d.content) ? d.content : [];
      const items: ConvItem[] = content.flatMap((c, i): ConvItem[] => {
        const it = rec(c);
        if (it.type === 'reasoning') return [{ type: 'think', key: String(i) }];
        if (it.type === 'text') return str(it.text) ? [{ type: 'text', key: String(i) }] : [];
        if (it.type === 'tool') {
          const state = rec(it.state);
          return [{ type: 'tool', key: str(it.id) ?? String(i), name: str(it.name) ?? str(it.tool), input: state.input ?? it.input, status: toolStatus(state.status) }];
        }
        return [];
      });
      return { id, role: 'assistant', at, items, model: str(model.id), modelProvider: str(model.providerID), done: num(rec(d.time).completed) !== undefined || !!str(d.finish) };
    }
    case 'compaction':
      return str(d.status) === 'failed' ? undefined : { id, role: 'compaction', at, items: [] };
    case 'idle':
      return str(d.outcome) === 'failed' ? { id, role: 'error', at, text: str(rec(d.error).type), items: [] } : undefined;
    case 'model-switched':
      // Marca de troca de modelo: sem atividade, só o modelo novo.
      return { id, role: 'assistant', at, items: [], model: str(model.id), modelProvider: str(model.providerID), done: true };
    default:
      return undefined;
  }
}

/** Mensagem + partes do OpenCode 1.x (SQLite `message`/`part` ou storage/ em JSON) no formato comum. */
export function legacyMessage(id: string, rawMsg: unknown, rawParts: readonly unknown[]): ConvMessage | undefined {
  const m = parse(rawMsg);
  const time = rec(m.time);
  const at = num(time.created) ?? 0;
  const parts = rawParts.map(parse);
  if (m.role === 'user') {
    const text = parts
      .filter((p) => p.type === 'text' && !p.synthetic)
      .map((p) => str(p.text) ?? '')
      .join('\n')
      .trim();
    return { id, role: 'user', at, text: text || undefined, items: [] };
  }
  if (m.role !== 'assistant') return undefined;
  if (parts.some((p) => p.type === 'compaction') || m.summary === true) return { id, role: 'compaction', at, items: [] };
  const items: ConvItem[] = parts.flatMap((p, i): ConvItem[] => {
    const key = str(p.id) ?? String(i);
    if (p.type === 'reasoning') return [{ type: 'think', key }];
    if (p.type === 'text') return str(p.text) && !p.synthetic ? [{ type: 'text', key }] : [];
    if (p.type === 'tool') {
      const state = rec(p.state);
      return [{ type: 'tool', key: str(p.callID) ?? key, name: str(p.tool), input: state.input, status: toolStatus(state.status) }];
    }
    return [];
  });
  const msg: ConvMessage = { id, role: 'assistant', at, items, model: str(m.modelID), modelProvider: str(m.providerID), done: num(time.completed) !== undefined || !!m.error };
  return msg;
}

function legacyTokens(msgs: readonly unknown[]): { input: number; output: number; reasoning: number; cacheRead: number; cacheWrite: number; cost: number } {
  const t = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
  for (const raw of msgs) {
    const m = parse(raw);
    if (m.role !== 'assistant') continue;
    const tk = rec(m.tokens);
    t.input += num(tk.input) ?? 0;
    t.output += num(tk.output) ?? 0;
    t.reasoning += num(tk.reasoning) ?? 0;
    t.cacheRead += num(rec(tk.cache).read) ?? 0;
    t.cacheWrite += num(rec(tk.cache).write) ?? 0;
    t.cost += num(m.cost) ?? 0;
  }
  return t;
}

function lastModel(msgs: readonly ConvMessage[]): { model?: string; modelProvider?: string } {
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].model) return { model: msgs[i].model, modelProvider: msgs[i].modelProvider };
  return {};
}

function countTools(msgs: readonly ConvMessage[]): number {
  return msgs.reduce((n, m) => n + m.items.filter((i) => i.type === 'tool').length, 0);
}

// ------------------------------------------------------------------ SQLite

type Sqlite = typeof import('node:sqlite');

/** O `node:sqlite` embutido, se este Node tiver (sem lançar e sem flags). */
function loadSqlite(): Sqlite | undefined {
  try {
    return process.getBuiltinModule?.('node:sqlite') as Sqlite | undefined;
  } catch {
    return undefined;
  }
}

interface Row {
  [k: string]: unknown;
}

interface V2Cache {
  msgs: Map<string, { seq: number; msg?: ConvMessage }>;
  /** Maior time_updated visto (as mensagens são regravadas enquanto o modelo escreve). */
  updatedAt: number;
}

class OpencodeDbReader implements SessionReader {
  private db?: DatabaseSync;
  private schema?: 'v2' | 'v1';
  private readonly v2 = new Map<string, V2Cache>();

  constructor(private readonly file: string) {}

  private open(): DatabaseSync {
    if (this.db) return this.db;
    const sqlite = loadSqlite();
    if (!sqlite) throw new Error(tr('este Node não tem o node:sqlite (use o Node 22.13 ou mais novo)'));
    const db = new sqlite.DatabaseSync(this.file, { readOnly: true });
    const tables = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Row[]).map((r) => String(r.name)));
    if (tables.has('session_v2') && tables.has('session_message')) this.schema = 'v2';
    else if (tables.has('session') && tables.has('message') && tables.has('part')) this.schema = 'v1';
    else {
      db.close();
      throw new Error(tr('formato do banco do OpenCode desconhecido'));
    }
    this.db = db;
    return db;
  }

  close(): void {
    this.db?.close();
    this.db = undefined;
  }

  read(now: number, since: number): PolledSession[] {
    try {
      const db = this.open();
      return this.schema === 'v2' ? this.readV2(db, now, since) : this.readV1(db, now, since);
    } catch (err) {
      // Conexão ruim (banco trocado, travado): reabre no próximo ciclo.
      this.close();
      throw err;
    }
  }

  private readV2(db: DatabaseSync, now: number, since: number): PolledSession[] {
    const rows = db
      .prepare(
        `SELECT id, parent_id, directory, title, model, cost, tokens_input, tokens_output, tokens_reasoning, tokens_cache_read,
                tokens_cache_write, summary_additions, summary_deletions, time_created, time_updated, time_busy, time_idle
           FROM session_v2
          WHERE time_archived IS NULL AND (time_updated >= ? OR COALESCE(time_busy, 0) > COALESCE(time_idle, 0))`,
      )
      .all(since) as Row[];
    const live = new Set<string>();
    const out: PolledSession[] = [];
    const latest = db.prepare('SELECT id, type, seq, time_created, time_updated, data FROM session_message WHERE session_id = ? ORDER BY seq DESC LIMIT ?');
    const newer = db.prepare('SELECT id, type, seq, time_created, time_updated, data FROM session_message WHERE session_id = ? AND time_updated >= ?');
    for (const r of rows) {
      const id = String(r.id);
      live.add(id);
      let cache = this.v2.get(id);
      let fresh: Row[];
      if (!cache) {
        cache = { msgs: new Map(), updatedAt: 0 };
        this.v2.set(id, cache);
        fresh = (latest.all(id, MESSAGE_WINDOW) as Row[]).reverse();
      } else fresh = newer.all(id, cache.updatedAt) as Row[];
      for (const m of fresh) {
        const mid = String(m.id);
        const seq = num(m.seq) ?? 0;
        cache.msgs.set(mid, { seq, msg: v2Message(mid, String(m.type), num(m.time_created) ?? 0, m.data) });
        cache.updatedAt = Math.max(cache.updatedAt, num(m.time_updated) ?? 0);
      }
      if (cache.msgs.size > MESSAGE_WINDOW * 1.5) {
        const keep = [...cache.msgs].sort((a, b) => a[1].seq - b[1].seq).slice(-MESSAGE_WINDOW);
        cache.msgs = new Map(keep);
      }
      const msgs = [...cache.msgs.values()].sort((a, b) => a.seq - b.seq).flatMap((x) => (x.msg ? [x.msg] : []));
      const lastAt = Math.max(num(r.time_updated) ?? 0, cache.updatedAt, num(r.time_busy) ?? 0, num(r.time_idle) ?? 0);
      const busyAt = num(r.time_busy);
      const idleAt = num(r.time_idle);
      const recorded = busyAt !== undefined || idleAt !== undefined;
      const busy = busyAt !== undefined && (idleAt === undefined || busyAt > idleAt);
      // O banco diz se está ocupada; a conversa diz se é uma pergunta ou aprovação em aberto.
      const conv = statusOf(msgs, lastAt, now, recorded ? Infinity : undefined);
      const status = recorded ? (busy ? (conv.status === 'waiting' ? conv : { status: 'working' as const }) : { status: 'idle' as const }) : conv;
      const sessionModel = parse(r.model);
      const fromMsgs = lastModel(msgs);
      out.push({
        id,
        cwd: str(r.directory),
        parentId: str(r.parent_id),
        title: str(r.title),
        model: fromMsgs.model ?? str(sessionModel.id),
        modelProvider: fromMsgs.modelProvider ?? str(sessionModel.providerID),
        startedAt: num(r.time_created) ?? lastAt,
        lastAt,
        ...status,
        activities: activitiesOf(id, msgs),
        stats: statsOf({
          toolCalls: countTools(msgs),
          input: num(r.tokens_input),
          output: num(r.tokens_output),
          reasoning: num(r.tokens_reasoning),
          cacheRead: num(r.tokens_cache_read),
          cacheWrite: num(r.tokens_cache_write),
          cost: num(r.cost),
          added: num(r.summary_additions),
          removed: num(r.summary_deletions),
        }),
      });
    }
    for (const id of [...this.v2.keys()]) if (!live.has(id)) this.v2.delete(id);
    return out;
  }

  private readV1(db: DatabaseSync, now: number, since: number): PolledSession[] {
    const cols = (t: string) => new Set((db.prepare(`PRAGMA table_info(${t})`).all() as Row[]).map((r) => String(r.name)));
    const sc = cols('session');
    if (!sc.has('id') || !sc.has('directory') || !sc.has('time_updated')) throw new Error(tr('formato do banco do OpenCode desconhecido'));
    const pick = (c: string) => (sc.has(c) ? c : 'NULL');
    const rows = db
      .prepare(`SELECT id, ${pick('parent_id')} AS parent_id, directory, ${pick('title')} AS title, ${pick('time_created')} AS time_created, time_updated FROM session WHERE time_updated >= ?`)
      .all(since) as Row[];
    const msgStmt = db.prepare('SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created DESC, id DESC LIMIT ?');
    const partStmt = db.prepare('SELECT id, message_id, data FROM part WHERE session_id = ? ORDER BY id');
    return rows.map((r) => {
      const id = String(r.id);
      const rawMsgs = (msgStmt.all(id, MESSAGE_WINDOW) as Row[]).reverse();
      const partsBy = new Map<string, unknown[]>();
      for (const p of partStmt.all(id) as Row[]) {
        const mid = String(p.message_id);
        const list = partsBy.get(mid) ?? [];
        list.push(p.data);
        partsBy.set(mid, list);
      }
      const msgs = rawMsgs.flatMap((m) => legacyMessage(String(m.id), m.data, partsBy.get(String(m.id)) ?? []) ?? []);
      return legacySession(id, { cwd: str(r.directory), parentId: str(r.parent_id), title: str(r.title), createdAt: num(r.time_created), updatedAt: num(r.time_updated) }, msgs, rawMsgs.map((m) => m.data), now);
    });
  }
}

function legacySession(
  id: string,
  meta: { cwd?: string; parentId?: string; title?: string; createdAt?: number; updatedAt?: number },
  msgs: ConvMessage[],
  rawMsgs: readonly unknown[],
  now: number,
): PolledSession {
  const lastAt = Math.max(meta.updatedAt ?? 0, ...msgs.map((m) => m.at));
  const tk = legacyTokens(rawMsgs);
  return {
    id,
    cwd: meta.cwd,
    parentId: meta.parentId,
    title: meta.title,
    ...lastModel(msgs),
    startedAt: meta.createdAt ?? msgs[0]?.at ?? lastAt,
    lastAt,
    ...statusOf(msgs, lastAt, now),
    activities: activitiesOf(id, msgs),
    stats: statsOf({ toolCalls: countTools(msgs), ...tk }),
  };
}

// ------------------------------------------------------------------ storage/ em JSON

function readJson(file: string): Record<string, unknown> | undefined {
  try {
    return rec(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return undefined;
  }
}

function listJson(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((n) => n.endsWith('.json'))
      .sort();
  } catch {
    return [];
  }
}

function mtime(p: string): number {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

class OpencodeJsonReader implements SessionReader {
  constructor(private readonly storage: string) {}

  read(now: number, since: number): PolledSession[] {
    const sesRoot = join(this.storage, 'session');
    let projects: string[];
    try {
      projects = readdirSync(sesRoot);
    } catch (err) {
      throw new Error(tr('pasta storage/session ilegível ({0})', [(err as NodeJS.ErrnoException).code ?? tr('erro')]));
    }
    const out: PolledSession[] = [];
    for (const proj of projects) {
      for (const name of listJson(join(sesRoot, proj))) {
        const file = join(sesRoot, proj, name);
        const id = name.slice(0, -5);
        const msgDir = join(this.storage, 'message', id);
        const touched = Math.max(mtime(file), mtime(msgDir));
        if (touched < since) continue;
        const ses = readJson(file);
        if (!ses) continue;
        const names = listJson(msgDir).slice(-MESSAGE_WINDOW);
        const raws = names.map((n) => readJson(join(msgDir, n)) ?? {});
        const msgs = names.flatMap((n, i) => {
          const mid = n.slice(0, -5);
          const partDir = join(this.storage, 'part', mid);
          const parts = listJson(partDir).map((p) => readJson(join(partDir, p)) ?? {});
          return legacyMessage(mid, raws[i], parts) ?? [];
        });
        const time = rec(ses.time);
        out.push(
          legacySession(
            str(ses.id) ?? id,
            { cwd: str(ses.directory), parentId: str(ses.parentID), title: str(ses.title), createdAt: num(time.created), updatedAt: Math.max(num(time.updated) ?? 0, touched) },
            msgs,
            raws,
            now,
          ),
        );
      }
    }
    return out;
  }
}

/** Leitor da pasta de dados do OpenCode: o banco, se houver; senão storage/ em JSON. */
export function createOpencodeReader(dir: string): SessionReader {
  const db = join(dir, 'opencode.db');
  if (existsSync(db)) return new OpencodeDbReader(db);
  return new OpencodeJsonReader(join(dir, 'storage'));
}
