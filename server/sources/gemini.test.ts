// Gemini CLI e Qwen Code: arquivos de conversa SINTÉTICOS no formato conhecido (não há dados reais aqui).
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGeminiReader, discoverGeminiDirs, parseGeminiChat } from './gemini';

const T0 = 1_800_000_000_000;
const iso = (ms: number) => new Date(ms).toISOString();
let dirs: string[] = [];
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), 'niko-gemini-'));
  dirs.push(d);
  return d;
}

function write(file: string, content: string, mtime = T0) {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, content);
  utimesSync(file, mtime / 1000, mtime / 1000);
}

function geminiChat(messages: unknown[]) {
  return JSON.stringify({ sessionId: 'sess-g1', projectHash: 'h', startTime: iso(T0), lastUpdated: iso(T0 + 3_000), messages }, null, 2);
}

describe('Gemini CLI: descoberta', () => {
  it('pasta padrão só com tmp/ ou projects/; variável substitui', () => {
    const home = tmp();
    expect(discoverGeminiDirs('gemini', {}, home)).toEqual([]);
    mkdirSync(join(home, '.gemini', 'tmp'), { recursive: true });
    expect(discoverGeminiDirs('gemini', {}, home)).toEqual([join(home, '.gemini')]);
    expect(discoverGeminiDirs('qwen', {}, home)).toEqual([]);
    mkdirSync(join(home, '.qwen', 'projects'), { recursive: true });
    expect(discoverGeminiDirs('qwen', {}, home)).toEqual([join(home, '.qwen')]);
    const other = tmp();
    expect(discoverGeminiDirs('gemini', { NIKO_PIXEL_GEMINI_DIRS: other }, home)).toEqual([other]);
  });
});

