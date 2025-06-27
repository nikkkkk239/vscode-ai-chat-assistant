import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';
import fetch from 'node-fetch'; 

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('aiChat.openChat', async () => {
      const panel = vscode.window.createWebviewPanel(
        'aiChat',
        'AI Chat Assistant',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
        }
      );

      panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'requestContext') {
          const visibleEditors = vscode.window.visibleTextEditors;
          const fallbackEditor = visibleEditors.find(
            (ed) => ed.document && ed.document.getText().trim() !== ''
          );

          const fileContent = fallbackEditor?.document.getText() || '';
          const fileName = fallbackEditor?.document.fileName || null;

          panel.webview.postMessage({
            type: 'context',
            fileName,
            fileContent,
          });
        }

        if (message.command === 'getWorkspaceFiles') {
          const files = await vscode.workspace.findFiles('**/*.*', '**/node_modules/**', 1000);
          const filePaths = files.map(file => vscode.workspace.asRelativePath(file));
          panel.webview.postMessage({
            type: 'workspaceFiles',
            files: filePaths,
          });
        }

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
          } catch (err) {
            panel.webview.postMessage({
              type: 'fileContent',
              fileName: message.filePath,
              fileContent: null,
              error: `❌ Could not read file: ${message.filePath}`,
              originalPrompt: message.originalPrompt,
            });
          }
        }

        if (message.command === 'geminiPrompt') {
          const prompt = message.prompt;
          const apiKey = 'your-api-key'; 

          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                }),
              }
            );

            const rawText = await response.text();
            console.log('Gemini raw response:', rawText);

            let data: any;
            try {
              data = JSON.parse(rawText);
            } catch (err) {
              panel.webview.postMessage({
                type: 'geminiReply',
                reply: '❌ Gemini API returned malformed JSON:\n' + rawText,
              });
              return;
            }

            let reply = '⚠️ Gemini API did not return a valid response.';
            if (
              Array.isArray(data?.candidates) &&
              data.candidates.length > 0 &&
              data.candidates[0]?.content?.parts
            ) {
              reply = data.candidates[0].content.parts
                .map((p: any) => p.text || '')
                .join('\n')
                .trim();
            }

            panel.webview.postMessage({
              type: 'geminiReply',
              reply,
            });
          } catch (error: any) {
            panel.webview.postMessage({
              type: 'geminiReply',
              reply: '❌ Gemini API request failed: ' + (error?.message || 'Unknown error'),
            });
          }
        }

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
          } catch (err: any) {
            panel.webview.postMessage({
              type: 'geminiReply',
              reply: `❌ Failed to write to \`${fileName}\`: ${err.message}`,
            });
          }
        }
      });
    })
  );
}

export function deactivate() {}
