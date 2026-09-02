// Client-side encryption service using Web Crypto API
// All user data (profile, RSA entries) encrypted before sending to backend

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
async function deriveKey(recoveryCode: string): Promise<CryptoKey> {
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

  return derivedKey;
}

// Encrypt data with recovery code
export async function encryptData(data: unknown, recoveryCode: string): Promise<string> {
  try {
    const key = await deriveKey(recoveryCode);
    const jsonStr = JSON.stringify(data);
    const plaintext = new TextEncoder().encode(jsonStr);

    // Generate random 12-byte IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    console.log('[Encryption] IV length:', iv.length);

    // Encrypt using AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    console.log('[Encryption] Encrypted length:', encrypted.byteLength);

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    const encoded = encodeBase64(combined);
    console.log('[Encryption] Encoded base64 length:', encoded.length);
    return encoded;
  } catch (err) {
    console.error('[Encryption] Encryption error:', err);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt data with recovery code
export async function decryptData<T>(encrypted: string, recoveryCode: string): Promise<T> {
  try {
    console.log('[Encryption] Decrypting data:');
    console.log('[Encryption]   input type:', typeof encrypted);
    console.log('[Encryption]   input length:', encrypted?.length);

    // Validate input
    if (!encrypted || encrypted.length < 12) {
      console.log('[Encryption]   ERROR: Input too short, cannot have 12-byte IV. Length:', encrypted?.length);
      throw new Error('Encrypted data too short to contain IV');
    }

    console.log('[Encryption]   input first 50 chars:', encrypted.substring(0, 50));
    console.log('[Encryption]   input last 50 chars:', encrypted.substring(Math.max(0, encrypted.length - 50)));

    // Check if data starts/ends with quotes (JSON-encoded)
    let toDecrypt = encrypted;
    if (encrypted.startsWith('"') && encrypted.endsWith('"')) {
      console.log('[Encryption]   WARNING: Data appears to be JSON-encoded with quotes, stripping them');
      toDecrypt = encrypted.slice(1, -1);
      console.log('[Encryption]   Stripped first 50 chars:', toDecrypt.substring(0, 50));
      console.log('[Encryption]   Stripped length:', toDecrypt.length);

      if (toDecrypt.length < 12) {
        console.log('[Encryption]   ERROR: After stripping quotes, still too short:', toDecrypt.length);
        throw new Error('Encrypted data too short after quote stripping');
      }
    }

    const key = await deriveKey(recoveryCode);
    const combined = decodeBase64(toDecrypt);

    console.log('[Encryption]   decoded combined length:', combined.length, 'bytes');
    console.log('[Encryption]   decoded first 12 bytes (should be IV):', Array.from(combined.slice(0, 12)));

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    console.log('[Encryption]   IV length:', iv.length);
    console.log('[Encryption]   ciphertext length:', ciphertext.length);

    // Decrypt using AES-GCM
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const jsonStr = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    console.error('[Encryption] Decryption error:', err);
    console.error('[Encryption] Error type:', err instanceof Error ? err.message : String(err));
    console.error('[Encryption] Stack:', err instanceof Error ? err.stack : 'no stack');
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
