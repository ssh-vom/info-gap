import type { APIRoute } from 'astro';
import { getDb, getProfile } from '../../../lib/db';
import { AUTH_COOKIE, authEnv, cookieOpts, REDIRECT_COOKIE, signUser, STATE_COOKIE } from '../../../lib/auth';

export const prerender = false;

const fail = (msg: string) => new Response(msg, { status: 400 });

export const GET: APIRoute = async ({ cookies, request, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code) return fail(url.searchParams.get('error_description') || 'LinkedIn login failed');
  if (!state || state !== cookies.get(STATE_COOKIE)?.value) return fail('Bad login state');
  const redirectUri = cookies.get(REDIRECT_COOKIE)?.value || new URL('/auth/linkedin/callback', url).toString();
  cookies.delete(STATE_COOKIE, { path: '/' });
  cookies.delete(REDIRECT_COOKIE, { path: '/' });

  const clientId = authEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = authEnv('LINKEDIN_CLIENT_SECRET');
  if (!clientId || !clientSecret) return fail('Missing LinkedIn env vars');

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) return fail(`LinkedIn token exchange failed: ${await tokenRes.text()}`);

  const token: any = await tokenRes.json();
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!userRes.ok) return fail('LinkedIn profile fetch failed');

  const u: any = await userRes.json();
  if (!u.sub || !u.name) return fail('LinkedIn did not return a usable profile');

  const user = { sub: u.sub, name: u.name, email: u.email, picture: u.picture };
  cookies.set(AUTH_COOKIE, await signUser(user), cookieOpts(url));

  return redirect((await getProfile(getDb(), user.sub)) ? '/' : '/profile/new');
};