describe('Gemini CLI: chat JSON', () => {
  it('mensagens, ferramentas, tokens e status', () => {
    const c = parseGeminiChat(
      geminiChat([
        { id: 'u1', timestamp: iso(T0 + 1_000), type: 'user', content: 'liste os arquivos' },
        {
          id: 'g1',
          timestamp: iso(T0 + 2_000),
          type: 'gemini',
          content: '',
          model: 'gemini-2.5-pro',
          thoughts: [{ subject: 'x', description: 'y' }],
          tokens: { input: 50, output: 7, cached: 3, thoughts: 2 },
          toolCalls: [{ id: 't1', name: 'list_directory', args: { path: '/p/app' }, status: 'success' }],
        },
      ]),
    );
    expect(c).toMatchObject({ sessionId: 'sess-g1', startedAt: T0, updatedAt: T0 + 3_000, usage: { input: 50, output: 7, reasoning: 2, cacheRead: 3 } });
    expect(c.messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(c.messages[1]).toMatchObject({ model: 'gemini-2.5-pro', done: false });
  });

  it('leitor: projeto pelo .project_root, aprovação pendente = esperando, fim do turno = ocioso', () => {
    const root = tmp();
    const proj = join(root, 'tmp', 'abc123');
    write(join(proj, '.project_root'), '/projetos/site');
    const file = join(proj, 'chats', 'session-2026-01-01T10-00-sess.json');
    const msgs = [
      { id: 'u1', timestamp: iso(T0 + 1_000), type: 'user', content: 'rode os testes' },
      { id: 'g1', timestamp: iso(T0 + 2_000), type: 'gemini', content: '', model: 'gemini-2.5-flash', toolCalls: [{ id: 't1', name: 'run_shell_command', args: { command: 'npm test' }, status: 'awaiting_approval' }] },
    ];
    write(file, geminiChat(msgs), T0 + 3_000);
    const r = createGeminiReader(root);
    let [s] = r.read(T0 + 4_000, T0 - 60_000);
    expect(s).toMatchObject({ id: 'sess-g1', cwd: '/projetos/site', model: 'gemini-2.5-flash', status: 'waiting', title: 'rode os testes' });
    expect(s.activities.map((a) => a.kind)).toEqual(['prompt', 'test']);

    msgs[1].toolCalls![0].status = 'success';
    msgs.push({ id: 'g2', timestamp: iso(T0 + 5_000), type: 'gemini', content: 'Pronto, todos passaram.', model: 'gemini-2.5-flash' } as never);
    write(file, geminiChat(msgs), T0 + 5_000);
    [s] = r.read(T0 + 6_000, T0 - 60_000);
    expect(s.status).toBe('idle');
    expect(s.activities.at(-1)?.kind).toBe('respond');

    // Arquivo antigo (fora da janela): fica de fora.
    expect(r.read(T0 + 6_000, T0 + 5_500)).toEqual([]);
  });

  it('projeto pelo projects.json (nome ou sha256 do caminho)', () => {
    const root = tmp();
    const hash = createHash('sha256').update('/projetos/blog').digest('hex');
    write(join(root, 'projects.json'), JSON.stringify({ projects: { '/projetos/blog': 'blog' } }));
    write(join(root, 'tmp', hash, 'chats', 'a.json'), geminiChat([{ id: 'u1', timestamp: iso(T0), type: 'user', content: 'oi' }]), T0);
    write(join(root, 'tmp', 'blog', 'chats', 'b.json'), geminiChat([{ id: 'u1', timestamp: iso(T0), type: 'user', content: 'oi' }]).replace('sess-g1', 'sess-g2'), T0);
    const out = createGeminiReader(root).read(T0 + 1_000, 0);
    expect(out.map((x) => x.cwd)).toEqual(['/projetos/blog', '/projetos/blog']);
    // Sessão cuja última palavra é do usuário, há pouco: trabalhando.
    expect(out[0].status).toBe('working');
  });
});

describe('Qwen Code: JSONL com parts', () => {
  it('cwd dos registros, chamada e resultado de ferramenta, compactação', () => {
    const root = tmp();
    const line = (o: Record<string, unknown>) => JSON.stringify({ sessionId: 'q1', cwd: '/projetos/cli', ...o });
    const lines = [
      line({ uuid: 'a', timestamp: iso(T0 + 1_000), type: 'user', message: { role: 'user', parts: [{ text: 'leia o README' }] } }),
      line({
        uuid: 'b',
        timestamp: iso(T0 + 2_000),
        type: 'assistant',
        model: 'qwen3-coder-plus',
        message: { role: 'model', parts: [{ text: 'pensando', thought: true }, { functionCall: { id: 'f1', name: 'read_file', args: { absolute_path: '/projetos/cli/README.md' } } }] },
        usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 4 },
      }),
    ];
    const file = join(root, 'projects', '-projetos-cli', 'chats', 'q1.jsonl');
    write(file, lines.join('\n') + '\n', T0 + 2_000);
    const r = createGeminiReader(root);
    let [s] = r.read(T0 + 3_000, 0);
    expect(s).toMatchObject({ id: 'q1', cwd: '/projetos/cli', model: 'qwen3-coder-plus', status: 'working' });
    expect(s.activities.map((a) => a.kind)).toEqual(['prompt', 'think', 'read']);
    expect(s.stats).toMatchObject({ toolCalls: 1, tokensIn: 30, tokensOut: 4 });

    lines.push(line({ uuid: 'c', timestamp: iso(T0 + 3_000), type: 'tool_result', message: { role: 'user', parts: [{ functionResponse: { id: 'f1', name: 'read_file', response: { output: 'ok' } } }] } }));
    lines.push(line({ uuid: 'd', timestamp: iso(T0 + 4_000), type: 'assistant', model: 'qwen3-coder-plus', message: { role: 'model', parts: [{ text: 'Feito.' }] } }));
    lines.push(line({ uuid: 'e', timestamp: iso(T0 + 5_000), type: 'system', subtype: 'chat_compression' }));
    write(file, lines.join('\n') + '\n{"partial', T0 + 5_000);
    [s] = r.read(T0 + 6_000, 0);
    expect(s.status).toBe('idle');
    expect(s.activities.map((a) => a.kind)).toEqual(['prompt', 'think', 'read', 'respond', 'compact']);
  });
});
