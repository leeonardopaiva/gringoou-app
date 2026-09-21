import {
  BusinessStatus,
  BannerType,
  EventStatus,
  SuggestionCategory,
  SuggestionStatus,
  UserRole,
  VisibilityScope,
} from '@prisma/client';
import { z } from 'zod';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN, isReservedUsername } from '@/lib/username';
import { isValidHttpUrl, normalizeHttpUrlInput } from '@/lib/url';

const emptyToUndefined = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const optionalString = z.string().transform(emptyToUndefined).optional();
const optionalEmail = z
  .string()
  .transform(emptyToUndefined)
  .optional()
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'Use um email valido',
  });

const optionalUrl = z
  .string()
  .optional()
  .transform((value) => (typeof value === 'string' ? normalizeHttpUrlInput(value) : undefined))
  .transform((value) => (typeof value === 'string' ? emptyToUndefined(value) : undefined))
  .refine((value) => !value || isValidHttpUrl(value), {
    message: 'Use a valid URL starting with http:// or https://',
  });

const requiredUrl = z
  .string()
  .transform(normalizeHttpUrlInput)
  .refine((value) => value.length > 0, {
    message: 'Informe uma URL valida',
  })
  .refine((value) => isValidHttpUrl(value), {
    message: 'Use uma URL valida iniciando com http:// ou https://',
  });

const optionalUrlArray = z
  .array(z.string())
  .max(12, 'Use no maximo 12 imagens na galeria')
  .transform((values) =>
    Array.from(
      new Set(
        values
          .map((value) => normalizeHttpUrlInput(value))
          .map((value) => emptyToUndefined(value))
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  )
  .refine((values) => values.every((value) => isValidHttpUrl(value)), {
    message: 'Use URLs validas para a galeria iniciando com http:// ou https://',
  })
  .default([]);

const optionalDate = z
  .string()
  .trim()
  .transform(emptyToUndefined)
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: 'Use uma data valida.',
  });

const isValidPhoneContact = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[+\d\s().-]+$/.test(value);
};

const optionalContact = z
  .string()
  .optional()
  .transform((value) => (typeof value === 'string' ? emptyToUndefined(value) : undefined))
  .transform((value) => {
    if (!value || isValidPhoneContact(value)) return value;
    return normalizeHttpUrlInput(value);
  })
  .refine((value) => !value || isValidPhoneContact(value) || isValidHttpUrl(value), {
    message: 'Informe um telefone válido ou uma URL iniciando com http:// ou https://',
  });

const profileGalleryUrls = optionalUrlArray.refine((values) => values.length <= 8, {
  message: 'Use no maximo 8 imagens na galeria do perfil',
});

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH, 'Use ao menos 3 caracteres para seu nome publico')
  .max(USERNAME_MAX_LENGTH, `Use no maximo ${USERNAME_MAX_LENGTH} caracteres`)
  .regex(USERNAME_PATTERN, 'Use apenas letras minusculas, numeros e hifens')
  .refine((value) => !isReservedUsername(value), {
    message: 'Esse nome esta reservado pela plataforma',
  });

export const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: usernameSchema,
  email: z.string().email().optional(),
  phone: optionalString.refine((value) => !value || value.length >= 8, {
    message: 'Telefone muito curto',
  }),
  regionKey: z.string().trim().min(2, 'Selecione uma regiao valida'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], {
    message: 'Selecione uma opcao de genero',
  }),
  age: z.coerce.number().int().min(18, 'Voce deve ter pelo menos 18 anos').max(120, 'Informe uma idade valida'),
  timeAbroad: z.enum(
    ['LESS_THAN_ONE_YEAR', 'ONE_TO_THREE_YEARS', 'THREE_TO_FIVE_YEARS', 'MORE_THAN_FIVE_YEARS'],
    { message: 'Selecione ha quanto tempo voce esta no exterior' },
  ),
  birthCity: z.string().trim().min(2, 'Informe sua cidade natal').max(100),
  referralUsername: z
    .string()
    .trim()
    .nullish()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized ? normalized : undefined;
    }),
});

