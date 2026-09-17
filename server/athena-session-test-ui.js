const result = document.getElementById('result');
const buttons = [...document.querySelectorAll('button')];
async function request(action, body = {}) {
  buttons.forEach(button => { button.disabled = true; });
  result.textContent = '확인 중입니다…';
  try {
    const response = await fetch(`/api/athena-test/${action}`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await response.json();
    result.textContent = data.message || data.error || '검사 응답을 확인할 수 없습니다.';
    result.dataset.state = data.ok ? 'success' : 'error';
  } catch {
    result.textContent = '로컬 검사 서버에 연결할 수 없습니다.';
    result.dataset.state = 'error';
  } finally { buttons.forEach(button => { button.disabled = false; }); }
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
