import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import probeModule from './athena-session-test.js';
const { AthenaCookieJar, createAthenaProbe } = probeModule;
const directory = path.dirname(fileURLToPath(import.meta.url));

test('cookie jar handles rotation, expiry, path, secure cookies and origin isolation', () => {
  const jar = new AthenaCookieJar('https://athena.example/admin');
  jar.absorb(new Headers({ 'Set-Cookie': 'sid=before; Path=/; Secure' }), 'https://athena.example/admin', 1000);
  jar.absorb(new Headers({ 'Set-Cookie': 'sid=after; Path=/; Secure; Max-Age=2' }), 'https://athena.example/api/login', 1000);
  assert.equal(jar.header('https://athena.example/management/image', 1500), 'sid=after');
  assert.throws(() => jar.header('https://other.example/'), /origin/);
  jar.absorb(new Headers({ 'Set-Cookie': 'narrow=x; Path=/admin' }), 'https://athena.example/admin', 1000);
  assert.equal(jar.header('https://athena.example/management/image', 4000), '');
  assert.equal(jar.header('https://athena.example/administrator', 4000), '');
  jar.absorb(new Headers({ 'Set-Cookie': 'narrow=; Path=/admin; Max-Age=0' }), 'https://athena.example/admin', 4000);
  assert.equal(jar.header('https://athena.example/admin', 4000), '');
  const httpJar = new AthenaCookieJar('http://localhost');
  httpJar.absorb(new Headers({ 'Set-Cookie': 'secret=x; Secure; Path=/' }), 'http://localhost');
  assert.equal(httpJar.header('http://localhost/'), '');
});

test('old Node combined Set-Cookie fallback does not split Expires date', () => {
  const jar = new AthenaCookieJar('https://athena.example');
  jar.absorb({ get: () => 'a=1; Expires=Wed, 09 Jun 2038 10:18:14 GMT; Path=/, b=2; Path=/' }, 'https://athena.example/');
  assert.equal(jar.header('https://athena.example/'), 'a=1; b=2');
});

async function invoke(probe, action, { cookie = '', origin = 'http://localhost:3300', body = {} } = {}) {
  const req = { method: 'POST', headers: { host: 'localhost:3300', origin, cookie, 'content-type': 'application/json' } };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, writeHead(status, headers) { this.status = status; Object.assign(this.headers, headers); }, end(value) { this.body = JSON.parse(value); } };
  await probe.handle(req, res, `/api/athena-test/${action}`, async () => body);
  return res;
}

