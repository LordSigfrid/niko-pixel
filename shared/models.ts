// Nome curto e legível do modelo de um agente ("DeepSeek", "Gemini", "Claude"...), para as ferramentas que usam
// modelos de vários provedores (OpenCode, Gemini CLI, Qwen Code). Código puro, sem APIs de Node nem de DOM.

/** Família do modelo pelo id (a ordem importa: o primeiro padrão que bate vence). */
const FAMILIES: ReadonlyArray<[RegExp, string]> = [
  [/deepseek/i, 'DeepSeek'],
  [/gemma/i, 'Gemma'],
  [/gemini/i, 'Gemini'],
  [/claude|sonnet|opus|haiku/i, 'Claude'],
  [/qwen|qwq/i, 'Qwen'],
  [/kimi|moonshot/i, 'Kimi'],
  [/glm|zhipu|chatglm/i, 'GLM'],
  [/grok/i, 'Grok'],
  [/llama/i, 'Llama'],
  [/codestral|devstral|mistral|mixtral|magistral/i, 'Mistral'],
  [/nemotron/i, 'Nemotron'],
  [/minimax|abab/i, 'MiniMax'],
  [/\bphi-?\d/i, 'Phi'],
  [/command-?r|cohere/i, 'Cohere'],
  [/(^|[/:\s-])(gpt|o[1-9])(?=[-.\d]|$)|codex|chatgpt/i, 'GPT'],
];

/** Provedor (providerID do OpenCode, por exemplo) quando o id do modelo não diz a família. */
const PROVIDERS: Readonly<Record<string, string>> = {
  anthropic: 'Claude',
  openai: 'GPT',
  google: 'Gemini',
  'google-vertex': 'Gemini',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  alibaba: 'Qwen',
  dashscope: 'Qwen',
  moonshotai: 'Kimi',
  zhipuai: 'GLM',
  xai: 'Grok',
  mistral: 'Mistral',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  'github-copilot': 'Copilot',
  opencode: 'OpenCode Zen',
};

/**
 * Nome curto da família do modelo: pelo id ("deepseek-v4-flash" → "DeepSeek", "anthropic/claude-sonnet-4" →
 * "Claude"); sem família conhecida, pelo provedor ("ollama" → "Ollama"); sem nenhum dos dois, o próprio id (cortado).
 */
export function modelFamily(modelId?: string, providerId?: string): string | undefined {
  const id = modelId?.trim();
  if (id) for (const [re, name] of FAMILIES) if (re.test(id)) return name;
  const prov = providerId?.trim().toLowerCase();
  if (prov && PROVIDERS[prov]) return PROVIDERS[prov];
  if (id) {
    const last = id.split('/').pop() ?? id;
    return last.length > 24 ? `${last.slice(0, 23)}…` : last;
  }
  return providerId?.trim() || undefined;
}
