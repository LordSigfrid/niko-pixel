// Gemini CLI (~/.gemini) e Qwen Code (~/.qwen, derivado do Gemini CLI): sessões lidas dos arquivos de conversa que as
// duas CLIs gravam. Só leitura. NIKO_PIXEL_GEMINI_DIRS / NIKO_PIXEL_QWEN_DIRS escolhem as pastas (separadas por
// vírgula); NIKO_PIXEL_GEMINI=0 / NIKO_PIXEL_QWEN=0 desligam.
//
// NÃO TESTADO COM DADOS REAIS: escrito a partir do formato conhecido, lido de forma defensiva (campo estranho = ignorado):
// - <pasta>/tmp/<projeto>/chats/session-*.json: { sessionId, startTime, lastUpdated, summary?, messages: [{ id,
//   timestamp, type: 'user' | 'gemini' | 'error' | 'info' | 'warning', content, thoughts?, model?, tokens?,
//   toolCalls?: [{ id, name, args, status: 'success' | 'error' | 'cancelled' | 'awaiting_approval' | 'executing' |
//   'scheduled' | 'validating' }] }] } (o mesmo também em JSONL: uma mensagem por linha, a última com o mesmo id vale);
// - Qwen Code mais novo: <pasta>/projects/<projeto>/chats/<sessão>.jsonl, um registro por linha: { uuid, sessionId,
//   timestamp, type: 'user' | 'assistant' | 'tool_result' | 'system', cwd?, model?, message: { role, parts: [{ text,
//   thought? } | { functionCall } | { functionResponse }] }, usageMetadata? }.
// O projeto (a sala): o `cwd` dos registros; senão o arquivo `.project_root` da pasta do projeto; senão o
// projects.json da raiz ({ projects: { "<caminho>": "<nome>" } }) ou o sha256 do caminho (nome antigo das pastas);
// sem nada disso, a própria pasta do projeto.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { truncate } from '../../shared/activity';
import { expandHome } from '../accounts/detect';
import { activitiesOf, statsOf, statusOf, type ConvItem, type ConvMessage, type PolledSession, type SessionReader } from './polled';

/** Arquivo de conversa maior que isto não é lido (proteção). */
const MAX_FILE_BYTES = 64 * 1024 * 1024;

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

function time(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return undefined;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : undefined;
}

/** Pasta com cara do Gemini CLI / Qwen Code (tmp/ ou projects/). */
export function isGeminiDir(dir: string): boolean {
  return isDir(join(dir, 'tmp')) || isDir(join(dir, 'projects'));
}

/** Pastas de uma ferramenta: a variável (substitui tudo) ou a pasta padrão, se existir. */
export function discoverGeminiDirs(tool: 'gemini' | 'qwen', env: NodeJS.ProcessEnv = process.env, home: string = env.HOME || homedir()): string[] {
  const override = splitList(tool === 'gemini' ? env.NIKO_PIXEL_GEMINI_DIRS : env.NIKO_PIXEL_QWEN_DIRS);
  if (override.length) return [...new Set(override.map((p) => expandHome(p, home)))].filter(isDir);
  const base = tool === 'gemini' ? env.GEMINI_CLI_HOME?.trim() : undefined;
  const dir = join(base ? expandHome(base, home) : home, tool === 'gemini' ? '.gemini' : '.qwen');
  return isGeminiDir(dir) ? [dir] : [];
}

// ------------------------------------------------------------------ normalização

const GEMINI_TOOL_STATUS: Record<string, ConvItem['status']> = {
  success: 'completed',
  error: 'error',
  cancelled: 'error',
  awaiting_approval: 'awaiting',
  executing: 'running',
  scheduled: 'pending',
  validating: 'pending',
};

function textOf(content: unknown): string | undefined {
  if (typeof content === 'string') return content.trim() || undefined;
  if (Array.isArray(content))
    return (
      content
        .map((p) => (typeof p === 'string' ? p : (str(rec(p).text) ?? '')))
        .join('\n')
        .trim() || undefined
    );
  return str(rec(content).text);
}

interface Usage {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
}

/** Uma conversa lida, já normalizada. */
export interface GeminiChat {
  sessionId?: string;
  startedAt?: number;
  updatedAt?: number;
  summary?: string;
  cwd?: string;
  messages: ConvMessage[];
  usage: Usage;
}