export const jobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(5000),
  employmentType: z.string().trim().min(2).max(60),
  locationLabel: z.string().trim().min(2).max(160),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).default('US'),
  salary: optionalString,
  contactUrl: optionalContact,
  imageUrl: optionalUrl,
  businessId: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const housingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(5000),
  propertyType: z.string().trim().min(2).max(60),
  locationLabel: z.string().trim().min(2).max(160),
  price: z.string().trim().min(1).max(80),
  imageUrl: optionalUrl,
  contactUrl: optionalUrl,
  isActive: z.boolean().optional(),
});

export const updateRegionSchema = z.object({
  regionKey: z.string().trim().min(2, 'Selecione uma regiao valida'),
});

export const updateProfileImageSchema = z.object({
  image: optionalUrl,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: usernameSchema,
  email: optionalEmail,
  phone: optionalString.refine((value) => !value || value.length >= 8, {
    message: 'Telefone muito curto',
  }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  age: z.coerce.number().int().min(18).max(120).optional(),
  timeAbroad: z.enum(
    ['LESS_THAN_ONE_YEAR', 'ONE_TO_THREE_YEARS', 'THREE_TO_FIVE_YEARS', 'MORE_THAN_FIVE_YEARS'],
  ).optional(),
  birthCity: z.string().trim().min(2).max(100).optional(),
  bio: z
    .string()
    .trim()
    .max(220, 'Use no maximo 220 caracteres na apresentacao.')
    .nullish()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized ? normalized : undefined;
    }),
  coverImageUrl: optionalUrl,
  galleryUrls: profileGalleryUrls,
  interests: z
    .array(z.string().trim().min(2).max(40))
    .max(8, 'Use no maximo 8 interesses')
    .transform((values) =>
      Array.from(
        new Set(
          values
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ),
    )
    .default([]),
});

export const requestEmailChangeSchema = z.object({
  email: z.string().trim().email('Use um email valido'),
});

export const updateBusinessMediaSchema = z.object({
  imageUrl: optionalUrl,
  galleryUrls: optionalUrlArray,
});

export const updateEventMediaSchema = z.object({
  imageUrl: optionalUrl,
  galleryUrls: optionalUrlArray,
});

const regionKeySchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minusculas, numeros e hifens');

export const adminRegionSchema = z.object({
  key: regionKeySchema.optional(),
  label: z.string().trim().min(3).max(80),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(40),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  aliases: z.array(z.string().trim().min(2).max(60)).max(20).default([]),
  isActive: z.boolean().default(true),
});

export const adminBannerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  imageUrl: requiredUrl,
  type: z.nativeEnum(BannerType).default(BannerType.LINK),
  targetUrl: optionalUrl,
  regionKey: z.string().trim().transform(emptyToUndefined).optional(),
  isActive: z.boolean().default(true),
  startsAt: optionalDate,
  endsAt: optionalDate,
}).superRefine((data, context) => {
  if (data.type === BannerType.LINK && !data.targetUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetUrl'],
      message: 'Informe o link de destino para banners do tipo link.',
    });
  }

  if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'A data final deve ser posterior a data inicial.',
    });
  }
});

const visibilitySettingsSchema = z
  .object({
    visibilityScope: z.nativeEnum(VisibilityScope).default(VisibilityScope.USER_REGION),
    visibilityRegionKey: z.string().trim().transform(emptyToUndefined).nullish(),
  })
  .superRefine((data, context) => {
    if (data.visibilityScope === VisibilityScope.SPECIFIC_REGION && !data.visibilityRegionKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['visibilityRegionKey'],
        message: 'Selecione uma regiao para a visibilidade especifica.',
      });
    }
  });

