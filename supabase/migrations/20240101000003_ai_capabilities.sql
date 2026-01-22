-- AI Capabilities Migration
-- Adds vector search primitives, AI function metadata, and run logging.

-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure timestamp helper exists (safety redefinition)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AI DOCUMENT STORAGE
-- ============================================================================
CREATE TABLE ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES ai_documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI FUNCTION DEFINITIONS + RUN LOGS
-- ============================================================================
CREATE TABLE ai_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'chat',
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.2,
  system_prompt TEXT,
  user_prompt_template TEXT,
  input_schema JSONB DEFAULT '{}'::jsonb,
  output_schema JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  project_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE TABLE ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_id UUID REFERENCES ai_functions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id TEXT,
  action TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'ai_documents' AND a.attname IN ('user_id')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_documents_user_id_idx ON ai_documents(user_id);';
END IF;
END$$;
        

DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'ai_document_chunks' AND a.attname IN ('document_id')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_document_chunks_document_id_idx ON ai_document_chunks(document_id);';
END IF;
END$$;
        

DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'ai_document_chunks' AND a.attname IN ('user_id')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_document_chunks_user_id_idx ON ai_document_chunks(user_id);';
END IF;
END$$;
        

DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'ai_functions' AND a.attname IN ('user_id')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_functions_user_id_idx ON ai_functions(user_id);';
END IF;
END$$;
        

DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'ai_runs' AND a.attname IN ('function_id')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_runs_function_id_idx ON ai_runs(function_id);';
END IF;
END$$;
        

DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'ai_runs' AND a.attname IN ('user_id')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS ai_runs_user_id_idx ON ai_runs(user_id);';
END IF;
END$$;
        

-- Vector index for faster similarity search (adjust lists as needed)
CREATE INDEX ai_document_chunks_embedding_idx
  ON ai_document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE TRIGGER update_ai_documents_updated_at
  BEFORE UPDATE ON ai_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_functions_updated_at
  BEFORE UPDATE ON ai_functions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE ai_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;

-- Document policies
CREATE POLICY "Users can read own ai_documents" ON ai_documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_documents" ON ai_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_documents" ON ai_documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_documents" ON ai_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Chunk policies
CREATE POLICY "Users can read own ai_document_chunks" ON ai_document_chunks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_document_chunks" ON ai_document_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_document_chunks" ON ai_document_chunks
  FOR DELETE USING (auth.uid() = user_id);

-- Function policies
CREATE POLICY "Users can read own ai_functions" ON ai_functions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_functions" ON ai_functions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_functions" ON ai_functions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_functions" ON ai_functions
  FOR DELETE USING (auth.uid() = user_id);

-- Run log policies (read + write own records)
CREATE POLICY "Users can read own ai_runs" ON ai_runs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_runs" ON ai_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- RPC FOR VECTOR SEARCH
-- ============================================================================
CREATE OR REPLACE FUNCTION match_ai_documents(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  min_similarity FLOAT DEFAULT 0,
  filter_tags TEXT[] DEFAULT NULL,
  filter_user UUID DEFAULT NULL,
  filter_document_ids UUID[] DEFAULT NULL
) RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    adc.id AS chunk_id,
    adc.document_id,
    adc.content,
    adc.metadata,
    1 - (adc.embedding <=> query_embedding) AS similarity
  FROM ai_document_chunks adc
  JOIN ai_documents ad ON ad.id = adc.document_id
  WHERE adc.embedding IS NOT NULL
    AND (filter_user IS NULL OR ad.user_id = filter_user)
    AND (filter_document_ids IS NULL OR adc.document_id = ANY(filter_document_ids))
    AND (filter_tags IS NULL OR ad.tags && filter_tags)
    AND (1 - (adc.embedding <=> query_embedding)) >= min_similarity
  ORDER BY adc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;