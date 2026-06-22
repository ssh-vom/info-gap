import type { APIRoute } from 'astro';
import { getDb, insertDiagram } from '../../../lib/db';
import { getUser } from '../../../lib/auth';

export const prerender = false;

const bad = (msg: string) => new Response(JSON.stringify({ error: msg }), { status: 400 });

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!(await getUser(cookies))) return new Response(JSON.stringify({ error: 'login required' }), { status: 401 });
  let p: any;
  try {
    p = await request.json();
  } catch {
    return bad('invalid JSON');
  }

  const svg = typeof p.svg === 'string' ? p.svg : '';
  if (!svg.trimStart().startsWith('<svg')) return bad('svg must be an <svg> document');
  if (svg.length > 512_000) return bad('svg too large');

  // scene is stored verbatim for future re-edit; keep it bounded and ensure it's a string
  const scene = typeof p.scene === 'string' ? p.scene : JSON.stringify(p.scene ?? {});
  if (scene.length > 1_000_000) return bad('scene too large');

  const id = crypto.randomUUID();
  await insertDiagram(getDb(), id, scene, svg);

  return new Response(JSON.stringify({ id }), { status: 200, headers: { 'content-type': 'application/json' } });
};
