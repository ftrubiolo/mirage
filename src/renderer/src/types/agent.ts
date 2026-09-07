export type PermissionMode = 'auto-apply' | 'ask-to-confirm';

export interface AIProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  availableModels: string[];
  isCustom?: boolean;
  hasKey: boolean;
  status: 'active' | 'unconfigured' | 'error' | 'testing';
  lastTestedAt?: string;
  errorMessage?: string;
}

export interface ProposedActionDiff {
  property: string;
  before: any;
  after: any;
}

export interface ProposedAction {
  id: string;
  toolName: string;
  summary: string;
  diff: ProposedActionDiff[];
  status: 'pending' | 'applied' | 'rejected';
  appliedAt?: string;
  rawArgs?: Record<string, unknown>;
}

export interface AgentStepItem {
  id: string;
  type: 'think' | 'tool' | 'edit' | 'audit' | 'status';
  title: string;
  detail?: string;
  status?: 'running' | 'done' | 'error';
  duration?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  steps?: AgentStepItem[];
  toolCalls?: ProposedAction[];
  timestamp: string;
  isStreaming?: boolean;
  modelUsed?: string;
  duration?: string;
  durationMs?: number;
  usage?: TokenUsage;
}

export interface SessionItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  providerId?: string;
  modelId?: string;
  messages: ChatMessage[];
}

export const INITIAL_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-reasoner'],
    hasKey: false,
    status: 'unconfigured'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    availableModels: [
      'meta/llama-3.3-70b-instruct',
      'deepseek-ai/deepseek-r1',
      'mistralai/mistral-large-2-instruct'
    ],
    hasKey: false,
    status: 'unconfigured'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    availableModels: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'deepseek/deepseek-r1',
      'google/gemini-2.5-flash'
    ],
    hasKey: false,
    status: 'unconfigured'
  }
];
