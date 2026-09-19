import { AdsSettingsClient } from '@/components/ads/AdsSettingsClient';
import { requireAdAccountPage } from '@/lib/ads/account';
import { prisma } from '@/lib/prisma';

export default async function AdsSettingsPage() {
  const { session, membership } = await requireAdAccountPage();
  const [account, user] = await Promise.all([
    prisma.adAccount.findUniqueOrThrow({ where: { id: membership.adAccountId }, include: { business: { select: { id: true, slug: true, name: true } }, users: { orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true, email: true, image: true } } } } } }),
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { name: true, email: true, marketingEmailsOptOut: true, preferredLanguage: true } }),
  ]);
  return <AdsSettingsClient initialAccount={account} initialUser={user} />;
}
