/**
 * OAuth State Encryption
 * Secure encryption/decryption for OAuth state parameters
 */

import crypto from 'crypto';
import { OAuthState } from './types';

const ENCRYPTION_KEY = process.env.OAUTH_STATE_SECRET || 'default-32-char-secret-key-here!';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt OAuth state object
 */
export function encryptState(state: Omit<OAuthState, 'nonce' | 'timestamp'>): string {
  const fullState: OAuthState = {
    ...state,
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
  };

  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(JSON.stringify(fullState), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt and validate OAuth state
 */
export function decryptState(encryptedState: string): OAuthState {
  const [ivHex, authTagHex, encrypted] = encryptedState.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid state format');
  }

  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  const state: OAuthState = JSON.parse(decrypted);

  // Validate timestamp (max 10 minutes old)
  const age = Date.now() - state.timestamp;
  if (age > 10 * 60 * 1000) {
    throw new Error('State expired');
  }

  return state;
}

/**
 * Generate CSRF token for OAuth flow
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, expectedToken: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}
