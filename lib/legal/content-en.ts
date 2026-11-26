import { LEGAL_CONTACTS, LEGAL_ENTITY, LEGAL_ROLES } from '@/lib/legal/company';
import type { LegalDocument } from '@/lib/legal/content';

/**
 * English version of the Terms of Use and Privacy Policy. It mirrors the Portuguese text
 * (lib/legal/content.ts): when one changes, change the other and bump LEGAL_VERSION.
 */
const { name: COMPANY, address: ADDRESS, registryId: REGISTRY } = LEGAL_ENTITY;
const { privacy: PRIVACY_EMAIL, legal: LEGAL_EMAIL, abuse: ABUSE_EMAIL } = LEGAL_CONTACTS;
const UPDATED_AT = 'November 26, 2026';

const euRepresentative = LEGAL_ROLES.euRepresentative
  ? [`Our representative in the European Union (GDPR Art. 27) is ${LEGAL_ROLES.euRepresentative.name}, ${LEGAL_ROLES.euRepresentative.address}, email ${LEGAL_ROLES.euRepresentative.email}.`]
  : [];
const dpo = LEGAL_ROLES.dpo ? [`Our data protection officer (DPO) is ${LEGAL_ROLES.dpo.name}, email ${LEGAL_ROLES.dpo.email}.`] : [];
const dmca = LEGAL_ROLES.dmcaAgent
  ? [`Designated agent for copyright notices (DMCA): ${LEGAL_ROLES.dmcaAgent.name}, email ${LEGAL_ROLES.dmcaAgent.email}.`]
  : [];

export function getTermsDocumentEn(): LegalDocument {
  return {
    title: 'Terms of Use',
    updatedAt: UPDATED_AT,
    sections: [
      {
        id: 'who',
        title: '1. Who we are and acceptance',
        paragraphs: [
          `Gringoou is a community platform for Brazilians living outside Brazil, operated by ${COMPANY}, ${ADDRESS} (registry ${REGISTRY}).`,
          'By creating an account or using Gringoou, you confirm that you have read and agree to these Terms and to the Privacy Policy.',
        ],
      },
      {
        id: 'eligibility',
        title: '2. Who can use it, and your account',
        paragraphs: [
          'Gringoou is intended for people aged 18 or older. Accounts of minors are not allowed.',
          'You must provide truthful information, keep your credentials safe and answer for what happens in your account. Each person may have one account, and each confirmed phone number can be linked to one account only.',
          'To protect the community, we confirm your phone number by SMS before you can use the platform.',
        ],
      },
      {
        id: 'regions',
        title: '3. Regions and availability',
        paragraphs: [
          'Gringoou is opened gradually, country by country and region by region. You see the content of the region you chose, and you may only choose regions in the country where you live, unless your access location shows that you are in another country.',
          'We may limit or block access by country or region for legal, security or operational reasons. You may not use means to bypass this location check.',
        ],
      },
      {
        id: 'content',
        title: '4. Content and conduct',
        paragraphs: [
          'You are responsible for what you post. Do not post content that is illegal, misleading, discriminatory, that encourages violence, that infringes the rights of others or that exposes other people’s personal data without permission.',
          'You keep the rights to your content and grant us a non-exclusive, free, worldwide license to display, store and distribute it within Gringoou, only to operate and promote the platform. The license ends when you remove the content or the account, except for what others have already shared or what we must keep by law.',
          'We may review, limit or remove content and accounts that violate these Terms, and we will explain why whenever the law requires it or when possible.',
        ],
      },
      {
        id: 'marketplace',
        title: '5. Businesses, jobs, housing and marketplace',
        paragraphs: [
          'Gringoou connects community members but is not a party to contracts between users, advertisers, employers, landlords, sellers and buyers, and does not guarantee the accuracy of listings or the outcome of any deal.',
          'Companies and recruiters must be authorized to publish opportunities. Be wary of requests for upfront payment and verify information before closing any deal.',
        ],
      },
      {
        id: 'ads',
        title: '6. Ads and payments',
        paragraphs: [
          'Paid ads are reviewed before publication and may be declined. Payments are processed by Stripe; we do not store your full card details.',
          'Prices, refunds and cancellations follow the conditions shown at purchase and the consumer rights guaranteed by the law of your country. Prices may not include local taxes, where applicable.',
        ],
      },
      {
        id: 'reports',
        title: '7. Reports and moderation',
        paragraphs: [
          `To report illegal content or content that violates these Terms, use the report button available on content or write to ${ABUSE_EMAIL}, saying where the content is, why you are reporting it and how to reach you. We review notices and take appropriate action.`,
          `If your content is removed or your account is limited, you can ask for a review of the decision at ${LEGAL_EMAIL}.`,
        ],
      },
      {
        id: 'ip',
        title: '8. Intellectual property and copyright',
        paragraphs: [
          'The Gringoou brand, code and design belong to Gringoou LLC. You may not copy, resell or exploit the platform beyond the normal use allowed.',
          `If you believe content infringes your copyright, send a notice to ${ABUSE_EMAIL} identifying the work, the location of the content and your contact details.`,
          ...dmca,
        ],
      },
      {
        id: 'termination',
        title: '9. Suspension and termination',
        paragraphs: [
          'You can close your account at any time from the account menu, under Privacy. We may suspend or close accounts that violate these Terms, put people at risk or use the platform for fraud or abuse.',
        ],
      },
      {
        id: 'liability',
        title: '10. Limitation of liability',
        paragraphs: [
          'Gringoou is provided “as is” and may be interrupted. To the extent permitted by law, Gringoou LLC is not liable for indirect damages, lost profits or the acts of users and third parties.',
          'Nothing in these Terms excludes or limits rights that the law of your country gives you as a consumer and that cannot be waived by contract.',
        ],
      },
      {
        id: 'law',
        title: '11. Governing law and venue',
        paragraphs: [
          'These Terms are governed by the laws of the State of Connecticut, United States. Disputes will be brought before the competent courts of Connecticut.',
          'If you are a consumer living in another country, this does not remove the mandatory rights of your local law or your right to sue in the venue that law guarantees you.',
        ],
      },
      {
        id: 'changes',
        title: '12. Changes',
        paragraphs: [
          'We may update these Terms to reflect legal or product changes. For relevant changes we will give reasonable notice (generally 30 days) by email or on the platform. Continued use after the update means you accept the new version.',
        ],
      },
      {
        id: 'contact',
        title: '13. Contact',
        paragraphs: [`Questions about these Terms: ${LEGAL_EMAIL}. Mail: ${COMPANY}, ${ADDRESS}.`],
      },
    ],
    regional: [
      {
        id: 'eu',
        title: 'European Union and Portugal',
        paragraphs: [
          'The rights that European Union and Portuguese consumer protection law gives you continue to apply, including the right to go to the courts of the country where you live and to consumer dispute resolution bodies.',
          'For business users (businesses and advertisers), we give advance notice of changes to the terms and describe in these Terms how content is moderated and ranked.',
        ],
      },
      {
        id: 'ca',
        title: 'Canada',
        paragraphs: [
          'If you live in Canada, the consumer protection rights of your province continue to apply. French versions will be provided before opening a region in Quebec.',
        ],
      },
      {
        id: 'br',
        title: 'Brazil',
        paragraphs: [
          'If you live in Brazil, the Consumer Defense Code (CDC) and Brazilian law apply where mandatory, including the consumer’s venue.',
        ],
      },
      {
        id: 'us',
        title: 'United States',
        paragraphs: [
          'In the United States, these Terms are governed by Connecticut law. Rights that your state’s laws give you and that cannot be waived by contract continue to apply.',
        ],
      },
    ],
  };
}

