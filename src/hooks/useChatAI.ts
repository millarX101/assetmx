// Hook for calling the Chat AI edge function
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ApplicationContext {
  abn?: string;
  businessName?: string;
  assetType?: string;
  loanAmount?: number;
  currentStep?: string;
}

interface UseChatAIReturn {
  sendMessage: (
    messages: ChatMessage[],
    context?: ApplicationContext
  ) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

export function useChatAI(): UseChatAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      messages: ChatMessage[],
      context?: ApplicationContext
    ): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('chat-ai', {
          body: {
            messages,
            applicationContext: context,
          },
        });

        if (fnError) {
          throw new Error(fnError.message || 'Failed to get AI response');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        return data?.message || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'AI chat failed';
        setError(errorMessage);
        console.error('Chat AI error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
}
