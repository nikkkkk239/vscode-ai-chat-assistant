import { useState, useEffect, useRef } from 'react';
import { vscode } from '../vscode';

export default function MessageInput({ onSend }: { onSend: (msg: string) => void }) {
  const [text, setText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.data.type === 'workspaceFiles') {
        setFileSuggestions(e.data.files || []);
        setSelectedIndex(0);
        setShowSuggestions(true);
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  const send = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
    setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);

    // Trigger only when user types "@" at the end
    if (value.endsWith('@')) {
      vscode.postMessage({ command: 'getWorkspaceFiles' });
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % fileSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + fileSuggestions.length) % fileSuggestions.length);
      } else if (e.key === 'Enter') {
        if (fileSuggestions.length > 0) {
          e.preventDefault();
          insertFileMention(fileSuggestions[selectedIndex]);
        } else {
          send();
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      send();
    }
  };

  const insertFileMention = (file: string) => {
    setText((prev) => prev.replace(/@$/, `@${file} `));
    setShowSuggestions(false);
    // Optional: Refocus the input after inserting
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="relative flex items-center gap-2 p-3">
      <input
        ref={inputRef}
        className="flex-1 px-3 py-2 bg-[#1e1e1e] text-white rounded-lg border border-gray-600 focus:outline-none"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask something..."
      />
      <button
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        onClick={send}
      >
        Send
      </button>

      {showSuggestions && (
        <ul className="absolute bottom-14 left-3 w-[90%] max-h-48 overflow-auto bg-[#2c2c2c] border border-gray-600 rounded-lg shadow z-10">
          {fileSuggestions.map((file, idx) => (
            <li
              key={file}
              className={`px-3 py-1 cursor-pointer ${
                idx === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
              }`}
              onMouseDown={() => insertFileMention(file)}
            >
              {file}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
