import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const chrome = process.env.PROFILE_TEST_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('real maker previews exported HTML, restores history, refreshes edits and preserves capture', { skip: !fs.existsSync(chrome) }, () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-preview-'));
    let page = fs.readFileSync(path.join(directory, 'index.html'), 'utf8')
        .replace(/<script[^>]*src="\/vendor\/html2canvas\/html2canvas.min.js"[^>]*><\/script>/, '')
        .replace('href="style.css"', `href="${pathToFileURL(path.join(directory, 'style.css'))}"`)
        .replace(/src="([\w-]+\.js)"/g, (_, name) => `src="${pathToFileURL(path.join(directory, name))}"`);
    const setup = () => {
        localStorage.clear();
        window.requestCount = 0;
        window.fetch = () => { window.requestCount++; return Promise.reject(new Error('Unexpected API call')); };
        window.alert = (text) => { window.lastAlert = text; };
        localStorage.setItem('pb-profile-history-v1', JSON.stringify([{
            id: 'fixture', title: '검수 프로필', templateType: 'tarot-ppt', imageMode: false,
            profile: { headline: '마음을 살피는 상담', intro: '현재 고민을 함께 정리합니다.', bulletPoints: ['관계의 흐름', '선택의 방향'] }
        }]));
    };
    const run = async () => {
        const check = (condition, label) => { if (!condition) throw new Error(label); };
        const byId = (id) => document.getElementById(id);
        const wait = async (fn) => {
            for (let i = 0; i < 300; i++) { if (fn()) return; await new Promise((resolve) => setTimeout(resolve, 10)); }
            throw new Error('Timed out');
        };
        const frame = byId('pb-site-view-frame');
        await wait(() => byId('pb-site-view-status').dataset.state === 'error');
        check(frame.hidden, 'empty profile hidden');
        byId('pb-edit-view-btn').click();
        document.querySelector('#pb-history-list button').click();
        await wait(() => frame.contentDocument?.querySelector('h2'));
        check(byId('pb-editor-view').hidden && !byId('pb-site-view').hidden, 'history opens site preview');
        byId('pb-code-generate-btn').click();
        check(frame.srcdoc.includes(`<body>${byId('pb-code-output').value}</body>`), 'same HTML as export');
        byId('pb-close-code-modal').click();
        check(frame.contentWindow.getComputedStyle(frame.contentDocument.querySelector('h2')).fontSize === '26px', 'site typography');
        byId('pb-edit-view-btn').click();
        const title = document.querySelector('#pb-canvas h2');
        title.textContent = '편집한 제목';
        byId('pb-site-view-btn').click();
        await wait(() => frame.contentDocument?.querySelector('h2')?.textContent === '편집한 제목');
        byId('pb-site-view-width').value = '720';
        byId('pb-site-view-width').dispatchEvent(new Event('change'));
        check(frame.style.width === '720px', 'desktop width');
        const presentation = document.querySelector('#pb-canvas .pb-presentation');
        presentation.classList.remove('is-text-only-choice');
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
        presentation.querySelectorAll('img').forEach((img) => img.src = dataUrl);
        await wait(() => frame.hidden && byId('pb-site-view-status').textContent.includes('URL'));
        check(!frame.hasAttribute('srcdoc'), 'stale preview cleared');
        for (const kind of ['portrait', 'mood']) {
            byId(`pb-${kind}-site-url`).value = `https://example.com/${kind}.png`;
            byId(`pb-${kind}-site-url`).dispatchEvent(new Event('input'));
        }
        await wait(() => !frame.hidden && frame.srcdoc.includes('https://example.com/mood.png'));
        byId('pb-portrait-site-url').value = 'https://example.com/replaced.png';
        byId('pb-portrait-site-url').dispatchEvent(new Event('input'));
        await wait(() => frame.srcdoc.includes('https://example.com/replaced.png'));
        byId('pb-embed-images-in-code').checked = true;
        byId('pb-embed-images-in-code').dispatchEvent(new Event('change'));
        await wait(() => frame.srcdoc.includes(dataUrl));
        check(!frame.sandbox.contains('allow-scripts'), 'preview scripts disabled');
        window.html2canvas = async (clone) => {
            check(clone.querySelector('h2').style.fontSize === '66px', 'capture typography preserved');
            check(clone.offsetWidth === 720, 'hidden editor still exports at capture width');
            window.captureChecked = true;
            return { toDataURL: () => dataUrl };
        };
        HTMLAnchorElement.prototype.click = function () {};
        byId('pb-export-btn').click();
        await wait(() => window.captureChecked);
        check(window.requestCount === 0, 'no AI/API requests');
        byId('pb-site-view-width').value = '375';
        byId('pb-site-view-width').dispatchEvent(new Event('change'));
        const result = document.createElement('p'); result.id = 'preview-test-result'; result.textContent = 'PASS'; document.body.appendChild(result);
    };
    page = page.replace('<head>', `<head><script>(${setup})();</script>`)
        .replace('</body>', `<script>window.addEventListener('load', async () => { try { await (${run})(); } catch(e) { const p=document.createElement('pre');p.id='preview-test-failure';p.textContent=e.stack;document.body.appendChild(p); } });</script></body>`);
    const file = path.join(temporary, 'test.html'); fs.writeFileSync(file, page);
    const capture = process.env.PROFILE_TEST_SCREENSHOT ? [`--screenshot=${path.resolve(process.env.PROFILE_TEST_SCREENSHOT)}`] : [];
    const output = execFileSync(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-extensions', '--host-resolver-rules=MAP * ~NOTFOUND', `--user-data-dir=${path.join(temporary, 'browser')}`, '--window-size=1440,1000', ...capture, '--allow-file-access-from-files', '--virtual-time-budget=10000', '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.ok(/id="preview-test-result">PASS<\/p>/.test(output), output.match(/<pre id="preview-test-failure">([\s\S]*?)<\/pre>/)?.[1] || 'Browser did not finish');
});
