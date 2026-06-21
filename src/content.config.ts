import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { STREAM_SLUGS } from './streams';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/guides' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    role: z.string().optional(),
    stream: z.enum(STREAM_SLUGS as [string, ...string[]]),
    tags: z.array(z.string()).default([]),
    video: z.string().optional(),
    published: z.coerce.date(),
    readingTime: z.string().optional(),
  }),
});

export const collections = { guides };
