import { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { vscode } from '../vscode';

export default function ChatPanel() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [fileContext, setFileContext] = useState<{ fileName: string; fileContent: string } | null>(null);
  const [contextPrompted, setContextPrompted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 0);
  };

  const appendMessage = (msg: { role: 'user' | 'assistant'; content: string }) => {
    setMessages(prev => [...prev, msg]);
  };

  const replaceThinkingWith = (reply: string) => {
    setMessages(prev => {
      const updated = [...prev];
      const idx = [...updated]
        .reverse()
        .findIndex(
          msg =>
            msg.role === 'assistant' &&
            msg.content.trim() === '__TYPING__'
        );

      if (idx !== -1) {
        const actualIndex = updated.length - 1 - idx;
        updated[actualIndex] = { role: 'assistant', content: reply };
      } else {
        updated.push({ role: 'assistant', content: reply });
      }

      return updated;
    });
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('chat-messages');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    sessionStorage.setItem('chat-messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    vscode.postMessage({ command: 'requestContext' });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('[ChatPanel] Received message:', message);

      if (message.type === 'context') {
        if (!message.fileName || !message.fileContent.trim()) {
          if (messages.length === 0) {
            appendMessage({
              role: 'assistant',
              content: `👋 Welcome to AI Chat Assistant!\n\nYou can ask me to generate or refactor code, explain snippets, or attach files using @filename.\n\nOpen a file in the editor to unlock contextual awareness!`,
            });
          }
          setFileContext(null);
          setContextPrompted(false);
        } else {
          if (messages.length === 0) {
            appendMessage({
              role: 'assistant',
              content: `📄 You've opened ${message.fileName}.\nWould you like a contextual summary of this file? (yes/no)`,
            });
          }
          setFileContext({ fileName: message.fileName, fileContent: message.fileContent });
          setContextPrompted(true);
        }
      }

      if (message.type === 'fileContent') {
        if (message.error) {
          appendMessage({ role: 'assistant', content: message.error });
          return;
        }

        const fullPrompt = `${message.originalPrompt}\n\nHere is the content of ${message.fileName}:\n\n${message.fileContent}`;
        vscode.postMessage({ command: 'geminiPrompt', prompt: fullPrompt });
      }

      if (message.type === 'geminiReply') {
        replaceThinkingWith(message.reply || '');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [messages]);

  const handleSend = (inputText: string, imageData?: string) => {
    const input = inputText.trim();
    if (!input && !imageData) return;

    let content = input;
    if (imageData) {
      content += `\n\n![image](${imageData})`;
    }

    appendMessage({ role: 'user', content });
    appendMessage({ role: 'assistant', content: '__TYPING__' });
    scrollToBottom();

    if (contextPrompted && fileContext) {
      if (input.toLowerCase() === 'yes') {
        vscode.postMessage({
          command: 'geminiPrompt',
          prompt: `Summarize this code file:\n\n${fileContext.fileContent}`,
        });
        setContextPrompted(false);
        return;
      }

      if (input.toLowerCase() === 'no') {
        appendMessage({
          role: 'assistant',
          content: '👍 No worries! You can still ask me to help with code, refactor suggestions, or explanations anytime.',
        });
        setContextPrompted(false);
        return;
      }
    }

    const match = input.match(/@([\w.\-/\\]+)/);
    if (match) {
      vscode.postMessage({
        command: 'getFileContent',
        filePath: match[1],
        originalPrompt: input,
      });
      return;
    }

    vscode.postMessage({
      command: 'geminiPrompt',
      prompt: input,
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] text-white">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList messages={messages} />
      </div>
      <div className="border-t border-gray-700">
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}