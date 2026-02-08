-- ============================================================================
-- CodeLens AI - Supabase Database Schema
-- Production-ready SQL setup for RAG-based code understanding system
-- ============================================================================

-- Enable required extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ============================================================================
-- 1. MAIN TABLES
-- ============================================================================

-- Code chunks table: Stores indexed code with embeddings
CREATE TABLE IF NOT EXISTS public.code_chunks (
  -- Primary Key
  id BIGSERIAL PRIMARY KEY,
  
  -- Project Information
  project_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  
  -- Content Information
  chunk_type TEXT NOT NULL DEFAULT 'file' CHECK (chunk_type IN ('function', 'class', 'file', 'dom')),
  content TEXT NOT NULL,
  
  -- Embeddings and Metadata
  embedding vector(384),  -- all-MiniLM-L6-v2 produces 384-dimensional vectors
  metadata JSONB,
  
  -- Timestamps
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_chunk UNIQUE (project_id, file_path, chunk_type, content)
);

-- Projects table: Track indexed projects
CREATE TABLE IF NOT EXISTS public.projects (
  id BIGSERIAL PRIMARY KEY,
  
  project_id TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  
  -- Statistics (updated periodically)
  total_chunks INTEGER DEFAULT 0,
  indexed_files INTEGER DEFAULT 0,
  last_indexed TIMESTAMP WITH TIME ZONE,
  
  -- Configuration
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Query history: Track user queries for analytics
CREATE TABLE IF NOT EXISTS public.query_history (
  id BIGSERIAL PRIMARY KEY,
  
  project_id TEXT NOT NULL,
  query TEXT NOT NULL,
  
  -- Results
  chunks_retrieved INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Code chunks indexes
CREATE INDEX IF NOT EXISTS idx_code_chunks_project_id 
  ON public.code_chunks(project_id);

CREATE INDEX IF NOT EXISTS idx_code_chunks_file_path 
  ON public.code_chunks(file_path);

CREATE INDEX IF NOT EXISTS idx_code_chunks_chunk_type 
  ON public.code_chunks(chunk_type);

CREATE INDEX IF NOT EXISTS idx_code_chunks_indexed_at 
  ON public.code_chunks(indexed_at DESC);

-- Vector similarity index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_code_chunks_embedding 
  ON public.code_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_code_chunks_project_type 
  ON public.code_chunks(project_id, chunk_type);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_project_id 
  ON public.projects(project_id);

CREATE INDEX IF NOT EXISTS idx_projects_last_indexed 
  ON public.projects(last_indexed DESC);

-- Query history indexes
CREATE INDEX IF NOT EXISTS idx_query_history_project_id 
  ON public.query_history(project_id);

CREATE INDEX IF NOT EXISTS idx_query_history_created_at 
  ON public.query_history(created_at DESC);

-- ============================================================================
-- 3. RPC FUNCTIONS FOR VECTOR SEARCH
-- ============================================================================

-- Main function: Match code chunks by semantic similarity
CREATE OR REPLACE FUNCTION public.match_code_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_project_id text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  project_id text,
  file_path text,
  chunk_type text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    code_chunks.id,
    code_chunks.project_id,
    code_chunks.file_path,
    code_chunks.chunk_type,
    code_chunks.content,
    code_chunks.metadata,
    (1 - (code_chunks.embedding <=> query_embedding))::float as similarity
  FROM public.code_chunks
  WHERE 
    (filter_project_id IS NULL OR code_chunks.project_id = filter_project_id)
    AND code_chunks.embedding IS NOT NULL
    AND (1 - (code_chunks.embedding <=> query_embedding)) > match_threshold
  ORDER BY code_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Get chunks for a specific file
CREATE OR REPLACE FUNCTION public.get_file_chunks(
  p_project_id text,
  p_file_path text
)
RETURNS TABLE (
  id bigint,
  project_id text,
  file_path text,
  chunk_type text,
  content text,
  metadata jsonb,
  indexed_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    code_chunks.id,
    code_chunks.project_id,
    code_chunks.file_path,
    code_chunks.chunk_type,
    code_chunks.content,
    code_chunks.metadata,
    code_chunks.indexed_at
  FROM public.code_chunks
  WHERE 
    code_chunks.project_id = p_project_id
    AND code_chunks.file_path = p_file_path
  ORDER BY code_chunks.id;
END;
$$;

-- Function: Get project statistics
CREATE OR REPLACE FUNCTION public.get_project_stats(p_project_id text)
RETURNS TABLE (
  total_chunks bigint,
  unique_files bigint,
  last_indexed timestamp with time zone,
  chunk_types jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_chunks,
    COUNT(DISTINCT file_path)::bigint as unique_files,
    MAX(indexed_at) as last_indexed,
    jsonb_object_agg(chunk_type, cnt) as chunk_types
  FROM (
    SELECT chunk_type, COUNT(*) as cnt
    FROM public.code_chunks
    WHERE project_id = p_project_id
    GROUP BY chunk_type
  ) subq;
END;
$$;

-- Function: Delete all chunks for a project
CREATE OR REPLACE FUNCTION public.delete_project_chunks(p_project_id text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.code_chunks
  WHERE project_id = p_project_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'project_id', p_project_id,
    'deleted_chunks', deleted_count,
    'deleted_at', CURRENT_TIMESTAMP
  );
END;
$$;

-- Function: Search across multiple chunk types
CREATE OR REPLACE FUNCTION public.search_code(
  query_embedding vector(384),
  p_project_id text,
  p_chunk_types text[] DEFAULT NULL,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  project_id text,
  file_path text,
  chunk_type text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    code_chunks.id,
    code_chunks.project_id,
    code_chunks.file_path,
    code_chunks.chunk_type,
    code_chunks.content,
    code_chunks.metadata,
    (1 - (code_chunks.embedding <=> query_embedding))::float as similarity
  FROM public.code_chunks
  WHERE 
    code_chunks.project_id = p_project_id
    AND code_chunks.embedding IS NOT NULL
    AND (p_chunk_types IS NULL OR code_chunks.chunk_type = ANY(p_chunk_types))
    AND (1 - (code_chunks.embedding <=> query_embedding)) > match_threshold
  ORDER BY code_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 4. UTILITY FUNCTIONS
-- ============================================================================

-- Function: Update project statistics
CREATE OR REPLACE FUNCTION public.update_project_stats(p_project_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.projects (project_id, project_name, total_chunks, indexed_files, last_indexed)
  SELECT 
    p_project_id,
    p_project_id,
    COUNT(*),
    COUNT(DISTINCT file_path),
    MAX(indexed_at)
  FROM public.code_chunks
  WHERE project_id = p_project_id
  ON CONFLICT (project_id) DO UPDATE
  SET 
    total_chunks = EXCLUDED.total_chunks,
    indexed_files = EXCLUDED.indexed_files,
    last_indexed = EXCLUDED.last_indexed,
    updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- Function: Get similar chunks (for related code discovery)
CREATE OR REPLACE FUNCTION public.get_similar_chunks(
  chunk_id bigint,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.6
)
RETURNS TABLE (
  id bigint,
  project_id text,
  file_path text,
  chunk_type text,
  content text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  source_embedding vector(384);
  source_project_id text;
BEGIN
  -- Get the source chunk's embedding and project
  SELECT embedding, project_id INTO source_embedding, source_project_id
  FROM public.code_chunks
  WHERE id = chunk_id;

  IF source_embedding IS NULL THEN
    RAISE EXCEPTION 'Chunk with id % not found', chunk_id;
  END IF;

  RETURN QUERY
  SELECT
    code_chunks.id,
    code_chunks.project_id,
    code_chunks.file_path,
    code_chunks.chunk_type,
    code_chunks.content,
    (1 - (code_chunks.embedding <=> source_embedding))::float as similarity
  FROM public.code_chunks
  WHERE 
    code_chunks.project_id = source_project_id
    AND code_chunks.id != chunk_id
    AND code_chunks.embedding IS NOT NULL
    AND (1 - (code_chunks.embedding <=> source_embedding)) > match_threshold
  ORDER BY code_chunks.embedding <=> source_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 5. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function: Update code_chunks.updated_at on modification
CREATE OR REPLACE FUNCTION public.update_code_chunks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_code_chunks_timestamp
BEFORE UPDATE ON public.code_chunks
FOR EACH ROW
EXECUTE FUNCTION public.update_code_chunks_timestamp();

-- Function: Update projects.updated_at on modification
CREATE OR REPLACE FUNCTION public.update_projects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_timestamp
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_projects_timestamp();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on tables
ALTER TABLE public.code_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;

-- Note: For development, you may want to disable RLS:
-- ALTER TABLE public.code_chunks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.query_history DISABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users (customize based on your auth strategy)
-- These are permissive policies that allow operations if user_id in metadata matches auth user

CREATE POLICY "Users can view their project chunks" ON public.code_chunks
  FOR SELECT
  USING (
    metadata->>'user_id' = auth.uid()::text
    OR auth.role() = 'anon'  -- Allow anon for development
  );

CREATE POLICY "Users can insert chunks for their projects" ON public.code_chunks
  FOR INSERT
  WITH CHECK (
    metadata->>'user_id' = auth.uid()::text
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can delete chunks from their projects" ON public.code_chunks
  FOR DELETE
  USING (
    metadata->>'user_id' = auth.uid()::text
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can view their projects" ON public.projects
  FOR SELECT
  USING (
    metadata->>'user_id' = auth.uid()::text
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can manage their projects" ON public.projects
  FOR ALL
  USING (
    metadata->>'user_id' = auth.uid()::text
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can view their query history" ON public.query_history
  FOR SELECT
  USING (
    metadata->>'user_id' = auth.uid()::text
    OR auth.role() = 'anon'
  );

CREATE POLICY "Users can insert query history" ON public.query_history
  FOR INSERT
  WITH CHECK (
    metadata->>'user_id' = auth.uid()::text
    OR auth.role() = 'anon'
  );

-- ============================================================================
-- 7. GRANTS FOR SERVICE ROLE (IMPORTANT FOR BACKEND)
-- ============================================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT SELECT, INSERT ON public.query_history TO authenticated;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION public.match_code_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_file_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_project_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_project_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_similar_chunks TO authenticated;

-- For development/service role (comment out in production)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.code_chunks TO anon;
GRANT SELECT, INSERT, UPDATE ON public.projects TO anon;
GRANT SELECT, INSERT ON public.query_history TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- ============================================================================
-- 8. SAMPLE DATA (OPTIONAL - For Testing)
-- ============================================================================

-- Uncomment to add sample data for testing:
/*
INSERT INTO public.projects (project_id, project_name, metadata)
VALUES ('test-project', 'Test Project', jsonb_build_object('user_id', 'test-user'))
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO public.code_chunks (
  project_id, file_path, chunk_type, content, embedding, metadata
)
VALUES (
  'test-project',
  'auth/login.ts',
  'function',
  'async function login(email, password) { /* ... */ }',
  '[0.1, 0.2, ...]'::vector(384),
  jsonb_build_object('user_id', 'test-user', 'language', 'typescript')
)
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'code_chunks';

-- Verify functions
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname LIKE 'match_%' OR proname LIKE 'get_%' OR proname LIKE 'delete_%';

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================

/*
1. VECTOR DIMENSION:
   - all-MiniLM-L6-v2 produces 384-dimensional vectors
   - Update vector(384) if using a different embedding model
   - Common models:
     * text-embedding-3-small: 1536 dimensions
     * text-embedding-3-large: 3072 dimensions
     * all-MiniLM-L6-v2: 384 dimensions (lightweight, recommended)

2. PERFORMANCE OPTIMIZATION:
   - HNSW index (ef_construction=64, m=16) is good for most use cases
   - For larger datasets (>1M chunks), consider:
     * Partitioning by project_id
     * Increasing ef_construction to 128
     * Using pg_partman for time-based partitioning

3. RLS AND SECURITY:
   - RLS is enabled but permissive for development
   - For production, disable anon role permissions
   - Use metadata.user_id to enforce access control
   - Consider adding API key authentication in your backend

4. BACKUPS:
   - Enable automatic backups in Supabase settings
   - Set retention to 7+ days
   - Test restore procedures regularly

5. MONITORING:
   - Monitor index usage: SELECT * FROM pg_stat_user_indexes
   - Monitor table bloat: SELECT * FROM pg_stat_user_tables
   - Run VACUUM ANALYZE weekly: SELECT * FROM public.code_chunks

6. SCALING:
   - Connection pool size: Start with 10-20 connections
   - Max connections: Set to ~100 for production
   - Enable connection pooling in PgBouncer (Supabase does this)

7. COST OPTIMIZATION:
   - Vector operations use compute resources
   - HNSW indexes take ~10-15% extra storage
   - Query cost depends on similarity_threshold and match_count
   - For large projects, use batch operations

8. TESTING:
   - Test match_code_chunks with known embeddings
   - Verify index performance with EXPLAIN ANALYZE
   - Load test with concurrent queries
   - Test RLS policies with different users
*/
