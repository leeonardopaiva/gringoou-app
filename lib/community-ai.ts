import { generateGeminiJson } from '@/lib/gemini';
import claudeAgent from '@/config/claude-community-agent.json';

export type CommunityAiProvider = 'gemini' | 'claude';
type GenerateCommunityAiJsonInput = { contents: string; temperature?: number; maxTokens?: number };
type ClaudeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const extractJson = (value: string) => {
  const cleaned = value.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  if (!cleaned) throw new Error('EMPTY_AI_RESPONSE');
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    if (fenced) {
      try { return JSON.parse(fenced) as unknown; } catch { /* tenta localizar o objeto abaixo */ }
    }

    const start = value.indexOf('{');
    if (start >= 0) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < value.length; index += 1) {
        const character = value[index];
        if (escaped) { escaped = false; continue; }
        if (character === '\\' && inString) { escaped = true; continue; }
        if (character === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (character === '{') depth += 1;
        if (character === '}') depth -= 1;
        if (depth === 0) {
          try { return JSON.parse(value.slice(start, index + 1)) as unknown; } catch { break; }
        }
      }
    }
    throw new Error('INVALID_AI_JSON');
  }
};

const generateClaudeJson = async ({ contents, temperature = 0, maxTokens = 1400 }: GenerateCommunityAiJsonInput) => {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('CLAUDE_NOT_CONFIGURED');
  const model = process.env.CLAUDE_MODEL || claudeAgent.model.id;
  const configuredEffort = process.env.CLAUDE_EFFORT?.trim().toLowerCase();
  const effort = (['low', 'medium', 'high', 'xhigh', 'max'].includes(configuredEffort || '')
    ? configuredEffort
    : claudeAgent.model.effort) as ClaudeEffort;
  const supportsOutputEffort = /claude-(?:opus|sonnet)-(?:[5-9]|4-[6-9])/.test(model);
  const acceptsTemperature = !/claude-(?:opus|sonnet)-(?:[5-9]|4-[7-9])/.test(model);
  const requestClaude = async (prompt: string, retry = false) => {
    const requestBody = {
      model,
      max_tokens: retry ? Math.max(maxTokens, 1800) : maxTokens,
      system: claudeAgent.system,
      messages: [{ role: 'user', content: prompt }],
      ...(supportsOutputEffort ? { output_config: { effort } } : {}),
      ...(acceptsTemperature ? { temperature: retry ? 0 : temperature } : {}),
    };
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.json().catch(() => null) as { content?: Array<{ type?: string; text?: string }>; error?: { message?: string }; stop_reason?: string } | null;
    if (!response.ok) {
      console.warn('Claude request failed', { model, status: response.status, retry });
      throw new Error(payload?.error?.message || `CLAUDE_HTTP_${response.status}`);
    }
    return {
      text: payload?.content?.filter((item) => item.type === 'text').map((item) => item.text || '').join('\n') || '',
      stopReason: payload?.stop_reason,
    };
  };

  const firstResponse = await requestClaude(contents);
  try {
    return { data: extractJson(firstResponse.text), model, provider: 'claude' as const };
  } catch (error) {
    console.warn('Claude returned invalid JSON; retrying once', { model, stopReason: firstResponse.stopReason, error: error instanceof Error ? error.message : 'UNKNOWN' });
    const retryResponse = await requestClaude(`${contents}\n\nSua resposta anterior não pôde ser interpretada. Retorne somente um objeto JSON válido, sem markdown, explicações ou texto adicional.`, true);
    return { data: extractJson(retryResponse.text), model, provider: 'claude' as const };
  }
};

export const getCommunityAiProvider = (): CommunityAiProvider =>
  process.env.AI_PROVIDER?.trim().toLowerCase() === 'claude' ? 'claude' : 'gemini';

export const isCommunityAiConfigured = () => getCommunityAiProvider() === 'claude'
  ? Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)
  : Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY);

export async function generateCommunityAiJson(input: GenerateCommunityAiJsonInput) {
  if (getCommunityAiProvider() === 'claude') return generateClaudeJson(input);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');
  const result = await generateGeminiJson({ apiKey, contents: input.contents, temperature: input.temperature });
  return { ...result, provider: 'gemini' as const };
}
