import { describe, expect, it } from 'vitest';
import { modelFamily } from './models';

describe('modelFamily', () => {
  it('pelo id do modelo', () => {
    expect(modelFamily('deepseek-v4.1-flash-free', 'opencode')).toBe('DeepSeek');
    expect(modelFamily('gemini-2.5-pro')).toBe('Gemini');
    expect(modelFamily('anthropic/claude-sonnet-4-5')).toBe('Claude');
    expect(modelFamily('qwen3-coder-plus')).toBe('Qwen');
    expect(modelFamily('gpt-5-codex')).toBe('GPT');
    expect(modelFamily('o3-mini')).toBe('GPT');
    expect(modelFamily('kimi-k2')).toBe('Kimi');
    expect(modelFamily('glm-4.6')).toBe('GLM');
  });
  it('sem família conhecida: o provedor, senão o próprio id', () => {
    expect(modelFamily('beam-free', 'opencode')).toBe('OpenCode Zen');
    expect(modelFamily('meu-modelo', 'ollama')).toBe('Ollama');
    expect(modelFamily('vendor/meu-modelo')).toBe('meu-modelo');
    expect(modelFamily(undefined, 'xpto')).toBe('xpto');
    expect(modelFamily()).toBeUndefined();
  });
});
