import type { APIRoute } from 'astro';
import { getDb, upsertPost, deletePost } from '../../lib/db';
import { getUser } from '../../lib/auth';
import { STREAM_SLUGS } from '../../streams';

export const prerender = false;

const bad = (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 });
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : '');

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await getUser(cookies))) return new Response(JSON.stringify({ error: 'login required' }), { status: 401 });
  let p: any;
  try {
    p = await request.json();
  } catch {
    return bad('invalid JSON');
  }

  const slug = str(p.slug, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return bad('slug must be a-z 0-9 dash');
  const title = str(p.title, 200);
  if (!title) return bad('title required');
  const author = str(p.author, 80);
  if (!author) return bad('author required');
  const stream = str(p.stream, 40);
  if (!STREAM_SLUGS.includes(stream as any)) return bad('unknown stream');
  const body = str(p.body, 100_000);
  if (!body) return bad('body required');

  const tags = Array.isArray(p.tags) ? p.tags.filter((t: unknown) => typeof t === 'string').map((t: string) => t.trim()).filter(Boolean).slice(0, 12) : [];
  const published = !isNaN(Date.parse(p.published)) ? new Date(p.published).toISOString() : new Date().toISOString();
  const now = new Date().toISOString();

  await upsertPost(getDb(), {
    slug, title, author,
    role: str(p.role, 80) || null,
    stream,
    tags,
    tagsJson: JSON.stringify(tags),
    video: str(p.video, 300) || null,
    body,
    readingTime: str(p.readingTime, 30) || null,
    published,
    updatedAt: now,
  });

  return new Response(JSON.stringify({ slug }), { status: 200, headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!(await getUser(cookies))) return new Response(JSON.stringify({ error: 'login required' }), { status: 401 });
  const slug = new URL(request.url).searchParams.get('slug') ?? '';
  if (!slug) return bad('slug required');
  await deletePost(getDb(), slug);
  return new Response(null, { status: 204 });
};
