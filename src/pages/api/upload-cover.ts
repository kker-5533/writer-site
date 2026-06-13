export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

export async function POST({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: '未选择文件' }), { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `cover-${Date.now()}.${ext}`;
    const filepath = path.join(process.cwd(), 'public/images', filename);

    // ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    const url = `/images/${filename}`;
    return new Response(JSON.stringify({ ok: true, url }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: '上传失败' }), { status: 500 });
  }
}
