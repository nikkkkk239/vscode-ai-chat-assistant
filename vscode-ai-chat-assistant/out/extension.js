"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const webviewContent_1 = require("./webviewContent");
const node_fetch_1 = __importDefault(require("node-fetch")); // Ensure node-fetch v2 is installed
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('aiChat.openChat', async () => {
        const panel = vscode.window.createWebviewPanel('aiChat', 'AI Chat Assistant', vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
        });
        panel.webview.html = (0, webviewContent_1.getWebviewContent)(panel.webview, context.extensionUri);
        panel.webview.onDidReceiveMessage(async (message) => {
            // === CONTEXT REQUEST ===
            if (message.command === 'requestContext') {
                const visibleEditors = vscode.window.visibleTextEditors;
                const fallbackEditor = visibleEditors.find((ed) => ed.document && ed.document.getText().trim() !== '');
                const fileContent = fallbackEditor?.document.getText() || '';
                const fileName = fallbackEditor?.document.fileName || null;
                panel.webview.postMessage({
                    type: 'context',
                    fileName,
                    fileContent,
                });
            }
            // === GET WORKSPACE FILES ===
            if (message.command === 'getWorkspaceFiles') {
                const files = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**', 1000);
                const filePaths = files.map(file => vscode.workspace.asRelativePath(file));
                panel.webview.postMessage({
                    type: 'workspaceFiles',
                    files: filePaths,
                });
            }
            // === READ FILE CONTENT ===
            if (message.command === 'getFileContent') {
                const filePath = message.filePath.replace(/\\/g, '/');
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    panel.webview.postMessage({
                        type: 'fileContent',
                        fileContent: null,
                        error: `❌ No workspace is open.`,
                        originalPrompt: message.originalPrompt,
                        fileName: message.filePath,
                    });
                    return;
                }
                const workspaceUri = workspaceFolders[0].uri;
                const fileUri = vscode.Uri.joinPath(workspaceUri, filePath);
                try {
                    const content = await vscode.workspace.fs.readFile(fileUri);
                    panel.webview.postMessage({
                        type: 'fileContent',
                        fileName: message.filePath,
                        fileContent: Buffer.from(content).toString('utf-8'),
                        originalPrompt: message.originalPrompt,
                    });
                }
                catch (err) {
                    panel.webview.postMessage({
                        type: 'fileContent',
                        fileName: message.filePath,
                        fileContent: null,
                        error: `❌ Could not read file: ${message.filePath}`,
                        originalPrompt: message.originalPrompt,
                    });
                }
            }
            // === GEMINI PROMPT ===
            if (message.command === 'geminiPrompt') {
                const prompt = message.prompt;
                const apiKey = 'AIzaSyAhdLThuWmXRByBqbqfbKGJAsfqm2R3F8A'; // Secure this key
                try {
                    const response = await (0, node_fetch_1.default)(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        }),
                    });
                    const rawText = await response.text();
                    console.log('Gemini raw response:', rawText);
                    let data;
                    try {
                        data = JSON.parse(rawText);
                    }
                    catch (err) {
                        panel.webview.postMessage({
                            type: 'geminiReply',
                            reply: '❌ Gemini API returned malformed JSON:\n' + rawText,
                        });
                        return;
                    }
                    let reply = '⚠️ Gemini API did not return a valid response.';
                    if (Array.isArray(data?.candidates) &&
                        data.candidates.length > 0 &&
                        data.candidates[0]?.content?.parts) {
                        reply = data.candidates[0].content.parts
                            .map((p) => p.text || '')
                            .join('\n')
                            .trim();
                    }
                    panel.webview.postMessage({
                        type: 'geminiReply',
                        reply,
                    });
                }
                catch (error) {
                    panel.webview.postMessage({
                        type: 'geminiReply',
                        reply: '❌ Gemini API request failed: ' + (error?.message || 'Unknown error'),
                    });
                }
            }
            // === APPLY CODE EDIT ===
            if (message.command === 'applyCodeEdit') {
                const { fileName, newCode } = message;
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    panel.webview.postMessage({
                        type: 'geminiReply',
                        reply: `❌ No workspace folder is open.`,
                    });
                    return;
                }
                const workspaceUri = workspaceFolders[0].uri;
                const fileUri = vscode.Uri.joinPath(workspaceUri, fileName);
                try {
                    const encoder = new TextEncoder();
                    await vscode.workspace.fs.writeFile(fileUri, encoder.encode(newCode));
                    panel.webview.postMessage({
                        type: 'geminiReply',
                        reply: `✅ Successfully updated \`${fileName}\`.`,
                    });
                }
                catch (err) {
                    panel.webview.postMessage({
                        type: 'geminiReply',
                        reply: `❌ Failed to write to \`${fileName}\`: ${err.message}`,
                    });
                }
            }
        });
    }));
}
function deactivate() { }