/** Mensagem do Gemini CLI (`messages[]` do chat JSON). */
function geminiMessage(m: Record<string, unknown>, idx: number, usage: Usage): ConvMessage | undefined {
  const id = str(m.id) ?? String(idx);
  const at = time(m.timestamp) ?? 0;
  const type = str(m.type);
  if (type === 'user') return { id, role: 'user', at, text: textOf(m.content), items: [] };
  if (type === 'error') return { id, role: 'error', at, text: textOf(m.content), items: [] };
  if (type !== 'gemini' && type !== 'model' && type !== 'assistant' && type !== 'qwen') return undefined;
  const tk = rec(m.tokens);
  usage.input += num(tk.input) ?? 0;
  usage.output += num(tk.output) ?? 0;
  usage.reasoning += num(tk.thoughts) ?? 0;
  usage.cacheRead += num(tk.cached) ?? 0;
  const items: ConvItem[] = [];
  if (Array.isArray(m.thoughts) && m.thoughts.length) items.push({ type: 'think', key: 'think' });
  if (textOf(m.content)) items.push({ type: 'text', key: 'text' });
  const calls = Array.isArray(m.toolCalls) ? m.toolCalls.map(rec) : [];
  calls.forEach((c, i) => {
    const name = str(c.name);
    if (!name) return;
    items.push({ type: 'tool', key: str(c.id) ?? `t${i}`, name, input: c.args, status: GEMINI_TOOL_STATUS[str(c.status) ?? ''] ?? 'completed' });
  });
  // Resposta com ferramentas nunca fecha o turno: o modelo continua depois dos resultados.
  return { id, role: 'assistant', at, items, model: str(m.model), done: !calls.length };
}

/** Registro do Qwen Code (JSONL com `message.parts`): soma na conversa (o tool_result fecha a ferramenta). */
function qwenRecord(r: Record<string, unknown>, idx: number, chat: GeminiChat, byCall: Map<string, ConvItem>): void {
  const id = str(r.uuid) ?? str(r.id) ?? String(idx);
  const at = time(r.timestamp) ?? 0;
  chat.sessionId ??= str(r.sessionId);
  chat.cwd = str(r.cwd) ?? chat.cwd;
  if (at) {
    chat.startedAt ??= at;
    chat.updatedAt = Math.max(chat.updatedAt ?? 0, at);
  }
  const type = str(r.type);
  const parts = Array.isArray(rec(r.message).parts) ? (rec(r.message).parts as unknown[]).map(rec) : [];
  if (type === 'system') {
    if (/compress|compact/i.test(str(r.subtype) ?? '')) chat.messages.push({ id, role: 'compaction', at, items: [] });
    return;
  }
  if (type === 'user') {
    const text = parts.map((p) => str(p.text) ?? '').join('\n').trim();
    if (text) chat.messages.push({ id, role: 'user', at, text, items: [] });
    return;
  }
  if (type === 'tool_result') {
    for (const p of parts) {
      const fr = rec(p.functionResponse);
      const it = byCall.get(str(fr.id) ?? '');
      if (it) it.status = rec(fr.response).error !== undefined ? 'error' : 'completed';
    }
    return;
  }
  if (type !== 'assistant') return;
  const um = rec(r.usageMetadata);
  chat.usage.input += num(um.promptTokenCount) ?? 0;
  chat.usage.output += num(um.candidatesTokenCount) ?? 0;
  chat.usage.reasoning += num(um.thoughtsTokenCount) ?? 0;
  const items: ConvItem[] = [];
  parts.forEach((p, i) => {
    if (p.thought === true) items.push({ type: 'think', key: String(i) });
    else if (str(p.text)) items.push({ type: 'text', key: String(i) });
    const fc = rec(p.functionCall);
    const name = str(fc.name);
    if (name) {
      const it: ConvItem = { type: 'tool', key: str(fc.id) ?? String(i), name, input: fc.args, status: 'running' };
      items.push(it);
      byCall.set(it.key, it);
    }
  });
  chat.messages.push({ id, role: 'assistant', at, items, model: str(r.model), done: !items.some((i) => i.type === 'tool') });
}

/** Lê um arquivo de conversa (JSON inteiro ou JSONL). */
export function parseGeminiChat(raw: string): GeminiChat {
  const chat: GeminiChat = { messages: [], usage: { input: 0, output: 0, reasoning: 0, cacheRead: 0 } };
  const header = (h: Record<string, unknown>) => {
    chat.sessionId = str(h.sessionId) ?? chat.sessionId;
    chat.startedAt = time(h.startTime) ?? chat.startedAt;
    chat.updatedAt = Math.max(chat.updatedAt ?? 0, time(h.lastUpdated) ?? 0) || chat.updatedAt;
    chat.summary = str(h.summary) ?? chat.summary;
    chat.cwd = str(h.cwd) ?? str(h.projectRoot) ?? chat.cwd;
  };
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{') && !trimmed.includes('\n{')) {
    // JSON inteiro (o Gemini CLI regrava o arquivo a cada mensagem).
    let j: Record<string, unknown>;
    try {
      j = rec(JSON.parse(raw));
    } catch {
      return chat;
    }
    if (!Array.isArray(j.messages) && rec(j.message).parts) return parseLines([raw], chat, header);
    header(j);
    const msgs = Array.isArray(j.messages) ? j.messages.map(rec) : [];
    msgs.forEach((m, i) => {
      const c = geminiMessage(m, i, chat.usage);
      if (c) chat.messages.push(c);
    });
    return finish(chat);
  }
  return parseLines(raw.split('\n'), chat, header);
}

function parseLines(lines: string[], chat: GeminiChat, header: (h: Record<string, unknown>) => void): GeminiChat {
  const byCall = new Map<string, ConvItem>();
  const gem = new Map<string, ConvMessage>();
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    let r: Record<string, unknown>;
    try {
      r = rec(JSON.parse(line));
    } catch {
      return; // linha sendo gravada
    }
    if (rec(r.message).parts !== undefined || r.uuid !== undefined) qwenRecord(r, i, chat, byCall);
    else if (str(r.type) && (r.id !== undefined || r.timestamp !== undefined)) {
      const c = geminiMessage(r, i, chat.usage);
      if (!c) return;
      if (!gem.has(c.id)) chat.messages.push(c);
      else chat.messages[chat.messages.indexOf(gem.get(c.id)!)] = c;
      gem.set(c.id, c);
    } else header(r);
  });
  return finish(chat);
}

