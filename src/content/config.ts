import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const works = defineCollection({
  loader: glob({ pattern: '**/*.json', base: 'src/content/works' }),
  schema: z.object({
    title: z.string(),
    type: z.string(),
    year: z.number(),
    wordCount: z.string().optional(),
    published: z.boolean().default(false),
    publisher: z.string().optional(),
    summary: z.string(),
    body: z.string().default(''),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.json', base: 'src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string().transform(s => new Date(s)),
    excerpt: z.string(),
    body: z.string().default(''),
    draft: z.boolean().default(false),
  }),
});

export const collections = { works, blog };
