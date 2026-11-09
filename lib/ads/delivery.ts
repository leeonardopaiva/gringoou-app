import type { AdPlanValue } from '@/lib/ads/contracts';

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export type DeliveryCandidate = {
  id: string;
  adAccountId: string | null;
  plan: AdPlanValue | null;
  /** Impressões estimadas do pacote contratado (cadastradas no admin). */
  planTargetImpressions?: number;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  totalImpressions: number;
  recentImpressions: number;
  clicks: number;
  regionMatch: boolean;
  interestMatch: boolean;
  keywordMatch: boolean;
  categoryMatch: boolean;
};

export type DeliveryScore = {
  score: number;
  pacingMultiplier: number;
  qualityMultiplier: number;
  explorationMultiplier: number;
  reasons: string[];
};

export function scoreDeliveryCandidate(candidate: DeliveryCandidate, now = new Date()): DeliveryScore {
  const planTarget = candidate.planTargetImpressions ?? 5_000;
  const start = candidate.startsAt?.getTime() ?? candidate.createdAt.getTime();
  const end = candidate.endsAt?.getTime() ?? start + 30 * 24 * 60 * 60 * 1_000;
  const duration = Math.max(1, end - start);
  const elapsedRatio = clamp((now.getTime() - start) / duration, 0, 1);
  const deliveryRatio = clamp(candidate.totalImpressions / Math.max(1, planTarget), 0, 2);
  const deliveryGap = elapsedRatio - deliveryRatio;
  const pacingMultiplier = clamp(1 + deliveryGap * 2.2, 0.55, 2.5);

  // Bayesian smoothing prevents a new campaign with one click from dominating delivery.
  const adjustedCtr = (candidate.clicks + 2) / (candidate.totalImpressions + 100);
  const qualityMultiplier = clamp(adjustedCtr / 0.02, 0.65, 1.8);
  const explorationMultiplier = candidate.totalImpressions < 100
    ? 1.35
    : candidate.totalImpressions < 500
      ? 1.12
      : 1;
  const frequencyMultiplier = clamp(1 - candidate.recentImpressions * 0.22, 0.25, 1);
  const relevance = 1
    + (candidate.regionMatch ? 0.35 : 0)
    + (candidate.interestMatch ? 0.3 : 0)
    + (candidate.keywordMatch ? 0.4 : 0)
    + (candidate.categoryMatch ? 0.25 : 0);

  const reasons = [
    candidate.regionMatch ? 'region' : null,
    candidate.interestMatch ? 'interest' : null,
    candidate.keywordMatch ? 'search' : null,
    candidate.categoryMatch ? 'category' : null,
    deliveryGap > 0.08 ? 'pacing' : null,
    candidate.totalImpressions < 100 ? 'exploration' : null,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    score: Math.max(0.01, relevance * pacingMultiplier * qualityMultiplier * explorationMultiplier * frequencyMultiplier),
    pacingMultiplier,
    qualityMultiplier,
    explorationMultiplier,
    reasons,
  };
}

type WeightedCandidate<T> = { item: T; weight: number; advertiserId: string | null };

export function selectWeightedWithDiversity<T>(candidates: WeightedCandidate<T>[], limit: number): T[] {
  const pool = [...candidates];
  const selected: T[] = [];
  const selectedAdvertisers = new Set<string>();

  while (pool.length && selected.length < limit) {
    const weighted = pool.map((candidate) => ({
      candidate,
      effectiveWeight: candidate.weight * (
        candidate.advertiserId && selectedAdvertisers.has(candidate.advertiserId) ? 0.25 : 1
      ),
    }));
    const totalWeight = weighted.reduce((total, entry) => total + entry.effectiveWeight, 0);
    let cursor = Math.random() * totalWeight;
    let selectedIndex = weighted.length - 1;

    for (let index = 0; index < weighted.length; index += 1) {
      cursor -= weighted[index].effectiveWeight;
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }

    const [winner] = pool.splice(selectedIndex, 1);
    selected.push(winner.item);
    if (winner.advertiserId) selectedAdvertisers.add(winner.advertiserId);
  }

  return selected;
}
