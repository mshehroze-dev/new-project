
// Shared AI utilities for Supabase Edge Functions
// Provides OpenAI config, chat + embedding helpers, simple chunking, and CORS headers.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

export type ChatRole = "system" | "user" | "assistant"

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface OpenAIConfig {
  apiKey: string
  baseUrl: string
  model: string
  embeddingModel: string
}

export interface ChatCompletionResult {
  message: ChatMessage
  usage?: Record<string, unknown>
  raw?: Record<string, unknown>
}

export const getOpenAIConfig = (): OpenAIConfig => {
  const apiKey = Deno.env.get("OPENAI_API_KEY") || ""
  const baseUrl = (Deno.env.get("OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/+$/, "")
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini"
  const embeddingModel = Deno.env.get("OPENAI_EMBEDDING_MODEL") || "text-embedding-3-small"

  return { apiKey, baseUrl, model, embeddingModel }
}

export const fetchChatCompletion = async (
  messages: ChatMessage[],
  cfg: OpenAIConfig,
  options?: {
    model?: string
    temperature?: number
    responseFormat?: Record<string, unknown>
    tools?: Record<string, unknown>[]
    maxTokens?: number
  },
): Promise<ChatCompletionResult> => {
  if (!cfg.apiKey) {
    throw new Error("Missing OpenAI API key")
  }

  const body: Record<string, unknown> = {
    model: options?.model || cfg.model,
    messages,
    temperature: options?.temperature ?? 0.3,
  }

  if (options?.responseFormat) {
    body.response_format = options.responseFormat
  }
  if (options?.tools) {
    body.tools = options.tools
  }
  if (options?.maxTokens) {
    body.max_tokens = options.maxTokens
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error?.message || "Failed to call OpenAI"
    throw new Error(message)
  }

  const choice = data?.choices?.[0]?.message
  return {
    message: {
      role: (choice?.role as ChatRole) || "assistant",
      content: choice?.content || "",
    },
    usage: data?.usage,
    raw: data,
  }
}

export const embedTexts = async (texts: string[], cfg: OpenAIConfig): Promise<number[][]> => {
  if (!cfg.apiKey) {
    throw new Error("Missing OpenAI API key")
  }
  if (texts.length === 0) return []

  const response = await fetch(`${cfg.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.embeddingModel,
      input: texts,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const message = data?.error?.message || "Failed to create embeddings"
    throw new Error(message)
  }

  return (data?.data || []).map((item: { embedding: number[] }) => item.embedding)
}

export const chunkText = (content: string, chunkSize = 700, overlap = 80): string[] => {
  if (!content) return []

  const words = content.split(/\s+/).filter(Boolean)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const slice = words.slice(i, i + chunkSize)
    if (slice.length) {
      chunks.push(slice.join(" "))
    }
  }

  return chunks
}


