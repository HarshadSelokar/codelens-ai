const BASE_URL = "http://localhost:8000/api";

export async function ingestChunk(
  projectId: string,
  filePath: string,
  content: string
) {
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

export async function explainCode(
  projectId: string,
  query: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, query })
  });

  const data = await res.json();
  return data.explanation;
}
