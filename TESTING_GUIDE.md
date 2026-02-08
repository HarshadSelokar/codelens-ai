# 🚀 System Running - Ready to Test

## ✅ Current Status

**Backend API**: Running on http://localhost:8000
- Status: ✅ Healthy
- Embedding Model: all-MiniLM-L6-v2
- LLM Provider: Groq (Llama 3.1)
- Database: ⚠️ Needs Supabase configuration

**VS Code Extension**: Compiled and ready
**Chrome Extension**: Ready to load

---

## 🧪 How to Test Each Feature

### 1️⃣ Backend API Endpoints

#### Test Health Check
```powershell
# Using Python
python test_backend.py

# Or visit in browser
http://localhost:8000/health
http://localhost:8000/
```

#### Test API Documentation
Visit: http://localhost:8000/docs
- Interactive Swagger UI
- Test all endpoints directly
- See request/response schemas

#### Test Endpoints Manually

**A) Ingest Code**
```python
import requests

response = requests.post("http://localhost:8000/api/ingest", json={
    "project_id": "test_project",
    "file_path": "example.py",
    "content": "def hello():\n    print('Hello World')",
    "chunk_type": "file"
})
print(response.json())
```

**B) Explain Code**
```python
import requests

response = requests.post("http://localhost:8000/api/explain", json={
    "project_id": "test_project",
    "query": "What does this code do?",
    "max_chunks": 5,
    "temperature": 0.2
})
print(response.json())
```

**C) Explain DOM**
```python
import requests

response = requests.post("http://localhost:8000/api/explain_dom", json={
    "url": "https://example.com",
    "html": "<button class='btn-primary'>Click Me</button>",
    "classes": ["btn-primary"],
    "tag": "button"
})
print(response.json())
```

---

### 2️⃣ VS Code Extension

#### Setup
1. Open VS Code
2. Open the `extension/` folder as workspace
3. Press **F5** to start Extension Development Host
4. A new VS Code window will open with the extension loaded

#### Test Commands

Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P) and test:

**A) Index Project**
```
Command: RAG: Index Project
```
- Indexes all code files in the current workspace
- Shows progress notification
- Displays total files and chunks indexed

**B) Index Current File**
```
Command: RAG: Index Current File
```
- Indexes only the currently open file
- Quick for testing

**C) Explain Selected Code**
```
1. Select some code in the editor
2. Command: RAG: Explain Selected Code
```
- Opens explanation in webview panel
- Shows relevant context from codebase

**D) Explain Current File**
```
Command: RAG: Explain Current File
```
- Explains the entire file's purpose

**E) Ask Question**
```
Command: RAG: Ask Question
```
- Type: "How does authentication work?"
- Searches entire indexed codebase

**F) Show Project Info**
```
Command: RAG: Show Project Info
```
- Shows indexing statistics
- Files indexed, total chunks, last update time

#### Check Status Bar
- Bottom right: Shows chunk count
- Click for project info

---

### 3️⃣ Chrome DevTools Extension

#### Setup
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `chrome-extension/` folder

#### Test Extension

