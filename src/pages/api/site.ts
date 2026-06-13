export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const SITE_FILE = path.join(process.cwd(), 'src/data/site.json');

export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(SITE_FILE, 'utf-8'));
    return new Response(JSON.stringify(data), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: '读取失败' }), { status: 500 });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    // 保留原有 coverPresets，只更新允许的字段
    const current = JSON.parse(fs.readFileSync(SITE_FILE, 'utf-8'));
    const updated = {
      ...current,
      author: body.author || current.author,
      subtitle: body.subtitle || current.subtitle,
      intro: body.intro || current.intro,
      coverImage: body.coverImage || current.coverImage,
      contact: body.contact ? { ...current.contact, ...body.contact } : current.contact,
      about: body.about || current.about,
    };
    fs.writeFileSync(SITE_FILE, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: '保存失败' }), { status: 500 });
  }
}
