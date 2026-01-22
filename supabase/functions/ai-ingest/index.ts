
// Supabase Edge Function: ai-ingest
// Chunks and embeds user-provided content into ai_document_chunks for retrieval.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { chunkText, corsHeaders, embedTexts, getOpenAIConfig } from "../_shared/ai-utils.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const title = (body.title as string) || ""
  const content = (body.content as string) || ""
  const description = (body.description as string) || null
  const tags = (body.tags as string[]) || []
  const metadata = (body.metadata as Record<string, unknown>) || {}
  const projectId = (body.projectId as string) || null
  const sourceUrl = (body.sourceUrl as string) || null
  const providedDocId = (body.documentId as string) || null

  if (!title || !content) {
    return new Response(JSON.stringify({ error: "title and content are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  // Get authenticated user
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") || ""
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const documentId = providedDocId || crypto.randomUUID()

    // Upsert parent document record
    const { error: docError } = await supabase.from("ai_documents").upsert({
      id: documentId,
      user_id: user.id,
      project_id: projectId,
      title,
      description,
      tags,
      source_url: sourceUrl,
    })

    if (docError) {
      throw docError
    }

    // Remove existing chunks for this document
    const { error: deleteError } = await supabase
      .from("ai_document_chunks")
      .delete()
      .eq("document_id", documentId)

    if (deleteError) {
      throw deleteError
    }

    const chunks = chunkText(content)
    if (!chunks.length) {
      return new Response(JSON.stringify({ error: "No text found to chunk" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const embeddings = await embedTexts(chunks, cfg)
    if (embeddings.length !== chunks.length) {
      throw new Error("Embedding count mismatch")
    }

    const records = chunks.map((chunk, index) => ({
      document_id: documentId,
      user_id: user.id,
      chunk_index: index,
      content: chunk,
      metadata,
      embedding: embeddings[index],
    }))

    const { error: insertError } = await supabase.from("ai_document_chunks").insert(records)
    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({
        documentId,
        chunks: records.length,
        embeddingModel: cfg.embeddingModel,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("AI ingest error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})