1. Navigate to any website (e.g., https://example.com)
2. Open DevTools (F12 or Right-click → Inspect)
3. Look for "AI Explain" tab in DevTools
4. Hover over elements on the page
5. Click "Explain Element" button

**Expected Behavior:**
- Backend status shows "✅ Backend Connected"
- Hovering highlights element with red border
- Explanation appears in panel with:
  - Element info (tag, classes, id)
  - Purpose analysis
  - Structure breakdown
  - Styling details
  - Accessibility notes

**Features to Test:**
- Copy button: Copies explanation to clipboard
- Clear button: Clears the output
- Different element types: buttons, divs, forms, etc.
- Nested elements
- Framework components (React, Vue, Angular)

---

## 🔍 Feature Testing Checklist

### Backend Features
- [x] Server starts without errors
- [x] Health endpoint responds
- [ ] Ingest endpoint accepts code chunks
- [ ] Explain endpoint retrieves and generates explanation
- [ ] Explain DOM endpoint works for UI elements
- [ ] Project info endpoint returns stats
- [ ] Delete project endpoint works
- [ ] Batch ingestion handles multiple files
- [ ] Error handling returns proper HTTP codes
- [ ] CORS allows requests from extensions

### VS Code Extension Features
- [ ] Extension activates
- [ ] Index Project discovers all files
- [ ] Index Current File works
- [ ] Explain Selected Code opens webview
- [ ] Explain Current File provides summary
- [ ] Ask Question searches codebase
- [ ] Show Project Info displays stats
- [ ] Status bar updates after indexing
- [ ] Progress notifications show properly
- [ ] Error messages display correctly

### Chrome Extension Features
- [ ] Extension loads in Chrome
- [ ] DevTools panel appears
- [ ] Backend health check shows status
- [ ] Element hovering tracked correctly
- [ ] Explain Element button works
- [ ] Explanation displays formatted output
- [ ] Copy button copies to clipboard
- [ ] Clear button resets output
- [ ] Element highlighting works
- [ ] Framework detection works (React/Vue/Angular)

---

## 🐛 Testing Scenarios

### Happy Path
1. **Ingest → Explain Flow**
   - Index a project with VS Code extension
   - Select code snippet
   - Request explanation
   - Verify context from indexed files appears

2. **DOM Inspection Flow**
   - Load website in Chrome
   - Open DevTools AI Explain panel
   - Hover over button
   - Click Explain Element
   - Verify styling and purpose analysis

### Edge Cases
1. **Empty Selection** (VS Code)
   - Try to explain without selecting code
   - Should show "Select some code first"

2. **Not Indexed** (VS Code)
   - Try to explain before indexing
   - Should show "Project not indexed"

3. **No Element Selected** (Chrome)
   - Click Explain without hovering
   - Should show "No element selected"

4. **Backend Offline**
   - Stop backend server
   - Try to use extensions
   - Should show connection error

5. **Large Files**
   - Index file with 10,000+ lines
   - Should chunk intelligently

6. **Special Characters**
   - Index code with unicode, emojis
   - Should handle properly

---

## 📊 Expected Results

### Successful Ingest
```json
{
  "status": "indexed",
  "project_id": "test_project",
  "chunks_indexed": 5
}
```

### Successful Explain
```json
{
  "explanation": "This code defines a function that...",
  "sources": ["file1.py", "file2.py"]
}
```

### Project Info
```json
{
  "project_id": "test_project",
  "total_chunks": 150,
  "indexed_files": 42,
  "last_indexed": "2026-02-08T..."
}
```

---

## 🛠️ Troubleshooting

### Backend Issues

**"Database unhealthy"**
- Expected! Supabase not configured yet
- For full RAG: Set SUPABASE_URL and SUPABASE_KEY in `.env`
- DOM explanations work without database

**"GROQ_API_KEY not set"**
- LLM won't work without this
- Get key from https://console.groq.com/
- Add to `.env`: `GROQ_API_KEY=your_key_here`

**Port 8000 in use**
- Change port: `--port 8001`
- Update extensions to use new port

### VS Code Extension Issues

**Commands not appearing**
- Reload window: Cmd/Ctrl+Shift+P → "Reload Window"
- Check extension host console for errors

**"No workspace folder"**
- Open a folder/project, not just files

**Request timeout**
- Backend might be slow on first request (model loading)
- Wait 30 seconds and retry

### Chrome Extension Issues

**"Backend Offline"**
- Verify backend running: http://localhost:8000/health
- Check CORS settings in backend

**Element not highlighting**
- Try hovering slowly
- Check browser console for errors

**No explanation returned**
- Check Network tab in DevTools
- Verify request reached backend

---

## 🎯 Testing Priority

**High Priority (Test First):**
1. Backend health endpoint
2. VS Code: Index Project
3. VS Code: Explain Selected Code
4. Chrome: Explain Element

**Medium Priority:**
5. VS Code: Index Current File
6. VS Code: Ask Question
7. Backend: Batch ingestion
8. Chrome: Copy/Clear buttons

**Low Priority:**
9. Edge cases and error handling
10. Framework detection
11. Large file handling

---

## 📝 Test Report Template

Use this to track your testing:

```
Feature: ___________________________
Status: [ ] Pass  [ ] Fail  [ ] Partial
Notes: _____________________________
_____________________________________

Issue: ______________________________
Expected: ___________________________
Actual: _____________________________
```

---

## 🚀 Quick Start Testing Commands

```powershell
# Terminal 1: Backend (already running)
# http://localhost:8000

# Terminal 2: Test backend
python test_backend.py

# Terminal 3: Open API docs in browser
start http://localhost:8000/docs

# VS Code: Press F5 in extension/ folder

# Chrome: Load unpacked from chrome-extension/
```

---

## ✅ System is Ready!

Everything is wired up and running. Start testing features one by one and report any issues you find.

**Current Terminal ID:** f1fced7d-f0b1-4ed9-b903-e6183a863330 (backend running)

To stop backend: Ctrl+C in the terminal or use VS Code terminal controls.
