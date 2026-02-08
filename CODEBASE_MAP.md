# Codebase Map

## Overview
This repository contains three main components that share a FastAPI backend:

1) Backend API (FastAPI + Supabase + Groq LLM)
2) VS Code Extension (TypeScript)
3) Chrome DevTools Extension (JavaScript)

## Folder Map

- backend/
  - app/
    - main.py (original entrypoint)
    - main_improved.py (improved entrypoint)
    - config.py (Supabase client + dotenv)
    - models/
      - request.py (legacy models)
      - schemas.py (validated request/response models)
    - routes/
      - explain.py (original)
      - explain_improved.py (improved)
      - ingest.py (original)
      - ingest_improved.py (improved)
    - services/
      - embedder.py (original)
      - embedder_improved.py (improved)
      - retriever.py (original)
      - retriever_improved.py (improved)
      - llm.py (original)
      - llm_improved.py (improved)
      - ingestor.py (original)
      - ingestor_improved.py (improved)
  - requirements.txt
  - database.sql
  - .env.example
  - docs/*.md

- extension/
  - package.json (extension manifest)
  - tsconfig.json
  - src/
    - extension.ts (entrypoint -> re-exports improved)
    - extension_improved.ts
    - api.ts (original)
    - api_improved.ts
    - indexer.ts (original)
    - indexer_improved.ts

- chrome-extension/
  - manifest.json
  - background_improved.js
  - content_improved.js
  - panel_improved.html
  - panel_improved.js
  - background.js (original)
  - content.js (original)
  - panel.html (original)
  - panel.js (original)
  - devtools.html
  - devtools.js

## Backend Runtime Flow

1) Ingestion:
   - VS Code extension finds files -> /api/ingest_batch
   - Backend chunks content -> embeds -> inserts into Supabase

2) Explain:
   - VS Code extension sends query -> /api/explain
   - Backend retrieves similar chunks (RPC) -> prompts LLM -> returns explanation

3) DOM Explain:
   - Chrome DevTools extracts DOM -> /api/explain_dom
   - Backend uses UI prompt -> returns explanation (no RAG)

## Backend Entry Point

- app/main_improved.py
  - CORS middleware
  - Router mounts: /api/ingest and /api/explain
  - / and /health routes

## API Endpoints (Improved)

- POST /api/ingest
  - Request: IngestRequest
  - Inserts chunks with embeddings

- POST /api/ingest_batch
  - Request: list[IngestRequest]
  - Batch ingestion

- POST /api/explain
  - Request: ExplainRequest
  - Response: ExplainResponse

- POST /api/explain_dom
  - Request: ExplainDOMRequest
  - Response: ExplainResponse

- GET /api/project/{project_id}/info
  - Response: ProjectInfoResponse

- DELETE /api/project/{project_id}
  - Deletes all chunks for project

- GET /health
  - Dependency health check

## Key Backend Services (Improved)

- embedder_improved.py
  - SentenceTransformer model loading
  - async embedding
  - batch embedding

- retriever_improved.py
  - Supabase RPC call (match_code_chunks)
  - threshold + limit

- llm_improved.py
  - Groq Llama 3.1
  - prompt helpers for code and DOM

- ingestor_improved.py
  - Chunking by language
  - Deduplication check

## Data Models

- IngestRequest
- ExplainRequest
- ExplainDOMRequest
- ExplainResponse
- ProjectInfoResponse

Defined in backend/app/models/schemas.py

## Database Dependencies

- Supabase Postgres + pgvector
- RPC function: match_code_chunks
- Table: code_chunks

See backend/database.sql for full schema.

## VS Code Extension (Improved)

Commands:
- rag.indexProject
- rag.indexCurrentFile
- rag.explainCode
- rag.explainFile
- rag.askQuestion
- rag.showProjectInfo

Main flow:
- indexer_improved.ts finds files and calls ingest_batch
- api_improved.ts calls backend endpoints
- extension_improved.ts handles UI + webview output

## Chrome DevTools Extension (Improved)

Flow:
- content_improved.js tracks hovered element
- panel_improved.js triggers EXPLAIN_DOM
- background_improved.js sends to backend

Manifest entrypoints:
- background: background_improved.js
- content: content_improved.js
- devtools panel: panel_improved.html

## Environment and Config

- .env (root) is loaded by backend/app/config.py
- Required: SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY
- Optional: LLM model config and tuning variables

## Test and Utility Scripts

- test-api/*.py (manual scripts)
- use backend/QUICK_START.md for testing flow

## Known Gaps

- Streaming endpoint /api/explain_stream is not implemented
- Auth and rate limiting are not implemented
- Supabase RPC must exist before explain calls

## How To Run (High Level)

1) Configure .env with real Supabase + Groq keys
2) Run backend: uvicorn app.main_improved:app
3) Build VS Code extension: npm install, npm run compile
4) Load Chrome extension from chrome-extension/ in dev mode

