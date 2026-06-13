import { defineCollection, z } from 'astro:content';

const works = defineCollection({
  schema: z.object({
    title: z.string(),
    type: z.string(),
    year: z.number(),
    wordCount: z.string().optional(),
    published: z.boolean().default(false),
    publisher: z.string().optional(),
    summary: z.string(),
    order: z.number().default(0),
  }),
});

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.date(),
    excerpt: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { works, blog };
