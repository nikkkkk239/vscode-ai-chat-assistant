import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import TypingIndicator from './TypingIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  messages: Message[];
}

export default function MessageList({ messages }: Props) {
  return (
    <div className="space-y-3 px-2 pb-4">
      {messages.map((msg, idx) => {
        let contentBlock;

        if (msg.role === 'assistant' && msg.content.trim() === '__TYPING__') {
          contentBlock = <TypingIndicator />;
        } else {
          try {
            contentBlock = (
              <ReactMarkdown
                components={{
                  a: (props: any) => (
                    <a {...props} className="text-blue-400 underline hover:text-blue-300" />
                  ),
                  img: (props) => (
                    <img
                      {...props}
                      className="rounded-xl mt-2 border border-gray-600 max-w-[50%] max-h-64 object-contain"
                    />
                  ),
                  code: ({ inline, className, children }: any) => {
                    const rawCode = String(children).replace(/\n$/, '');

                    if (inline) {
                      return (
                        <code className="bg-zinc-700 px-1 py-0.5 rounded text-sm">
                          {rawCode}
                        </code>
                      );
                    }

                    const lang = className?.replace('language-', '') || '';
                    const highlighted = hljs.highlightAuto(rawCode, lang ? [lang] : undefined).value;
                    const [copied, setCopied] = useState(false);

                    const handleCopy = () => {
                      navigator.clipboard.writeText(rawCode).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000); 
                      });
                    };

                    return (
                      <div className="relative group">
                        <button
                          onClick={handleCopy}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-xs bg-zinc-700 text-white px-2 py-1 rounded hover:bg-zinc-600 transition-all"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                        <pre className="bg-zinc-900 rounded-xl overflow-auto text-sm p-3 mt-2">
                          <code
                            className={`hljs language-${lang}`}
                            dangerouslySetInnerHTML={{ __html: highlighted }}
                          />
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {msg.content}
              </ReactMarkdown>
            );
          } catch (err) {
            console.error('Markdown render error:', err);
            contentBlock = (
              <div className="text-red-400">
                ⚠️ Error rendering response. See console for details.
              </div>
            );
          }
        }

        return (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xl overflow-x-hidden p-4 rounded-2xl shadow-sm break-words whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-800 text-white rounded-br-md'
                  : 'bg-zinc-800 text-white rounded-bl-md'
              }`}
            >
              {contentBlock}
            </div>
          </div>
        );
      })}
    </div>
  );
}
