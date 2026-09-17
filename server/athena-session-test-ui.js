const result = document.getElementById('result');
const buttons = [...document.querySelectorAll('button')];
const inputs = [...document.querySelectorAll('input')];
let busy = false;
function setBusy(value) {
  busy = value;
  [...buttons, ...inputs].forEach(control => { control.disabled = value; });
}
async function request(action, body = {}) {
  setBusy(true);
  result.textContent = '확인 중입니다…';
  try {
    const response = await fetch(`/api/athena-test/${action}`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await response.json();
    result.textContent = data.message || data.error || '검사 응답을 확인할 수 없습니다.';
    result.dataset.state = data.ok ? 'success' : 'error';
    return data;
  } catch {
    result.textContent = '로컬 검사 서버에 연결할 수 없습니다.';
    result.dataset.state = 'error';
  } finally { setBusy(false); }
}
document.getElementById('login').addEventListener('submit', event => {
  event.preventDefault();
  const password = document.getElementById('password');
  const body = { username: document.getElementById('username').value.trim(), password: password.value };
  password.value = '';
  request('login', body);
});
document.getElementById('check').addEventListener('click', () => request('check'));
document.getElementById('logout').addEventListener('click', () => request('logout'));
const fileInput = document.getElementById('upload-file');
const original = document.getElementById('original-preview');
const registered = document.getElementById('registered-preview');
const urlLink = document.getElementById('upload-url');
const nameLabel = document.getElementById('upload-name');
let previewUrl = '';
fileInput.addEventListener('change', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  original.hidden = true;
  original.removeAttribute('src');
  registered.hidden = true;
  registered.removeAttribute('src');
  urlLink.hidden = true;
  urlLink.removeAttribute('href');
  nameLabel.textContent = '';
  document.getElementById('upload-consent').checked = false;
  const file = fileInput.files[0];
  if (file && ['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= 8 * 1024 * 1024) {
    previewUrl = URL.createObjectURL(file);
    original.src = previewUrl;
    original.hidden = false;
  }
});
async function upload(recoverOnly) {
  if (busy) return;
  const file = fileInput.files[0];
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) {
    result.textContent = '8MB 이하 PNG/JPEG/WebP 이미지 한 장을 선택해주세요.'; return;
  }
  if (!recoverOnly && !document.getElementById('upload-consent').checked) {
    result.textContent = '실제 이미지 등록 항목에 체크해주세요.'; return;
  }
  setBusy(true);
  try {
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('선택한 파일을 읽지 못했습니다.'));
      reader.readAsDataURL(file);
    });
    const data = await request(recoverOnly ? 'recover' : 'upload', { source, confirmUpload: !recoverOnly });
    if (data?.name) nameLabel.textContent = `아테나 등록 이름: ${data.name}`;
    if (data?.ok && data.url) {
      const url = new URL(data.url);
      if (url.origin !== 'https://hongcafe-korea.gcdn.ntruss.com' || !url.pathname.startsWith('/media/media_url/')) throw new Error('등록 URL을 확인할 수 없습니다.');
      urlLink.href = url.href;
      urlLink.textContent = url.href;
      urlLink.hidden = false;
      registered.src = url.href;
      registered.hidden = false;
    }
  } catch (error) { result.textContent = error.message; }
  finally { setBusy(false); }
}
registered.addEventListener('error', () => { result.textContent = 'URL은 확보했지만 이미지 표시를 확인하지 못했습니다. URL 링크를 열어 확인해주세요.'; });
document.getElementById('upload').addEventListener('click', () => upload(false));
document.getElementById('recover').addEventListener('click', () => upload(true));
