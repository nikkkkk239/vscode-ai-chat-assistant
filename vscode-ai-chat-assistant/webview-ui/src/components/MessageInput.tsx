import { useState, useEffect, useRef } from 'react';
import { vscode } from '../vscode';

export default function MessageInput({ onSend }: { onSend: (msg: string) => void }) {
  const [text, setText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fileSuggestions, setFileSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!text.trim() && !imageData) return;
    let final = text.trim();
    if (imageData) {
      final += `\n\n![uploaded image](${imageData})`;
    }
    onSend(final);
    setText('');
    setImagePreview(null);
    setImageData(null);
    setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);

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
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageData(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative flex flex-col gap-2 p-3">
      {imagePreview && (
        <div className="mb-2 max-w-sm">
          <img
            src={imagePreview}
            alt="Preview"
            className="rounded-lg border border-gray-600 max-h-40 object-contain"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          className="flex-1 px-3 py-2 bg-[#1e1e1e] text-white rounded-lg border border-gray-600 focus:outline-none"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask something or attach image..."
        />
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg"
          onClick={() => fileInputRef.current?.click()}
        >
          +
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          onClick={send}
        >
          Send
        </button>
      </div>

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
