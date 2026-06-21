import type { APIRoute } from 'astro';
import { getDb, getDiagramSvg } from '../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const svg = await getDiagramSvg(getDb(), params.id!);
  if (!svg) return new Response('Not found', { status: 404 });
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // id is unique + content-addressed by creation, so it never changes
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
