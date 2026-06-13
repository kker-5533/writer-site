export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

export async function GET() {
  try {
    const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.json'));
    const posts = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(BLOG_DIR, f), 'utf-8'));
      return { id: f.replace('.json', ''), ...data };
    });
    posts.sort((a, b) => b.date.localeCompare(a.date));
    return new Response(JSON.stringify(posts), { status: 200 });
  } catch {
    return new Response(JSON.stringify([]), { status: 200 });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === 'delete') {
      if (!id) return new Response(JSON.stringify({ error: '缺少 id' }), { status: 400 });
      const filePath = path.join(BLOG_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (action === 'create' || action === 'update') {
      const date = data.date || new Date().toISOString().slice(0, 10);
      const slug = id || `${date}-${(data.title || 'untitled').replace(/[^a-zA-Z一-龥]/g, '-').toLowerCase().slice(0, 30)}`;
      const filePath = path.join(BLOG_DIR, `${slug}.json`);

      if (action === 'update' && id && id !== slug) {
        const oldPath = path.join(BLOG_DIR, `${id}.json`);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const entry = {
        title: data.title || '',
        date,
        excerpt: data.excerpt || '',
        body: data.body || '',
        draft: Boolean(data.draft),
      };
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
      return new Response(JSON.stringify({ ok: true, id: slug }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: '操作失败' }), { status: 500 });
  }
}
