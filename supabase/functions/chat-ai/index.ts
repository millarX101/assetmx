// Chat AI Edge Function
// Proxies requests to Claude API for the conversational application flow

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for the AssetMX chat assistant
const SYSTEM_PROMPT = `You are a friendly Australian asset finance assistant for AssetMX. Your job is to help small business owners and tradies get finance for vehicles, trucks, equipment, and technology.

PERSONALITY:
- Friendly, casual Australian tone (like texting a mate who knows finance)
- Use simple language, avoid jargon
- Be encouraging and supportive
- Keep responses concise (2-3 sentences max unless explaining something complex)

YOUR ROLE:
- Guide users through the finance application process
- Collect information: ABN, asset details, loan amount, director details
- Answer questions about asset finance
- Explain terms simply when asked (balloon payments, residuals, etc.)

WHAT YOU KNOW:
- AssetMX offers transparent pricing with a flat $800 fee (vs brokers who hide ~$2,000+ in rate markup)
- Base rates from 6.45% p.a. for 1-5 year terms, 7.15% for longer terms
- We finance vehicles, trucks/trailers, equipment/machinery, and technology/medical equipment
- Minimum 2 years ABN trading history required
- Loan amounts from $5,000 to $500,000
- Terms from 1-7 years
- Balloon/residual payments available (reduces monthly payments)

CONVERSATION FLOW:
1. Greet warmly, ask for ABN
2. After ABN lookup, confirm business details
3. Ask what they're financing (asset type)
4. Ask new or used
5. Ask approximate price
6. Show quick estimate to build excitement
7. Continue collecting director details if they want to proceed
8. Guide to document upload

IMPORTANT:
- Never make up rates or give specific approval guarantees
- Always be transparent about the $800 fee
- If unsure, say so and offer to connect them with a human
- Celebrate progress ("Great!", "Awesome!", "Nearly there!")

Respond naturally as if chatting. Don't use markdown formatting or bullet points in conversational responses.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  applicationContext?: {
    abn?: string;
    businessName?: string;
    assetType?: string;
    loanAmount?: number;
    currentStep?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, applicationContext }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context-aware system prompt
    let contextualPrompt = SYSTEM_PROMPT;
    if (applicationContext) {
      contextualPrompt += '\n\nCURRENT APPLICATION CONTEXT:';
      if (applicationContext.abn) {
        contextualPrompt += `\n- ABN: ${applicationContext.abn}`;
      }
      if (applicationContext.businessName) {
        contextualPrompt += `\n- Business: ${applicationContext.businessName}`;
      }
      if (applicationContext.assetType) {
        contextualPrompt += `\n- Asset Type: ${applicationContext.assetType}`;
      }
      if (applicationContext.loanAmount) {
        contextualPrompt += `\n- Loan Amount: $${applicationContext.loanAmount.toLocaleString()}`;
      }
      if (applicationContext.currentStep) {
        contextualPrompt += `\n- Current Step: ${applicationContext.currentStep}`;
      }
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: contextualPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: response.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Extract the assistant's response
    const assistantMessage = data.content?.[0]?.text || 'Sorry, I had trouble responding. Please try again.';

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat AI error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Chat failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
