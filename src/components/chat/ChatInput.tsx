import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type InputType = 'text' | 'number' | 'date' | 'email' | 'phone';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputType?: InputType;
  autoFocus?: boolean;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  inputType = 'text',
  autoFocus = true,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && !disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Get appropriate input mode for mobile keyboards
  const getInputMode = (): React.HTMLAttributes<HTMLInputElement>['inputMode'] => {
    switch (inputType) {
      case 'number':
        return 'numeric';
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      default:
        return 'text';
    }
  };

  // Get appropriate input type
  const getInputType = () => {
    switch (inputType) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 bg-white border-t border-slate-200">
      <input
        ref={inputRef}
        type={getInputType()}
        inputMode={getInputMode()}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex-1 px-4 py-3 rounded-full border border-slate-200',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
          'text-sm placeholder:text-slate-400',
          'disabled:bg-slate-50 disabled:text-slate-400',
          'transition-all duration-200'
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        className={cn(
          'rounded-full w-11 h-11 flex-shrink-0',
          'bg-gradient-brand hover:opacity-90',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-200'
        )}
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