test('probe TTL, logout, cross-origin rejection and sanitized failures', async t => {
  let now = 1000;
  let requested = 0;
  const probe = createAthenaProbe({ enabled: true, loginUrl: 'https://athena.example/admin', now: () => now,
    authenticate: async () => true,
    fetchImpl: async () => { requested++; throw new Error('secret-upstream-cookie'); }
  });
  t.after(() => probe.close());
  const login = await invoke(probe, 'login', { body: { username: 'alice', password: 'private' } });
  const cookie = login.headers['Set-Cookie'].split(';')[0];
  assert.equal(login.status, 200);
  assert.equal((await invoke(probe, 'check', { cookie, origin: 'https://evil.example' })).status, 403);
  assert.equal(requested, 0);
  const failed = await invoke(probe, 'check', { cookie });
  assert.equal(failed.status, 502);
  assert.ok(!JSON.stringify(failed).includes('secret-upstream-cookie'));
  now += 15 * 60 * 1000;
  assert.equal((await invoke(probe, 'check', { cookie })).status, 401);
  assert.equal(requested, 1);
  const next = await invoke(probe, 'login', { body: { username: 'alice', password: 'private' } });
  const nextCookie = next.headers['Set-Cookie'].split(';')[0];
  await invoke(probe, 'logout', { cookie: nextCookie });
  assert.equal((await invoke(probe, 'check', { cookie: nextCookie })).status, 401);
});

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
async function startWeb(t, extraEnv = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'athena-probe-'));
  fs.mkdirSync(path.join(root, 'server', 'data'), { recursive: true });
  for (const name of ['server.js', 'athena-session-test.js', 'athena-session-test-ui.js', 'athena-session-test.html']) fs.copyFileSync(path.join(directory, name), path.join(root, 'server', name));
  fs.writeFileSync(path.join(root, 'server', 'data', 'users.json'), JSON.stringify([{ adminId: 'alice', name: 'Alice', role: 'teamLead', part: '운영팀' }]));
  const child = spawn(process.execPath, ['server/server.js'], { cwd: root, windowsHide: true,
    env: { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: '0', AUTH_BYPASS: 'false', COOKIE_SECURE: 'false', PROFILE_AUTH_SECRET: '', ATHENA_SESSION_TEST: 'true', ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', b => { output += b; });
  child.stderr.on('data', b => { output += b; });
  t.after(() => child.kill());
  // PORT=0 requires the bound port in the startup message; use a reserved test port instead.
  return { child, output: () => output, root };
}

test('real web routes preserve login API and keep separate Athena sessions with rotated cookies', async t => {
  const calls = [];
  let denied = false;
  const mock = http.createServer(async (req, res) => {
    calls.push({ method: req.method, path: req.url, cookie: req.headers.cookie || '' });
    if (req.url === '/admin') { res.setHeader('Set-Cookie', 'seed=initial; Path=/'); res.end('<input type="hidden" name="csrf" value="fixture">'); return; }
    if (req.url === '/api/admin/loginadmin') {
      let body = ''; for await (const part of req) body += part;
      const form = new URLSearchParams(body);
      assert.equal(req.headers.cookie, 'seed=initial');
      assert.equal(form.get('csrf'), 'fixture');
      const username = form.get('admin_id');
      res.setHeader('Set-Cookie', [`seed=; Path=/; Max-Age=0`, `sid=${username}-private; Path=/; HttpOnly`]);
      res.end(JSON.stringify({ response: form.get('password') === 'fixture-password' ? 'success' : 'fail' })); return;
    }
    if (req.url === '/management/image') {
      if (denied) { res.writeHead(302, { Location: '/admin' }); res.end(); return; }
      assert.match(req.headers.cookie || '', /^sid=(alice|bob)-private(?:-rotated)*$/);
      const value = req.headers.cookie.slice(4);
      res.setHeader('Set-Cookie', `sid=${value}-rotated; Path=/`);
      res.end('<button class="image-popup-insert">등록</button><script id="image-popup-template">private-list-content</script>'); return;
    }
    res.writeHead(404); res.end();
  });
  const mockPort = await listen(mock);
  t.after(() => { mock.closeAllConnections(); mock.close(); });
  const reservation = http.createServer(); const port = await listen(reservation); await new Promise(resolve => reservation.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const web = await startWeb(t, { PORT: String(port), LEGACY_LOGIN_URL: `http://127.0.0.1:${mockPort}/admin`, LEGACY_LOGIN_POST_URL: `http://127.0.0.1:${mockPort}/api/admin/loginadmin` });
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + '/api/health')).ok) { healthy = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  assert.ok(healthy, web.output());
  assert.equal((await fetch(base + '/athena-session-test')).status, 200);
  const post = (route, cookie = '', body = {}) => fetch(base + route, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const normal = await post('/api/auth/login', '', { username: 'alice', password: 'fixture-password' });
  assert.equal(normal.status, 200);
  const normalData = await normal.json();
  assert.deepEqual(Object.keys(normalData), ['user']);
  assert.equal(normalData.user.adminId, 'alice');
  const sessions = [];
  for (const username of ['alice', 'bob']) {
    const response = await post('/api/athena-test/login', '', { username, password: 'fixture-password' });
    assert.equal(response.status, 200);
    const raw = await response.text();
    assert.ok(!/sid=|private|fixture-password/.test(raw));
    sessions.push(response.headers.get('set-cookie').split(';')[0]);
  }
  for (const cookie of [sessions[0], sessions[1], sessions[0]]) {
    const response = await post('/api/athena-test/check', cookie);
    const raw = await response.text();
    assert.equal(JSON.parse(raw).ok, true);
    assert.ok(!/private-list-content|sid=|private/.test(raw));
  }
  const gets = calls.filter(c => c.path === '/management/image');
  assert.deepEqual(gets.map(c => c.cookie), ['sid=alice-private', 'sid=bob-private', 'sid=alice-private-rotated']);
  denied = true;
  const before = calls.length;
  const expired = await post('/api/athena-test/check', sessions[0]);
  assert.equal((await expired.json()).ok, false);
  assert.equal(calls.length, before + 1, 'never follows login redirects');
  await post('/api/athena-test/logout', sessions[0]);
  assert.equal((await post('/api/athena-test/check', sessions[0])).status, 401);
  assert.ok(!calls.some(c => c.path.includes('insertImage')), 'no uploads');
  assert.ok(!/fixture-password|sid=|alice-private/.test(web.output()), 'no secrets in logs');
});

test('disabled probe returns 404 without authentication or upstream requests', async t => {
  const probe = createAthenaProbe({ enabled: false, loginUrl: 'https://athena.example', authenticate: () => { throw new Error('must not run'); } });
  t.after(() => probe.close());
  assert.equal((await invoke(probe, 'login')).status, 404);
});
