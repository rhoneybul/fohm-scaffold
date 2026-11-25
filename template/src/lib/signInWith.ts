/**
 * Signing in with Apple and Google (docs/SIGN-IN.md): which buttons show,
 * the name Apple hands over once, and the nonce Apple's token carries. Plain
 * TypeScript with no React Native, so Node tests it (tests/signInWith.test.ts).
 */

/** How an account signs in: the `method` on `signed_in` and `signed_up`. */
export type SignInMethod = 'apple' | 'google' | 'email';

/** The Google OAuth clients the apps sign in with (`APP.google` in src/lib/brand.ts): public IDs, never secrets. */
export interface GoogleClients {
  webClientId: string;
  iosClientId: string;
}

export interface SignInContext {
  platform: string;
  /** What /api/health says Supabase has switched on. */
  integrations: { apple?: boolean; google?: boolean };
  google: GoogleClients;
  /** Whether this build carries each native module (an older build has neither). */
  native: { apple: boolean; google: boolean };
}

/**
 * The buttons over the email form, in order: Sign in with Apple first on an
 * iPhone (Apple's guideline 4.8 and its HIG: at least as prominent as the
 * others), then Google. Each shows only where it works: Apple on iOS once
 * Supabase's Apple provider is on; Google on the web once its provider is on
 * (a redirect), and in the apps only with this build's native module and the
 * client IDs it needs (the web client on both, the iOS client on an iPhone).
 */
export function signInMethods({ platform, integrations, google, native }: SignInContext): Exclude<SignInMethod, 'email'>[] {
  const methods: Exclude<SignInMethod, 'email'>[] = [];
  if (platform === 'ios' && integrations.apple && native.apple) methods.push('apple');
  if (integrations.google) {
    if (platform === 'web') methods.push('google');
    else if (native.google && google.webClientId && (platform === 'android' || (platform === 'ios' && google.iosClientId))) methods.push('google');
  }
  return methods;
}

/** The name Apple hands over on the first sign-in only (it's null every time after), or '' without one. */
export function appleName(fullName: { givenName?: string | null; familyName?: string | null } | null | undefined): string {
  return [fullName?.givenName, fullName?.familyName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 80);
}

/** The iOS URL scheme Google's sign-in returns to: the iOS client ID reversed ('123-abc.apps.googleusercontent.com' → 'com.googleusercontent.apps.123-abc'). */
export function googleIosUrlScheme(iosClientId: string): string | null {
  const id = iosClientId.trim().replace(/\.apps\.googleusercontent\.com$/, '');
  return id ? `com.googleusercontent.apps.${id}` : null;
}

/** A nonce from random bytes: hex, 64 characters for 32 bytes. Its SHA-256 goes to Apple, the nonce itself to Supabase. */
export const nonceFrom = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * SHA-256 of an ASCII string (a nonce), as lowercase hex: what Apple puts in
 * its token's `nonce` claim and Supabase checks the raw nonce against. Plain
 * code rather than a native digest, so the hash the app sends is the one
 * tested here.
 */
export function sha256Hex(text: string): string {
  const bytes = Array.from(text, (c) => c.charCodeAt(0) & 0xff);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bitLength >>> (i * 8)) & 0xff);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let block = 0; block < bytes.length; block += 64) {
    for (let t = 0; t < 16; t++) w[t] = (bytes[block + t * 4] << 24) | (bytes[block + t * 4 + 1] << 16) | (bytes[block + t * 4 + 2] << 8) | bytes[block + t * 4 + 3];
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = w[t - 16] + s0 + w[t - 7] + s1;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [hh, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}
