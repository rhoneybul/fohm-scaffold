/**
 * Tapp on the web: nothing to do. A Tapp link opened in a browser is just a
 * link to the site or the store; only the iOS and Android apps read one back
 * (src/lib/tapp.native.ts, which has the same functions).
 */
import type { HeldLink } from './tappLink';

export type Claimer = (link: HeldLink) => Promise<unknown>;

export async function startTapp(_config: { authToken: string; tappToken: string } | null): Promise<boolean> {
  return false;
}

export function setTappClaimer(_claim: Claimer | null) {}
