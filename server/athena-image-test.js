const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function failure(status, message) { return Object.assign(new Error(message), { publicStatus: status }); }
function decodeImage(source) {
  const match = typeof source === 'string' && source.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length > 12 * 1024 * 1024) throw failure(400, '8MB 이하 PNG/JPEG/WebP 이미지 한 장을 선택해주세요.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024 || bytes.toString('base64') !== match[2]) throw failure(400, '이미지 데이터가 올바르지 않습니다.');
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    : match[1] === 'jpeg' ? bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.subarray(-2).equals(Buffer.from('ffd9', 'hex'))
      : bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw failure(400, '선택한 파일의 형식과 이미지 내용이 일치하지 않습니다.');
  return { bytes, mime: `image/${match[1]}`, extension: match[1] === 'jpeg' ? 'jpg' : match[1] };
}

function validateRegisteredUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw failure(502, '등록 행에서 이미지 URL을 확인할 수 없습니다.'); }
  if (url.origin !== 'https://hongcafe-korea.gcdn.ntruss.com' || !url.pathname.startsWith('/media/media_url/') || url.username || url.password) throw failure(502, '등록 이미지 URL의 호스트 또는 경로가 예상과 다릅니다.');
  return url.href;
}

function registeredUrl(html, name) {
  // Only parse the known table contract supplied by the user. Names generated
  // here contain ASCII only; do not guess based on latest row or substring.
  const urls = [];
  for (const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr\s*>/gi) || []) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td\s*>/gi)].map(m => m[1]);
    if (cells.length < 3 || cells[1].trim() !== name || !/^\d+$/.test(cells[0].trim())) continue;
    const img = cells[2].match(/<img\b[^>]*>/i)?.[0] || '';
    const raw = img.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1]?.replace(/&amp;/gi, '&');
    urls.push(validateRegisteredUrl(raw));
  }
  if (urls.length > 1) throw failure(409, '같은 검사 이름의 등록 결과가 여러 개입니다. 관리 목록을 확인해주세요.');
  return urls[0] || null;
}

async function limitedText(response, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > maxBytes) throw failure(502, '아테나 응답이 예상 크기를 초과했습니다.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function createImageTest({ loginUrl, receiptDirectory, fetchImpl = fetch }) {
  const origin = new URL(loginUrl).origin;
  const listAddress = new URL('/management/image', origin).href;
  async function find(session, name) {
    const response = await fetchImpl(listAddress, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { Cookie: session.jar.header(listAddress), 'User-Agent': 'HongCafe-Ops-Worklog/0.1' } });
    session.jar.absorb(response.headers, listAddress);
    if (response.status !== 200) {
      await response.body?.cancel();
      throw failure(401, '아테나 목록에 접근할 수 없습니다. 다시 로그인 후 결과 확인을 눌러주세요.');
    }
    const html = await limitedText(response, 4 * 1024 * 1024);
    if (!/class=["'][^"']*\bimage-popup-insert\b[^"']*["']/.test(html)
      || !/id\s*=\s*["']image-popup-template["']/.test(html)) throw failure(401, '이미지관리 화면을 확인하지 못했습니다. 다시 로그인해주세요.');
    return registeredUrl(html, name);
  }
  return async function run(session, body, recoverOnly = false) {
    const image = decodeImage(body.source);
    const key = crypto.createHash('sha256').update(`${origin}\n${session.accountKey}\n`).update(image.bytes).digest('hex');
    const name = `hc-test-${key.slice(0, 32)}`;
    const file = path.join(receiptDirectory, `${key}.json`);
    let receipt;
    try { receipt = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw failure(409, '등록 기록을 읽을 수 없어 재등록을 중단했습니다.'); }
    const finish = (url, reused) => {
      const completed = { version: 1, name, state: 'complete', url, updatedAt: new Date().toISOString() };
      fs.mkdirSync(receiptDirectory, { recursive: true });
      const temporary = file + '.' + crypto.randomUUID() + '.tmp';
      fs.writeFileSync(temporary, JSON.stringify(completed), { flag: 'wx', mode: 0o600 });
      fs.renameSync(temporary, file);
      return { ok: true, name, url, reused, message: reused ? '기존 등록 결과를 재사용했습니다. 새 업로드는 하지 않았습니다.' : '이미지 한 장을 등록하고 URL을 확인했습니다. 두 미리보기를 비교해주세요.' };
    };
    // A complete receipt is only for the exact account/origin/image bytes.
    if (receipt?.state === 'complete') {
      const url = validateRegisteredUrl(receipt.url);
      return { ok: true, name, url, reused: true, message: '기존 등록 결과를 재사용했습니다. 새 업로드는 하지 않았습니다.' };
    }
    const found = await find(session, name);
    if (found) return finish(found, true);
    if (receipt || recoverOnly) return { ok: false, name, pending: Boolean(receipt), message: `현재 목록에서 등록 결과를 찾지 못했습니다. 재업로드하지 않았습니다. 아테나에서 ${name} 이름으로 확인해주세요.` };
    fs.mkdirSync(receiptDirectory, { recursive: true });
    try {
      // Exclusive creation is the durable cross-session duplicate guard. Keep
      // this record even on timeout, process crash or a failure response.
      fs.writeFileSync(file, JSON.stringify({ version: 1, name, state: 'pending', createdAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if (error.code === 'EEXIST') return { ok: false, name, pending: true, message: '같은 이미지 등록이 진행됐습니다. 잠시 후 결과 확인을 눌러주세요.' };
      throw failure(503, '중복 방지 기록을 저장할 수 없어 업로드하지 않았습니다.');
    }
    try {
      const address = new URL('/api/management/insertImage', origin).href;
      const data = new FormData();
      data.append('media_name', name);
      data.append('bn_img', new Blob([image.bytes], { type: image.mime }), `${name}.${image.extension}`);
      data.append('media_memo', '프로필 서버 연동 2차 검사');
      const response = await fetchImpl(address, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(30000),
        headers: { Cookie: session.jar.header(address), Referer: listAddress, Origin: origin, 'X-Requested-Wit': 'XMLHttpRequest', 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'HongCafe-Ops-Worklog/0.1' }, body: data });
      session.jar.absorb(response.headers, address);
      if (response.status !== 200) { await response.body?.cancel(); throw new Error('Upload response not confirmed'); }
      const result = JSON.parse(await limitedText(response, 256 * 1024));
      if (result.response !== 'success') throw new Error('Upload success not confirmed');
      const url = await find(session, name);
      if (url) return finish(url, false);
    } catch { /* preserve pending receipt; never return upstream secrets */ }
    return { ok: false, name, pending: true, message: '등록 결과를 확정하지 못했습니다. 같은 이미지 결과 확인을 눌러주세요. 중복 방지를 위해 다시 업로드하지 않습니다.' };
  };
}
module.exports = { createImageTest, decodeImage, registeredUrl };
