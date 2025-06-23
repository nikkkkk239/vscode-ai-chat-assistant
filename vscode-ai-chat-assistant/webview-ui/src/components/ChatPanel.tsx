import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: `🤖 ${text}` }]);
    }, 500);
  };

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
   <div className="flex flex-col h-full w-full overflow-hidden bg-[#1e1e1e] text-white">
  <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
    <MessageList messages={messages} />
  </div>
  <div className="border-t border-gray-700">
    <MessageInput onSend={handleSend} />
  </div>
</div>
  );
}
