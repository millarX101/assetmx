import { cn } from '@/lib/utils';

export type MessageType = 'bot' | 'user' | 'system';

export interface ChatMessageData {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.type === 'bot';
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-sand text-ink-600 text-xs px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Bot Avatar */}
      {isBot && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center">
            <span className="text-forest font-display text-sm">A</span>
          </div>
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3 rounded-2xl whitespace-pre-wrap',
          isUser
            ? 'bg-forest text-cream rounded-br-md'
            : 'bg-sand text-ink rounded-bl-md'
        )}
      >
        {message.isTyping ? (
          <TypingIndicator />
        ) : (
          <p className="text-sm leading-relaxed">{message.content}</p>
        )}
      </div>

      {/* User Avatar (optional - keeping it clean for now) */}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-ink-400 rounded-full animate-bounce" />
    </div>
  );
}

export function ChatTypingIndicator() {
  return (
    <ChatMessage
      message={{
        id: 'typing',
        type: 'bot',
        content: '',
        timestamp: new Date(),
        isTyping: true,
      }}
    />
  );
}
