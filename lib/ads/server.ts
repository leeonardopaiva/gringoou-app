import 'server-only';
import Stripe from 'stripe';
import type { AdGoalValue } from './contracts';

export const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY não configurada.');
  return new Stripe(secretKey);
};

export const getAdDestinationFields = (goal: AdGoalValue, destination: string) => {
  const normalized = destination.trim();

  if (goal === 'WHATSAPP') {
    const whatsappNumber = normalized.replace(/\D/g, '');
    return {
      targetUrl: `https://wa.me/${whatsappNumber}`,
      whatsappNumber,
      marketplaceItemId: null,
    };
  }

  if (goal === 'MARKETPLACE') {
    return {
      targetUrl: `/marketplace?item=${encodeURIComponent(normalized)}`,
      whatsappNumber: null,
      marketplaceItemId: normalized,
    };
  }

  return {
    targetUrl: normalized,
    whatsappNumber: null,
    marketplaceItemId: null,
  };
};

