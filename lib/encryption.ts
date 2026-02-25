/**
 * Encryption/decryption for API keys and credentials.
 * Uses Web Crypto API with AES-256-GCM + PBKDF2.
 *
 * Format (v2): base64( version[1] | salt[16] | iv[12] | ciphertext+tag )
 * Backward-compatible: decryption auto-detects v1 (no salt prefix) vs v2.
 *
 * Note: For production, consider using Supabase Vault or a dedicated key management service.
 */

const VERSION_BYTE = 0x02;
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;

/** Convert Uint8Array to a true ArrayBuffer (fixes TS strictness with SharedArrayBuffer). */
function toAB(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY || '';
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL] ENCRYPTION_KEY env var is required in production');
  }
  return key || 'default-key-change-in-production-32chars!!';
}

/**
 * Derive a key from the encryption key + salt via PBKDF2.
 */
async function deriveKey(keyMaterial: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    cryptoKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value.
 * Output: base64( 0x02 | salt[16] | iv[12] | ciphertext+authTag )
 */
export async function encrypt(value: string): Promise<string> {
  try {
    if (!value) return '';

    const saltArr = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await deriveKey(getEncryptionKey(), toAB(saltArr));
    const encoder = new TextEncoder();
    const data = encoder.encode(value);

    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // version(1) + salt(16) + iv(12) + ciphertext
    const combined = new Uint8Array(1 + saltArr.length + iv.length + encrypted.byteLength);
    combined[0] = VERSION_BYTE;
    combined.set(saltArr, 1);
    combined.set(iv, 1 + saltArr.length);
    combined.set(new Uint8Array(encrypted), 1 + saltArr.length + iv.length);

    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt a string value.
 * Auto-detects v1 (legacy zero-salt) vs v2 (random salt) format.
 */
export async function decrypt(encryptedValue: string): Promise<string> {
  try {
    if (!encryptedValue) return '';

    const combined = Buffer.from(encryptedValue, 'base64');

    let salt: Uint8Array;
    let iv: Uint8Array;
    let encrypted: Uint8Array;

    if (combined[0] === VERSION_BYTE && combined.length > 1 + SALT_LENGTH + IV_LENGTH) {
      // v2 format: version(1) + salt(16) + iv(12) + ciphertext
      salt = new Uint8Array(combined.slice(1, 1 + SALT_LENGTH));
      iv = new Uint8Array(combined.slice(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH));
      encrypted = new Uint8Array(combined.slice(1 + SALT_LENGTH + IV_LENGTH));
    } else {
      // v1 legacy format: iv(12) + ciphertext (zero-fill salt)
      salt = new Uint8Array(SALT_LENGTH).fill(0);
      iv = new Uint8Array(combined.slice(0, IV_LENGTH));
      encrypted = new Uint8Array(combined.slice(IV_LENGTH));
    }

    const key = await deriveKey(getEncryptionKey(), toAB(salt));

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: toAB(iv) },
      key,
      toAB(encrypted)
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt value');
  }
}

/**
 * Encrypt an object (for storing multiple credentials)
 */
export async function encryptObject(obj: Record<string, unknown>): Promise<string> {
  const jsonString = JSON.stringify(obj);
  return encrypt(jsonString);
}

/**
 * Decrypt an object
 */
export async function decryptObject(encryptedValue: string): Promise<Record<string, unknown>> {
  const decrypted = await decrypt(encryptedValue);
  return JSON.parse(decrypted);
}

