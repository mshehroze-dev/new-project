
// Supabase Edge Function: ai-assistant
// Routes common AI actions (chat, content generation, code help, extraction, semantic search) through OpenAI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { ChatMessage, corsHeaders, embedTexts, fetchChatCompletion, getOpenAIConfig } from "../_shared/ai-utils.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

type Action = "chat" | "generate" | "code" | "extract" | "search"

interface AssistantRequest {
  action: Action
  messages?: ChatMessage[]
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

type ContextBlock = { document_id: string; content: string; similarity: number; chunk_id?: string }

const buildMessages = (
  body: AssistantRequest,
  contextBlocks: ContextBlock[],
): { messages: ChatMessage[]; responseFormat?: Record<string, unknown> } => {
  const variablesText = body.variables
    ? Object.entries(body.variables)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    : ""

  const contextText = contextBlocks
    .map((c) => `Document: ${c.document_id}\nRelevance: ${(c.similarity * 100).toFixed(1)}%\n${c.content}`)
    .join("\n\n---\n\n")

  const response: { messages: ChatMessage[]; responseFormat?: Record<string, unknown> } = {
    messages: [],
  }

  switch (body.action) {
    case "chat": {
      if (body.messages && body.messages.length > 0) {
        response.messages = body.messages
      } else {
        response.messages = [
          { role: "system", content: "You are a concise, helpful assistant." },
          { role: "user", content: body.prompt || "Answer the user." },
        ]
      }
      break
    }
    case "generate": {
      response.messages = [
        {
          role: "system",
          content: "You create on-brand, concise content. Keep answers actionable and avoid fluff.",
        },
        {
          role: "user",
          content: `Create content for: ${body.prompt || "my product"}${variablesText ? `\nDetails:\n${variablesText}` : ""}`,
        },
      ]
      break
    }
    case "code": {
      response.messages = [
        {
          role: "system",
          content:
            "You generate working code snippets and short explanations. Prefer modern, idiomatic patterns and safe defaults.",
        },
        {
          role: "user",
          content: `Write code for: ${body.prompt || "the described task"}${variablesText ? `\nDetails:\n${variablesText}` : ""}\nRespond with JSON containing 'explanation' and 'code'.`,
        },
      ]
      response.responseFormat = { type: "json_object" }
      break
    }
    case "extract": {
      response.messages = [
        {
          role: "system",
          content: "Extract structured data. Return only valid JSON that matches the provided schema.",
        },
        {
          role: "user",
          content: `${body.prompt || "Extract the required fields."}${variablesText ? `\nPayload:\n${variablesText}` : ""}`,
        },
      ]
      const schema = body.schema?.schema || {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_facts: { type: "array", items: { type: "string" } },
        },
        required: ["summary"],
      }
      // OpenAI function schemas require additionalProperties to be explicitly set
      if (typeof schema === "object" && !("additionalProperties" in schema)) {
        ;(schema as Record<string, unknown>).additionalProperties = false
      }
      if (
        typeof schema === "object" &&
        "properties" in schema &&
        typeof (schema as any).properties === "object"
      ) {
        const propKeys = Object.keys((schema as any).properties || {})
        const existingRequired = Array.isArray((schema as any).required) ? (schema as any).required : []
        const mergedRequired = Array.from(new Set([...(existingRequired || []), ...propKeys]))
        ;(schema as any).required = mergedRequired
      }
      response.responseFormat = {
        type: "json_schema",
        json_schema: {
          name: body.schema?.name || "extraction",
          schema,
          strict: body.schema?.strict ?? true,
        },
      }
      break
    }
    case "search": {
      response.messages = [
        {
          role: "system",
          content:
            "You answer questions using only the provided context. If context is missing, say you don't have enough information.",
        },
        {
          role: "user",
          content: `Question: ${body.query}\n\nContext:\n${contextText || "No context found."}\n\nRespond with JSON containing 'answer' and 'sources' (chunk IDs used).`,
        },
      ]
      response.responseFormat = { type: "json_object" }
      break
    }
    default: {
      response.messages = [{ role: "user", content: body.prompt || "Respond to the user." }]
    }
  }

  return response
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const cfg = getOpenAIConfig()
  if (!cfg.apiKey) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY environment variable" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: AssistantRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  // Authenticated user (optional for chat/generate/code/extract, helpful for logging/search scoping)
  let user = null
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") || ""
  if (token) {
    const {
      data: { user: authedUser },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (!authError && authedUser) {
      user = authedUser
    }
  }

  if (!body.action) {
    return new Response(JSON.stringify({ error: "action is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // For search actions, ensure we have a query
  if (body.action === "search" && !body.query) {
    return new Response(JSON.stringify({ error: "query is required for search" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
  let contextBlocks: ContextBlock[] = []

    if (body.action === "search" && body.query) {
      const [queryEmbedding] = await embedTexts([body.query], cfg)
      if (queryEmbedding) {
        const { data: matches, error: matchError } = await supabase.rpc("match_ai_documents", {
          query_embedding: queryEmbedding,
          match_count: body.topK || 5,
          filter_tags: body.tags || null,
          filter_user: user?.id || null,
          filter_document_ids: body.documentIds || null,
        })

        if (matchError) {
          throw matchError
        }

        contextBlocks =
          (matches || []).map(
            (m: { document_id: string; chunk_id: string; content: string; similarity: number }) => ({
              document_id: m.document_id,
              content: m.content,
              similarity: m.similarity || 0,
              chunk_id: m.chunk_id,
            }),
          ) || []
      }
    }

    const { messages, responseFormat } = buildMessages(body, contextBlocks)

    const completion = await fetchChatCompletion(messages, cfg, {
      model: body.model || cfg.model,
      temperature: body.temperature ?? 0.3,
      responseFormat,
    })

    // Best-effort logging for observability
    await supabase.from("ai_runs").insert({
      function_id: body.functionId || null,
      user_id: user?.id || null,
      action: body.action,
      request_payload: body as unknown as Record<string, unknown>,
      response_payload: {
        message: completion.message,
        context_used: contextBlocks.map((c) => ({ document_id: c.document_id, similarity: c.similarity })),
      },
      model: body.model || cfg.model,
      tokens_used: (completion.usage as { total_tokens?: number } | undefined)?.total_tokens ?? null,
      project_id: body.projectId || null,
    })

    return new Response(
      JSON.stringify({
        message: completion.message,
        usage: completion.usage,
        context: contextBlocks,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("AI assistant error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})


