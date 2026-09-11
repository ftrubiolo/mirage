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
