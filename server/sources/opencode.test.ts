// Fonte do OpenCode: banco SQLite (formato 2.x) e storage/ em JSON sintéticos, numa pasta temporária, e a ponte
// PolledSource → Office. Nada aqui vem de conversas reais.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { AccountsService } from '../accounts/service';
import { setQuiet } from '../log';
import { NameStore } from '../model/names';
import { Office } from '../model/office';
import { createOpencodeReader, discoverOpencodeDirs } from './opencode';
import { PolledSource, RECENT_MS } from './polled';

setQuiet(true);

const T0 = 1_800_000_000_000;
let dirs: string[] = [];
let closers: Array<() => void> = [];
afterEach(() => {
  // No Windows o banco aberto trava a pasta: fecha tudo antes de apagar.
  for (const c of closers) c();
  closers = [];
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'niko-opencode-'));
  dirs.push(d);
  return d;
}

const SESSION_COLS = `id TEXT PRIMARY KEY, project_id TEXT, parent_id TEXT, directory TEXT NOT NULL, title TEXT, model TEXT,
  cost REAL DEFAULT 0, tokens_input INTEGER DEFAULT 0, tokens_output INTEGER DEFAULT 0, tokens_reasoning INTEGER DEFAULT 0,
  tokens_cache_read INTEGER DEFAULT 0, tokens_cache_write INTEGER DEFAULT 0, summary_additions INTEGER, summary_deletions INTEGER,
  time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, time_busy INTEGER, time_idle INTEGER, time_archived INTEGER`;

