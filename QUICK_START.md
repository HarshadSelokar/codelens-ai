# ⚡ QUICK START GUIDE

## 🎯 Fastest Path to Working System

### Prerequisites
- Python 3.9+
- Node.js 16+
- VS Code
- Chrome Browser
- Supabase account (free tier)
- Groq API key (free tier)

---

## 📋 30-Minute Setup

### Step 1: Database Setup (5 min)

1. Go to [Supabase](https://supabase.com/) → Create new project
2. Open SQL Editor
3. Copy-paste ALL SQL from [DATABASE_SETUP.md](backend/DATABASE_SETUP.md)
4. Execute all scripts
5. Save your `SUPABASE_URL` and `SUPABASE_KEY` (Settings → API)

### Step 2: Get Groq API Key (2 min)

1. Go to [Groq Console](https://console.groq.com/)
2. Create account (free)
3. Generate API key
4. Save it

### Step 3: Backend Setup (10 min)

```bash
cd backend

# Create environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install
pip install -r requirements.txt

# Configure
echo SUPABASE_URL=your_url_here > .env
echo SUPABASE_KEY=your_key_here >> .env
echo GROQ_API_KEY=your_groq_key_here >> .env

# Use improved files (CRITICAL)
# Option 1: Replace existing files
copy app\main_improved.py app\main.py
copy app\routes\explain_improved.py app\routes\explain.py
copy app\routes\ingest_improved.py app\routes\ingest.py
copy app\services\embedder_improved.py app\services\embedder.py
copy app\services\retriever_improved.py app\services\retriever.py
copy app\services\llm_improved.py app\services\llm.py
copy app\services\ingestor_improved.py app\services\ingestor.py
copy app\models\schemas.py app\models\schemas.py

# Option 2: Update imports in main.py to use improved files
# (Keep both versions if you want to compare)

# Start server
uvicorn app.main:app --reload
```

**Verify:** Open http://localhost:8000/health → Should see status "running"

### Step 4: VS Code Extension Setup (8 min)

```bash
cd extension

# Install dependencies
npm install

# Use improved files
copy src\extension_improved.ts src\extension.ts
copy src\api_improved.ts src\api.ts
copy src\indexer_improved.ts src\indexer.ts

# Compile
npm run compile

# Debug extension
# Press F5 in VS Code → Opens Extension Development Host
```

**Test in Extension Host:**
1. Open a project
2. `Ctrl+Shift+P` → "RAG: Index Project"
3. Wait for completion
4. Select some code
5. `Ctrl+Shift+P` → "RAG: Explain Selected Code"

### Step 5: Chrome Extension Setup (5 min)

```bash
cd chrome-extension

# Use improved files
copy background_improved.js background.js
copy content_improved.js content.js
copy panel_improved.js panel.js
copy panel_improved.html panel.html

# Update devtools.js
# Change "panel.html" to "panel_improved.html"
```

**Load Extension:**
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome-extension` folder

**Test:**
1. Open any website
2. Open DevTools (F12)
3. Click "AI Explain" tab
4. Hover over element
5. Click "Explain Element"

---

## 🧪 Verify Everything Works

### Backend Health Check
```bash
curl http://localhost:8000/health
# Should return: {"status":"running","database":"healthy",...}
```

### Test Indexing
```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"project_id":"test","file_path":"test.py","content":"def hello(): pass","chunk_type":"file"}'
# Should return: {"status":"indexed","project_id":"test","chunks_indexed":1}
```

### Test Explanation
```bash
curl -X POST http://localhost:8000/api/explain \
  -H "Content-Type: application/json" \
  -d '{"project_id":"test","query":"explain hello function","max_chunks":5}'
# Should return: {"explanation":"...","sources":[...]}
```

### Test DOM Explanation
```bash
curl -X POST http://localhost:8000/api/explain_dom \
  -H "Content-Type: application/json" \
  -d '{"url":"test.com","html":"<button>Click</button>","classes":[],"tag":"button"}'
# Should return: {"explanation":"..."}
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: "No module named 'sentence_transformers'"**
```bash
pip install sentence-transformers
```

**Error: "Could not connect to Supabase"**
- Check `.env` file exists
- Verify `SUPABASE_URL` and `SUPABASE_KEY` correct
- Test connection: `curl $SUPABASE_URL/rest/v1/`

**Error: "Table 'code_chunks' does not exist"**
- Run SQL setup scripts from [DATABASE_SETUP.md](backend/DATABASE_SETUP.md)

### VS Code Extension Not Working

**Error: "Cannot find module 'vscode'"**
```bash
npm install
npm run compile
```

**Extension won't load in Development Host**
- Check `package.json` has correct `main` path
- Ensure TypeScript compiled: Check `out/` folder exists
- Restart VS Code

**"Backend unavailable" error**
- Ensure backend running on port 8000
- Check `BASE_URL` in [api.ts](extension/src/api.ts)

### Chrome Extension Issues

**Extension not loading**
- Check `manifest.json` is valid JSON
- Ensure all files referenced exist
- Check Chrome console for errors

**"Backend offline" in panel**
- Backend must be running on localhost:8000
- Check CORS configured properly
- Disable other extensions that might conflict

**"No element selected"**
- Hover over element in page BEFORE clicking "Explain"
- Content script must be injected (refresh page if needed)

---

## 📊 What You Should See

### After Indexing (VS Code)
```
✅ Indexed 47 files (283 chunks)
```
Status bar shows: `$(database) 283 chunks`

### After Explaining Code (VS Code)
Webview panel opens with:
```
Context:
<Selected code snippet>

Explanation:
This function handles user authentication by...
[Detailed explanation]

📁 Sources: auth/login.ts, middleware/auth.ts
```

### After Explaining DOM (Chrome)
DevTools panel shows:
```
Element: <button>
ID: submit-btn
Classes: btn, btn-primary

Explanation:
Purpose: This is a submit button for the login form...
Structure: Standard HTML button with Bootstrap classes...
Styling: Primary blue color from Bootstrap theme...
[More details]
```

---

## 🚀 Next Steps

### If Everything Works
1. Read [FEATURE_IDEAS.md](FEATURE_IDEAS.md) for enhancement ideas
2. Implement Tier 1 features (Visual Navigation, Error Explanation)
3. Add authentication and rate limiting
4. Deploy to production

### If Having Issues
1. Check [PRODUCTION_REVIEW.md](PRODUCTION_REVIEW.md) Section 11 (Troubleshooting)
2. Enable debug logging in backend
3. Check browser console for frontend errors
4. Review [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📚 Key Files Reference

### Read These First
1. [PRODUCTION_REVIEW.md](PRODUCTION_REVIEW.md) - Complete audit and recommendations
2. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Detailed setup instructions
3. [DATABASE_SETUP.md](backend/DATABASE_SETUP.md) - SQL setup scripts

### Features and Ideas
4. [FEATURE_IDEAS.md](FEATURE_IDEAS.md) - 20 high-impact features to implement

### Improved Code (Use These)
5. Backend: All files with `_improved.py` suffix
6. VS Code: All files with `_improved.ts` suffix
7. Chrome: All files with `_improved.js/html` suffix

---

## ⚡ Pro Tips

### Development Workflow
```bash
# Terminal 1: Backend with auto-reload
cd backend
uvicorn app.main:app --reload

# Terminal 2: VS Code extension compilation
cd extension
npm run compile -- --watch

# Terminal 3: Any additional tools
```

### Faster Iteration
- Use `RAG: Index Current File` instead of full project during development
- Cache embeddings for common queries (already implemented in improved files)
- Use smaller test projects first (< 50 files)

### Debugging
```python
# Backend: Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

```typescript
// VS Code: Use Debug Console
console.log("Debug info:", data);
```

```javascript
// Chrome: Use DevTools Console
console.log("Chrome extension debug:", data);
```

---

## 🎯 Success Checklist

- [ ] Backend starts without errors
- [ ] Health endpoint returns "running"
- [ ] Can ingest test file
- [ ] Can explain test query
- [ ] VS Code extension loads in Development Host
- [ ] Can index a small project (< 10 files)
- [ ] Can explain selected code
- [ ] Webview panel displays explanation
- [ ] Chrome extension loads in browser
- [ ] DevTools panel appears
- [ ] Can explain DOM element
- [ ] Backend status shows "connected"

**All checked?** 🎉 You're ready to use the system!

---

## 📞 Help

If stuck after following this guide:
1. Check error logs in backend terminal
2. Check browser console (F12 → Console)
3. Review [PRODUCTION_REVIEW.md](PRODUCTION_REVIEW.md) Section 2 (Integration Issues)
4. Verify all environment variables set correctly
5. Ensure using improved files (not original ones)

**Most common issue:** Using original files instead of improved ones. Make sure to copy/replace files as instructed in Step 3-5.
