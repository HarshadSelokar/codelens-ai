"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexProject = indexProject;
const vscode = require("vscode");
const api_1 = require("./api");
const fs = require("fs");
async function indexProject() {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace)
        return;
    const projectId = workspace.name;
    const files = await vscode.workspace.findFiles("**/*.{js,ts,py}");
    for (const file of files) {
        const content = fs.readFileSync(file.fsPath, "utf-8");
        // Simple chunking (per file for MVP)
        await (0, api_1.ingestChunk)(projectId, file.fsPath, content);
    }
    vscode.window.showInformationMessage("Project indexed successfully 🚀");
}
