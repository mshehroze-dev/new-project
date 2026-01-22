import React, { useState } from 'react'
import { AISectionCard } from '@/components/ai/AISectionCard'
import { ingestDocument, runAIAction } from '@/lib/ai-client'
import type { AIResponse } from '@/lib/ai-types'

const defaultExtractionSchema = JSON.stringify(
  {
    type: 'object',
    properties: {
      title: { type: 'string' },
      summary: { type: 'string' },
      key_points: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary'],
  },
  null,
  2
)

export default function AIPlayground() {
  const [chatInput, setChatInput] = useState('')
  const [chatResult, setChatResult] = useState<AIResponse | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)

  const [contentTopic, setContentTopic] = useState('')
  const [contentTone, setContentTone] = useState('concise')
  const [contentAudience, setContentAudience] = useState('builders')
  const [contentResult, setContentResult] = useState<AIResponse | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)

  const [codeTask, setCodeTask] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('TypeScript')
  const [codeResult, setCodeResult] = useState<AIResponse | null>(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const [extractText, setExtractText] = useState('')
  const [schemaText, setSchemaText] = useState(defaultExtractionSchema)
  const [extractResult, setExtractResult] = useState<AIResponse | null>(null)
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchTags, setSearchTags] = useState('')
  const [searchTopK, setSearchTopK] = useState(5)
  const [searchResult, setSearchResult] = useState<AIResponse | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [docTitle, setDocTitle] = useState('')
  const [docContent, setDocContent] = useState('')
  const [docTags, setDocTags] = useState('')
  const [docMessage, setDocMessage] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)

  const renderResponse = (res: AIResponse | null) => {
    if (!res) return null

    // Try to parse JSON payloads to render friendlier UI
    let parsed: any = null
    if (res.message?.content) {
      try {
        parsed = JSON.parse(res.message.content)
      } catch {
        parsed = null
      }
    }

    return (
      <div className="rounded-md bg-gray-900/90 px-4 py-3 text-sm text-gray-100 shadow-inner space-y-3">
        {parsed ? (
          <div className="space-y-2">
            {parsed.explanation && (
              <div className="rounded-md bg-gray-800/80 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Explanation</div>
                <div className="mt-1 text-sm text-gray-50 whitespace-pre-wrap break-words">{parsed.explanation}</div>
              </div>
            )}
            {parsed.answer && (
              <div className="rounded-md bg-gray-800/80 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Answer</div>
                <div className="mt-1 text-sm text-gray-50 whitespace-pre-wrap break-words">{parsed.answer}</div>
              </div>
            )}
            {parsed.key_points && Array.isArray(parsed.key_points) && (
              <div className="rounded-md bg-gray-800/80 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Key points</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-gray-50">
                  {parsed.key_points.map((p: string, idx: number) => (
                    <li key={idx} className="whitespace-pre-wrap break-words">{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.sources && Array.isArray(parsed.sources) && parsed.sources.length > 0 && (
              <div className="rounded-md bg-gray-800/80 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Sources</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-gray-50">
                  {parsed.sources.map((s: string, idx: number) => (
                    <li key={idx} className="font-mono">{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.code && (
              <div className="rounded-md bg-gray-800/80 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">Code</div>
                <pre className="mt-1 overflow-auto rounded bg-black/40 p-2 text-xs text-amber-50">
                  <code>{parsed.code}</code>
                </pre>
              </div>
            )}
            {!parsed.explanation && !parsed.answer && !parsed.code && (
              <div className="font-mono whitespace-pre-wrap break-words">{res.message?.content}</div>
            )}
          </div>
        ) : (
          <div className="font-mono whitespace-pre-wrap break-words">{res.message?.content}</div>
        )}

        {res.context && res.context.length > 0 && (
          <div className="rounded border border-gray-700 bg-black/20 px-3 py-2 text-xs text-gray-300">
            <div className="font-semibold text-gray-200">Context used</div>
            <ul className="mt-1 space-y-1">
              {res.context.map((c) => (
                <li key={c.chunk_id || `${c.document_id}-${c.similarity}`}>
                  <span className="font-mono text-gray-200">{c.document_id}</span>{' '}
                  <span className="text-gray-400">({(c.similarity * 100).toFixed(1)}% match)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault()
    setChatLoading(true)
    setChatError(null)
    try {
      const res = await runAIAction({
        action: 'chat',
        prompt: chatInput,
      })
      setChatResult(res)
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Failed to run chat')
    } finally {
      setChatLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setContentLoading(true)
    setContentError(null)
    try {
      const res = await runAIAction({
        action: 'generate',
        prompt: contentTopic,
        variables: {
          tone: contentTone,
          audience: contentAudience,
        },
      })
      setContentResult(res)
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setContentLoading(false)
    }
  }

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setCodeLoading(true)
    setCodeError(null)
    try {
      const res = await runAIAction({
        action: 'code',
        prompt: codeTask,
        variables: {
          language: codeLanguage,
        },
      })
      setCodeResult(res)
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault()
    setExtractLoading(true)
    setExtractError(null)
    try {
      const schema = JSON.parse(schemaText)
      const res = await runAIAction({
        action: 'extract',
        prompt: extractText,
        schema: {
          schema,
          strict: true,
        },
      })
      setExtractResult(res)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract data'
      setExtractError(message)
    } finally {
      setExtractLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setSearchLoading(true)
    setSearchError(null)
    try {
      const res = await runAIAction({
        action: 'search',
        query: searchQuery,
        topK: searchTopK,
        tags: searchTags ? searchTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      })
      setSearchResult(res)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    setDocLoading(true)
    setDocError(null)
    setDocMessage(null)
    try {
      const res = await ingestDocument({
        title: docTitle,
        content: docContent,
        tags: docTags ? docTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      })
      setDocMessage(`Document stored with ${res.chunks} chunks (model: ${res.embeddingModel}). You can query it via semantic search. Document ID: ${res.documentId}`)
      setDocTitle('')
      setDocContent('')
      setDocTags('')
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Failed to ingest document')
    } finally {
      setDocLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-indigo-600">AI Toolkit</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Build with OpenAI</h1>
        <p className="mt-3 text-gray-600">
          Use the pre-wired Supabase Edge Functions to chat, generate content, build code helpers, extract structured
          data, and run retrieval-augmented Q&A against your own documents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AISectionCard
          title="Chat & Q&A"
          description="Simple assistant behavior for quick questions or helpdesk-style prompts."
          footer="Backed by the ai-assistant Edge Function (action=chat)."
        >
          <form className="space-y-3" onSubmit={handleChat}>
            <label className="block text-sm font-medium text-gray-700">
              Prompt
              <textarea
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything or describe the task..."
                required
              />
            </label>
            {chatError && <p className="text-sm text-red-600">{chatError}</p>}
            <button
              type="submit"
              disabled={chatLoading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {chatLoading ? 'Thinking...' : 'Run chat'}
            </button>
          </form>
          {renderResponse(chatResult)}
        </AISectionCard>

        <AISectionCard
          title="Content generation"
          description="Generate product copy, blog outlines, or marketing snippets with a few controls."
          footer="Backed by the ai-assistant Edge Function (action=generate)."
        >
          <form className="space-y-3" onSubmit={handleGenerate}>
            <label className="block text-sm font-medium text-gray-700">
              Topic or goal
              <input
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={contentTopic}
                onChange={(e) => setContentTopic(e.target.value)}
                placeholder="e.g., Launch blurb for our beta"
                required
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Tone
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={contentTone}
                  onChange={(e) => setContentTone(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Audience
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={contentAudience}
                  onChange={(e) => setContentAudience(e.target.value)}
                />
              </label>
            </div>
            {contentError && <p className="text-sm text-red-600">{contentError}</p>}
            <button
              type="submit"
              disabled={contentLoading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {contentLoading ? 'Generating...' : 'Generate content'}
            </button>
          </form>
          {renderResponse(contentResult)}
        </AISectionCard>

        <AISectionCard
          title="Code helper"
          description="Ask for code snippets or micro-implementations. Responses are structured JSON with explanation + code."
          footer="Backed by the ai-assistant Edge Function (action=code)."
        >
          <form className="space-y-3" onSubmit={handleCode}>
            <label className="block text-sm font-medium text-gray-700">
              Task
              <input
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={codeTask}
                onChange={(e) => setCodeTask(e.target.value)}
                placeholder="e.g., validate email + password input"
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Language / stack
              <input
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                placeholder="TypeScript"
              />
            </label>
            {codeError && <p className="text-sm text-red-600">{codeError}</p>}
            <button
              type="submit"
              disabled={codeLoading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {codeLoading ? 'Assembling...' : 'Generate code'}
            </button>
          </form>
          {renderResponse(codeResult)}
        </AISectionCard>

        <AISectionCard
          title="Structured extraction"
          description="Turn messy text into a JSON object that matches the provided schema."
          footer="Backed by the ai-assistant Edge Function (action=extract)."
        >
          <form className="space-y-3" onSubmit={handleExtract}>
            <label className="block text-sm font-medium text-gray-700">
              Text to extract from
              <textarea
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={4}
                value={extractText}
                onChange={(e) => setExtractText(e.target.value)}
                placeholder="Paste a support ticket, blog post, or any freeform text..."
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              JSON schema
              <textarea
                className="mt-1 font-mono w-full rounded-md border border-gray-200 px-3 py-2 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={6}
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
              />
            </label>
            {extractError && <p className="text-sm text-red-600">{extractError}</p>}
            <button
              type="submit"
              disabled={extractLoading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {extractLoading ? 'Parsing...' : 'Extract data'}
            </button>
          </form>
          {renderResponse(extractResult)}
        </AISectionCard>

        <AISectionCard
          title="Semantic search & RAG"
          description="Run retrieval-augmented responses over your stored documents."
          footer="Backed by the ai-assistant Edge Function (action=search). Ingest documents first."
        >
          <form className="space-y-3" onSubmit={handleSearch}>
            <label className="block text-sm font-medium text-gray-700">
              Question
              <textarea
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are the key billing rules?"
                required
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-gray-700">
                Tags (comma-separated)
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={searchTags}
                  onChange={(e) => setSearchTags(e.target.value)}
                  placeholder="docs,api"
                />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                Top K
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={searchTopK}
                  onChange={(e) => setSearchTopK(Number(e.target.value))}
                />
              </label>
            </div>
            {searchError && <p className="text-sm text-red-600">{searchError}</p>}
            <button
              type="submit"
              disabled={searchLoading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {searchLoading ? 'Searching...' : 'Search + answer'}
            </button>
          </form>
          {renderResponse(searchResult)}
        </AISectionCard>

        <AISectionCard
          title="Document ingestion"
          description="Store text in pgvector for retrieval. Use tags to group documents."
          footer="Backed by the ai-ingest Edge Function."
        >
          <form className="space-y-3" onSubmit={handleIngest}>
            <label className="block text-sm font-medium text-gray-700">
              Title
              <input
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Feature spec or FAQ"
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
              <input
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={docTags}
                onChange={(e) => setDocTags(e.target.value)}
                placeholder="support,faq,billing"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Content
              <textarea
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={6}
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Paste raw text to chunk and embed..."
                required
              />
            </label>
            {docError && <p className="text-sm text-red-600">{docError}</p>}
            {docMessage && <p className="text-sm text-green-700">{docMessage}</p>}
            <button
              type="submit"
              disabled={docLoading}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {docLoading ? 'Saving...' : 'Ingest document'}
            </button>
          </form>
        </AISectionCard>
      </div>
    </div>
  )
}