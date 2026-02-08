"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestChunk = ingestChunk;
exports.ingestBatch = ingestBatch;
exports.explainCode = explainCode;
exports.explainCurrentFile = explainCurrentFile;
exports.getProjectInfo = getProjectInfo;
exports.deleteProject = deleteProject;
exports.checkBackendHealth = checkBackendHealth;
const BASE_URL = process.env.RAG_BACKEND_URL || "http://localhost:8000/api";
async function ingestChunk(projectId, filePath, content) {
    const response = await fetch(`${BASE_URL}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            project_id: projectId,
            file_path: filePath,
            content: content,
            chunk_type: "file" // Will be intelligently chunked by backend
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ingestion failed: ${error}`);
    }
    return await response.json();
}
async function ingestBatch(chunks) {
    const payload = chunks.map(c => ({
        project_id: c.projectId,
        file_path: c.filePath,
        content: c.content,
        chunk_type: "file"
    }));
    const response = await fetch(`${BASE_URL}/ingest_batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Batch ingestion failed: ${error}`);
    }
    return await response.json();
}
async function explainCode(projectId, query, currentFile) {
    const response = await fetch(`${BASE_URL}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            project_id: projectId,
            query: query,
            max_chunks: 5,
            temperature: 0.2
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Explanation failed: ${error}`);
    }
    const data = await response.json();
    // Format response with sources
    let result = data.explanation;
    if (data.sources && data.sources.length > 0) {
        result += "\n\n---\n📁 Sources: " + data.sources.join(", ");
    }
    return result;
}
async function explainCurrentFile(projectId, filePath) {
    // Special query to explain entire file
    const query = `Explain the purpose and structure of the file: ${filePath}`;
    return explainCode(projectId, query, filePath);
}
async function getProjectInfo(projectId) {
    const response = await fetch(`${BASE_URL}/project/${projectId}/info`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Project not indexed");
        }
        const error = await response.text();
        throw new Error(`Failed to get project info: ${error}`);
    }
    return await response.json();
}
async function deleteProject(projectId) {
    const response = await fetch(`${BASE_URL}/project/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete project: ${error}`);
    }
}
async function checkBackendHealth() {
    try {
        const response = await fetch(`${BASE_URL.replace('/api', '')}/health`, {
            method: "GET",
            timeout: 5000
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
