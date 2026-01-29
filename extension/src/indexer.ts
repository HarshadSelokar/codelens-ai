import * as vscode from "vscode";
import { ingestChunk } from "./api";
import * as fs from "fs";

export async function indexProject() {
  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (!workspace) return;

  const projectId = workspace.name;
  const files = await vscode.workspace.findFiles("**/*.{js,ts,py}");

  for (const file of files) {
    const content = fs.readFileSync(file.fsPath, "utf-8");

    // Simple chunking (per file for MVP)
    await ingestChunk(projectId, file.fsPath, content);
  }

  vscode.window.showInformationMessage("Project indexed successfully 🚀");
}
