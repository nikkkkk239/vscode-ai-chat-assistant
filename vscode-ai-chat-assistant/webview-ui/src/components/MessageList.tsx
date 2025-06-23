// import React from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <>
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`max-w-[75%] px-4 py-2 rounded-xl whitespace-pre-wrap break-words shadow-sm ${
            msg.role === 'user'
              ? 'ml-auto bg-blue-600 text-white'
              : 'mr-auto bg-[#2d2d2d] text-gray-100'
          }`}
        >
          {msg.content}
        </div>
      ))}
    </>
  );
}
