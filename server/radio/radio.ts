// Rádio: alerta tático no topo da tela quando um operador pede reforço, mesmo com o navegador minimizado ou fechado.
// O servidor desenha pelo snapshot (model.ts) e conversa com uma janela nativa (no Windows, host-script.ts) por linhas
// JSON. Autorizar/Negar decidem o pedido de permissão aberto (o mesmo do escritório; o terminal continua valendo);
// Abrir abre o Niko-Pixel no navegador.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { OfficeSnapshot, PermissionDecision } from '../../shared/types';
import { RADIO_HOST_PS1 } from './host-script';
import { alertsFrom, diffAlerts, radioLabels, type RadioAlert, type RadioCommand } from './model';

export interface RadioHost {
  send(cmd: RadioCommand | { type: 'labels'; labels: ReturnType<typeof radioLabels> } | { type: 'quit' }): void;
  onAction(cb: (action: string, id: string) => void): void;
  onExit(cb: () => void): void;
  kill(): void;
}

export interface RadioOptions {
  /** Decide um pedido de permissão (PermissionRegistry.decide); ausente = só Abrir. */
  decide?: (permId: string, d: PermissionDecision) => string;
  /** Abre a página do Niko-Pixel no navegador. */
  open: (agentId: string) => void;
  /** Cria a janela nativa (troca nos testes). */
  createHost: () => RadioHost | undefined;
  log?: (msg: string) => void;
  /** Tentativas de reabrir a janela se ela cair. */
  maxRestarts?: number;
  now?: () => number;
}

/** Quanto tempo, depois de Autorizar/Negar, a espera do mesmo operador não vira alerta. */
export const DECIDED_QUIET_MS = 15_000;

export class Radio {
  private host: RadioHost | undefined;
  private readonly shown = new Map<string, RadioAlert>();
  private readonly dismissed = new Set<string>();
  private last: OfficeSnapshot | undefined;
  private restarts = 0;
  private stopped = false;
  /**
   * Operadores que acabaram de receber Autorizar/Negar, até quando. Logo depois da decisão o pedido some, mas o status
   * ainda fica "aguardando" por alguns segundos: sem isso, o mesmo operador reaparecia como um alerta novo.
   */
  private readonly decided = new Map<string, number>();

  constructor(private readonly opts: RadioOptions) {}

  private now(): number {
    return this.opts.now?.() ?? Date.now();
  }

  /** Janela aberta: conta como alguém olhando (os pedidos de permissão podem ser respondidos por ela). */
  get active(): boolean {
    return !!this.host;
  }

  start(): void {
    this.stopped = false;
    this.spawnHost();
  }

  stop(): void {
    this.stopped = true;
    const h = this.host;
    this.host = undefined;
    if (h) {
      h.send({ type: 'quit' });
      h.kill();
    }
  }

  /** Cada snapshot novo do escritório. */
  update(snap: OfficeSnapshot): void {
    this.last = snap;
    const now = this.now();
    for (const [id, until] of this.decided) if (until <= now) this.decided.delete(id);
    // Depois de uma decisão, só um pedido NOVO de permissão do mesmo operador volta a aparecer.
    const next = alertsFrom(snap).filter((a) => !(this.decided.has(a.agentId) && a.kind === 'waiting'));
    // Esquece dispensas de pedidos que já acabaram (um pedido novo do mesmo operador aparece de novo).
    const live = new Set(next.map((a) => a.id));
    for (const id of this.dismissed) if (!live.has(id)) this.dismissed.delete(id);
    if (!this.host) return;
    for (const cmd of diffAlerts(this.shown, next, this.dismissed)) {
      if (cmd.type === 'show') this.shown.set(cmd.alert.id, cmd.alert);
      else this.shown.delete(cmd.id);
      this.host.send(cmd);
    }
  }

  private spawnHost(): void {
    const h = this.opts.createHost();
    if (!h) return;
    this.host = h;
    this.shown.clear();
    h.onAction((action, id) => this.act(action, id));
    h.onExit(() => {
      if (this.host !== h) return;
      this.host = undefined;
      this.shown.clear();
      if (this.stopped) return;
      if (this.restarts++ < (this.opts.maxRestarts ?? 3)) {
        this.opts.log?.('rádio: a janela fechou; reabrindo');
        setTimeout(() => !this.stopped && this.spawnHost(), 2000).unref?.();
      } else this.opts.log?.('rádio: a janela caiu várias vezes; desligado até reiniciar o servidor');
    });
    h.send({ type: 'labels', labels: radioLabels() });
    if (this.last) this.update(this.last);
  }

  private act(action: string, id: string): void {
    if (action === 'ready') return;
    const a = this.shown.get(id);
    if (!a) return;
    if (action === 'dismiss') {
      this.dismissed.add(id);
      this.shown.delete(id);
      return;
    }
    if (action === 'open') {
      this.opts.open(a.agentId);
      return;
    }
    if ((action === 'allow' || action === 'deny') && a.permId && a.canDecide && this.opts.decide) {
      const r = this.opts.decide(a.permId, { behavior: action });
      if (r !== 'ok') this.opts.log?.(`rádio: decisão "${action}" não aplicada (${r})`);
      this.decided.set(a.agentId, this.now() + DECIDED_QUIET_MS);
      // O snapshot seguinte tira o alerta; esconde já para a resposta parecer imediata.
      this.shown.delete(id);
      this.dismissed.add(id);
      this.host?.send({ type: 'hide', id });
    }
  }
}

/** Janela nativa do Windows (PowerShell + WPF). O script vai para a pasta de dados, com BOM (o PowerShell 5.1 lê ANSI sem ele). */
export function createWindowsHost(dataDir: string, log?: (msg: string) => void): RadioHost | undefined {
  let child: ChildProcessWithoutNullStreams;
  try {
    const dir = join(dataDir, 'radio');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'radio.ps1');
    writeFileSync(file, `﻿${RADIO_HOST_PS1.replace(/\r?\n/g, '\r\n')}`, 'utf8');
    child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', file], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } catch (err) {
    log?.(`rádio: não foi possível abrir a janela (${(err as Error).message})`);
    return undefined;
  }
  const actions: Array<(action: string, id: string) => void> = [];
  const exits: Array<() => void> = [];
  createInterface({ input: child.stdout }).on('line', (line) => {
    try {
      const m = JSON.parse(line) as { action?: unknown; id?: unknown };
      if (typeof m.action === 'string') for (const cb of actions) cb(m.action, typeof m.id === 'string' ? m.id : '');
    } catch {
      /* linha que não é JSON: ignora */
    }
  });
  createInterface({ input: child.stderr }).on('line', (line) => line.trim() && log?.(`rádio: ${line.trim()}`));
  child.on('error', (err) => log?.(`rádio: ${err.message}`));
  child.on('exit', () => exits.forEach((cb) => cb()));
  child.stdin.on('error', () => {});
  return {
    send: (cmd) => {
      if (!child.stdin.destroyed) child.stdin.write(`${JSON.stringify(cmd)}\n`);
    },
    onAction: (cb) => actions.push(cb),
    onExit: (cb) => exits.push(cb),
    kill: () => {
      if (!child.killed) child.kill();
    },
  };
}

/** Abre uma URL no navegador padrão do Windows. */
export function openInBrowser(url: string): void {
  try {
    spawn('explorer.exe', [url], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } catch {
    /* sem navegador: nada a fazer */
  }
}
