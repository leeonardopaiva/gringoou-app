import { redirect } from 'next/navigation';

/** Rota legada: as conversas do Marketplace vivem na Inbox unificada. */
export default async function MarketplaceConversationsRoute({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { conversation } = await searchParams;
  redirect(conversation ? `/inbox?conversation=${encodeURIComponent(conversation)}` : '/inbox');
}
