export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const MESSAGES_FILE = path.join(process.cwd(), 'src/data/messages.json');

export async function GET() {
  try {
    const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    return new Response(JSON.stringify(messages), { status: 200 });
  } catch {
    return new Response(JSON.stringify([]), { status: 200 });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { action, author, body: messageBody, index } = body;

    if (action === 'delete') {
      const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
      if (index >= 0 && index < messages.length) {
        messages.splice(index, 1);
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2) + '\n', 'utf-8');
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 创建留言（默认 action）
    if (!author || !author.trim()) {
      return new Response(JSON.stringify({ error: '请输入昵称' }), { status: 400 });
    }
    if (!messageBody || !messageBody.trim()) {
      return new Response(JSON.stringify({ error: '请输入留言内容' }), { status: 400 });
    }

    const now = new Date();
    const time = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;

    const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
    messages.unshift({
      author: author.trim().slice(0, 20),
      time,
      body: messageBody.trim().slice(0, 1000),
    });

    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2) + '\n', 'utf-8');

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: '服务器错误，请稍后再试' }), { status: 500 });
  }
}
