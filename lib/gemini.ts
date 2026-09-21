import { GoogleGenAI } from '@google/genai';

type GenerateJsonInput = { apiKey: string; contents: string; temperature?: number };
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const errorStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

export const getGeminiModelCandidates = () => Array.from(new Set([
  process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  ...(process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash-lite').split(',').map((model) => model.trim()).filter(Boolean),
]));

export async function generateGeminiJson({ apiKey, contents, temperature = 0 }: GenerateJsonInput) {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  for (const model of getGeminiModelCandidates()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await ai.models.generateContent({ model, contents, config: { temperature, responseMimeType: 'application/json' } });
        const text = (response.text || '').replace(/^```(?:json)?\s*|\s*```$/gi, '');
        return { data: JSON.parse(text || '{}') as unknown, model };
      } catch (error) {
        lastError = error;
        const status = errorStatus(error);
        console.warn('Gemini request failed', { model, attempt: attempt + 1, status });
        // Em indisponibilidade do modelo, avance imediatamente para o fallback.
        // Apenas limites momentâneos recebem uma segunda tentativa curta.
        if (status !== 429 || attempt === 1) break;
        await wait(350 * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('GEMINI_UNAVAILABLE');
}