class FakeDb {
  readonly db: DatabaseSync;
  private seq = 0;
  constructor(readonly dir: string) {
    this.db = new DatabaseSync(join(dir, 'opencode.db'));
    closers.push(() => this.db.isOpen && this.db.close());
    this.db.exec(`CREATE TABLE session_v2 (${SESSION_COLS});
      CREATE TABLE session_message (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, type TEXT NOT NULL, seq INTEGER NOT NULL,
        time_created INTEGER NOT NULL, time_updated INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE TABLE credential (id TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  }
  session(id: string, p: { dir?: string; parent?: string; title?: string; at: number; busy?: number; idle?: number; model?: string }) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO session_v2 (id, project_id, parent_id, directory, title, model, tokens_input, tokens_output, tokens_cache_read, cost, time_created, time_updated, time_busy, time_idle)
         VALUES (?, 'p', ?, ?, ?, ?, 100, 20, 5, 0.5, ?, ?, ?, ?)`,
      )
      .run(id, p.parent ?? null, p.dir ?? '/projetos/loja', p.title ?? 'Sessão de teste', JSON.stringify({ id: p.model ?? 'deepseek-v4-flash', providerID: 'opencode' }), T0, p.at, p.busy ?? null, p.idle ?? null);
  }
  message(session: string, id: string, type: string, at: number, data: Record<string, unknown>) {
    this.db
      .prepare('INSERT OR REPLACE INTO session_message (id, session_id, type, seq, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, session, type, ++this.seq, at, at, JSON.stringify({ time: { created: at }, ...data }));
  }
}

const tool = (id: string, name: string, input: Record<string, unknown>, status = 'completed') => ({ type: 'tool', id, name, executed: true, state: { status, input } });

function office(now: () => number) {
  const late: { office?: Office } = {};
  const accounts = new AccountsService({ dirs: [], home: tmpdir(), env: {}, now, onChange: () => late.office?.markDirty() });
  const o = new Office({ names: new NameStore(null), version: 'teste', startedAt: now(), accounts: (s) => accounts.list(s), sources: () => [], accountName: (id) => accounts.find(id)?.detected.name, now });
  late.office = o;
  return { accounts, office: o };
}

describe('OpenCode: descoberta', () => {
  it('NIKO_PIXEL_OPENCODE_DIRS substitui a detecção; pasta padrão só se tiver dados', () => {
    const home = tmp();
    expect(discoverOpencodeDirs({}, home)).toEqual([]);
    const data = join(home, '.local', 'share', 'opencode');
    mkdirSync(data, { recursive: true });
    expect(discoverOpencodeDirs({}, home)).toEqual([]);
    writeFileSync(join(data, 'opencode.db'), '');
    expect(discoverOpencodeDirs({}, home)).toEqual([data]);
    const other = tmp();
    expect(discoverOpencodeDirs({ NIKO_PIXEL_OPENCODE_DIRS: `${other}, ${join(home, 'nao-existe')}` }, home)).toEqual([other]);
  });
});

describe('OpenCode 2.x (SQLite)', () => {
  it('lê sessão, modelo, atividades, tokens e status (ocupada/ociosa, pergunta em aberto)', () => {
    const f = new FakeDb(tmp());
    f.session('ses_a', { at: T0 + 5_000, busy: T0 + 1_000 });
    f.message('ses_a', 'm1', 'user', T0 + 1_000, { text: 'arrume o carrinho de compras' });
    f.message('ses_a', 'm2', 'assistant', T0 + 2_000, {
      model: { id: 'deepseek-v4-flash', providerID: 'opencode' },
      content: [{ type: 'reasoning', text: 'x' }, tool('c1', 'read', { path: '/projetos/loja/src/cart.ts' }), tool('c2', 'shell', { command: 'npm test' }, 'running')],
    });
    const r = createOpencodeReader(f.dir);
    closers.unshift(() => r.close?.());
    let [s] = r.read(T0 + 6_000, T0 - RECENT_MS);
    expect(s).toMatchObject({ id: 'ses_a', cwd: '/projetos/loja', title: 'Sessão de teste', model: 'deepseek-v4-flash', modelProvider: 'opencode', status: 'working' });
    expect(s.activities.map((a) => a.kind)).toEqual(['prompt', 'think', 'read', 'test']);
    expect(s.activities[2].text).toContain('cart.ts');
    expect(s.stats).toMatchObject({ toolCalls: 2, tokensIn: 105, tokensOut: 20, costUSD: 0.5 });

    // Pergunta ao usuário em aberto, com a sessão ocupada: esperando você.
    f.message('ses_a', 'm3', 'assistant', T0 + 7_000, { content: [tool('c3', 'question', { questions: [{ question: 'Qual cor?' }] }, 'running')] });
    [s] = r.read(T0 + 8_000, T0 - RECENT_MS);
    expect(s.status).toBe('waiting');
    expect(s.activities.at(-1)?.kind).toBe('ask');

    // Ficou ociosa (time_idle depois de time_busy) e trocou de modelo.
    f.message('ses_a', 'm4', 'model-switched', T0 + 9_000, { model: { id: 'gemini-2.5-pro', providerID: 'google' } });
    f.session('ses_a', { at: T0 + 10_000, busy: T0 + 1_000, idle: T0 + 10_000 });
    [s] = r.read(T0 + 11_000, T0 - RECENT_MS);
    expect(s).toMatchObject({ status: 'idle', model: 'gemini-2.5-pro' });
    r.close?.();
  });

  it('banco sem as tabelas conhecidas: erro claro', () => {
    const dir = tmp();
    const db = new DatabaseSync(join(dir, 'opencode.db'));
    db.exec('CREATE TABLE outra (id TEXT)');
    db.close();
    const r = createOpencodeReader(dir);
    closers.unshift(() => r.close?.());
    expect(() => r.read(T0, 0)).toThrow(/desconhecido|unknown/);
  });
});

describe('OpenCode 1.x (storage/ em JSON)', () => {
  it('sessão, mensagens e partes', () => {
    const dir = tmp();
    const st = join(dir, 'storage');
    const w = (p: string, v: unknown) => {
      mkdirSync(join(st, p, '..'), { recursive: true });
      writeFileSync(join(st, p), JSON.stringify(v));
    };
    w('session/proj1/ses_j.json', { id: 'ses_j', directory: '/projetos/api', title: 'API', time: { created: T0, updated: T0 + 3_000 } });
    w('message/ses_j/msg_1.json', { id: 'msg_1', role: 'user', time: { created: T0 + 1_000 } });
    w('part/msg_1/prt_1.json', { type: 'text', text: 'crie a rota /health' });
    w('message/ses_j/msg_2.json', { id: 'msg_2', role: 'assistant', modelID: 'claude-sonnet-4', providerID: 'anthropic', time: { created: T0 + 2_000 }, tokens: { input: 10, output: 3, reasoning: 0, cache: { read: 1, write: 0 } } });
    w('part/msg_2/prt_1.json', { type: 'tool', tool: 'edit', callID: 'call_1', state: { status: 'running', input: { filePath: '/projetos/api/routes.ts' } } });
    const [s] = createOpencodeReader(dir).read(T0 + 4_000, 0);
    expect(s).toMatchObject({ id: 'ses_j', cwd: '/projetos/api', model: 'claude-sonnet-4', status: 'working' });
    expect(s.activities.map((a) => a.kind)).toEqual(['prompt', 'edit']);
    expect(s.stats).toMatchObject({ toolCalls: 1, tokensIn: 11, tokensOut: 3 });
  });
});

describe('PolledSource com o OpenCode', () => {
  it('principal entra com o modelo no papel, subagente entrega, sessão parada sai', () => {
    let clock = T0 + 5_000;
    const now = () => clock;
    const { accounts, office: o } = office(now);
    const f = new FakeDb(tmp());
    f.session('ses_p', { at: T0 + 4_000, busy: T0 + 1_000 });
    f.message('ses_p', 'm1', 'user', T0 + 1_000, { text: 'olá' });
    f.session('ses_c', { parent: 'ses_p', title: 'Explorar', at: T0 + 4_000, busy: T0 + 2_000 });
    const src = new PolledSource({ provider: 'opencode', name: 'OpenCode', short: 'O', color: '#e8b931', accounts, office: o, dirs: [f.dir], createReader: createOpencodeReader, now });
    src.start();
    closers.unshift(() => src.stop());
    const snap = () => o.commit().snapshot;
    let s = snap();
    const main = s.agents.find((a) => a.id === 'opencode:ses_p');
    expect(main).toMatchObject({ kind: 'main', provider: 'opencode', status: 'working', role: 'Agente principal (OpenCode · DeepSeek)', model: 'deepseek-v4-flash' });
    expect(s.agents.find((a) => a.id === 'opencode:ses_c')).toMatchObject({ kind: 'sub', parentId: 'opencode:ses_p', provider: 'opencode' });
    expect(s.accounts.find((a) => a.id === 'opencode')).toMatchObject({ provider: 'opencode', name: 'OpenCode', short: 'O' });
    expect(src.sources()).toEqual([{ label: 'opencode', provider: 'opencode', path: f.dir, sessions: 1, ok: true }]);

    // O subagente terminou: entrega.
    clock += 1_000;
    f.session('ses_c', { parent: 'ses_p', title: 'Explorar', at: clock, busy: T0 + 2_000, idle: clock });
    src.poll();
    expect(snap().agents.find((a) => a.id === 'opencode:ses_c')?.status).toBe('done');

    // Principal ocioso e parado além da janela: sai do escritório.
    f.session('ses_p', { at: clock, busy: T0 + 1_000, idle: clock });
    src.poll();
    expect(snap().agents.find((a) => a.id === 'opencode:ses_p')?.status).toBe('idle');
    clock += RECENT_MS + 1_000;
    src.poll();
    o.tick();
    s = snap();
    expect(s.agents.find((a) => a.id === 'opencode:ses_p')?.status ?? 'offline').toBe('offline');
  });

  it('pasta ilegível: conta com erro, sem derrubar nada', () => {
    const now = () => T0;
    const { accounts, office: o } = office(now);
    const src = new PolledSource({
      provider: 'opencode',
      name: 'OpenCode',
      short: 'O',
      color: '#e8b931',
      accounts,
      office: o,
      dirs: ['/nao/existe'],
      createReader: () => ({
        read: () => {
          throw new Error('quebrado');
        },
      }),
      now,
    });
    src.poll(true);
    expect(src.sources()[0]).toMatchObject({ ok: false, error: 'quebrado' });
  });
});
