export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const WORKS_DIR = path.join(process.cwd(), 'src/content/works');

export async function GET() {
  try {
    const files = fs.readdirSync(WORKS_DIR).filter(f => f.endsWith('.json'));
    const works = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(WORKS_DIR, f), 'utf-8'));
      return { id: f.replace('.json', ''), ...data };
    });
    works.sort((a, b) => b.year - a.year);
    return new Response(JSON.stringify(works), { status: 200 });
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
      const filePath = path.join(WORKS_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (action === 'create' || action === 'update') {
      const slug = id || data.title.replace(/[^a-zA-Z一-龥]/g, '-').toLowerCase().slice(0, 40);
      const filePath = path.join(WORKS_DIR, `${slug}.json`);

      // 如果是 update 且改了标题，删旧文件
      if (action === 'update' && id && id !== slug) {
        const oldPath = path.join(WORKS_DIR, `${id}.json`);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const entry = {
        title: data.title || '',
        type: data.type || '散文',
        year: Number(data.year) || new Date().getFullYear(),
        wordCount: data.wordCount || '',
        published: Boolean(data.published),
        publisher: data.publisher || '',
        summary: data.summary || '',
        body: data.body || '',
      };
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
      return new Response(JSON.stringify({ ok: true, id: slug }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: '操作失败' }), { status: 500 });
  }
}
