export type AIAction = 'chat' | 'generate' | 'code' | 'extract' | 'search'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIContext {
  chunk_id?: string
  document_id: string
  content: string
  similarity: number
}

export interface AIResponse {
  message: AIMessage
  usage?: Record<string, unknown>
  context?: AIContext[]
  error?: string
}

export interface AIRequest {
  action: AIAction
  messages?: AIMessage[]
  prompt?: string
  query?: string
  variables?: Record<string, string>
  schema?: {
    name?: string
    schema?: Record<string, unknown>
    strict?: boolean
  }
  topK?: number
  tags?: string[]
  documentIds?: string[]
  model?: string
  temperature?: number
  projectId?: string
  functionId?: string
}

export interface IngestRequest {
  title: string
  content: string
  description?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  projectId?: string
  sourceUrl?: string
  documentId?: string
}