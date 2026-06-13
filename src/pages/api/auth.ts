export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';

const USERS_FILE = path.join(process.cwd(), 'src/data/users.json');

function readUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); }
  catch { return []; }
}
function writeUsers(data: any[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { action } = body;

    // ===== 注册 =====
    if (action === 'register') {
      const { nickname, password } = body;
      if (!nickname || nickname.length < 2) return new Response(JSON.stringify({ error: '昵称至少 2 个字符' }), { status: 400 });
      if (!password || password.length < 4) return new Response(JSON.stringify({ error: '密码至少 4 位' }), { status: 400 });
      const users = readUsers();
      if (users.find((u: any) => u.nickname === nickname)) return new Response(JSON.stringify({ error: '昵称已被使用' }), { status: 400 });
      const newUser = {
        id: 'user-' + Date.now(),
        nickname,
        password,
        role: 'author',
        status: 'active',
        intro: '',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      users.push(newUser);
      writeUsers(users);
      return new Response(JSON.stringify({ ok: true, user: { id: newUser.id, nickname: newUser.nickname, role: newUser.role } }), { status: 200 });
    }

    // ===== 登录 =====
    if (action === 'login') {
      const { nickname, password } = body;
      const users = readUsers();
      const user = users.find((u: any) => u.nickname === nickname && u.password === password);
      if (!user) return new Response(JSON.stringify({ ok: false, error: '昵称或密码错误' }), { status: 401 });
      if (user.status === 'banned') return new Response(JSON.stringify({ ok: false, error: '账号已被封禁' }), { status: 403 });
      return new Response(JSON.stringify({ ok: true, user: { id: user.id, nickname: user.nickname, role: user.role, status: user.status } }), { status: 200 });
    }

    // ===== 修改自己的密码 =====
    if (action === 'change') {
      const { nickname, password, newPassword } = body;
      const users = readUsers();
      const idx = users.findIndex((u: any) => u.nickname === nickname && u.password === password);
      if (idx === -1) return new Response(JSON.stringify({ ok: false, error: '当前昵称或密码错误' }), { status: 401 });
      if (!newPassword || newPassword.length < 4) return new Response(JSON.stringify({ ok: false, error: '新密码至少 4 位' }), { status: 400 });
      users[idx].password = newPassword;
      writeUsers(users);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 以下操作需要管理员权限
    const { adminId } = body;
    const users = readUsers();
    const admin = users.find((u: any) => u.id === adminId);
    if (!admin || admin.role !== 'admin') return new Response(JSON.stringify({ error: '无权限' }), { status: 403 });

    // ===== 获取用户列表（管理员） =====
    if (action === 'list') {
      const safe = users.map((u: any) => ({ id: u.id, nickname: u.nickname, role: u.role, status: u.status, intro: u.intro, createdAt: u.createdAt }));
      return new Response(JSON.stringify(safe), { status: 200 });
    }

    // ===== 管理员操作：重置密码/禁言/封禁/解封 =====
    if (action === 'manage') {
      const { targetId, operation, value } = body;
      const idx = users.findIndex((u: any) => u.id === targetId);
      if (idx === -1) return new Response(JSON.stringify({ error: '用户不存在' }), { status: 404 });

      if (operation === 'resetPassword') {
        users[idx].password = value || '123456';
        writeUsers(users);
        return new Response(JSON.stringify({ ok: true, msg: `密码已重置为 ${users[idx].password}` }), { status: 200 });
      }
      if (operation === 'setStatus') {
        if (!['active', 'muted', 'banned'].includes(value)) return new Response(JSON.stringify({ error: '状态无效' }), { status: 400 });
        users[idx].status = value;
        writeUsers(users);
        const labels: Record<string, string> = { active: '已解封', muted: '已禁言', banned: '已封禁' };
        return new Response(JSON.stringify({ ok: true, msg: labels[value] || '已更新' }), { status: 200 });
      }
      if (operation === 'toggleRecommend') {
        users[idx].recommended = !users[idx].recommended;
        writeUsers(users);
        return new Response(JSON.stringify({ ok: true, msg: users[idx].recommended ? '已推荐' : '已取消推荐' }), { status: 200 });
      }

      return new Response(JSON.stringify({ error: '未知操作' }), { status: 400 });
    }

    return new Response(JSON.stringify({ error: '未知操作' }), { status: 400 });
  } catch {
    return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500 });
  }
}
