export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'src/data/private-messages.json');
const USERS_FILE = path.join(process.cwd(), 'src/data/users.json');

function getUserMap(): any {
  try { const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); const m: any = {}; users.forEach((u: any) => { m[u.id] = u; }); return m; } catch { return {}; }
}
function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf-8')); } catch { return []; }
}
function write(data: any[]) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export async function GET({ url }: { url: URL }) {
  const userId = url.searchParams.get('userId') || '';
  const withUser = url.searchParams.get('with') || '';
  const messages = read();

  // 返回与特定用户的对话
  if (withUser && userId) {
    const conv = messages.filter((m: any) =>
      (m.from === userId && m.to === withUser) || (m.from === withUser && m.to === userId)
    );
    // 标记为已读
    conv.forEach((m: any) => { if (m.to === userId) m.read = true; });
    write(messages);
    return new Response(JSON.stringify(conv), { status: 200 });
  }

  // 返回用户的所有会话列表（按对方分组，取最新一条）
  if (userId) {
    const userMsgs = messages.filter((m: any) => m.from === userId || m.to === userId);
    const convMap: Record<string, any> = {};
    userMsgs.forEach((m: any) => {
      const partner = m.from === userId ? m.to : m.from;
      if (!convMap[partner] || m.time > convMap[partner].time) {
        convMap[partner] = { partner, lastMsg: m.body, time: m.time, from: m.from, read: m.read || m.from === userId };
      }
    });
    const list = Object.values(convMap).sort((a: any, b: any) => b.time.localeCompare(a.time));
    const userMap = getUserMap();
    const withNames = list.map((c: any) => ({ ...c, partnerName: (userMap[c.partner] || {}).nickname || '未知用户' }));
    const unread = userMsgs.filter((m: any) => m.to === userId && !m.read).length;
    return new Response(JSON.stringify({ conversations: withNames, unread }), { status: 200 });
  }

  return new Response(JSON.stringify([]), { status: 200 });
}

export async function POST({ request }: { request: { json: () => Promise<any> } }) {
  try {
    const body = await request.json();
    const { from, to, body: msgBody } = body;
    if (!from || !to || !msgBody?.trim()) {
      return new Response(JSON.stringify({ error: '参数不完整' }), { status: 400 });
    }
    const messages = read();
    messages.push({
      id: 'pm-' + Date.now(),
      from,
      to,
      body: msgBody.trim().slice(0, 2000),
      time: new Date().toISOString(),
      read: false,
    });
    write(messages);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: '发送失败' }), { status: 500 });
  }
}