function finish(chat: GeminiChat): GeminiChat {
  const ats = chat.messages.map((m) => m.at).filter((t) => t > 0);
  if (ats.length) {
    chat.startedAt ??= Math.min(...ats);
    chat.updatedAt = Math.max(chat.updatedAt ?? 0, ...ats);
  }
  return chat;
}

// ------------------------------------------------------------------ leitor

interface FileCache {
  mtimeMs: number;
  size: number;
  chat: GeminiChat;
}

class GeminiReader implements SessionReader {
  private readonly files = new Map<string, FileCache>();
  private projects?: { at: number; byKey: Map<string, string> };

  constructor(private readonly root: string) {}

  /** Nome ou hash da pasta do projeto → caminho (projects.json da raiz), relido a cada minuto. */
  private projectPaths(now: number): Map<string, string> {
    if (this.projects && now - this.projects.at < 60_000) return this.projects.byKey;
    const byKey = new Map<string, string>();
    try {
      const j = rec(JSON.parse(readFileSync(join(this.root, 'projects.json'), 'utf8')));
      const map = rec(j.projects ?? j);
      for (const [path, name] of Object.entries(map)) {
        if (typeof name === 'string') byKey.set(name, path);
        byKey.set(createHash('sha256').update(path).digest('hex'), path);
      }
    } catch {
      // sem projects.json (versões antigas)
    }
    this.projects = { at: now, byKey };
    return byKey;
  }

  private projectRoot(projectDir: string, now: number): string | undefined {
    try {
      const p = readFileSync(join(projectDir, '.project_root'), 'utf8').trim();
      if (p) return p;
    } catch {
      // versões antigas não gravam
    }
    return this.projectPaths(now).get(basename(projectDir));
  }

  read(now: number, since: number): PolledSession[] {
    const out: PolledSession[] = [];
    const live = new Set<string>();
    for (const sub of ['tmp', 'projects']) {
      let projects: string[];
      try {
        projects = readdirSync(join(this.root, sub));
      } catch {
        continue;
      }
      for (const proj of projects) {
        const projectDir = join(this.root, sub, proj);
        const chats = join(projectDir, 'chats');
        let names: string[];
        try {
          names = readdirSync(chats).filter((n) => /\.jsonl?$/.test(n));
        } catch {
          continue;
        }
        for (const name of names) {
          const file = join(chats, name);
          let st;
          try {
            st = statSync(file);
          } catch {
            continue;
          }
          if (st.mtimeMs < since || st.size > MAX_FILE_BYTES) continue;
          live.add(file);
          let cache = this.files.get(file);
          if (!cache || cache.mtimeMs !== st.mtimeMs || cache.size !== st.size) {
            let raw: string;
            try {
              raw = readFileSync(file, 'utf8');
            } catch {
              continue;
            }
            cache = { mtimeMs: st.mtimeMs, size: st.size, chat: parseGeminiChat(raw) };
            this.files.set(file, cache);
          }
          const chat = cache.chat;
          const id = chat.sessionId ?? name.replace(/\.jsonl?$/, '');
          const lastAt = Math.max(chat.updatedAt ?? 0, st.mtimeMs);
          const msgs = chat.messages;
          const firstPrompt = msgs.find((m) => m.role === 'user' && m.text)?.text;
          const model = [...msgs].reverse().find((m) => m.model)?.model;
          out.push({
            id,
            cwd: chat.cwd ?? this.projectRoot(projectDir, now) ?? projectDir,
            title: chat.summary ?? (firstPrompt ? truncate(firstPrompt, 60) : undefined),
            model,
            startedAt: chat.startedAt ?? lastAt,
            lastAt,
            ...statusOf(msgs, lastAt, now),
            activities: activitiesOf(id, msgs),
            stats: statsOf({ toolCalls: msgs.reduce((n, m) => n + m.items.filter((i) => i.type === 'tool').length, 0), ...chat.usage }),
          });
        }
      }
    }
    for (const f of [...this.files.keys()]) if (!live.has(f)) this.files.delete(f);
    return out;
  }
}

export function createGeminiReader(dir: string): SessionReader {
  return new GeminiReader(dir);
}
