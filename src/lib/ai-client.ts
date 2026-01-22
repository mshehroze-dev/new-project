import { supabase } from './supabase'
import type { AIRequest, AIResponse, IngestRequest } from './ai-types'

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

export const runAIAction = async (payload: AIRequest): Promise<AIResponse> => {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('ai-assistant', {
    body: payload,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as AIResponse
}

export const ingestDocument = async (payload: IngestRequest) => {
  const client = requireSupabase()
  const { data, error } = await client.functions.invoke('ai-ingest', {
    body: payload,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as { documentId: string; chunks: number; embeddingModel: string }
}
