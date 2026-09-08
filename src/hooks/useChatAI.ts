// Client for the chat-ai edge function (Claude assist inside the scripted flow).
// Called only when the current step cannot parse what the customer typed.
import { useCallback, useState } from 'react';
import { getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured } from '@/lib/supabase';

export type AssistIntent = 'answer' | 'question' | 'change' | 'handoff' | 'unclear';

export interface AssistStep {
  id: string;
  question: string;
  inputType: string;
  field?: string;
  options?: { label: string; value: string }[];
}

export interface AssistRequest {
  step: AssistStep;
  userText: string;
  context?: Record<string, string | number | boolean | null | undefined>;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export interface AssistResult {
  intent: AssistIntent;
  value: string | null;
  reply: string;
}

export async function assist(req: AssistRequest, signal?: AbortSignal): Promise<AssistResult | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const res = await fetch(`${getSupabaseUrl()}/functions/v1/chat-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: getSupabaseAnonKey() ?? '' },
      body: JSON.stringify(req),
      signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.intent !== 'string') return null;
    return { intent: data.intent as AssistIntent, value: data.value ?? null, reply: data.reply ?? '' };
  } catch {
    return null;
  }
}

export function useChatAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (req: AssistRequest): Promise<AssistResult | null> => {
    setIsLoading(true);
    setError(null);
    const result = await assist(req);
    if (!result) setError('AI assist unavailable');
    setIsLoading(false);
    return result;
  }, []);

  return { assist: run, isLoading, error };
}
