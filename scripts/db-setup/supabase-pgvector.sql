CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_embeddings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id text NOT NULL,
  user_id text,
  is_public_in_org boolean NOT NULL DEFAULT false,
  doc_key text NOT NULL,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, doc_key, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_org ON ai_embeddings (organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_org_module ON ai_embeddings (organization_id, module_id);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_org_visibility ON ai_embeddings (organization_id, is_public_in_org);
CREATE INDEX IF NOT EXISTS idx_ai_embeddings_org_user ON ai_embeddings (organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_ai_embeddings_embedding_cosine ON ai_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION ai_semantic_search(
  p_organization_id uuid,
  p_query_embedding text,
  p_user_id text,
  p_module_id text DEFAULT NULL,
  p_match_count int DEFAULT 8,
  p_similarity_threshold double precision DEFAULT 0.2
)
RETURNS TABLE (
  id uuid,
  doc_key text,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.doc_key,
    e.chunk_index,
    e.content,
    e.metadata,
    1 - (e.embedding <=> (p_query_embedding::vector(1536))) AS similarity
  FROM ai_embeddings e
  WHERE e.organization_id = p_organization_id
    AND (p_module_id IS NULL OR e.module_id = p_module_id)
    AND (e.is_public_in_org = true OR (p_user_id IS NOT NULL AND e.user_id = p_user_id))
    AND (1 - (e.embedding <=> (p_query_embedding::vector(1536)))) >= p_similarity_threshold
  ORDER BY e.embedding <=> (p_query_embedding::vector(1536))
  LIMIT p_match_count;
$$;
