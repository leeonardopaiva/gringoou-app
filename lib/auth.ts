import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { cookies } from 'next/headers';
import { isConfiguredAdminEmail, syncAdminRole } from '@/lib/admin';
import {
  emailFrom,
  emailProviderServer,
  isEmailAuthConfigured,
  sendMagicLinkVerification,
} from '@/lib/email-auth';
import { normalizeAuthEmail, verifyPassword } from '@/lib/password-auth';
import { prisma } from '@/lib/prisma';
import { isOperationalFeatureEnabled } from '@/lib/operational-flags';
import { isDevAuthEnabled } from '@/lib/dev-magic-links';
import { USE_MOCKS } from '@/lib/server/mocks/config';
import { getMockDevUser } from '@/lib/server/mocks/profiles.mock';
import { consumeInvite, isInviteOnlyRegistration, validateInvite } from '@/lib/invites';
import { INVITE_COOKIE_NAME, verifyInviteToken } from '@/lib/invite-token';

// On Vercel, a stale localhost NEXTAUTH_URL (often copied from the local .env)
// makes NextAuth build an unreachable OAuth redirect_uri and the callback fails
// with OAuthCallback. Derive the public URL from the deployment when the
// configured one still points at localhost.
if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXTAUTH_URL &&
  /localhost|127\.0\.0\.1/i.test(process.env.NEXTAUTH_URL)
) {
  const deploymentHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//i, '');
  if (deploymentHost) {
    process.env.NEXTAUTH_URL = `https://${deploymentHost.replace(/\/$/, '')}`;
  }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const passwordAuthEnabled = process.env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED !== 'false';
const sessionMaxAgeSeconds = 8 * 60 * 60;

const getAuthRedirectOrigin = (baseUrl: string) => {
  if (process.env.NODE_ENV !== 'production') return baseUrl.replace(/\/$/, '');

  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin);
      if (parsed.hostname === 'gringoou.com' || parsed.hostname === 'www.gringoou.com') {
        return parsed.origin;
      }
    } catch {
      // Usa o dominio canonico abaixo quando a variavel estiver invalida.
    }
  }

  return 'https://gringoou.com';
};

export const isGoogleAuthConfigured = Boolean(
  googleClientId && googleClientSecret && process.env.NEXTAUTH_SECRET,
);

export const isPasswordAuthConfigured = Boolean(passwordAuthEnabled && process.env.NEXTAUTH_SECRET);

// Local-dev-only bypass: lets a developer sign in without Google/DB when
// mocked content is being used, reusing the same flags as the dev magic-link
// shortcut (never true in production).
export const isMockDevAuthConfigured = USE_MOCKS && isDevAuthEnabled;

/**
 * Lê o convite do cookie de curta duração e o consome para o usuário.
 * Retorna true se o convite foi consumido com sucesso; false se não houver
 * cookie válido ou se o consumo falhar.
 */
