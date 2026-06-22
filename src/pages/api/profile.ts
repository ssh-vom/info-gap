import type { APIRoute } from 'astro';
import { getDb, getProfile, upsertProfile, type RoleHistory } from '../../lib/db';
import { getUser } from '../../lib/auth';

export const prerender = false;

const jsonRes = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '');
const list = (v: unknown) => Array.isArray(v) ? v.map((x) => str(x, 60)).filter(Boolean).slice(0, 30) : [];
const roles = (v: unknown): RoleHistory[] => Array.isArray(v) ? v.map((r: any) => ({
  company: str(r.company, 100),
  title: str(r.title, 100),
  start: str(r.start, 20),
  end: str(r.end, 20),
  description: str(r.description, 500),
})).filter((r) => r.company || r.title).slice(0, 20) : [];

export const POST: APIRoute = async ({ cookies, request }) => {
  const user = await getUser(cookies);
  if (!user) return jsonRes({ error: 'login required' }, 401);

  let p: any;
  try { p = await request.json(); } catch { return jsonRes({ error: 'invalid JSON' }, 400); }

  const name = str(p.name, 100) || user.name;
  const now = new Date().toISOString();
  const old = await getProfile(getDb(), user.sub);

  await upsertProfile(getDb(), {
    linkedinSub: user.sub,
    name,
    email: user.email ?? null,
    picture: user.picture ?? null,
    headline: str(p.headline, 160) || null,
    location: str(p.location, 100) || null,
    school: str(p.school, 120) || null,
    gradYear: str(p.gradYear, 20) || null,
    program: str(p.program, 120) || null,
    linkedinUrl: str(p.linkedinUrl, 300) || null,
    website: str(p.website, 300) || null,
    bio: str(p.bio, 2000) || null,
    roleHistory: roles(p.roleHistory),
    education: list(p.education),
    skills: list(p.skills),
    interests: list(p.interests),
    createdAt: old?.createdAt ?? now,
    updatedAt: now,
  });

  return jsonRes({ ok: true });
};
