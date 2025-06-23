import { useState } from 'react';

export default function MessageInput({ onSend }: { onSend: (msg: string) => void }) {
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="flex items-center gap-2 p-3">
      <input
        className="flex-1 px-3 py-2 bg-[#1e1e1e] text-white rounded-lg border border-gray-600 focus:outline-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        placeholder="Ask something..."
      />
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        onClick={send}
      >
        Send
      </button>
    </div>
  );
}
