export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 text-sm text-gray-400">
      <span>Thinking</span>
      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0s]" />
      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
    </div>
  );
}
