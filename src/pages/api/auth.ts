export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const AUTH_FILE = path.join(process.cwd(), 'src/data/auth.json');

function readAuth() {
  try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')); }
  catch { return { nickname: '0000', password: '0000' }; }
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { action, nickname, password, newPassword } = body;

    // 登录验证
    if (action === 'login') {
      const auth = readAuth();
      if (nickname === auth.nickname && password === auth.password) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false, error: '昵称或密码错误' }), { status: 401 });
    }

    // 修改密码
    if (action === 'change') {
      const auth = readAuth();
      if (nickname !== auth.nickname || password !== auth.password) {
        return new Response(JSON.stringify({ ok: false, error: '当前昵称或密码错误' }), { status: 401 });
      }
      if (!newPassword || newPassword.length < 4) {
        return new Response(JSON.stringify({ ok: false, error: '新密码至少 4 位' }), { status: 400 });
      }
      auth.password = newPassword;
      fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2) + '\n', 'utf-8');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), { status: 400 });
  } catch {
    return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500 });
  }
}
