// @ts-ignore - virtual module provided by the Cloudflare runtime (and platformProxy in dev)
import { env } from 'cloudflare:workers';

export type AuthUser = {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
};

export const AUTH_COOKIE = 'ig_auth';
export const STATE_COOKIE = 'ig_oauth_state';
export const REDIRECT_COOKIE = 'ig_oauth_redirect';
const enc = new TextEncoder();

export const cookieOpts = (url: URL, maxAge = 60 * 60 * 24 * 30) => ({
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: url.protocol === 'https:',
  maxAge,
});

export const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

const unb64url = (s: string) => {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

const text = (s: string) => new TextDecoder().decode(unb64url(s));
export const authEnv = (name: string) => {
  const e = env as any;
  const p = (globalThis as any).process?.env ?? {};
  return e[name] || p[name] ||
    // ponytail: tolerate the dashboard names people actually type once.
    (name === 'LINKEDIN_CLIENT_ID' ? e.LINKED_CLIENT_ID || p.LINKED_CLIENT_ID : '') ||
    (name === 'LINKEDIN_CLIENT_SECRET' ? e.SECRET || p.SECRET : '') || '';
};
const secret = () => authEnv('AUTH_SECRET') || authEnv('LINKEDIN_CLIENT_SECRET');

async function signature(value: string) {
  const s = secret();
  if (!s) throw new Error('AUTH_SECRET or LINKEDIN_CLIENT_SECRET missing');
  const key = await crypto.subtle.importKey('raw', enc.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

function safeEq(a: string, b: string) {
  const aa = unb64url(a), bb = unb64url(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

export async function signUser(user: AuthUser) {
  const payload = b64url(enc.encode(JSON.stringify(user)));
  return `${payload}.${await signature(payload)}`;
}

export async function getUser(cookies: any): Promise<AuthUser | null> {
  try {
    const raw = cookies.get(AUTH_COOKIE)?.value;
    if (!raw) return null;
    const [payload, sig] = raw.split('.');
    if (!payload || !sig || !safeEq(sig, await signature(payload))) return null;
    const user = JSON.parse(text(payload));
    return user?.sub && user?.name ? user : null;
  } catch {
    return null;
  }
}

export function randomState() {
  return b64url(crypto.getRandomValues(new Uint8Array(24)));
}
