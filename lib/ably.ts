import 'server-only';

import Ably from 'ably';

let restClient: Ably.Rest | null = null;

const getRestClient = () => {
  const apiKey = process.env.ABLY_API_KEY?.trim();
  if (!apiKey) return null;
  if (!restClient) {
    restClient = new Ably.Rest(apiKey);
  }
  return restClient;
};

/** Gera um token real (string) para o cliente se autenticar no Ably. */
export const generateAblyClientToken = async (userId: string, ttlSeconds = 3600): Promise<string | null> => {
  const client = getRestClient();
  if (!client) return null;

  try {
    const tokenDetails = await client.auth.requestToken({
      clientId: userId,
      ttl: ttlSeconds * 1000,
      capability: { 'marketplace:conversation:*': ['subscribe'] },
    });
    return tokenDetails.token ?? null;
  } catch (error) {
    console.error('Failed to generate Ably token:', error);
    return null;
  }
};

/** Publica um evento de nova mensagem no canal da conversa. */
export const publishNewMessage = async (
  conversationId: string,
  event: { type: string; data: Record<string, unknown> },
): Promise<boolean> => {
  const client = getRestClient();
  if (!client) return false;

  try {
    const channel = client.channels.get(`marketplace:conversation:${conversationId}`);
    await channel.publish(event.type, event.data);
    return true;
  } catch (error) {
    console.error('Failed to publish message to Ably:', error);
    return false;
  }
};