async function consumeInviteFromCookie(email: string, userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(INVITE_COOKIE_NAME)?.value;
  const payload = verifyInviteToken(token);

  if (!payload) {
    return false;
  }

  const result = await consumeInvite(payload.code, email, userId);
  return result.ok;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  // Enable only on demand in local development with NEXTAUTH_DEBUG=true.
  // Never enable this variable in production because OAuth diagnostics can be verbose.
  debug: process.env.NODE_ENV !== 'production' && process.env.NEXTAUTH_DEBUG === 'true',
  session: {
    strategy: 'jwt',
    maxAge: sessionMaxAgeSeconds,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/access-blocked',
  },
  providers: [
    ...(isPasswordAuthConfigured
      ? [
          CredentialsProvider({
            name: 'Email e senha',
            credentials: {
              email: { label: 'Email', type: 'email' },
              password: { label: 'Senha', type: 'password' },
            },
            async authorize(credentials) {
              const email = credentials?.email ? normalizeAuthEmail(credentials.email) : '';
              const password = credentials?.password || '';

              if (!email || !password) {
                return null;
              }

              const user = await prisma.user.findUnique({
                where: { email },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  role: true,
                  username: true,
                  phone: true,
                  locationLabel: true,
                  regionKey: true,
                  onboardingCompleted: true,
                  recruiterVerified: true,
                  isAdvertiser: true,
                  passwordHash: true,
                  emailVerified: true,
                  emailVerificationRequired: true,
                },
              });

              if (
                !user ||
                (user.emailVerificationRequired && !user.emailVerified) ||
                !(await verifyPassword(password, user.passwordHash))
              ) {
                return null;
              }

              return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                username: user.username,
                phone: user.phone,
                locationLabel: user.locationLabel,
                regionKey: user.regionKey,
                onboardingCompleted: user.onboardingCompleted,
                recruiterVerified: user.recruiterVerified,
                isAdvertiser: user.isAdvertiser,
              };
            },
          }),
        ]
      : []),
    ...(isEmailAuthConfigured
      ? [
          EmailProvider({
            server: emailProviderServer,
            from: emailFrom,
            maxAge: 15 * 60,
            sendVerificationRequest: async (params) => {
              const email = normalizeAuthEmail(params.identifier);
              const existingUser = await prisma.user.findUnique({
                where: { email },
                select: { id: true },
              });

              if (!isOperationalFeatureEnabled('registration')) {
                if (!existingUser) throw new Error('REGISTRATION_DISABLED');
              }

              // Private Beta: novos cadastros por e-mail exigem convite válido.
              if (isInviteOnlyRegistration() && !existingUser) {
                const cookieStore = await cookies();
                const token = cookieStore.get(INVITE_COOKIE_NAME)?.value;
                const payload = verifyInviteToken(token);

                if (!payload) {
                  throw new Error('INVITE_REQUIRED');
                }

                const validation = await validateInvite(payload.code, email);
                if (!validation.ok) {
                  throw new Error('INVITE_REQUIRED');
                }
              }

              await sendMagicLinkVerification(params);
            },
          }),
        ]
      : []),
    ...(isGoogleAuthConfigured
      ? [
        GoogleProvider({
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          allowDangerousEmailAccountLinking: true,
        }),
      ]
      : []),
    ...(isMockDevAuthConfigured
      ? [
          CredentialsProvider({
            id: 'mock-dev',
            name: 'Usuário de teste',
            credentials: {},
            async authorize() {
              return getMockDevUser();
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const targetOrigin = getAuthRedirectOrigin(baseUrl);

      if (url.startsWith('/')) return `${targetOrigin}${url}`;

      try {
        const target = new URL(url);
        const currentBase = new URL(baseUrl);
        if (target.origin === currentBase.origin) {
          return `${targetOrigin}${target.pathname}${target.search}${target.hash}`;
        }
        if (target.origin === targetOrigin) return target.toString();
      } catch {
        return targetOrigin;
      }

      return targetOrigin;
    },
    async signIn({ user, account, profile }) {
      if (!isOperationalFeatureEnabled('registration') && ['google', 'email'].includes(account?.provider || '')) {
        const candidateEmail = normalizeAuthEmail(user.email || '');
        const existingUser = candidateEmail
          ? await prisma.user.findUnique({ where: { email: candidateEmail }, select: { id: true } })
          : null;
        if (!existingUser) return false;
      }

      if (account?.provider === 'google') {
        const googleProfile = profile as { email?: string; email_verified?: boolean } | undefined;
        const verifiedEmail = googleProfile?.email_verified === true
          ? normalizeAuthEmail(googleProfile.email || user.email || '')
          : '';

        if (!verifiedEmail) {
          return false;
        }

        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: { id: true },
        });

        if (!existingAccount) {
          const existingUser = await prisma.user.findUnique({
            where: { email: verifiedEmail },
            select: { id: true },
          });

          if (existingUser) {
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              create: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state ? String(account.session_state) : null,
              },
              update: {},
            });
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date(), emailVerificationRequired: false },
            });
          } else if (isInviteOnlyRegistration()) {
            // Novo cadastro via Google: exige convite válido.
            const consumed = await consumeInviteFromCookie(verifiedEmail, user.id || '');
            if (!consumed) {
              return false;
            }
          }
        }
      }

      if (account?.provider === 'email' && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date(),
            emailVerificationRequired: false,
          },
        });

        // Novo cadastro via magic link: consome o convite apenas se houver
        // cookie válido (usuários existentes não possuem cookie e seguem livres).
        if (isInviteOnlyRegistration()) {
          const email = normalizeAuthEmail(user.email || '');
          const cookieStore = await cookies();
          const token = cookieStore.get(INVITE_COOKIE_NAME)?.value;
          const payload = verifyInviteToken(token);

          if (payload) {
            const result = await consumeInvite(payload.code, email, user.id);
            if (!result.ok) {
              return false;
            }
          }
        }
      }

      if (user.id && isConfiguredAdminEmail(user.email)) {
        // Admin role sync is a convenience step; never let it break sign-in.
        try {
          await syncAdminRole(user.id, user.email);
        } catch (error) {
          console.error('[auth] syncAdminRole failed during signIn:', error);
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      const userId = user?.id || token.id || token.sub;

      if (!userId) {
        return token;
      }

      if (USE_MOCKS) {
        // Local mock mode: this callback re-runs on every getServerSession()/useSession()
        // call, and a DB-backed refresh here would hit the real database on every page
        // even though the mocked flows never need it. Keep whatever the token/provider
        // already carries instead of round-tripping to Prisma.
        token.id = userId;
        token.sub = userId;
        token.accountDeleted = false;

        if (user) {
          const mockUser = user as typeof user & {
            role?: string;
            username?: string | null;
            phone?: string | null;
            locationLabel?: string | null;
            regionKey?: string | null;
            onboardingCompleted?: boolean;
            recruiterVerified?: boolean;
            isAdvertiser?: boolean;
          };
          token.name = mockUser.name;
          token.email = mockUser.email;
          token.picture = mockUser.image;
          token.role = mockUser.role ?? token.role ?? 'USER';
          token.username = mockUser.username ?? token.username ?? null;
          token.phone = mockUser.phone ?? token.phone ?? null;
          token.locationLabel = mockUser.locationLabel ?? token.locationLabel ?? null;
          token.regionKey = mockUser.regionKey ?? token.regionKey ?? null;
          token.onboardingCompleted = mockUser.onboardingCompleted ?? token.onboardingCompleted ?? true;
          token.recruiterVerified = mockUser.recruiterVerified ?? token.recruiterVerified ?? false;
          token.isAdvertiser = mockUser.isAdvertiser ?? token.isAdvertiser ?? false;
          // Mock accounts exist only for local development and skip SMS confirmation.
          token.phoneVerified = true;
        }

        // Real accounts still need onboarding and SMS confirmation read from the database,
        // so changes made during the session show up without signing out again.
        // Mock accounts are complete from sign-in and skip this lookup.
        if (!token.phoneVerified || !token.onboardingCompleted || !token.username) {
          const dbRow = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              username: true,
              phone: true,
              locationLabel: true,
              regionKey: true,
              onboardingCompleted: true,
              phoneVerifiedAt: true,
            },
          });

          if (dbRow) {
            token.username = dbRow.username;
            token.phone = dbRow.phone;
            token.locationLabel = dbRow.locationLabel;
            token.regionKey = dbRow.regionKey;
            token.onboardingCompleted = dbRow.onboardingCompleted;
            token.phoneVerified = Boolean(dbRow.phoneVerifiedAt);
          }
        }

        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          username: true,
          phone: true,
          locationLabel: true,
          regionKey: true,
          onboardingCompleted: true,
          recruiterVerified: true,
          isAdvertiser: true,
          phoneVerifiedAt: true,
        },
      });

      if (!dbUser) {
        token.id = '';
        token.sub = '';
        token.role = 'USER';
        token.accountDeleted = true;
        return token;
      }

      token.id = dbUser.id;
      token.sub = dbUser.id;
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.picture = dbUser.image;
      token.role = dbUser.role;
      token.username = dbUser.username;
      token.phone = dbUser.phone;
      token.locationLabel = dbUser.locationLabel;
      token.regionKey = dbUser.regionKey;
      token.onboardingCompleted = dbUser.onboardingCompleted;
      token.recruiterVerified = dbUser.recruiterVerified;
      token.isAdvertiser = dbUser.isAdvertiser;
      token.phoneVerified = Boolean(dbUser.phoneVerifiedAt);
      token.accountDeleted = false;

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      session.user.id = String(token.id || token.sub || '');
      session.user.accountDeleted = Boolean(token.accountDeleted);
      session.user.role = (token.role || 'USER') as typeof session.user.role;
      session.user.username = (token.username as string | null | undefined) ?? null;
      session.user.phone = (token.phone as string | null | undefined) ?? null;
      session.user.locationLabel = (token.locationLabel as string | null | undefined) ?? null;
      session.user.regionKey = (token.regionKey as string | null | undefined) ?? null;
      session.user.onboardingCompleted = Boolean(token.onboardingCompleted);
      session.user.recruiterVerified = Boolean(token.recruiterVerified);
      session.user.isAdvertiser = Boolean(token.isAdvertiser);
      session.user.phoneVerified = Boolean(token.phoneVerified);
      session.user.name = (token.name as string | null | undefined) ?? null;
      session.user.email = (token.email as string | null | undefined) ?? null;
      session.user.image = (token.picture as string | null | undefined) ?? null;

      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
