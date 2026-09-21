import { generateGeminiJson } from '@/lib/gemini';
import claudeAgent from '@/config/claude-community-agent.json';

export type CommunityAiProvider = 'gemini' | 'claude';
type GenerateCommunityAiJsonInput = { contents: string; temperature?: number; maxTokens?: number };
type ClaudeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

const extractJson = (value: string) => JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/gi, '').trim() || '{}') as unknown;

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
  const requestBody = {
    model,
    max_tokens: maxTokens,
    system: claudeAgent.system,
    messages: [{ role: 'user', content: contents }],
    ...(supportsOutputEffort ? { output_config: { effort } } : {}),
    ...(acceptsTemperature ? { temperature } : {}),
  };
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null) as { content?: Array<{ type?: string; text?: string }>; error?: { message?: string } } | null;
  if (!response.ok) {
    console.warn('Claude request failed', { model, status: response.status });
    throw new Error(payload?.error?.message || `CLAUDE_HTTP_${response.status}`);
  }
  const text = payload?.content?.filter((item) => item.type === 'text').map((item) => item.text || '').join('\n') || '';
  return { data: extractJson(text), model, provider: 'claude' as const };
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
