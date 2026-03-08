export type AIProviderName = 'google' | 'openai' | 'anthropic' | 'groq' | 'deepgram';

export type AITaskKind = 'json' | 'text' | 'transcription' | 'embedding' | 'image_generation';

export type AIFeatureSettingsRow = {
  id: string;
  organization_id: string | null;
  feature_key: string;
  enabled: boolean;
  primary_provider: AIProviderName;
  primary_model: string;
  fallback_provider: AIProviderName | null;
  fallback_model: string | null;
  backup_provider?: AIProviderName | null;
  backup_model?: string | null;
  base_prompt?: string | null;
  reserve_cost_cents: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
};

export type AIProviderKeyRow = {
  id: string;
  provider: AIProviderName;
  organization_id: string | null;
  api_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type AIModelAliasRow = {
  id: string;
  provider: AIProviderName;
  model: string;
  organization_id: string | null;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type AIGenerateJsonParams = {
  featureKey: string;
  organizationId?: string;
  userId?: string;
  prompt: string;
  responseSchema?: unknown;
  systemInstruction?: string;
  meta?: Record<string, unknown>;
};

export type AIGenerateTextParams = {
  featureKey: string;
  organizationId?: string;
  userId?: string;
  prompt: string;
  systemInstruction?: string;
  meta?: Record<string, unknown>;
};

export type AIStreamTextParams = {
  featureKey: string;
  organizationId?: string;
  userId?: string;
  prompt: string;
  systemInstruction?: string;
  meta?: Record<string, unknown>;
};

export type AITranscribeParams = {
  featureKey: string;
  organizationId?: string;
  userId?: string;
  audioBuffer: ArrayBuffer;
  mimeType: string;
  meta?: Record<string, unknown>;
};

export type AIGenerateJsonResult<T = unknown> = {
  result: T;
  provider: AIProviderName;
  model: string;
  modelDisplayName?: string | null;
  chargedCents: number;
};

export type AIGenerateTextResult = {
  text: string;
  provider: AIProviderName;
  model: string;
  modelDisplayName?: string | null;
  chargedCents: number;
};

export type AIStreamTextResult = {
  stream: ReadableStream<Uint8Array>;
  provider: AIProviderName;
  model: string;
  modelDisplayName?: string | null;
};

export type AITranscribeResult = {
  text: string;
  provider: AIProviderName;
  model: string;
  chargedCents: number;
};
