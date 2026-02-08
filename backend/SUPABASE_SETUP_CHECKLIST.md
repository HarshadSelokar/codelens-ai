# 📋 SUPABASE SETUP CHECKLIST

## Quick Setup (5 Minutes)

Follow these steps in order:

### ✅ Step 1: Create Supabase Project
- [ ] Go to [supabase.com](https://supabase.com/)
- [ ] Click "Start your project"
- [ ] Sign up with GitHub or email
- [ ] Create new organization
- [ ] Create new project
  - Name: `codelens-ai` (or your project name)
  - Password: Store securely
  - Region: Choose closest to you
- [ ] Wait for project to initialize (~3 min)

### ✅ Step 2: Get Credentials
- [ ] Open project dashboard
- [ ] Go to **Project Settings → API**
- [ ] Copy **Project URL** → Add to `.env` as `SUPABASE_URL`
- [ ] Copy **anon key** → Add to `.env` as `SUPABASE_KEY`
- [ ] Copy **service_role key** (optional, for backend only)

### ✅ Step 3: Import Database Schema
- [ ] In Supabase, go to **SQL Editor**
- [ ] Click **New Query**
- [ ] Open [database.sql](database.sql)
- [ ] Copy ALL content
- [ ] Paste into SQL Editor
- [ ] Click **Run**
- [ ] Wait for completion (✅ all statements)

### ✅ Step 4: Verify Setup
```bash
# In your project directory
python -c "from app.config import supabase; print(supabase.table('projects').select('*').limit(1).execute())"
```
Should output something like: `{'data': [], 'count': 0}`

✅ **Done!** Your database is ready.

---

## Detailed Setup Guide

### Prerequisites
- Supabase account (free)
- Basic SQL knowledge (helpful but not required)

### 1. Supabase Project Creation

**Steps:**
1. Visit [https://supabase.com/](https://supabase.com/)
2. Click "Start your project"
3. Choose sign-up method:
   - **Recommended:** GitHub (faster)
   - **Alternative:** Email + password

4. Create organization (if new user)
5. Click "New project"
6. Fill in project details:
   ```
   Project name: codelens-ai
   Database password: [Strong password - save it!]
   Region: [Choose closest to you]
   ```
7. Click "Create new project"
8. **Wait 3-5 minutes** for initialization

### 2. Get API Credentials

**In Supabase Dashboard:**
1. Click your project
2. Go to **Settings** (bottom left gear icon)
3. Click **API** (left sidebar)
4. You should see:
   ```
   Project URL:  https://[project-id].supabase.co
   Anon key:     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service key:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**Copy to `.env`:**
```bash
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Set Up Database Schema

**Two Options:**

#### Option A: Using SQL Editor (Easiest)
1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `backend/database.sql` in text editor
4. Copy entire contents
5. Paste into Supabase SQL Editor
6. Click blue **Run** button
7. Wait for all statements to complete (green checkmarks)

#### Option B: Using psql (Command line)
```bash
# Get connection string from Supabase
# Settings → Database → Connection string → PSQL

psql "postgresql://postgres:[password]@[host]:[port]/postgres" < backend/database.sql
```

### 4. Verify Everything Works

**Method 1: Python Test**
```bash
cd backend

# Create .env with credentials
echo "SUPABASE_URL=https://your-project.supabase.co" > .env
echo "SUPABASE_KEY=your_key_here" >> .env
echo "GROQ_API_KEY=gsk_your_key_here" >> .env

# Test connection
python -c "
from app.config import supabase
result = supabase.table('projects').select('*').limit(1).execute()
print('✅ Database connected!')
print(f'Tables ready: {result}')
"
```

**Method 2: Check in Supabase UI**
1. Go to **Database** (left sidebar)
2. Expand **public** schema
3. Should see tables:
   - ✅ `code_chunks`
   - ✅ `projects`
   - ✅ `query_history`

**Method 3: Test API**
```bash
curl https://[your-project].supabase.co/rest/v1/projects \
  -H "apikey: your_anon_key"
```

---

## What Was Created

### Tables (3)
- **code_chunks** - Stores code with embeddings
- **projects** - Tracks indexed projects
- **query_history** - Analytics tracking

### Indexes (7)
- Vector similarity index (HNSW)
- Project lookup indexes
- Performance optimization indexes

### Functions (7)
- **match_code_chunks** - Vector similarity search
- **get_file_chunks** - Retrieve code from file
- **get_project_stats** - Project statistics
- **delete_project_chunks** - Clear project data
- **search_code** - Advanced search
- **update_project_stats** - Refresh stats
- **get_similar_chunks** - Find related code

### Triggers (2)
- Auto-update timestamps on changes

### RLS Policies (7)
- Secure data access (can be disabled for development)

---

## Troubleshooting

### ❌ "Connection refused"
**Solution:**
- Check `SUPABASE_URL` is correct (should have `supabase.co`)
- Check `SUPABASE_KEY` is valid
- Verify project exists in Supabase dashboard

### ❌ "Extension vector does not exist"
**Solution:**
- Make sure SQL executed completely
- Re-run the SQL, check for errors
- The first statement `CREATE EXTENSION vector` must run successfully

### ❌ "Table does not exist"
**Solution:**
- Check all SQL was pasted (should be ~600 lines)
- Look for error messages in SQL Editor
- Try running tables creation again

### ❌ "Invalid API key"
**Solution:**
- Go to Supabase Settings → API
- Copy the **anon key** (not the service key)
- Paste the ENTIRE key (should be long)

### ❌ "Permission denied"
**Solution:**
- Check RLS policies are disabled (for development)
- Or: Add user_id to metadata
- See [database.sql](database.sql) line ~350 for RLS setup

---

## Advanced Setup

### Enable Row Level Security (RLS)

For production with user authentication:

```sql
-- In Supabase SQL Editor

-- Disable for development:
ALTER TABLE public.code_chunks DISABLE ROW LEVEL SECURITY;

-- Enable for production:
ALTER TABLE public.code_chunks ENABLE ROW LEVEL SECURITY;
```

### Custom Backup

```sql
-- Backup all data
CREATE TABLE code_chunks_backup AS TABLE code_chunks;

-- Restore from backup
DELETE FROM code_chunks;
INSERT INTO code_chunks SELECT * FROM code_chunks_backup;
```

### Performance Tuning

```sql
-- Analyze table for query optimization
ANALYZE code_chunks;

-- Check index usage
SELECT * FROM pg_stat_user_indexes 
WHERE tablename = 'code_chunks';

-- Monitor table size
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public';
```

---

## SQL Editor Tips

### Running Queries
- Click the blue **Run** button (or Ctrl+Enter)
- Watch for green checkmarks ✅ (success) or red X (error)

### Multiple Statements
- Separate with semicolons `;`
- Each statement runs independently
- Errors don't stop execution of later statements

### Viewing Results
- Results shown at bottom
- Can export as CSV
- Can view row count

### Debugging SQL Errors
- Read error message carefully
- Check line number mentioned
- Common issues:
  - Typos in table names
  - Missing semicolon
  - Wrong data types
  - Syntax errors

---

## Testing Queries

Once setup is complete, test with these queries:

### Check Tables Exist
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Check Indexes
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'code_chunks';
```

### Check Functions
```sql
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND proname LIKE '%match%' OR proname LIKE '%get%';
```

### Test Vector Search Function
```sql
-- Create a test embedding vector (all zeros for testing)
SELECT * FROM match_code_chunks(
  '[0.1,0.2,0.3,...]'::vector(384),
  0.7,
  5,
  'test-project'
);
-- Should return: 0 rows (no data yet, but function works)
```

---

## Next Steps

✅ **After setup is complete:**

1. Create `.env` file (see [.env.example](.env.example))
2. Start backend: `uvicorn app.main:app --reload`
3. Verify health: `curl http://localhost:8000/health`
4. Index a project: Use VS Code extension or test API
5. Try explanation: Query the backend with code

See [QUICK_START.md](../QUICK_START.md) for full workflow.

---

## Quick Reference

| Task | Steps |
|------|-------|
| **Get URL** | Supabase Settings → API → Copy Project URL |
| **Get Key** | Supabase Settings → API → Copy anon key |
| **Run SQL** | SQL Editor → New Query → Paste SQL → Run |
| **Check Tables** | Database → Expand public → View tables |
| **Test API** | `curl https://[url]/rest/v1/projects -H "apikey: [key]"` |

---

## Estimated Time

| Step | Time |
|------|------|
| Create project | 3-5 min |
| Get credentials | 1 min |
| Run SQL | 2-3 min |
| Verify setup | 1 min |
| **Total** | **7-10 min** |

---

## Support

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **pgvector Docs:** [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- **SQL Help:** [postgresql.org/docs](https://www.postgresql.org/docs/)

---

**Status:** Ready to set up? Follow the checklist above! ✅
