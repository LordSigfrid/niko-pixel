import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { claudeBinFrom, unwrapNpmShim } from './claude-bin';

describe('claude do npm no Windows', () => {
  const dirs: string[] = [];
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  function npmGlobal(withExe: boolean): string {
    const dir = mkdtempSync(join(tmpdir(), 'niko-claude-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'claude.cmd'), '@echo off');
    if (withExe) {
      const bin = join(dir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin');
      mkdirSync(bin, { recursive: true });
      writeFileSync(join(bin, 'claude.exe'), '');
    }
    return dir;
  }

  it('troca o atalho claude.cmd pelo claude.exe de verdade', () => {
    const dir = npmGlobal(true);
    expect(unwrapNpmShim(join(dir, 'claude.cmd'), 'win32')).toBe(join(dir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'));
    expect(claudeBinFrom({ PATH: dir, PATHEXT: '.CMD' }, 'win32')).toMatch(/claude\.exe$/);
  });

  it('sem o .exe ao lado, ou fora do Windows, mantém o caminho', () => {
    const dir = npmGlobal(false);
    expect(unwrapNpmShim(join(dir, 'claude.cmd'), 'win32')).toBe(join(dir, 'claude.cmd'));
    expect(unwrapNpmShim('/usr/local/bin/claude', 'linux')).toBe('/usr/local/bin/claude');
  });
});
