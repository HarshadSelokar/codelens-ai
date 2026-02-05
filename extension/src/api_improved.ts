const BASE_URL = process.env.RAG_BACKEND_URL || "http://localhost:8000/api";

interface IngestResponse {
  status: string;
  project_id: string;
  chunks_indexed: number;
}

interface ExplainResponse {
  explanation: string;
  sources?: string[];
}

interface ProjectInfo {
  project_id: string;
  total_chunks: number;
  indexed_files: number;
  last_indexed: string | null;
}

export async function ingestChunk(
  projectId: string,
  filePath: string,
  content: string
): Promise<IngestResponse> {
  const response = await fetch(`${BASE_URL}/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      file_path: filePath,
      content: content,
      chunk_type: "file"  // Will be intelligently chunked by backend
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ingestion failed: ${error}`);
  }

  return await response.json();
}

export async function ingestBatch(
  chunks: Array<{ projectId: string; filePath: string; content: string }>
): Promise<any> {
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

export async function explainCode(
  projectId: string,
  query: string,
  currentFile?: string
): Promise<string> {
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

  const data: ExplainResponse = await response.json();
  
  // Format response with sources
  let result = data.explanation;
  if (data.sources && data.sources.length > 0) {
    result += "\n\n---\n📁 Sources: " + data.sources.join(", ");
  }
  
  return result;
}

export async function explainCurrentFile(
  projectId: string,
  filePath: string
): Promise<string> {
  // Special query to explain entire file
  const query = `Explain the purpose and structure of the file: ${filePath}`;
  return explainCode(projectId, query, filePath);
}

export async function getProjectInfo(projectId: string): Promise<ProjectInfo> {
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

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/project/${projectId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete project: ${error}`);
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL.replace('/api', '')}/health`, {
      method: "GET",
      timeout: 5000
    } as any);
    
    return response.ok;
  } catch {
    return false;
  }
}
