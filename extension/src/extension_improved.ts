import * as vscode from "vscode";
import { indexProject, indexCurrentFile } from "./indexer";
import { explainCode, explainCurrentFile, getProjectInfo } from "./api";

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("RAG Code Explainer");
  
  // Status bar for indexing status
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "rag.showProjectInfo";
  context.subscriptions.push(statusBarItem);
  
  updateStatusBar();

  // Command: Index entire project
  context.subscriptions.push(
    vscode.commands.registerCommand("rag.indexProject", async () => {
      const choice = await vscode.window.showWarningMessage(
        "This will index the entire project. Existing index will be replaced. Continue?",
        "Yes", "No"
      );
      
      if (choice !== "Yes") return;
      
      try {
        statusBarItem.text = "$(sync~spin) Indexing...";
        statusBarItem.show();
        
        const result = await indexProject();
        
        vscode.window.showInformationMessage(
          `✅ Indexed ${result.filesProcessed} files (${result.chunksCreated} chunks)`
        );
        
        updateStatusBar();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Indexing failed: ${error.message}`);
        statusBarItem.text = "$(alert) Index Failed";
      }
    })
  );

  // Command: Index current file only
  context.subscriptions.push(
    vscode.commands.registerCommand("rag.indexCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active file");
        return;
      }
      
      try {
        await indexCurrentFile(editor.document);
        vscode.window.showInformationMessage("✅ File indexed successfully");
        updateStatusBar();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Indexing failed: ${error.message}`);
      }
    })
  );

  // Command: Explain selected code (with RAG context)
  context.subscriptions.push(
    vscode.commands.registerCommand("rag.explainCode", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showErrorMessage("Select some code first");
        return;
      }

      const projectId = getProjectId();

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Explaining code...",
            cancellable: false
          },
          async () => {
            const explanation = await explainCode(projectId, selection, editor.document.fileName);
            showExplanation(explanation, selection);
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Explanation failed: ${error.message}`);
      }
    })
  );

  // Command: Explain entire current file
  context.subscriptions.push(
    vscode.commands.registerCommand("rag.explainFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const projectId = getProjectId();

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Explaining file...",
            cancellable: false
          },
          async () => {
            const explanation = await explainCurrentFile(projectId, editor.document.fileName);
            showExplanation(explanation, `File: ${editor.document.fileName}`);
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Explanation failed: ${error.message}`);
      }
    })
  );

  // Command: Show project info
  context.subscriptions.push(
    vscode.commands.registerCommand("rag.showProjectInfo", async () => {
      const projectId = getProjectId();
      
      try {
        const info = await getProjectInfo(projectId);
        
        const message = `Project: ${info.project_id}
Files Indexed: ${info.indexed_files}
Total Chunks: ${info.total_chunks}
Last Indexed: ${info.last_indexed || "Never"}`;

        vscode.window.showInformationMessage(message, { modal: true });
      } catch (error: any) {
        vscode.window.showWarningMessage(
          "Project not indexed yet. Run 'RAG: Index Project' first."
        );
      }
    })
  );

  // Command: Ask question about codebase
  context.subscriptions.push(
    vscode.commands.registerCommand("rag.askQuestion", async () => {
      const question = await vscode.window.showInputBox({
        prompt: "Ask a question about your codebase",
        placeHolder: "e.g., How does authentication work?"
      });

      if (!question) return;

      const projectId = getProjectId();

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Searching codebase...",
            cancellable: false
          },
          async () => {
            const explanation = await explainCode(projectId, question);
            showExplanation(explanation, question);
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Query failed: ${error.message}`);
      }
    })
  );

  outputChannel.appendLine("RAG Code Explainer activated");
}

function getProjectId(): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error("No workspace folder open");
  }
  return workspaceFolder.name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function updateStatusBar() {
  const projectId = getProjectId();
  
  try {
    const info = await getProjectInfo(projectId);
    statusBarItem.text = `$(database) ${info.total_chunks} chunks`;
    statusBarItem.tooltip = `${info.indexed_files} files indexed`;
    statusBarItem.show();
  } catch {
    statusBarItem.text = "$(database) Not Indexed";
    statusBarItem.tooltip = "Click to view project info";
    statusBarItem.show();
  }
}

function showExplanation(explanation: string, context: string) {
  // Create webview panel for better UX
  const panel = vscode.window.createWebviewPanel(
    "ragExplanation",
    "Code Explanation",
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getWebviewContent(explanation, context);
}

function getWebviewContent(explanation: string, context: string): string {
  // Escape HTML in context
  const escapedContext = context
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  const escapedExplanation = explanation
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px;
      line-height: 1.6;
    }
    .context {
      background-color: var(--vscode-textBlockQuote-background);
      border-left: 4px solid var(--vscode-textLink-foreground);
      padding: 12px;
      margin-bottom: 20px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    .explanation {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    h2 {
      color: var(--vscode-textLink-foreground);
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <h2>Context</h2>
  <div class="context"><code>${escapedContext.substring(0, 500)}${escapedContext.length > 500 ? '...' : ''}</code></div>
  
  <h2>Explanation</h2>
  <div class="explanation">${escapedExplanation}</div>
</body>
</html>`;
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}
