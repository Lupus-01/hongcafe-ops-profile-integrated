import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const chrome = process.env.PROFILE_TEST_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
test('browser validates DOM, computed styles, tabs and stale output protection', { skip: !fs.existsSync(chrome) }, () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-resizer-'));
    // 기존 생성 스크립트를 로드하지 않아 API/AI 요청 없이 교정 UI만 검사한다.
    let page = fs.readFileSync(path.join(directory, 'index.html'), 'utf8')
        .replace(/<script[^>]*src="(?:script.js|\/vendor\/html2canvas\/html2canvas.min.js)"[^>]*><\/script>/g, '')
        .replace('href="style.css"', `href="${pathToFileURL(path.join(directory, 'style.css'))}"`)
        .replace('src="profile-code-resizer.js"', `src="${pathToFileURL(path.join(directory, 'profile-code-resizer.js'))}"`)
        .replace('src="profile-code-resizer-ui.js"', `src="${pathToFileURL(path.join(directory, 'profile-code-resizer-ui.js'))}"`);
    const run = async () => {
        const assert = (condition, message) => { if (!condition) throw new Error(message); };
        const get = (id) => document.getElementById(id);
        const original = '<div class="pb-presentation" style="background:rgb(247,246,251);padding:13px;border:1px solid red;width:600px"><h2 class="pb-presentation-title" style="font-size:66px;color:rgb(51,34,17);font-weight:800;margin:0">제목 원문</h2><p class="pb-presentation-body" style="font-size:35px;color:rgb(85,72,64);line-height:1.65;letter-spacing:1px">본문 <strong style="font-size:48px">강조</strong></p><span class="pb-presentation-chip" style="font-size:12px">라벨</span></div>';
        try {
            const result = ProfileCodeResizer.resize(original, 42, 20);
            assert(ProfileCodeResizer.verifyDOM(original, result.code, document), 'DOM preservation');
            for (const mutated of [result.code.replace('제목 원문', '다른 제목'), result.code.replace('padding:13px', 'padding:99px'), result.code.replace('font-weight:800', 'font-weight:400')]) {
                let rejected = false;
                try { ProfileCodeResizer.verifyDOM(original, mutated, document); } catch { rejected = true; }
                assert(rejected, 'must reject unrelated mutations');
            }
            let rejected = false;
            try {
                const malformed = '<p class="pb-presentation-body"><h2 class="pb-presentation-title">제목</h2>본문</p>';
                ProfileCodeResizer.verifyDOM(malformed, ProfileCodeResizer.resize(malformed, 42, 20).code, document);
            } catch { rejected = true; }
            assert(rejected, 'must reject browser repaired markup');
            const blocks = [original, result.code].map((html) => {
                const element = document.createElement('div');
                element.innerHTML = html;
                document.body.appendChild(element);
                return element;
            });
            for (const selector of ['.pb-presentation', 'h2', 'p', 'strong', '.pb-presentation-chip']) {
                const [before, after] = blocks.map((block) => getComputedStyle(block.querySelector(selector)));
                for (const property of ['color', 'backgroundColor', 'fontFamily', 'fontWeight', 'fontStyle', 'letterSpacing', 'textAlign', 'padding', 'margin', 'border', 'display']) assert(before[property] === after[property], selector + ' preserves ' + property);
            }
            assert(getComputedStyle(blocks[1].querySelector('h2')).fontSize === '42px', 'title 42px');
            assert(getComputedStyle(blocks[1].querySelector('p')).fontSize === '20px', 'body 20px');
            assert(getComputedStyle(blocks[1].querySelector('strong')).fontSize === '20px', 'nested 20px');
            assert(getComputedStyle(blocks[1].querySelector('.pb-presentation-chip')).fontSize === '12px', 'label unchanged');
            blocks.forEach((block) => block.remove());
            get('pb-canvas').dataset.preservationSentinel = 'keep';
            get('pb-resizer-tab').click();
            assert(get('pb-app').hidden && !get('pb-resizer').hidden, 'resize tab');
            assert(get('pb-resize-title').value === '66' && get('pb-resize-body').value === '35', 'automation defaults');
            assert(get('pb-resize-canvas').getAttribute('aria-pressed') === 'true', 'automation selected');
            assert(getComputedStyle(get('pb-resize-title')).fontFamily.includes('Pretendard'), 'UI font inherits production font');
            const sidebar = document.querySelector('.pb-resize-sidebar').getBoundingClientRect();
            const workspace = document.querySelector('.pb-resize-workspace').getBoundingClientRect();
            if (innerWidth > 960) assert(workspace.left >= sidebar.right - 1, 'desktop columns');
            else assert(workspace.top >= sidebar.bottom - 1, 'mobile stacked layout');
            assert(document.documentElement.scrollWidth <= innerWidth, 'no horizontal overflow');
            get('pb-resize-source').value = original;
            get('pb-resize-apply').click();
            assert(get('pb-resize-output').value === ProfileCodeResizer.resize(original, 66, 35).code, 'default conversion');
            assert(get('pb-resize-status').dataset.state === 'success', 'success feedback');
            get('pb-resize-site').click();
            assert(get('pb-resize-copy').disabled && get('pb-resize-site').getAttribute('aria-pressed') === 'true', 'preset invalidates previous output');
            get('pb-resize-apply').click();
            assert(get('pb-resize-output').value === result.code && !get('pb-resize-copy').disabled, 'verified output');
            get('pb-resize-preview').click();
            assert(get('pb-resize-before').getAttribute('sandbox') === '', 'preview sandbox');
            assert(get('pb-resize-after').srcdoc.includes("default-src 'none'"), 'preview CSP');
            get('pb-maker-tab').click();
            assert(!get('pb-app').hidden && get('pb-canvas').dataset.preservationSentinel === 'keep', 'maker state preserved');
            assert(get('pb-resize-source').value === original, 'input preserved across tabs');
            get('pb-resize-title').value = 50;
            get('pb-resize-title').dispatchEvent(new Event('input'));
            assert(get('pb-resize-canvas').getAttribute('aria-pressed') === 'false' && get('pb-resize-site').getAttribute('aria-pressed') === 'false', 'custom size deselects presets');
            assert(!get('pb-resize-output').value && get('pb-resize-copy').disabled && get('pb-resize-save').disabled, 'stale output cleared');
            get('pb-resize-title').value = 42;
            let finishRead;
            Object.defineProperty(get('pb-resize-file'), 'files', { configurable: true, value: [{ name: 'old-profile.txt', size: original.length, text: () => new Promise((resolve) => { finishRead = resolve; }) }] });
            get('pb-resize-file').dispatchEvent(new Event('change'));
            get('pb-resize-apply').click();
            finishRead(original);
            await Promise.resolve();
            assert(get('pb-resize-source').value === original && get('pb-resize-copy').disabled, 'file read invalidates prior result');
            get('pb-resize-apply').click();
            let copied = '';
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { copied = text; } } });
            get('pb-resize-copy').click();
            await Promise.resolve();
            assert(copied === result.code, 'copy contains exact verified result');
            let savedBlob, download;
            URL.createObjectURL = (blob) => { savedBlob = blob; return 'blob:test'; };
            HTMLAnchorElement.prototype.click = function () { download = this.download; };
            get('pb-resize-save').click();
            assert(download === 'profile-font-size-adjusted.txt' && savedBlob.type === 'text/plain;charset=utf-8', 'download metadata');
            assert(await savedBlob.text() === result.code, 'download contains exact verified result');
            get('pb-resizer-tab').click();
            get('pb-resize-canvas').click();
            get('pb-resize-apply').click();
            const resultLabel = document.createElement('p');
            resultLabel.id = 'test-result';
            resultLabel.textContent = 'PASS: DOM preservation, computed styles, tabs, previews, invalidation, files, copy, download';
            if (window.PB_CAPTURE) { resultLabel.hidden = true; document.body.appendChild(resultLabel); }
            else document.body.replaceChildren(resultLabel);
        } catch (error) { document.body.innerHTML = ''; const result = document.createElement('pre'); result.textContent = 'FAIL: ' + error.stack; document.body.appendChild(result); }
    };
    page = page.replace('</body>', `<script>window.PB_CAPTURE = ${Boolean(process.env.PROFILE_TEST_SCREENSHOT)}; window.addEventListener('load', ${run.toString()});</script></body>`);
    const file = path.join(temporary, 'test.html');
    fs.writeFileSync(file, page);
    const capture = process.env.PROFILE_TEST_SCREENSHOT ? [`--screenshot=${path.resolve(process.env.PROFILE_TEST_SCREENSHOT)}`] : [];
    const output = execFileSync(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-extensions', '--host-resolver-rules=MAP * ~NOTFOUND', `--user-data-dir=${path.join(temporary, 'browser')}`, `--window-size=${process.env.PROFILE_TEST_WINDOW_SIZE || '1440,1000'}`, ...capture, '--allow-file-access-from-files', '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(output, /<p id="test-result"(?: hidden="")?>PASS: DOM preservation, computed styles, tabs, previews, invalidation, files, copy, download<\/p>/, output);
});
