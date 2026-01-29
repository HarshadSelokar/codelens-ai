import * as vscode from "vscode";
import { indexProject } from "./indexer";
import { explainCode } from "./api";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("rag.indexProject", async () => {
      await indexProject();
    }),

    vscode.commands.registerCommand("rag.explainCode", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showErrorMessage("Select some code first");
        return;
      }

      const projectId =
        vscode.workspace.workspaceFolders?.[0]?.name || "default";

      vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Explaining code..." },
        async () => {
          const explanation = await explainCode(projectId, selection);
          vscode.window.showInformationMessage(explanation);
        }
      );
    })
  );
}
