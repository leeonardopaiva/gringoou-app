export type OperationalFeature =
  | 'registration'
  | 'aiAssistant'
  | 'adsCheckout'
  | 'privateBeta'
  | 'inviteOnlyRegistration'
  | 'geoRestriction';

const featureEnvironment: Record<OperationalFeature, string> = {
  registration: 'REGISTRATION_ENABLED',
  aiAssistant: 'AI_ASSISTANT_ENABLED',
  adsCheckout: 'ADS_CHECKOUT_ENABLED',
  privateBeta: 'PRIVATE_BETA_ENABLED',
  inviteOnlyRegistration: 'INVITE_ONLY_REGISTRATION',
  geoRestriction: 'GEO_RESTRICTION_ENABLED',
};

const isExplicitlyDisabled = (value: string | undefined) =>
  value?.trim().toLowerCase() === 'false';

export const isOperationalFeatureEnabled = (feature: OperationalFeature) =>
  !isExplicitlyDisabled(process.env[featureEnvironment[feature]]);

/**
 * Países bloqueados durante o Private Beta (lista de bloqueio).
 * Formato: lista separada por vírgula de códigos ISO-3166-1 alpha-2.
 * Ex.: "BR,AR,CL,CO,PE,VE,UY,PY,BO,EC,GY,SR,GF"
 */
export const getGeoBlockedCountries = (): string[] =>
  (process.env.GEO_BLOCKED_COUNTRIES ?? '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
