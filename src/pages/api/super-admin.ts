export const prerender = false;
import fs from 'node:fs';
import path from 'node:path';

const SUPER_FILE = path.join(process.cwd(), 'src/data/super-auth.json');
const USERS_FILE = path.join(process.cwd(), 'src/data/users.json');
const DATA_DIR = path.join(process.cwd(), 'src/data');
const CONTENT_DIR = path.join(process.cwd(), 'src/content');

function readJSON(fp: string) { try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; } }
function writeJSON(fp: string, data: any) { fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8'); }

export async function POST({ request }: { request: { json: () => Promise<any> } }) {
  const body = await request.json();
  const { action, password } = body;
  const superData = readJSON(SUPER_FILE) || { password: 'admin888' };

  if (action === 'verify') {
    return new Response(JSON.stringify(password === superData.password ? { ok: true } : { error: '密码错误' }), { status: password === superData.password ? 200 : 403 });
  }
  if (password !== superData.password) return new Response(JSON.stringify({ error: '超级密码错误' }), { status: 403 });

  const users = readJSON(USERS_FILE) || [];

  if (action === 'changePassword') {
    superData.password = body.newPassword || 'admin888'; writeJSON(SUPER_FILE, superData);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (action === 'listAdmins') {
    const admins = users.filter((u: any) => u.role === 'admin').map((u: any) => ({ id: u.id, nickname: u.nickname, createdAt: u.createdAt, status: u.status }));
    const authors = users.filter((u: any) => u.role === 'author').length;
    const wc = countFiles(path.join(CONTENT_DIR, 'works'));
    const bc = countFiles(path.join(CONTENT_DIR, 'blog'));
    const msgs = readJSON(path.join(DATA_DIR, 'messages.json')) || [];
    const interactions = readJSON(path.join(DATA_DIR, 'interactions.json')) || {};
    const totalLikes = Object.values(interactions).reduce((s: number, v: any) => s + (v.likes || 0), 0);
    return new Response(JSON.stringify({ admins, stats: { authors, works: wc, blogs: bc, messages: msgs.length, likes: totalLikes } }), { status: 200 });
  }
  if (action === 'promoteAdmin') {
    const idx = users.findIndex((u: any) => u.id === body.userId);
    if (idx > -1) { users[idx].role = 'admin'; writeJSON(USERS_FILE, users); return new Response(JSON.stringify({ ok: true }), { status: 200 }); }
    return new Response(JSON.stringify({ error: '用户不存在' }), { status: 404 });
  }
  if (action === 'demoteAdmin') {
    const idx = users.findIndex((u: any) => u.id === body.userId);
    if (idx === -1) return new Response(JSON.stringify({ error: '用户不存在' }), { status: 404 });
    const ac = users.filter((u: any) => u.role === 'admin').length;
    if (ac <= 1) return new Response(JSON.stringify({ error: '不能移除最后一个管理员' }), { status: 400 });
    users[idx].role = 'author'; writeJSON(USERS_FILE, users);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (action === 'resetPassword') {
    const idx = users.findIndex((u: any) => u.id === body.userId);
    if (idx === -1) return new Response(JSON.stringify({ error: '用户不存在' }), { status: 404 });
    users[idx].password = '123456';
    writeJSON(USERS_FILE, users);
    return new Response(JSON.stringify({ ok: true, msg: '密码已重置为 123456' }), { status: 200 });
  }
  if (action === 'listAll') {
    const safe = users.map((u: any) => ({ id: u.id, nickname: u.nickname, role: u.role, status: u.status }));
    return new Response(JSON.stringify(safe), { status: 200 });
  }
  if (action === 'backup') {
    const backup: any = {};
    fs.readdirSync(DATA_DIR).filter((f: string) => f.endsWith('.json')).forEach((f: string) => { backup[f] = readJSON(path.join(DATA_DIR, f)); });
    backup.works = {}; backup.blog = {};
    const wd = path.join(CONTENT_DIR, 'works'); const bd = path.join(CONTENT_DIR, 'blog');
    if (fs.existsSync(wd)) fs.readdirSync(wd).filter((f: string) => f.endsWith('.json')).forEach((f: string) => { backup.works[f] = readJSON(path.join(wd, f)); });
    if (fs.existsSync(bd)) fs.readdirSync(bd).filter((f: string) => f.endsWith('.json')).forEach((f: string) => { backup.blog[f] = readJSON(path.join(bd, f)); });
    return new Response(JSON.stringify({ ok: true, data: backup }), { status: 200 });
  }
  if (action === 'restore') {
    const bd = body.data; if (!bd) return new Response(JSON.stringify({ error: '无数据' }), { status: 400 });
    Object.keys(bd).forEach((k: string) => { if (k !== 'works' && k !== 'blog') writeJSON(path.join(DATA_DIR, k), bd[k]); });
    if (bd.works) Object.keys(bd.works).forEach((f: string) => writeJSON(path.join(CONTENT_DIR, 'works', f), bd.works[f]));
    if (bd.blog) Object.keys(bd.blog).forEach((f: string) => writeJSON(path.join(CONTENT_DIR, 'blog', f), bd.blog[f]));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ error: '未知操作' }), { status: 400 });
}

function countFiles(dir: string): number { try { return fs.readdirSync(dir).filter((f: string) => f.endsWith('.json')).length; } catch { return 0; } }
