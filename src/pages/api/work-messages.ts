export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'src/data/work-messages.json');

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')); }
  catch { return {}; }
}
function write(data: Record<string, unknown>) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export async function GET({ url }: { url: URL }) {
  const slug = url.searchParams.get('slug') || '';
  const data = read();
  return new Response(JSON.stringify(data[slug] || []), { status: 200 });
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { slug, author, body: msgBody, action } = body;

    const data = read();
    if (!data[slug]) data[slug] = [];

    if (action === 'delete') {
      const idx = Number(body.index);
      if (idx >= 0 && idx < data[slug].length) data[slug].splice(idx, 1);
      write(data);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (!author || !author.trim()) {
      return new Response(JSON.stringify({ error: '请输入昵称' }), { status: 400 });
    }
    if (!msgBody || !msgBody.trim()) {
      return new Response(JSON.stringify({ error: '请输入内容' }), { status: 400 });
    }

    const now = new Date();
    const time = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
    data[slug].unshift({ author: author.trim().slice(0, 20), time, body: msgBody.trim().slice(0, 1000) });
    write(data);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: '操作失败' }), { status: 500 });
  }
}
