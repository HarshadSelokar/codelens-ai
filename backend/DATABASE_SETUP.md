# Supabase Database Setup

## Required SQL Setup

Run these SQL commands in your Supabase SQL Editor:

### 1. Create Table with Vector Extension

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create code_chunks table
CREATE TABLE IF NOT EXISTS code_chunks (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  chunk_type TEXT NOT NULL DEFAULT 'file',
  content TEXT NOT NULL,
  embedding vector(384), -- all-MiniLM-L6-v2 produces 384-dim vectors
  metadata JSONB,
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT unique_chunk UNIQUE (project_id, file_path, content)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_id ON code_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_file_path ON code_chunks(file_path);
CREATE INDEX IF NOT EXISTS idx_indexed_at ON code_chunks(indexed_at);

-- Vector similarity index (HNSW for faster similarity search)
CREATE INDEX IF NOT EXISTS idx_embedding ON code_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2. Create RPC Function for Vector Search

```sql
-- Function to match code chunks by similarity
CREATE OR REPLACE FUNCTION match_code_chunks(
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
    1 - (code_chunks.embedding <=> query_embedding) as similarity
  FROM code_chunks
  WHERE 
    (filter_project_id IS NULL OR code_chunks.project_id = filter_project_id)
    AND 1 - (code_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY code_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Create Helper Functions

```sql
-- Function to get project stats
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id text)
RETURNS TABLE (
  total_chunks bigint,
  unique_files bigint,
  last_indexed timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_chunks,
    COUNT(DISTINCT file_path)::bigint as unique_files,
    MAX(indexed_at) as last_indexed
  FROM code_chunks
  WHERE project_id = p_project_id;
END;
$$;

-- Function to delete project (for re-indexing)
CREATE OR REPLACE FUNCTION delete_project(p_project_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM code_chunks WHERE project_id = p_project_id;
END;
$$;
```

### 4. Row Level Security (RLS) - Production Setup

```sql
-- Enable RLS
ALTER TABLE code_chunks ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (customize based on your auth)
CREATE POLICY "Users can view their own projects" ON code_chunks
  FOR SELECT
  USING (auth.uid()::text = (metadata->>'user_id'));

CREATE POLICY "Users can insert into their own projects" ON code_chunks
  FOR INSERT
  WITH CHECK (auth.uid()::text = (metadata->>'user_id'));

CREATE POLICY "Users can delete their own projects" ON code_chunks
  FOR DELETE
  USING (auth.uid()::text = (metadata->>'user_id'));

-- For development, you can disable RLS temporarily:
-- ALTER TABLE code_chunks DISABLE ROW LEVEL SECURITY;
```

## Environment Variables

Add to your `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
GROQ_API_KEY=your-groq-api-key-here
```

## Testing the Setup

```sql
-- Test vector search function
SELECT * FROM match_code_chunks(
  ARRAY[0.1, 0.2, ...]::vector(384), -- Test embedding
  0.7,
  5,
  'test-project'
);

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'code_chunks';

-- View table stats
SELECT 
  project_id,
  COUNT(*) as chunks,
  COUNT(DISTINCT file_path) as files,
  MAX(indexed_at) as last_indexed
FROM code_chunks
GROUP BY project_id;
```

## Migration from Existing Setup

If you have existing data with a different schema:

```sql
-- Backup existing data
CREATE TABLE code_chunks_backup AS SELECT * FROM code_chunks;

-- Drop and recreate with new schema
DROP TABLE code_chunks;
-- Then run CREATE TABLE from step 1
```

## Performance Optimization

For large projects (>10,000 chunks), consider:

1. **Partitioning by project_id**:
```sql
-- Future optimization for multi-tenant at scale
CREATE TABLE code_chunks_partitioned (
  LIKE code_chunks INCLUDING ALL
) PARTITION BY HASH (project_id);
```

2. **Vacuum and analyze regularly**:
```sql
VACUUM ANALYZE code_chunks;
```

3. **Monitor index usage**:
```sql
SELECT * FROM pg_stat_user_indexes WHERE relname = 'code_chunks';
```
