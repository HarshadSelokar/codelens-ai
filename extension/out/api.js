"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestChunk = ingestChunk;
exports.explainCode = explainCode;
const BASE_URL = "http://localhost:8000/api";
async function ingestChunk(projectId, filePath, content) {
    await fetch(`${BASE_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            project_id: projectId,
            file_path: filePath,
            content
        })
    });
}
async function explainCode(projectId, query) {
    const res = await fetch(`${BASE_URL}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, query })
    });
    const data = await res.json();
    return data.explanation;
}
