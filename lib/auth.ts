import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { isConfiguredAdminEmail, syncAdminRole } from '@/lib/admin';
import {
  emailFrom,
  emailProviderServer,
  isEmailAuthConfigured,
  sendMagicLinkVerification,
} from '@/lib/email-auth';
import { normalizeAuthEmail, verifyPassword } from '@/lib/password-auth';
import { prisma } from '@/lib/prisma';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const passwordAuthEnabled = process.env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED !== 'false';
const sessionMaxAgeSeconds = 8 * 60 * 60;

export const isGoogleAuthConfigured = Boolean(
  googleClientId && googleClientSecret && process.env.NEXTAUTH_SECRET,
);

export const isPasswordAuthConfigured = Boolean(passwordAuthEnabled && process.env.NEXTAUTH_SECRET);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
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
            sendVerificationRequest: sendMagicLinkVerification,
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
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'email' && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date(),
            emailVerificationRequired: false,
          },
        });
      }

      if (user.id && isConfiguredAdminEmail(user.email)) {
        await syncAdminRole(user.id, user.email);
      }

      return true;
    },
    async jwt({ token, user }) {
      const userId = user?.id || token.id || token.sub;

      if (!userId) {
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
