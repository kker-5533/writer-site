export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'src/data/interactions.json');

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')); }
  catch { return {}; }
}
function write(data: Record<string, unknown>) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export async function GET() {
  return new Response(JSON.stringify(read()), { status: 200 });
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { slug, action } = body; // action: 'like' | 'urge'

    if (!slug || !['like', 'urge'].includes(action)) {
      return new Response(JSON.stringify({ error: '参数错误' }), { status: 400 });
    }

    const data = read();
    if (!data[slug]) data[slug] = { likes: 0, urges: 0 };
    data[slug][action === 'like' ? 'likes' : 'urges'] += 1;
    write(data);

    return new Response(JSON.stringify({ ok: true, counts: data[slug] }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: '操作失败' }), { status: 500 });
  }
}
