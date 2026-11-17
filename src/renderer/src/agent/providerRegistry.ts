import { AIProviderConfig } from '../types/agent';

export interface ProviderDefinition {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  popularModels: string[];
  docUrl: string;
  apiKeyHelpUrl: string;
  keyPrefix?: string;
  placeholderKey?: string;
  helpText?: string;
}

/**
 * Authoritative registry of standard LLM cloud providers.
 * Local providers (Ollama, LM Studio, etc.) are handled via Custom Provider.
 */
export const STANDARD_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    popularModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'o1',
      'o1-mini',
      'o3-mini',
      'chatgpt-4o-latest'
    ],
    docUrl: 'https://platform.openai.com/docs/api-reference',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-',
    placeholderKey: 'sk-proj-... or sk-...',
    helpText: 'GPT-4o and o1/o3 series models with native function calling and tool support.'
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Proxy / Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-7-sonnet-latest',
    popularModels: [
      'claude-3-7-sonnet-latest',
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest',
      'claude-3-opus-latest'
    ],
    docUrl: 'https://docs.anthropic.com/en/docs',
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-',
    placeholderKey: 'sk-ant-api03-...',
    helpText: 'To connect Claude directly, an OpenAI-compatible proxy or OpenRouter is recommended.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    popularModels: [
      'anthropic/claude-3.7-sonnet',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'openai/o3-mini',
      'openai/gpt-5.6-luna',
      'deepseek/deepseek-r1',
      'deepseek/deepseek-chat',
      'google/gemini-2.5-flash',
      'meta-llama/llama-3.3-70b-instruct'
    ],
    docUrl: 'https://openrouter.ai/docs',
    apiKeyHelpUrl: 'https://openrouter.ai/keys',
    keyPrefix: 'sk-or-v1-',
    placeholderKey: 'sk-or-v1-...',
    helpText: 'Unified access to 200+ models (Claude, GPT, Gemini, Llama, DeepSeek) with a single key.'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.5-flash',
    popularModels: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ],
    docUrl: 'https://ai.google.dev/gemini-api/docs/openai',
    apiKeyHelpUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIzaSy',
    placeholderKey: 'AIzaSy...',
    helpText: 'Official Google endpoint in OpenAI-compatibility mode. Fast with a large context window.'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    popularModels: [
      'deepseek-chat',
      'deepseek-reasoner'
    ],
    docUrl: 'https://api-docs.deepseek.com',
    apiKeyHelpUrl: 'https://platform.deepseek.com/api_keys',
    keyPrefix: 'sk-',
    placeholderKey: 'sk-...',
    helpText: 'deepseek-chat (V3) for high speed or deepseek-reasoner (R1) for deep reasoning.'
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    popularModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'deepseek-r1-distill-llama-70b',
      'mixtral-8x7b-32768'
    ],
    docUrl: 'https://console.groq.com/docs/quickstart',
    apiKeyHelpUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    placeholderKey: 'gsk_...',
    helpText: 'Ultra-high-speed inference (300–800 tok/s) powered by next-generation LPU chips.'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    popularModels: [
      'mistral-large-latest',
      'codestral-latest',
      'mistral-small-latest',
      'ministral-8b-latest'
    ],
    docUrl: 'https://docs.mistral.ai/api/',
    apiKeyHelpUrl: 'https://console.mistral.ai/api-keys/',
    placeholderKey: 'Mistral API key...',
    helpText: 'High-precision European models with strong code generation support via Codestral.'
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    popularModels: [
      'grok-2-latest',
      'grok-beta'
    ],
    docUrl: 'https://docs.x.ai',
    apiKeyHelpUrl: 'https://console.x.ai',
    keyPrefix: 'xai-',
    placeholderKey: 'xai-...',
    helpText: 'xAI Grok models with OpenAI-compatible interface and strong reasoning capabilities.'
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    popularModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
      'Qwen/Qwen2.5-72B-Instruct-Turbo'
    ],
    docUrl: 'https://docs.together.ai',
    apiKeyHelpUrl: 'https://api.together.ai/settings/api-keys',
    placeholderKey: 'Together API key...',
    helpText: 'Low-latency cloud hosting for large-scale open-source models.'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    popularModels: [
      'meta/llama-3.3-70b-instruct',
      'deepseek-ai/deepseek-r1',
      'mistralai/mistral-large-2-instruct'
    ],
    docUrl: 'https://docs.api.nvidia.com/nim/',
    apiKeyHelpUrl: 'https://build.nvidia.com/',
    keyPrefix: 'nvapi-',
    placeholderKey: 'nvapi-...',
    helpText: 'NVIDIA GPU-accelerated inference microservices with ultra-low latency.'
  }
];

/**
 * Helper to convert a ProviderDefinition into an AIProviderConfig instance.
 */
