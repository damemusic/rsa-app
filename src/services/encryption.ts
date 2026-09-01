// Client-side encryption service using TweetNaCl.js
// All user data (profile, RSA entries) encrypted before sending to backend

import * as nacl from 'tweetnacl';

// Helper: encode string to Uint8Array
function encodeUTF8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Helper: decode Uint8Array to string
function decodeUTF8(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

// Helper: encode Uint8Array to base64
function encodeBase64(arr: Uint8Array): string {
  let str = '';
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i]);
  }
  return btoa(str);
}

// Helper: decode base64 to Uint8Array
function decodeBase64(str: string): Uint8Array {
  const binaryStr = atob(str);
  const arr = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    arr[i] = binaryStr.charCodeAt(i);
  }
  return arr;
}

// Derive a key from recovery code using PBKDF2
async function deriveKey(recoveryCode: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(recoveryCode);

  const key = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('rsa-app-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Export the key as raw bytes
  const exported = await crypto.subtle.exportKey('raw', derivedKey);
  return new Uint8Array(exported);
}

// Encrypt data with recovery code
export async function encryptData(data: unknown, recoveryCode: string): Promise<string> {
  try {
    const key = await deriveKey(recoveryCode);
    const jsonStr = JSON.stringify(data);
    const plaintext = encodeUTF8(jsonStr);

    // TweetNaCl.js secretbox requires 32-byte key
    const keyArray = key.slice(0, 32);
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.secretbox(plaintext, nonce, keyArray);

    if (!encrypted) throw new Error('Encryption failed');

    // Combine nonce + encrypted data
    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);

    return encodeBase64(combined);
  } catch (err) {
    console.error('Encryption error:', err);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data with recovery code
export async function decryptData<T>(encrypted: string, recoveryCode: string): Promise<T> {
  try {
    const key = await deriveKey(recoveryCode);
    const combined = decodeBase64(encrypted);

    // Extract nonce and ciphertext
    const nonce = combined.slice(0, 24);
    const ciphertext = combined.slice(24);

    const keyArray = key.slice(0, 32);
    const decrypted = nacl.secretbox.open(ciphertext, nonce, keyArray);

    if (!decrypted) throw new Error('Decryption failed');

    const jsonStr = decodeUTF8(decrypted);
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.error('Decryption error:', err);
    throw new Error('Failed to decrypt data');
  }
}

// Generate a recovery code (12-word mnemonic-like string)
export function generateRecoveryCode(): string {
  const words = [
    'apple', 'bridge', 'castle', 'dragon', 'eagle', 'forest',
    'guitar', 'harbor', 'island', 'jungle', 'knight', 'liberty',
    'mountain', 'navigate', 'ocean', 'palace', 'quantum', 'river',
    'sunset', 'travel', 'umbrella', 'victory', 'whisper', 'zenith'
  ];

  let code = '';
  for (let i = 0; i < 12; i++) {
    const randomIdx = Math.floor(Math.random() * words.length);
    code += words[randomIdx];
    if (i < 11) code += '-';
  }

  return code;
}
