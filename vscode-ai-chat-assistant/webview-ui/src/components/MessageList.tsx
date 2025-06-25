// import React from 'react';
import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  messages: Message[];
}
export default function MessageList({ messages }: Props) {
  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => {
        let contentBlock;
        try {
          contentBlock = (
            <ReactMarkdown
              // remarkPlugins={[remarkGfm]}
              //rehypePlugins={[[rehypeHighlight as any]]}
              components={{
                a: (props: any) => (
                  <a {...props} className="text-blue-400 underline hover:text-blue-300" />
                ),
                code: (props: any) => {
                  const { inline, className, children, ...rest } = props;
                  const content = String(children).replace(/\n$/, '');
                  return inline ? (
                    <code className="bg-zinc-700 px-1 py-0.5 rounded text-sm">{content}</code>
                  ) : (
                    <pre className="bg-zinc-900 p-3 rounded-md overflow-auto text-sm">
                      <code className={className} {...rest}>
                        {content}
                      </code>
                    </pre>
                  );
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>
          );
        } catch (err: any) {
          console.error("Markdown render error:", err);
          contentBlock = (
            <div className="text-red-400">
              ⚠️ Error rendering response. See console for details.
            </div>
          );
        }

        return (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xl p-4 rounded-xl whitespace-pre-wrap ${
                msg.role === 'user' ? 'bg-blue-900 text-white' : 'bg-zinc-800 text-white'
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
