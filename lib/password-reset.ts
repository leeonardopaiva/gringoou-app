import { createHash, randomBytes } from 'node:crypto';

export const PASSWORD_RESET_MAX_AGE_MS = 30 * 60 * 1000;
export const createPasswordResetToken = () => randomBytes(32).toString('hex');
export const hashPasswordResetToken = (token: string) => createHash('sha256').update(token).digest('hex');
