const crypto = require('node:crypto');
const path = require('node:path');
const { createImageTest } = require('./athena-image-test');

// A small origin-bound cookie jar for the local Athena probe. It never
// forwards cookies to a different origin or follows an authentication redirect.
class AthenaCookieJar {
  constructor(origin) { this.origin = new URL(origin).origin; this.cookies = new Map(); }
  absorb(headers, address, now = Date.now()) {
    const url = new URL(address);
    if (url.origin !== this.origin) throw new Error('Unexpected Athena origin');
    const values = headers.getSetCookie ? headers.getSetCookie()
      : (headers.get('set-cookie') || '').split(/,(?=\s*[^;,=\s]+=[^;]*)/).filter(Boolean);
    for (const value of values) {
      const [pair, ...attributes] = value.split(';');
      const equal = pair.indexOf('=');
      if (equal < 1) continue;
      const name = pair.slice(0, equal).trim();
      const content = pair.slice(equal + 1).trim();
      if (!/^[!#$%&'*+\-.^_`|~\w]+$/.test(name) || /[\r\n;]/.test(content)) continue;
      const attrs = Object.fromEntries(attributes.map(part => {
        const index = part.indexOf('=');
        return index < 0 ? [part.trim().toLowerCase(), true]
          : [part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim()];
      }));
      const domain = typeof attrs.domain === 'string' ? attrs.domain.replace(/^\./, '').toLowerCase() : url.hostname;
      if (domain !== url.hostname && !url.hostname.endsWith('.' + domain)) continue;
      const directory = url.pathname.slice(0, url.pathname.lastIndexOf('/')) || '/';
      const cookiePath = typeof attrs.path === 'string' && attrs.path.startsWith('/') ? attrs.path : directory;
      let expires = typeof attrs.expires === 'string' ? Date.parse(attrs.expires) : Infinity;
      if (!Number.isFinite(expires)) expires = Infinity;
      if (typeof attrs['max-age'] === 'string' && /^-?\d+$/.test(attrs['max-age'])) expires = now + Number(attrs['max-age']) * 1000;
      const key = `${name}\n${cookiePath}`;
      if (expires <= now) this.cookies.delete(key);
      else this.cookies.set(key, { name, content, path: cookiePath, secure: attrs.secure === true, expires });
    }
  }
  header(address, now = Date.now()) {
    const url = new URL(address);
    if (url.origin !== this.origin) throw new Error('Unexpected Athena origin');
    const values = [];
    for (const [key, cookie] of this.cookies) {
      if (cookie.expires <= now) { this.cookies.delete(key); continue; }
      const matchesPath = url.pathname === cookie.path || url.pathname.startsWith(cookie.path.endsWith('/') ? cookie.path : cookie.path + '/');
      if (matchesPath && (!cookie.secure || url.protocol === 'https:')) values.push(cookie);
    }
    return values.sort((a, b) => b.path.length - a.path.length).map(c => `${c.name}=${c.content}`).join('; ');
  }
}

function createAthenaProbe({ loginUrl, enabled, authenticate, fetchImpl = fetch, now = Date.now, receiptDirectory = path.join(__dirname, 'data', 'athena-upload-tests') }) {
  const sessions = new Map();
  const imageTest = createImageTest({ loginUrl, receiptDirectory, fetchImpl });
  const ttl = 15 * 60 * 1000;
  const cleanup = setInterval(() => {
    for (const [id, session] of sessions) if (session.expires <= now()) sessions.delete(id);
  }, 30000);
  cleanup.unref();
  const respond = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  const cookieName = 'athena_probe';
  const sessionId = req => (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  const setCookie = (res, value, seconds) => res.setHeader('Set-Cookie', `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/api/athena-test; Max-Age=${seconds}`);
  return {
    enabled,
    close() { clearInterval(cleanup); sessions.clear(); },
    async handle(req, res, pathname, readBody) {
      if (!pathname.startsWith('/api/athena-test/')) return false;
      if (!enabled) { respond(res, 404, { error: 'Not found' }); return true; }
      // Loopback binding plus exact Origin prevents another website from using
      // this local test service to authenticate or inspect an existing session.
      const expectedOrigin = `http://${req.headers.host}`;
      const host = new URL(expectedOrigin).hostname;
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)
          || req.headers.origin !== expectedOrigin || req.method !== 'POST'
          || !(req.headers['content-type'] || '').startsWith('application/json')) {
        respond(res, 403, { error: '로컬 검사 화면에서 실행해주세요.' }); return true;
      }
      try {
        if (pathname === '/api/athena-test/login') {
          const body = await readBody(req, 8192);
          const previous = sessionId(req);
          if (previous) sessions.delete(previous);
          setCookie(res, '', 0);
          const username = String(body.username || '').trim();
          const password = String(body.password || '');
          if (!username || !password) { respond(res, 400, { error: '아이디와 비밀번호를 입력해주세요.' }); return true; }
          const capture = { jar: new AthenaCookieJar(loginUrl) };
          const ok = await authenticate(username, password, capture);
          if (!ok) { respond(res, 401, { error: '아테나 로그인에 실패했습니다.' }); return true; }
          const id = crypto.randomBytes(32).toString('hex');
          sessions.set(id, { jar: capture.jar, accountKey: crypto.createHash('sha256').update(username.toLowerCase()).digest('hex'), expires: now() + ttl, busy: false });
          setCookie(res, id, ttl / 1000);
          respond(res, 200, { ok: true, message: '로그인 판정 성공. 목록 조회 검사를 실행해주세요.', expiresInSeconds: ttl / 1000 });
        } else if (pathname === '/api/athena-test/logout') {
          sessions.delete(sessionId(req));
          setCookie(res, '', 0);
          respond(res, 200, { ok: true, message: '로컬 아테나 검사 세션을 삭제했습니다.' });
        } else if (pathname === '/api/athena-test/upload' || pathname === '/api/athena-test/recover') {
          const session = sessions.get(sessionId(req));
          if (!session || session.expires <= now()) {
            sessions.delete(sessionId(req));
            respond(res, 401, { error: '검사 화면에서 다시 로그인해주세요.' }); return true;
          }
          if (session.busy) { respond(res, 409, { error: '다른 검사가 진행 중입니다.' }); return true; }
          session.busy = true;
          try {
            const body = await readBody(req, 12 * 1024 * 1024);
            if (pathname.endsWith('/upload') && body.confirmUpload !== true) {
              respond(res, 400, { error: '선택한 이미지의 실제 등록에 체크해주세요.' }); return true;
            }
            respond(res, 200, await imageTest(session, body, pathname.endsWith('/recover')));
          } finally { session.busy = false; }
        } else if (pathname === '/api/athena-test/check') {
          const id = sessionId(req);
          const session = sessions.get(id);
          if (!session || session.expires <= now()) {
            sessions.delete(id);
            respond(res, 401, { error: '검사 화면에서 다시 로그인해주세요.' }); return true;
          }
          if (session.busy) { respond(res, 409, { error: '목록 조회가 진행 중입니다.' }); return true; }
          session.busy = true;
          try {
            const address = new URL('/management/image', loginUrl).href;
            const response = await fetchImpl(address, {
              method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000),
              headers: { Cookie: session.jar.header(address), 'User-Agent': 'HongCafe-Ops-Worklog/0.1' }
            });
            session.jar.absorb(response.headers, address);
            if (response.status !== 200) {
              await response.body?.cancel();
              respond(res, 200, { ok: false, upstreamStatus: response.status, message: '목록 접근을 확인하지 못했습니다. 로그인 만료 또는 계정 권한을 확인해주세요.' });
            } else {
              const chunks = [];
              let size = 0;
              for await (const chunk of response.body) {
                size += chunk.byteLength;
                if (size > 4 * 1024 * 1024) throw new Error('Response too large');
                chunks.push(Buffer.from(chunk));
              }
              const html = Buffer.concat(chunks).toString('utf8');
              const ok = /class=["'][^"']*\bimage-popup-insert\b[^"']*["']/.test(html)
                && /id\s*=\s*["']image-popup-template["']/.test(html);
              respond(res, 200, { ok, upstreamStatus: 200, message: ok
                ? '아테나 이미지관리 목록 접근을 확인했습니다. 기존 아테나 창도 새로고침해 로그인이 유지되는지 확인해주세요.'
                : '응답은 받았지만 이미지관리 화면을 확인하지 못했습니다. 로그인 상태·권한·화면 구조 확인이 필요합니다.' });
            }
          } finally { session.busy = false; }
        } else respond(res, 404, { error: 'Not found' });
      } catch (error) {
        // Never return upstream HTML, fetch errors, cookies or submitted secrets.
        respond(res, error.publicStatus || 502, { error: error.publicStatus ? error.message : '아테나 연결 검사를 완료하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.' });
      }
      return true;
    }
  };
}
module.exports = { AthenaCookieJar, createAthenaProbe };
