/**
 * Cryptographic Password Hashing and Verification
 * Uses the Web Crypto API (PBKDF2 with SHA-256 and 100,000 iterations)
 * Compliant with NIST SP 800-132 password hashing standards.
 */

const ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';
const KEY_LENGTH_BITS = 256;

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Converts a Uint8Array buffer into a hexadecimal string
 */
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hexadecimal string back to a Uint8Array
 */
function fromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array();
  const arr = new Uint8Array(matches.length);
  for (let i = 0; i < matches.length; i++) {
    arr[i] = parseInt(matches[i], 16);
  }
  return arr;
}

/**
 * Securely hashes a plain-text password with a unique cryptographic salt.
 * Returns a string formatted as: "pbkdf2:iterations:saltHex:hashHex"
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);

  // Generate cryptographically secure random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  const saltHex = toHex(salt);
  const hashHex = toHex(new Uint8Array(derivedBits));

  return `pbkdf2:${ITERATIONS}:${saltHex}:${hashHex}`;
}

/**
 * Verifies a plain-text password against a stored hash string.
 * Supports:
 * - PBKDF2 hashed strings (`pbkdf2:100000:...`)
 * - Backward compatibility with plain text passwords created before encryption.
 */
export async function verifyPassword(
  plainText: string,
  storedValue: string | null | undefined
): Promise<boolean> {
  if (!storedValue || !plainText) return false;

  // Handle standard PBKDF2 hash
  if (storedValue.startsWith('pbkdf2:')) {
    const parts = storedValue.split(':');
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHashHex = parts[3];

    if (isNaN(iterations) || !saltHex || !expectedHashHex) return false;

    const salt = fromHex(saltHex);
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(plainText);

    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt as unknown as BufferSource,
          iterations,
          hash: HASH_ALGO,
        },
        keyMaterial,
        KEY_LENGTH_BITS
      );

      const actualHashHex = toHex(new Uint8Array(derivedBits));
      return timingSafeEqual(actualHashHex, expectedHashHex);
    } catch (err) {
      console.error('Password verification error:', err);
      return false;
    }
  }

  // Fallback for legacy unhashed passwords if any exist
  return timingSafeEqual(plainText, storedValue);
}
