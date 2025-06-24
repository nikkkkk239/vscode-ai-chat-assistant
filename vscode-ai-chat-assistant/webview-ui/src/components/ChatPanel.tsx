import { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { vscode } from '../vscode';

export default function ChatPanel() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [fileContext, setFileContext] = useState<{ fileName: string; fileContent: string } | null>(null);
  const [contextPrompted, setContextPrompted] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    vscode.postMessage({ command: 'requestContext' });

    const handleMessage = async (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'context') {
        if (!message.fileName || !message.fileContent.trim()) {
          setMessages([
            {
              role: 'assistant',
              content:
                `👋 Welcome to AI Chat Assistant!\n\nYou can ask me to generate or refactor code, explain snippets, or attach files using @filename.\n\nOpen a file in the editor to unlock contextual awareness!`,
            },
          ]);
          setFileContext(null);
          setContextPrompted(false);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: `📄 You've opened ${message.fileName}.\nWould you like a contextual summary of this file? (yes/no)`,
            },
          ]);
          setFileContext({ fileName: message.fileName, fileContent: message.fileContent });
          setContextPrompted(true);
        }
      }

      if (message.type === 'fileContent') {
        if (message.error) {
          setMessages((prev) => [...prev, { role: 'assistant', content: message.error }]);
          return;
        }

        const fullPrompt = `${message.originalPrompt}\n\nHere is the content of ${message.fileName}:\n\n${message.fileContent}`;
        setMessages((prev) => [...prev, { role: 'assistant', content: '⏳ Processing attached file with Gemini...' }]);
        vscode.postMessage({ command: 'geminiPrompt', prompt: fullPrompt });
      }

      if (message.type === 'geminiReply') {
        if (pendingPrompt === 'followUps') {
          const parsed = message.reply
            .split('\n')
            .filter((line: string) => line.trim().startsWith('-'))
            .map((line: string) => line.replace(/^-/, '').trim());
          setFollowUps(parsed);
          setMessages((prev) => prev.filter((m) => !m.content.startsWith('💡 Generating')));
          setPendingPrompt(null);
        } else {
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: 'assistant', content: message.reply },
          ]);

          // Trigger follow-ups only ONCE after main reply
          generateFollowUps(message.reply);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pendingPrompt]);

  const generateFollowUps = (lastReply: string) => {
    const followPrompt = `Based on this AI response:\n"${lastReply}"\nSuggest 2-3 relevant follow-up questions the user might want to ask. Return each as a bullet point.`;
    setFollowUps([]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '💡 Generating follow-up suggestions...' }]);
    vscode.postMessage({ command: 'geminiPrompt', prompt: followPrompt });
    setPendingPrompt('followUps');
  };

  const handleSend = (text: string, isFollowUp: boolean = false) => {
    const input = text.trim();
    if (!input) return;

    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setFollowUps([]);
    setMessages((prev) => [...prev, { role: 'assistant', content: '⏳ Thinking...' }]);

    if (contextPrompted && fileContext) {
      if (input.toLowerCase() === 'yes') {
        const prompt = `Summarize this code file:\n\n${fileContext.fileContent}`;
        vscode.postMessage({ command: 'geminiPrompt', prompt });
        setContextPrompted(false);
        return;
      }

      if (input.toLowerCase() === 'no') {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: '👍 No worries! You can still ask me to help with code, refactor suggestions, or explanations anytime.',
        }]);
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

    vscode.postMessage({ command: 'geminiPrompt', prompt: input });
    setPendingPrompt(isFollowUp ? null : 'main'); // only allow followUps from initial input
  };

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, followUps]);

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] text-white">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList messages={messages} />
        {followUps.length > 0 && (
          <div className="mt-4 border-t border-gray-700 pt-3">
            <p className="mb-2 text-sm text-gray-400">💡 Suggested Follow-ups:</p>
            <div className="flex flex-wrap gap-2">
              {followUps.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q, true)}
                  className="bg-gray-700 hover:bg-gray-600 text-sm px-3 py-1 rounded text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-700">
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}
