# 🚀 PRODUCTION DEPLOYMENT GUIDE

## Critical Issues Fixed

### Backend
✅ Missing `/explain_dom` endpoint (Chrome extension broke)
✅ Request validation with Pydantic models
✅ Async/await properly implemented (no blocking calls)
✅ Error handling at all layers
✅ CORS configured for VS Code + Chrome extensions
✅ Health check endpoint
✅ Project management (delete, info, batch operations)
✅ Intelligent code chunking (not whole files)
✅ Deduplication to prevent re-indexing duplicates

### VS Code Extension
✅ Proper error handling and user feedback
✅ Status bar with project stats
✅ Webview panel for explanations (better UX)
✅ Current file context support
✅ Batch indexing for performance
✅ Workspace-relative paths
✅ Extended language support

### Chrome Extension
✅ Enhanced DOM extraction (CSS rules, computed styles, parent context)
✅ Framework detection (React, Vue, Angular, Svelte)
✅ Visual element highlighting
✅ Backend health check with status indicator
✅ Loading states and error feedback
✅ Modern UI with proper styling

---

## Installation Steps

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GROQ_API_KEY=your-groq-api-key
EOF

# Setup database (see DATABASE_SETUP.md)
# Run SQL commands in Supabase SQL Editor

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. VS Code Extension Setup

```bash
cd extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Test in Extension Development Host
# Press F5 in VS Code to launch
```

**Using the improved files:**
- Replace [extension.ts](extension/src/extension.ts) with `extension_improved.ts`
- Replace [api.ts](extension/src/api.ts) with `api_improved.ts`
- Replace [indexer.ts](extension/src/indexer.ts) with `indexer_improved.ts`

### 3. Chrome Extension Setup

```bash
cd chrome-extension

# Load unpacked extension
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select chrome-extension folder
```

**Using the improved files:**
- Replace [background.js](chrome-extension/background.js) with `background_improved.js`
- Replace [content.js](chrome-extension/content.js) with `content_improved.js`
- Replace [panel.js](chrome-extension/panel.js) with `panel_improved.js`
- Replace [panel.html](chrome-extension/panel.html) with `panel_improved.html`

Update [devtools.js](chrome-extension/devtools.js):
```javascript
chrome.devtools.panels.create(
  "AI Explain",
  "",
  "panel_improved.html",  // Use improved panel
  function () {}
);
```

---

## Usage Guide

### VS Code Extension

**Commands (Ctrl+Shift+P):**
- `RAG: Index Project` - Index entire workspace
- `RAG: Index Current File` - Index only current file
- `RAG: Explain Selected Code` - Explain with RAG context
- `RAG: Explain File` - Explain entire file
- `RAG: Ask Question` - Ask about codebase
- `RAG: Show Project Info` - View indexing stats

**Status Bar:**
- Shows indexed chunk count
- Click to view project info

### Chrome Extension

1. Open DevTools (F12)
2. Navigate to "AI Explain" panel
3. Hover over element in page
4. Click "Explain Element"
5. View structured explanation

---

## API Endpoints

### Ingestion
- `POST /api/ingest` - Ingest single file/chunk
- `POST /api/ingest_batch` - Batch ingest (up to 100)
- `GET /api/project/{project_id}/info` - Project stats
- `DELETE /api/project/{project_id}` - Delete project

### Explanation
- `POST /api/explain` - RAG-based code explanation
- `POST /api/explain_dom` - DOM/UI explanation
- `POST /api/explain_stream` - Streaming (TODO)

### Health
- `GET /` - Basic health check
- `GET /health` - Detailed health with dependency status

---

## Architecture Improvements

### 1. Intelligent Chunking
**Before:** Entire files indexed (bad for large files)
**After:** Smart chunking by functions/classes with line numbers

### 2. Async Throughout
**Before:** Blocking sync calls in async routes
**After:** Proper async/await, thread pool for CPU-intensive ops

### 3. Error Handling
**Before:** Bare exceptions crash the server
**After:** Try-catch at all layers, proper HTTP status codes, logging

### 4. Request Validation
**Before:** Plain query parameters, no validation
**After:** Pydantic models with validators, SQL injection prevention

### 5. User Experience
**Before:** Simple alerts/notifications
**After:** Webview panels, loading states, status indicators, visual feedback

---

## Security Checklist

⚠️ **Current State: Development**

For production, implement:

1. **Authentication**
   - Add API key middleware
   - Implement Supabase RLS policies
   - User-scoped projects

2. **Rate Limiting**
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   ```

3. **Input Sanitization**
   - Already implemented in Pydantic validators
   - Additional XSS protection for DOM content

4. **CORS Hardening**
   - Replace wildcards with specific origins
   - Add credentials validation

5. **HTTPS Only**
   - Configure TLS certificates
   - Redirect HTTP to HTTPS

---

## Performance Optimization

### Backend
- ✅ Batch operations for bulk ingestion
- ✅ Async database calls
- ✅ LRU cache for embeddings
- ✅ HNSW index for fast vector search
- 🔜 Redis cache for frequent queries
- 🔜 Streaming responses for long explanations

### VS Code Extension
- ✅ Batch file processing
- ✅ Workspace-relative paths (smaller payloads)
- 🔜 Incremental indexing (file watcher)
- 🔜 Background indexing (don't block UI)

### Chrome Extension
- ✅ Debounced hover events
- ✅ Limited CSS rule extraction
- 🔜 Cache explanations for repeated elements

---

## Monitoring & Logging

Add application monitoring:

```python
# backend/app/main.py
import logging
from prometheus_client import Counter, Histogram

# Metrics
requests_total = Counter('requests_total', 'Total requests')
request_duration = Histogram('request_duration_seconds', 'Request duration')

# Structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
```

---

## Troubleshooting

### Backend won't start
- Check `.env` file exists and has correct values
- Verify Supabase connection: `psql $SUPABASE_URL`
- Check port 8000 not in use: `lsof -i :8000`

### Indexing fails
- Check Supabase table and RPC function exist
- Verify embedding model downloaded: Check `~/.cache/torch/sentence_transformers/`
- Check file size limits (100KB max)

### Explanations empty
- Verify project indexed: `GET /api/project/{project_id}/info`
- Check similarity threshold (try lowering to 0.5)
- Ensure Groq API key valid

### Chrome extension not working
- Check backend health indicator
- Verify CORS configured in backend
- Check console for errors: DevTools → Console

---

## Next Steps

See [FEATURE_IDEAS.md](FEATURE_IDEAS.md) for high-impact feature suggestions.