export const businessSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(40),
  description: z.string().trim().min(10).max(600),
  address: z.string().trim().min(5).max(140),
  regionKey: z.string().trim().min(2, 'Selecione uma regiao valida'),
  phone: optionalString,
  whatsapp: optionalString,
  website: optionalUrl,
  instagram: optionalString,
  imageUrl: optionalUrl,
  galleryUrls: optionalUrlArray,
});

export const eventSchema = z.object({
  title: z.string().trim().min(4).max(100),
  description: z.string().trim().min(10).max(700),
  venueName: z.string().trim().min(3).max(100),
  category: z.string().trim().min(2).max(60).default('Outros'),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  regionKey: z.string().trim().min(2, 'Selecione uma regiao valida'),
  businessId: z.string().trim().min(1).optional(),
  externalUrl: optionalUrl,
  imageUrl: optionalUrl,
  galleryUrls: optionalUrlArray,
});

export const adminBusinessSchema = businessSchema.merge(visibilitySettingsSchema).extend({
  status: z.nativeEnum(BusinessStatus),
});

export const adminEventSchema = eventSchema.merge(visibilitySettingsSchema).extend({
  status: z.nativeEnum(EventStatus),
});

export const adminUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  username: usernameSchema,
  email: optionalEmail,
  phone: optionalString.refine((value) => !value || value.length >= 8, {
    message: 'Telefone muito curto',
  }),
  image: optionalUrl,
  role: z.nativeEnum(UserRole),
  regionKey: z.string().trim().min(2, 'Selecione uma regiao valida'),
  onboardingCompleted: z.boolean().default(true),
});

export const communityPostSchema = z.object({
  content: z.string().trim().min(5).max(600, 'Use no maximo 600 caracteres'),
  imageUrl: optionalUrl,
  externalUrl: optionalUrl,
  personaMode: z.enum(['personal', 'professional']).default('personal'),
  businessId: z.string().trim().min(1).optional(),
  groupId: z.string().trim().min(1).optional(),
});

export const commentSchema = z.object({
  content: z.string().trim().min(2).max(240),
});

export const suggestionSchema = z.object({
  category: z.nativeEnum(SuggestionCategory),
  message: z.string().trim().min(8, 'Descreva melhor a sua sugestao').max(600),
});

export const friendRequestCreateSchema = z
  .object({
    recipientId: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.recipientId || value.username), {
    message: 'Informe o perfil que deseja adicionar.',
  });

export const friendRequestDecisionSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export const communityGroupSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do grupo').max(80),
  description: z
    .string()
    .trim()
    .max(360, 'Use no maximo 360 caracteres na descricao.')
    .nullish()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized ? normalized : undefined;
    }),
  category: z
    .string()
    .trim()
    .max(40, 'Use no maximo 40 caracteres na categoria.')
    .nullish()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized ? normalized : undefined;
    }),
  regionKey: z
    .string()
    .trim()
    .nullish()
    .transform((value) => {
      const normalized = value?.trim();
      return normalized ? normalized : undefined;
    }),
  imageUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).default('US'),
  isPublic: z.boolean().default(true),
});

export const eventUpdateSchema = eventSchema.partial();

export const communityGroupMemberActionSchema = z.object({
  action: z.enum(['approve', 'block', 'remove', 'promote', 'demote']),
});

export const adminSuggestionSchema = z.object({
  status: z.nativeEnum(SuggestionStatus),
});

export const businessReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend']),
});

export const eventReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel']),
});

export const postReviewSchema = z.object({
  action: z.enum(['approve', 'remove']),
});

export const starRatingSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
});

export const analyticsEventSchema = z.object({
  type: z.enum(['disabled_feature_click', 'banner_click', 'banner_registration', 'search_query']),
  targetType: z.enum(['feature', 'banner', 'search']),
  targetKey: z.string().trim().min(2).max(80),
  label: z.string().trim().min(2).max(120),
  sourcePath: z.string().trim().max(160).optional(),
  sourceSection: z.string().trim().max(80).optional(),
  regionKey: z.string().trim().max(80).optional(),
});
