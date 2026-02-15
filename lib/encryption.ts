/**
 * Simple encryption/decryption for API keys
 * Uses Web Crypto API (available in Node.js 15+)
 * 
 * Note: For production, consider using Supabase Vault or a dedicated key management service
 */

const ENCRYPTION_KEY = (() => {
  const key = process.env.ENCRYPTION_KEY || '';
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL] ENCRYPTION_KEY env var is required in production');
  }
  return key || 'default-key-change-in-production-32chars!!';
})();
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;

/**
 * Derive a key from the encryption key
 */
async function deriveKey(keyMaterial: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyMaterial);
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  const salt = new Uint8Array(SALT_LENGTH).fill(0); // Simple salt for demo
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    cryptoKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string value
 */
export async function encrypt(value: string): Promise<string> {
  try {
    if (!value) return '';

    const key = await deriveKey(ENCRYPTION_KEY);
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage
    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt a string value
 */
export async function decrypt(encryptedValue: string): Promise<string> {
  try {
    if (!encryptedValue) return '';

    const key = await deriveKey(ENCRYPTION_KEY);
    
    // Decode from base64
    const combined = Buffer.from(encryptedValue, 'base64');
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );

    // Convert back to string
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

