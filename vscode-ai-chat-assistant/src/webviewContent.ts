import * as vscode from 'vscode';
import { readdirSync } from 'fs';
import { join } from 'path';
import { getNonce } from './utils';

export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const distPath = vscode.Uri.joinPath(extensionUri, 'dist', 'assets');
  const distFsPath = vscode.Uri.joinPath(extensionUri, 'dist', 'assets').fsPath;

  const files = readdirSync(distFsPath);
  const scriptFile = files.find(f => f.endsWith('.js'))!;
  const styleFile = files.find(f => f.endsWith('.css'))!;

  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, scriptFile));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, styleFile));

  const nonce = getNonce();

  return /* html */ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="${styleUri}" rel="stylesheet">
      <title>AI Chat Assistant</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>
  `;
}
