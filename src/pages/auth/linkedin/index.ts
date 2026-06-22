import type { APIRoute } from 'astro';
import { authEnv, cookieOpts, randomState, REDIRECT_COOKIE, STATE_COOKIE } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, request, redirect }) => {
  const url = new URL(request.url);
  const clientId = authEnv('LINKEDIN_CLIENT_ID');
  if (!clientId) return new Response('Missing LINKEDIN_CLIENT_ID. Add it to .dev.vars locally or wrangler secrets in prod.', { status: 500 });
  const state = randomState();
  const redirectUri = new URL('/auth/linkedin/callback', url).toString();
  cookies.set(STATE_COOKIE, state, cookieOpts(url, 600));
  cookies.set(REDIRECT_COOKIE, redirectUri, cookieOpts(url, 600));

  const auth = new URL('https://www.linkedin.com/oauth/v2/authorization');
  auth.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
  }).toString();

  return redirect(auth.toString());
};
