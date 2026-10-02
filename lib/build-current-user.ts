import { UserRole, type User } from '@/types';
import { DEFAULT_AVATAR_URL } from '@/lib/avatar';

export const mapUserRole = (role?: string | null): UserRole => {
  switch (role) {
    case UserRole.ADMIN:
      return UserRole.ADMIN;
    case UserRole.MODERATOR:
      return UserRole.MODERATOR;
    case UserRole.BUSINESS_OWNER:
      return UserRole.BUSINESS_OWNER;
    case UserRole.COMPANY:
      return UserRole.COMPANY;
    default:
      return UserRole.USER;
  }
};

export function buildCurrentUser(sessionUser: {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  phone?: string | null;
  locationLabel?: string | null;
  regionKey?: string | null;
  role?: string | null;
  recruiterVerified?: boolean;
}): User {
  return {
    id: sessionUser.id,
    name: sessionUser.name || 'Comunidade Gringoou',
    username: sessionUser.username,
    role: mapUserRole(sessionUser.role),
    avatar: sessionUser.image || DEFAULT_AVATAR_URL,
    location: sessionUser.locationLabel || 'Defina sua regiao',
    regionKey: sessionUser.regionKey,
    email: sessionUser.email,
    phone: sessionUser.phone,
    recruiterVerified: Boolean(sessionUser.recruiterVerified),
  };
}