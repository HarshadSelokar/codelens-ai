# 🗄️ DATABASE SETUP & ENVIRONMENT GUIDE

## Files Created

1. **[database.sql](database.sql)** - Complete Supabase SQL schema (production-ready)
2. **[.env.example](.env.example)** - Environment configuration template

---

## 🚀 Quick Start

### Step 1: Set Up Supabase Project

1. Go to [https://supabase.com/](https://supabase.com/)
2. Sign up (free account available)
3. Create new project
4. Wait for project to initialize (~2-3 minutes)
5. Go to **Project Settings → API** and copy:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (anon key)

### Step 2: Set Up Groq API

1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up (free tier available)
3. Create new API key
4. Copy the key

### Step 3: Create Environment File

```bash
cd backend

# Copy template to actual .env file
cp .env.example .env
```

### Step 4: Edit .env File

Open `backend/.env` and fill in:

```bash
# Required (copy from Supabase)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required (from Groq)
GROQ_API_KEY=gsk_your_api_key_here
```

### Step 5: Set Up Database

1. In Supabase, open **SQL Editor**
2. Create new query
3. Copy entire contents of [database.sql](database.sql)
4. Paste into SQL Editor
5. Click **Run**

**Wait for completion** (should see ✅ on all statements)

### Step 6: Verify Setup

Test in Python:
```python
from app.config import supabase

# Test connection
result = supabase.table("projects").select("*").limit(1).execute()
print("✅ Database connected!")
```

Or via curl:
```bash
curl http://localhost:8000/health
```

---

## 📋 Database Schema Explanation

### Tables

#### `code_chunks` (Main Table)
Stores code snippets with embeddings for RAG retrieval.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | BIGSERIAL | Unique identifier |
| `project_id` | TEXT | Which project this belongs to |
| `file_path` | TEXT | Path to source file |
| `chunk_type` | TEXT | Type: function, class, file, or dom |
| `content` | TEXT | Actual code/text content |
| `embedding` | vector(384) | 384-dim semantic vector |
| `metadata` | JSONB | Extra info (language, line numbers, etc.) |
| `indexed_at` | TIMESTAMP | When it was indexed |

#### `projects` (Metadata Table)
Tracks projects and statistics.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | BIGSERIAL | Unique identifier |
| `project_id` | TEXT | Project identifier |
| `project_name` | TEXT | Human-readable name |
| `total_chunks` | INTEGER | Total indexed chunks |
| `indexed_files` | INTEGER | Number of files indexed |
| `last_indexed` | TIMESTAMP | When last updated |

#### `query_history` (Analytics Table)
Tracks queries for analytics (optional).

| Column | Type | Purpose |
|--------|------|---------|
| `id` | BIGSERIAL | Unique identifier |
| `project_id` | TEXT | Which project was queried |
| `query` | TEXT | User's query |
| `chunks_retrieved` | INTEGER | How many chunks returned |
| `response_time_ms` | INTEGER | How long explanation took |
| `success` | BOOLEAN | Did query succeed? |

---

## 🔧 RPC Functions (Supabase Functions)

These are called from your backend code:

### `match_code_chunks()`
**Purpose:** Find similar code using vector search

**Usage:**
```python
results = supabase.rpc(
    "match_code_chunks",
    {
        "query_embedding": [0.1, 0.2, ...],  # 384-dim vector
        "match_threshold": 0.7,
        "match_count": 5,
        "filter_project_id": "my-project"
    }
).execute()
```

**Returns:** List of matching chunks with similarity scores

---

### `get_file_chunks()`
**Purpose:** Get all chunks from a specific file

**Usage:**
```python
chunks = supabase.rpc(
    "get_file_chunks",
    {
        "p_project_id": "my-project",
        "p_file_path": "src/auth.ts"
    }
).execute()
```

---

### `get_project_stats()`
**Purpose:** Get indexing statistics

**Usage:**
```python
stats = supabase.rpc(
    "get_project_stats",
    {"p_project_id": "my-project"}
).execute()

# Returns: {total_chunks: 1000, unique_files: 50, last_indexed: "2026-02-05..."}
```

---

### `delete_project_chunks()`
**Purpose:** Delete all chunks for a project (for re-indexing)

**Usage:**
```python
result = supabase.rpc(
    "delete_project_chunks",
    {"p_project_id": "my-project"}
).execute()
```

---

## 🔒 Environment Variables Explained

### Required (Must Fill In)

#### `SUPABASE_URL`
- **What:** Your Supabase project URL
- **Where:** Supabase Dashboard → Settings → API
- **Format:** `https://[project-id].supabase.co`
- **Example:** `https://lqxyz-abc.supabase.co`

#### `SUPABASE_KEY`
- **What:** Public API key (safe to expose)
- **Where:** Supabase Dashboard → Settings → API → anon key
- **Format:** JWT token starting with `eyJ...`
- **Used By:** Frontend (VS Code, Chrome extensions)

#### `GROQ_API_KEY`
- **What:** API key for LLM service
- **Where:** [https://console.groq.com/](https://console.groq.com/)
- **Format:** Starts with `gsk_`
- **Cost:** Free tier available (~10K requests/month)

### Optional (Good Defaults)

#### `GROQ_MODEL`
- **Default:** `llama-3.1-8b-instant`
- **Options:** 
  - `llama-3.1-8b-instant` ⭐ (recommended, fast & cheap)
  - `llama-3.1-70b-versatile` (slower, smarter)
  - `mixtral-8x7b-32768` (balanced)

#### `SIMILARITY_THRESHOLD`
- **Default:** `0.7`
- **Range:** 0.0 - 1.0
- **Lower** = more results, less precise
- **Higher** = fewer results, very precise
- **Recommendation:** 0.7 for most projects

#### `DEFAULT_MATCH_COUNT`
- **Default:** `5`
- **How many chunks to retrieve for context**
- **More** = better context, slower & more expensive
- **Less** = faster, less context

#### `EMBEDDING_BATCH_SIZE`
- **Default:** `10`
- **Batch size during indexing**
- **Increase** for faster indexing (if memory allows)
- **Decrease** for low-memory systems

---

## 📊 Understanding Vector Search

### Why Vectors?
Instead of exact text matching, we use vector embeddings to find **semantically similar** code.

```
Query: "How does login work?"
                        ↓
            Convert to vector [0.1, 0.2, ...]
                        ↓
            Find similar vectors in database
                        ↓
            Return code chunks about authentication
```

### Vector Dimension
- **384** for `all-MiniLM-L6-v2` (recommended)
- **768** for larger models (slower, more accurate)
- **1536** for OpenAI models (expensive)

### Similarity Score
- **0.0** = completely different
- **0.5** = somewhat related
- **0.8** = very similar
- **1.0** = identical

---

## 🚀 Production Deployment

### Before Going Live

1. **Change Environment**
   ```bash
   NODE_ENV=production
   ```

2. **Increase Security**
   ```bash
   ENABLE_RATE_LIMITING=true
   RATE_LIMIT_PER_MINUTE=10
   ```

3. **Set Strong Limits**
   ```bash
   MAX_FILE_SIZE=100000
   LLM_MAX_TOKENS=2000
   ```

4. **Enable Monitoring**
   ```bash
   SENTRY_DSN=https://your-sentry-key@sentry.io/...
   LOG_LEVEL=INFO
   ```

5. **Optimize Database**
   ```sql
   -- In Supabase SQL Editor
   VACUUM ANALYZE code_chunks;
   ```

### Cost Optimization

#### Reduce Groq API Costs
```bash
# Use cheaper model
GROQ_MODEL=llama-3.1-8b-instant

# Limit response length
LLM_MAX_TOKENS=1000

# Cache responses
ENABLE_CACHE=true
CACHE_TTL=3600
```

#### Reduce Database Costs
```bash
# Limit chunk retrieval
DEFAULT_MATCH_COUNT=3
MAX_MATCH_COUNT=10

# Cleanup old data
CLEANUP_HISTORY_DAYS=30
```

---

## 🔍 Debugging

### Database Connection Issues

```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/projects \
  -H "apikey: your_anon_key"

# Should return: {"status": "ok"} or 404 (if no data)
```

### Vector Search Not Working

```bash
# Check if embeddings exist
SELECT id, embedding FROM code_chunks 
WHERE embedding IS NOT NULL 
LIMIT 1;

# If empty, you need to index projects first
```

### LLM API Errors

```bash
# Test Groq API key
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer your_api_key"

# Should list available models
```

---

## 📚 Resources

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **pgvector Docs:** [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- **Groq API Docs:** [console.groq.com/docs](https://console.groq.com/docs)
- **Sentence Transformers:** [sbert.net](https://www.sbert.net/)

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] `.env` file created with all required values
- [ ] SQL from `database.sql` executed in Supabase
- [ ] `curl http://localhost:8000/health` returns running status
- [ ] Project can be created and indexed
- [ ] Queries return relevant results
- [ ] Explanations are generated
- [ ] No error logs in backend console

**All checked?** ✅ You're ready to use the system!

---

## 🆘 Need Help?

1. **Database issues?** Check [DATABASE_SETUP.md](DATABASE_SETUP.md)
2. **Deployment issues?** See [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
3. **Can't get credentials?** Review Getting Credentials section above
4. **Code errors?** Check backend logs: `tail -f uvicorn.log`

---

## 📝 Next Steps

1. Set up `.env` file
2. Run SQL in Supabase
3. Start backend: `uvicorn app.main:app --reload`
4. Test with: `curl http://localhost:8000/health`
5. Follow [QUICK_START.md](../QUICK_START.md) for extension setup
