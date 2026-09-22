export type OperationalFeature = 'registration' | 'aiAssistant' | 'adsCheckout';

const featureEnvironment: Record<OperationalFeature, string> = {
  registration: 'REGISTRATION_ENABLED',
  aiAssistant: 'AI_ASSISTANT_ENABLED',
  adsCheckout: 'ADS_CHECKOUT_ENABLED',
};

const isExplicitlyDisabled = (value: string | undefined) =>
  value?.trim().toLowerCase() === 'false';

export const isOperationalFeatureEnabled = (feature: OperationalFeature) =>
  !isExplicitlyDisabled(process.env[featureEnvironment[feature]]);
