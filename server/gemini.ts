import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
    timeout: 20000,
  },
});

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

export const SUPPORTED_MODELS = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Ultra-fast, responsive, and highly available free-tier model.',
    tier: 'free' as const,
    recommended: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Comprehensive reasoning model for complex tasks (may experience demand spikes).',
    tier: 'free' as const,
    recommended: false,
  },
];

export function cleanErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred while communicating with the AI service.';

  let rawMessage = typeof err === 'string' ? err : err.message || '';

  // Try parsing nested JSON error structures from Gemini SDK
  try {
    if (typeof rawMessage === 'string' && (rawMessage.startsWith('{') || rawMessage.includes('{\n'))) {
      const parsed = JSON.parse(rawMessage);
      if (parsed?.error?.message) {
        rawMessage = parsed.error.message;
        // Check for double-nested JSON
        try {
          const innerParsed = JSON.parse(rawMessage);
          if (innerParsed?.error?.message) {
            rawMessage = innerParsed.error.message;
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  const lower = String(rawMessage).toLowerCase();

  if (err.status === 503 || err.code === 503 || lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable')) {
    return 'This model is currently experiencing temporary high demand on Google servers. Please tap the Retry button below.';
  }

  if (err.status === 429 || err.code === 429 || lower.includes('quota') || lower.includes('rate limit')) {
    return 'Gemini API rate limit reached. Spikes are usually brief, please click Retry in a few seconds.';
  }

  if (err.status === 401 || lower.includes('api_key') || lower.includes('unauthenticated')) {
    return 'Gemini API key is missing or invalid. Please check your GEMINI_API_KEY settings.';
  }

  if (err.status === 504 || lower.includes('deadline') || lower.includes('timeout')) {
    return 'Request timed out waiting for AI response. Please click Retry.';
  }

  // Clean any remaining raw JSON brackets if present
  return rawMessage.replace(/^[{\[\s"]+|[}\]\s"]+$/g, '') || 'Failed to generate response. Please try again.';
}

export async function generateChatTitle(userPrompt: string): Promise<string> {
  if (!apiKey) {
    const clean = userPrompt.trim().replace(/[\r\n]+/g, ' ').slice(0, 36);
    return clean.length > 33 ? clean + '...' : clean;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a very concise, 3 to 5 word title that summarizes this user inquiry. Do not use quotes, punctuation, or preamble. Inquiry: "${userPrompt.slice(0, 300)}"`,
            },
          ],
        },
      ],
      config: {
        maxOutputTokens: 20,
        temperature: 0.3,
      },
    });

    const title = response.text?.trim().replace(/^["']|["']$/g, '');
    if (title && title.length <= 50) {
      return title;
    }
  } catch (err) {
    console.warn('Could not generate automatic title with Gemini, falling back to prompt snippet:', err);
  }

  const clean = userPrompt.trim().replace(/[\r\n]+/g, ' ').slice(0, 36);
  return clean.length > 33 ? clean + '...' : clean;
}
