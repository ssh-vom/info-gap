// @ts-ignore - virtual module provided by the Cloudflare runtime (and platformProxy in dev)
import { env } from 'cloudflare:workers';

// ponytail: D1 binding typed loosely (any) to skip a @cloudflare/workers-types dep.
export type Post = {
  slug: string;
  title: string;
  author: string;
  role: string | null;
  stream: string;
  tags: string[];
  video: string | null;
  body: string;
  readingTime: string | null;
  published: string;
  updatedAt: string;
};

export type RoleHistory = {
  company: string;
  title: string;
  start?: string;
  end?: string;
  description?: string;
};

export type Profile = {
  linkedinSub: string;
  name: string;
  email: string | null;
  picture: string | null;
  headline: string | null;
  location: string | null;
  school: string | null;
  gradYear: string | null;
  program: string | null;
  linkedinUrl: string | null;
  website: string | null;
  bio: string | null;
  roleHistory: RoleHistory[];
  education: string[];
  skills: string[];
  interests: string[];
  createdAt: string;
  updatedAt: string;
};

const rowToPost = (r: any): Post => ({
  slug: r.slug,
  title: r.title,
  author: r.author,
  role: r.role,
  stream: r.stream,
  tags: JSON.parse(r.tags || '[]'),
  video: r.video,
  body: r.body,
  readingTime: r.reading_time,
  published: r.published,
  updatedAt: r.updated_at,
});

const json = (s: string | null, fallback: any) => {
  try { return JSON.parse(s || ''); } catch { return fallback; }
};

const rowToProfile = (r: any): Profile => ({
  linkedinSub: r.linkedin_sub,
  name: r.name,
  email: r.email,
  picture: r.picture,
  headline: r.headline,
  location: r.location,
  school: r.school,
  gradYear: r.grad_year,
  program: r.program,
  linkedinUrl: r.linkedin_url,
  website: r.website,
  bio: r.bio,
  roleHistory: json(r.role_history, []),
  education: json(r.education, []),
  skills: json(r.skills, []),
  interests: json(r.interests, []),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function getDb(): any {
  const db = (env as any).DB;
  if (!db) throw new Error('D1 binding "DB" missing — check wrangler.toml / platformProxy');
  return db;
}

export async function listPosts(db: any, stream?: string): Promise<Post[]> {
  const stmt = stream
    ? db.prepare('SELECT * FROM posts WHERE stream = ? ORDER BY published DESC').bind(stream)
    : db.prepare('SELECT * FROM posts ORDER BY published DESC');
  const { results } = await stmt.all();
  return (results ?? []).map(rowToPost);
}

export async function getPost(db: any, slug: string): Promise<Post | null> {
  const r = await db.prepare('SELECT * FROM posts WHERE slug = ?').bind(slug).first();
  return r ? rowToPost(r) : null;
}

export async function upsertPost(db: any, p: Post & { tagsJson: string }): Promise<void> {
  await db
    .prepare(
      `INSERT INTO posts (slug,title,author,role,stream,tags,video,body,reading_time,published,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(slug) DO UPDATE SET
         title=excluded.title, author=excluded.author, role=excluded.role, stream=excluded.stream,
         tags=excluded.tags, video=excluded.video, body=excluded.body, reading_time=excluded.reading_time,
         published=excluded.published, updated_at=excluded.updated_at`
    )
    .bind(p.slug, p.title, p.author, p.role, p.stream, p.tagsJson, p.video, p.body, p.readingTime, p.published, p.updatedAt)
    .run();
}

export async function deletePost(db: any, slug: string): Promise<void> {
  await db.prepare('DELETE FROM posts WHERE slug = ?').bind(slug).run();
}

export async function insertDiagram(db: any, id: string, sceneJson: string, svg: string): Promise<void> {
  await db
    .prepare('INSERT INTO diagrams (id, scene, svg, created_at) VALUES (?,?,?,?)')
    .bind(id, sceneJson, svg, new Date().toISOString())
    .run();
}

export async function getDiagramSvg(db: any, id: string): Promise<string | null> {
  const r = await db.prepare('SELECT svg FROM diagrams WHERE id = ?').bind(id).first();
  return r ? r.svg : null;
}

export async function getProfile(db: any, linkedinSub: string): Promise<Profile | null> {
  const r = await db.prepare('SELECT * FROM profiles WHERE linkedin_sub = ?').bind(linkedinSub).first();
  return r ? rowToProfile(r) : null;
}

export async function upsertProfile(db: any, p: Profile): Promise<void> {
  await db
    .prepare(
      `INSERT INTO profiles (linkedin_sub,name,email,picture,headline,location,school,grad_year,program,linkedin_url,website,bio,role_history,education,skills,interests,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(linkedin_sub) DO UPDATE SET
         name=excluded.name, email=excluded.email, picture=excluded.picture, headline=excluded.headline,
         location=excluded.location, school=excluded.school, grad_year=excluded.grad_year, program=excluded.program,
         linkedin_url=excluded.linkedin_url, website=excluded.website, bio=excluded.bio,
         role_history=excluded.role_history, education=excluded.education, skills=excluded.skills,
         interests=excluded.interests, updated_at=excluded.updated_at`
    )
    .bind(
      p.linkedinSub, p.name, p.email, p.picture, p.headline, p.location, p.school, p.gradYear, p.program,
      p.linkedinUrl, p.website, p.bio, JSON.stringify(p.roleHistory), JSON.stringify(p.education),
      JSON.stringify(p.skills), JSON.stringify(p.interests), p.createdAt, p.updatedAt
    )
    .run();
}
