import * as vscode from "vscode";
import { ingestChunk, ingestBatch, deleteProject } from "./api";
import * as path from "path";

export async function indexProject(): Promise<{ filesProcessed: number; chunksCreated: number }> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    throw new Error("No workspace folder open");
  }

  const projectId = workspace.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Delete existing index
  try {
    await deleteProject(projectId);
  } catch {
    // Ignore if project doesn't exist yet
  }

  // Find all code files
  const files = await vscode.workspace.findFiles(
    "**/*.{js,ts,jsx,tsx,py,java,cpp,c,go,rb,php,rs,swift,kt}", // Extended language support
    "**/node_modules/**"  // Exclude common large directories
  );

  vscode.window.showInformationMessage(`Found ${files.length} files to index...`);

  let filesProcessed = 0;
  let chunksCreated = 0;
  const batchSize = 10;
  
  // Process in batches for better performance
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchData = [];

    for (const file of batch) {
      try {
        const document = await vscode.workspace.openTextDocument(file);
        const content = document.getText();
        
        // Skip empty or very large files
        if (!content || content.length > 100000) {
          continue;
        }

        // Normalize file path to be workspace-relative
        const relativePath = path.relative(workspace.uri.fsPath, file.fsPath);

        batchData.push({
          projectId,
          filePath: relativePath,
          content
        });
        
        filesProcessed++;
      } catch (error) {
        console.error(`Failed to read file ${file.fsPath}:`, error);
      }
    }

    if (batchData.length > 0) {
      try {
        const result = await ingestBatch(batchData);
        // Count successful chunks
        chunksCreated += result.results.filter((r: any) => r.status === "indexed")
          .reduce((sum: number, r: any) => sum + (r.chunks_indexed || 0), 0);
      } catch (error: any) {
        console.error("Batch ingestion failed:", error);
      }
    }

    // Show progress
    vscode.window.setStatusBarMessage(
      `Indexing: ${filesProcessed}/${files.length} files...`,
      2000
    );
  }

  return { filesProcessed, chunksCreated };
}

export async function indexCurrentFile(document: vscode.TextDocument): Promise<void> {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) {
    throw new Error("No workspace folder open");
  }

  const projectId = workspace.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const content = document.getText();
  
  if (!content) {
    throw new Error("File is empty");
  }

  // Normalize to workspace-relative path
  const relativePath = path.relative(workspace.uri.fsPath, document.fileName);

  await ingestChunk(projectId, relativePath, content);
}

export async function watchFileChanges(context: vscode.ExtensionContext): Promise<void> {
  // Watch for file changes and incrementally update index
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{js,ts,jsx,tsx,py,java,cpp,c,go,rb,php,rs,swift,kt}"
  );

  watcher.onDidChange(async (uri) => {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      await indexCurrentFile(document);
      console.log(`Auto-indexed changed file: ${uri.fsPath}`);
    } catch (error) {
      console.error("Auto-indexing failed:", error);
    }
  });

  watcher.onDidCreate(async (uri) => {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      await indexCurrentFile(document);
      console.log(`Auto-indexed new file: ${uri.fsPath}`);
    } catch (error) {
      console.error("Auto-indexing failed:", error);
    }
  });

  context.subscriptions.push(watcher);
}
