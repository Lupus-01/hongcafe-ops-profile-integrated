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
        .replace('src="profile-code-files.js"', `src="${pathToFileURL(path.join(directory, 'profile-code-files.js'))}"`)
        .replace('src="profile-code-resizer-ui.js"', `src="${pathToFileURL(path.join(directory, 'profile-code-resizer-ui.js'))}"`);
    const run = async () => {
        const assert = (condition, message) => { if (!condition) throw new Error(message); };
        const get = (id) => document.getElementById(id);
        const waitUntil = async (predicate) => {
            for (let i = 0; i < 300; i += 1) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 1)); }
            throw new Error('browser operation timed out');
        };
        const original = '<div class="pb-presentation" style="background:rgb(247,246,251);padding:13px;border:1px solid red;width:600px"><h2 class="pb-presentation-title" style="font-size:66px;color:rgb(51,34,17);font-weight:800;margin:0">제목 원문</h2><p class="pb-presentation-body" style="font-size:35px;color:rgb(85,72,64);line-height:1.65;letter-spacing:1px">본문 <strong style="font-size:48px">강조</strong></p><span class="pb-presentation-chip" style="font-size:12px">라벨</span></div>'
            .replaceAll('style="', 'style="font-family:Pretendard,&quot;Apple SD Gothic Neo&quot;,&quot;Malgun Gothic&quot;,sans-serif;');
        try {
            const result = ProfileCodeResizer.resize(original, 42, 20);
            assert(ProfileCodeResizer.verifyDOM(original, result.code, document), 'DOM preservation');
            assert(result.code === original.replace('font-size:66px', 'font-size:42px !important').replace('font-size:35px', 'font-size:20px !important').replace('font-size:48px', 'font-size:20px !important'), 'exported quote entities and all non-size bytes preserved');
            const entityTail = '<h2 class="pb-presentation-title" style="font-family:&quot;name;font-size:99px&quot;">제목</h2><p class="pb-presentation-body" style="font-family:&#39;Apple SD Gothic Neo&#39;">본문</p>';
            const entityTailResult = ProfileCodeResizer.resize(entityTail, 42, 20);
            assert(ProfileCodeResizer.verifyDOM(entityTail, entityTailResult.code, document), 'entity terminator is not a CSS separator; font-family preserved');
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
            assert(get('pb-resize-title').value === '42' && get('pb-resize-body').value === '20', 'site defaults');
            assert(get('pb-resize-site').getAttribute('aria-pressed') === 'true', 'site default selected');
            assert(!get('pb-resize-canvas') && !/66|35/.test(get('pb-resizer').textContent), 'image size preset removed');
            assert(getComputedStyle(get('pb-resize-title')).fontFamily.includes('Pretendard'), 'UI font inherits production font');
            const sidebar = document.querySelector('.pb-resize-sidebar').getBoundingClientRect();
            const workspace = document.querySelector('.pb-resize-workspace').getBoundingClientRect();
            if (innerWidth > 960) assert(workspace.left >= sidebar.right - 1, 'desktop columns');
            else assert(workspace.top >= sidebar.bottom - 1, 'mobile stacked layout');
            assert(document.documentElement.scrollWidth <= innerWidth, 'no horizontal overflow');
            get('pb-resize-source').value = original;
            get('pb-resize-apply').click();
            assert(get('pb-resize-output').value === result.code, 'default conversion uses 42/20');
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
            get('pb-resizer-tab').click();
            get('pb-resize-title').value = 50;
            get('pb-resize-title').dispatchEvent(new Event('input'));
            assert(get('pb-resize-site').getAttribute('aria-pressed') === 'false', 'custom size deselects preset');
            assert(!get('pb-resize-output').value && get('pb-resize-copy').disabled && get('pb-resize-save').disabled, 'stale output cleared');
            get('pb-resize-title').value = 42;
            let finishRead;
            Object.defineProperty(get('pb-resize-file'), 'files', { configurable: true, value: [{ name: 'old-profile.txt', size: original.length, arrayBuffer: () => new Promise((resolve) => { finishRead = resolve; }) }] });
            get('pb-resize-file').dispatchEvent(new Event('change'));
            get('pb-resize-apply').click();
            assert(get('pb-resize-apply').disabled, 'conversion disabled during file read');
            finishRead(new TextEncoder().encode(original).buffer);
            await waitUntil(() => !get('pb-resize-file').disabled);
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
            assert(download === 'old-profile-크기수정.txt' && savedBlob.type === 'text/plain;charset=utf-8', 'download metadata');
            assert(await savedBlob.text() === result.code, 'download contains exact verified result');
            const xmlEscape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const wordXML = (text) => {
                const split = Math.floor(text.length / 2);
                return '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">' + xmlEscape(text.slice(0, split)) + '</w:t></w:r><w:r><w:t xml:space="preserve">' + xmlEscape(text.slice(split)) + '</w:t></w:r></w:p></w:body></w:document>';
            };
            const wordCode = original.replace('제목 원문', 'Word &amp; 원문').replace('본문 ', '본문  \t내용 ');
            assert(ProfileCodeFiles.extractWordCode(wordXML(wordCode)) === wordCode, 'Word split runs preserve code and entities');
            const linesXML = wordXML('앞  내용').replace('</w:body>', '<w:p><w:r><w:t>뒤</w:t><w:tab/><w:t>내용</w:t><w:br/><w:t>끝</w:t></w:r></w:p></w:body>');
            assert(ProfileCodeFiles.extractWordCode(linesXML) === '앞  내용\n뒤\t내용\n끝', 'Word paragraph tab and break preservation');
            for (const xml of [wordXML(wordCode).replace('<w:p>', '<w:p><w:ins/>'), wordXML(wordCode).replace('<w:p>', '<w:p><w:r><w:rPr><w:vanish/></w:rPr></w:r>'), wordXML(wordCode).replace('</w:body>', '<w:tbl/></w:body>'), wordXML(wordCode).replace('</w:document>', '<w:p><w:r><w:t>누락 금지</w:t></w:r></w:p></w:document>')]) {
                let refused = false; try { ProfileCodeFiles.extractWordCode(xml); } catch { refused = true; }
                assert(refused, 'ambiguous Word content must not be dropped');
            }
            const requested = [];
            window.fetch = async (url, options) => {
                requested.push(url);
                assert(options.credentials === 'same-origin' && options.body.get('file').name === '상담.docx', 'Word upload request');
                return { ok: true, json: async () => ({ documentXml: wordXML(wordCode) }) };
            };
            const txtCode = '\ufeff' + original.replace('본문 ', '본문  \r\n\t');
            const otherCode = original.replace('제목 원문', '다른 파일 제목');
            const files = [new File([txtCode], '상담.txt'), new File(['docx-test'], '상담.docx'), new File([otherCode], '상담.txt'), new File(['일반 문장'], '실패.txt'), new File(['legacy'], '구형.doc')];
            Object.defineProperty(get('pb-resize-file'), 'files', { configurable: true, value: files });
            get('pb-resize-file').dispatchEvent(new Event('change'));
            await waitUntil(() => !get('pb-resize-file').disabled);
            assert(requested.length === 1 && requested[0] === '/api/profile-code-document', 'only Word read API called');
            assert(document.querySelectorAll('.pb-resize-file-item').length === 5, 'all selected files have separate rows');
            assert(document.documentElement.scrollWidth <= innerWidth, 'batch list does not overflow viewport');
            assert(get('pb-resize-source').readOnly, 'file source cannot be edited');
            get('pb-resize-apply-all').click();
            await waitUntil(() => !get('pb-resize-file').disabled);
            assert(document.querySelectorAll('.pb-resize-file-item[data-state="success"]').length === 3, 'mixed batch successes');
            assert(document.querySelectorAll('.pb-resize-file-item[data-state="error"]').length === 2, 'failed files isolated');
            const expectedCodes = [txtCode, wordCode, otherCode].map((code) => ProfileCodeResizer.resize(code, 42, 20).code);
            for (let i = 0; i < 3; i += 1) {
                document.querySelectorAll('.pb-resize-file-item')[i].click();
                get('pb-resize-output').value = '출력 영역을 잘못 바꿔도 저장에 사용하지 않음';
                get('pb-resize-save').click();
                const decoded = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await savedBlob.arrayBuffer());
                assert(decoded === expectedCodes[i], 'individual file exact source preservation including CRLF/BOM');
            }
            get('pb-resize-save-all').click();
            assert(download === 'profile-font-size-results.zip', 'batch ZIP name');
            const archive = new Uint8Array(await savedBlob.arrayBuffer()), view = new DataView(archive.buffer);
            const actualFiles = []; let offset = 0;
            while (view.getUint32(offset, true) === 0x04034b50) {
                const length = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true);
                const name = new TextDecoder().decode(archive.slice(offset + 30, offset + 30 + nameLength));
                const start = offset + 30 + nameLength + extra;
                actualFiles.push({ name, code: new TextDecoder('utf-8', { ignoreBOM: true }).decode(archive.slice(start, start + length)) }); offset = start + length;
            }
            assert(actualFiles.length === 3, 'ZIP contains only successful results');
            assert(new Set(actualFiles.map((file) => file.name)).size === 3, 'duplicate filenames preserved separately');
            actualFiles.forEach((file, index) => assert(file.code === expectedCodes[index], 'ZIP result equals exact verified code'));
            let rejectClipboard;
            navigator.clipboard.writeText = () => new Promise((_resolve, reject) => { rejectClipboard = reject; });
            document.querySelectorAll('.pb-resize-file-item')[0].click();
            get('pb-resize-copy').click();
            document.querySelectorAll('.pb-resize-file-item')[1].click();
            rejectClipboard(new Error('clipboard denied'));
            await Promise.resolve();
            assert(get('pb-resize-output').value === expectedCodes[1], 'late clipboard failure cannot mix file results');
            get('pb-resize-body').value = 21; get('pb-resize-body').dispatchEvent(new Event('input'));
            assert(get('pb-resize-save-all').disabled && document.querySelectorAll('.pb-resize-file-item[data-state="success"]').length === 0, 'size change invalidates entire batch');
            // 취소 후 늦게 도착한 파일 데이터가 새 원본/결과를 덮지 않아야 한다.
            let lateRead;
            Object.defineProperty(get('pb-resize-file'), 'files', { configurable: true, value: [{ name: 'late.txt', size: 10, arrayBuffer: () => new Promise((resolve) => { lateRead = resolve; }) }] });
            get('pb-resize-file').dispatchEvent(new Event('change'));
            get('pb-resize-cancel').click();
            get('pb-resize-manual').click();
            get('pb-resize-source').value = original;
            get('pb-resize-site').click(); get('pb-resize-apply').click();
            lateRead(new TextEncoder().encode('늦게 도착한 데이터').buffer);
            await new Promise((resolve) => setTimeout(resolve, 0));
            assert(get('pb-resize-output').value === result.code && get('pb-resize-source').value === original, 'canceled read cannot overwrite new work');
            get('pb-resizer-tab').click();
            get('pb-resize-site').click();
            get('pb-resize-apply').click();
            if (window.PB_CAPTURE) {
                Object.defineProperty(get('pb-resize-file'), 'files', { configurable: true, value: files });
                get('pb-resize-file').dispatchEvent(new Event('change'));
                await waitUntil(() => !get('pb-resize-file').disabled);
                get('pb-resize-apply-all').click();
                await waitUntil(() => !get('pb-resize-file').disabled);
                document.querySelector('.pb-resize-file-item').click();
            }
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
