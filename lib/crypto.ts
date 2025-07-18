// lib/crypto.ts

// --- Configuration ---
const PBKDF2_ITERATIONS = 250000;
const HASH_ALGORITHM = 'SHA-256';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const IV_LENGTH_BYTES = 12;
const SALT_LENGTH_BYTES = 16;

// --- Recovery Code Functions ---

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_LENGTH = 6; // e.g., ABC-123


// --- Type Definitions ---
export interface EncryptedData {
  ciphertext: string; // Base64 encoded ciphertext
  iv: string;         // Base64 encoded initialization vector
}


// --- Core Functions ---

/**
 * Derives a cryptographic key from a user's password and a salt.
 * Uses PBKDF2, a standard key-stretching algorithm to make passwords harder to guess.
 * @param password The user's master password.
 * @param salt A unique salt for the user.
 * @returns A CryptoKey object suitable for encryption.
 */
// 👇 FIX: Added the 'export' keyword here
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordEncoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypts a string of plaintext data using a derived key.
 * @param plaintext The data to encrypt (e.g., a note's content as a JSON string).
 * @param key The CryptoKey derived from the user's password.
 * @returns An object containing the Base64-encoded ciphertext and IV.
 */
export async function encryptData(plaintext: string, key: CryptoKey): Promise<EncryptedData> {
  const textEncoder = new TextEncoder();
  const dataToEncrypt = textEncoder.encode(plaintext);
  
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    dataToEncrypt
  );

  return {
    ciphertext: Buffer.from(ciphertextBuffer).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  };
}

/**
 * Decrypts data using the key, ciphertext, and IV.
 * @param encrypted An object containing the Base64-encoded ciphertext and IV.
 * @param key The CryptoKey derived from the user's password.
 * @returns The original plaintext string.
 */
export async function decryptData(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
    },
    key,
    ciphertext
  );

  const textDecoder = new TextDecoder();
  return textDecoder.decode(decryptedBuffer);
}

/**
 * Generates a new, cryptographically secure salt.
 * This should be created once per user during registration.
 * @returns A Base64-encoded salt string.
 */
export function generateSalt(): string {
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
    return Buffer.from(salt).toString('base64');
}

// --- Recovery Code Functions ---

/**
 * Generates a single, human-readable recovery code.
 * Format: XXX-XXX (alphanumeric)
 */
function generateSingleRecoveryCode(): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Omitting O and 0 for clarity
  let code = '';
  for (let i = 0; i < RECOVERY_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 2) {
      code += '-';
    }
  }
  return code;
}

/**
 * Generates a set of unique recovery codes for the user.
 * @returns An array of unique recovery code strings.
 */
export function generateRecoveryCodes(): string[] {
  const codes = new Set<string>();
  while (codes.size < RECOVERY_CODE_COUNT) {
    codes.add(generateSingleRecoveryCode());
  }
  return Array.from(codes);
}

/**
 * Hashes a single recovery code using SHA-256.
 * This hash is what we store on the server for verification.
 * @param code The recovery code to hash.
 * @returns A Base64-encoded hash string.
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toUpperCase().replace('-', '')); // Normalize before hashing
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hashBuffer).toString('base64');
}