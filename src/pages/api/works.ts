export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const WORKS_DIR = path.join(process.cwd(), 'src/content/works');

export async function GET({ url }: { url: URL }) {
  try {
    const authorId = url.searchParams.get('authorId') || '';
    const files = fs.readdirSync(WORKS_DIR).filter(f => f.endsWith('.json'));
    const works = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(WORKS_DIR, f), 'utf-8'));
      return { id: f.replace('.json', ''), ...data };
    });
    const filtered = authorId ? works.filter((w: any) => w.authorId === authorId) : works;
    filtered.sort((a: any, b: any) => b.year - a.year);
    return new Response(JSON.stringify(filtered), { status: 200 });
  } catch {
    return new Response(JSON.stringify([]), { status: 200 });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    // ===== 审核操作 =====
    if (action === 'review') {
      if (!id) return new Response(JSON.stringify({ error: '缺少 id' }), { status: 400 });
      const filePath = path.join(WORKS_DIR, `${id}.json`);
      if (!fs.existsSync(filePath)) return new Response(JSON.stringify({ error: '作品不存在' }), { status: 404 });
      const entry = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      entry.reviewStatus = data.reviewStatus || 'pending';
      if (data.reviewNote !== undefined) entry.reviewNote = data.reviewNote;
      if (typeof data.recommended === 'boolean') entry.recommended = data.recommended;
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

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
        authorId: data.authorId || '',
        authorName: data.authorName || '',
        reviewStatus: data.reviewStatus || 'pending',
        reviewNote: data.reviewNote || '',
        recommended: Boolean(data.recommended),
      };
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
      return new Response(JSON.stringify({ ok: true, id: slug }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), { status: 400 });
  } catch (e) {
    return new Response(JSON.stringify({ error: '操作失败' }), { status: 500 });
  }
}