export function getPrivacyDocumentEn(): LegalDocument {
  return {
    title: 'Privacy Policy',
    updatedAt: UPDATED_AT,
    sections: [
      {
        id: 'controller',
        title: '1. Who is responsible for your data',
        paragraphs: [
          `The controller of your personal data is ${COMPANY}, ${ADDRESS} (registry ${REGISTRY}).`,
          `Contact for privacy matters and requests about your data: ${PRIVACY_EMAIL}.`,
          ...euRepresentative,
          ...dpo,
        ],
      },
      {
        id: 'data',
        title: '2. Data we collect',
        paragraphs: [
          'Account and profile: name, public name, email, password (stored encrypted) and the information you choose to provide, such as age, gender, time abroad, hometown, photo, bio and interests.',
          'Phone and location: the phone number confirmed by SMS and its country; the region you choose; and the country of your access, identified by IP address, used to open regions and for security.',
          'Content and interactions: posts, comments, messages, ads, businesses, events, jobs and housing listings you create, plus likes, favorites and reports.',
          'Usage and device: technical records (such as IP, browser type and pages visited) needed for security, abuse prevention and to run the service.',
          'Payments: if you buy ads, Stripe processes the payment data. We only receive the confirmation and basic transaction details.',
          'We do not ask for sensitive data such as racial or ethnic origin, religion or health. Please avoid including it in free-text fields of your profile or posts.',
        ],
      },
      {
        id: 'purposes',
        title: '3. What we use it for and the legal basis',
        paragraphs: [
          'Providing the service (performance of a contract): creating and keeping your account, showing your region’s content, enabling posts, messages and ads.',
          'Security and abuse prevention (legitimate interest): confirming your phone, limiting abuse, detecting fraud, moderating content and protecting the community.',
          'Complying with legal obligations: responding to authorities and keeping records when the law requires.',
          'Service communications (performance of a contract): notices about your account, security and changes to these texts.',
          'Consent: only when we ask, for example for cookies or non-essential communications. You can withdraw consent at any time.',
        ],
      },
      {
        id: 'phone',
        title: '4. Phone verification and location',
        paragraphs: [
          'We send a code by SMS, through Twilio, to confirm the phone is yours. We use the phone and its country for security and to open the right region. We do not use your phone for marketing.',
        ],
      },
      {
        id: 'sharing',
        title: '5. Who we share it with',
        paragraphs: [
          'We do not sell personal data. We share data with providers that deliver services to us, only for the purpose of the service: hosting (Vercel), database (Neon), SMS (Twilio), payments (Stripe), images (Cloudinary), real-time messaging (Ably), maps (Mapbox), abuse control (Upstash), sign-in (Google) and email delivery.',
          'Artificial intelligence features (assistant and search) send the text you type to AI providers (Google and Anthropic) to generate the answer. Do not send confidential data to the assistant.',
          'We may also share data when the law requires, to comply with an order from an authority, or to protect people’s rights and safety.',
        ],
      },
      {
        id: 'transfers',
        title: '6. International transfers',
        paragraphs: [
          'Our company and several providers are in the United States, and your data may be processed outside the country where you live. When the law requires, we use recognized safeguards, such as standard contractual clauses or adequacy mechanisms.',
        ],
      },
      {
        id: 'retention',
        title: '7. How long we keep it',
        paragraphs: [
          'We keep data while your account is active. When you delete your account, we remove or anonymize your personal data, except what we must keep for legal obligations, security, fraud prevention or defense of rights, for as long as necessary.',
        ],
      },
      {
        id: 'rights',
        title: '8. Your rights',
        paragraphs: [
          'You can ask for access, correction, deletion, portability, restriction and objection to the processing of your data, and withdraw consents you gave.',
          `In the account menu, under Privacy, you can export your data and delete your account. For other requests, write to ${PRIVACY_EMAIL}. We reply within 30 days, or within the time your country’s law sets.`,
          'You can also complain to the data protection authority of your country.',
        ],
      },
      {
        id: 'cookies',
        title: '9. Cookies and on-device storage',
        paragraphs: [
          'We only use essential cookies and storage: keeping you signed in, protecting access and saving device preferences such as theme and language. We measure usage with our own events, without sending data to advertising networks.',
          'If we start using non-essential cookies (such as third-party analytics or advertising), we will ask for your consent first.',
        ],
      },
      {
        id: 'security',
        title: '10. Security and incidents',
        paragraphs: [
          'We use technical and organizational controls to reduce the risk of improper access, such as encrypted connections, protected passwords and access control. If an incident puts your data at risk, we will notify you and the authorities within the deadlines the law requires.',
        ],
      },
      {
        id: 'children',
        title: '11. Minors',
        paragraphs: ['Gringoou is intended for people over 18. If we identify a minor’s account, we will close it and delete the data.'],
      },
      {
        id: 'changes',
        title: '12. Changes and contact',
        paragraphs: [`When we change this Policy in a relevant way, we will notify you by email or on the platform. Questions: ${PRIVACY_EMAIL}.`],
      },
    ],
    regional: [
      {
        id: 'eu',
        title: 'European Union and Portugal (GDPR)',
        paragraphs: [
          'For people in the European Union, we process data under the General Data Protection Regulation (GDPR) and the Portuguese implementing law (Law No. 58/2019). The legal bases are those described in section 3.',
          'In addition to the rights in section 8, you may lodge a complaint with a supervisory authority: in Portugal, the National Data Protection Commission (CNPD, www.cnpd.pt); in another EU country, the authority where you live or work.',
          'Your data is transferred to the United States with the safeguards described in section 6.',
          ...euRepresentative,
        ],
      },
      {
        id: 'ca',
        title: 'Canada (PIPEDA and provincial laws)',
        paragraphs: [
          'For people in Canada, we process data under PIPEDA and applicable provincial laws, with meaningful consent, collection limited to what is needed, and access to your data on request.',
          'Your data is processed outside Canada, in the United States and in other countries where our providers operate, and may be subject to the laws of, and access by authorities in, those countries.',
          `Contact for privacy compliance: ${PRIVACY_EMAIL}. You may complain to the Office of the Privacy Commissioner of Canada or to your province’s authority.`,
        ],
      },
      {
        id: 'br',
        title: 'Brazil (LGPD)',
        paragraphs: [
          'For data subjects in Brazil, we apply the General Data Protection Law (Law No. 13,709/2018). You have the rights in Art. 18 of the LGPD, including confirmation of processing, access, correction, anonymization, portability and deletion.',
          'You may complain to the National Data Protection Authority (ANPD).',
          ...dpo,
        ],
      },
      {
        id: 'us',
        title: 'United States',
        paragraphs: [
          'In the United States, we respect the privacy rights given by applicable state laws. We do not sell personal data or share it for cross-context behavioral advertising.',
          `You can send requests to ${PRIVACY_EMAIL}. We will respond within the time set by your state’s law.`,
        ],
      },
    ],
  };
}
