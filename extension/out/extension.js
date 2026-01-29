"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const indexer_1 = require("./indexer");
const api_1 = require("./api");
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand("rag.indexProject", async () => {
        await (0, indexer_1.indexProject)();
    }), vscode.commands.registerCommand("rag.explainCode", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.document.getText(editor.selection);
        if (!selection) {
            vscode.window.showErrorMessage("Select some code first");
            return;
        }
        const projectId = vscode.workspace.workspaceFolders?.[0]?.name || "default";
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Explaining code..." }, async () => {
            const explanation = await (0, api_1.explainCode)(projectId, selection);
            vscode.window.showInformationMessage(explanation);
        });
    }));
}
