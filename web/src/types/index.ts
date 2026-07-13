export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  reasoning_content?: string;
  image?: {
    base64: string;
    mimeType: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  model: string;
  pinned?: boolean;
}

export interface AppConfig {
  deepseekApiKey: string;
  qwenApiKey: string;
  deepseekModel: string;
  qwenModel: string;
  useAutoDetect: boolean;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
  maxRounds: number;
  budget: number;
}

export interface ProviderStats {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  calls: number;
  imagesGenerated?: number;
}

export interface CostEntry {
  id?: number;
  provider: "deepseek" | "qwen";
  model: string;
  action: "chat" | "vision" | "generate";
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp?: number;
  createdAt?: string;
}

export interface CostSummary {
  deepseek: ProviderStats;
  qwen: ProviderStats;
  totalCost: number;
  recentEntries?: CostEntry[];
  entries?: CostEntry[];
}

export type StreamStage = "idle" | "vision" | "reasoning" | "generating";

export interface StreamEvent {
  type: "delta" | "done" | "error" | "status" | "vision_done";
  content?: string;
  reasoning?: string;
  model?: string;
  thinking?: string;
  error?: string;
  description?: string;
  message?: string;
  stage?: StreamStage;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}

export interface ImageGenResponse {
  images: string[];
  taskId: string;
  cost: number;
}
