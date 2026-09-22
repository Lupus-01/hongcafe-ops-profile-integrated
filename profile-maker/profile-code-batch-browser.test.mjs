import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import test from 'node:test';
import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { registerCodeDocumentRoute } from '../profile-maker-api/profile-code-document.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const chrome = process.env.PROFILE_TEST_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// 실제 UI와 로컬 Word API만 사용한다. 운영 인증/AI/외부 서비스에는 연결하지 않는다.
test('50/100/200 TXT and DOCX files preserve source through UI conversion and ZIP export', { skip: !fs.existsSync(chrome), timeout: 180000 }, async () => {
    const app = express();
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-batch-'));
    const paragraph = '<p class="pb-presentation-body" style="font-size:35px">' + '샘플  원문 &amp; 공백 보존. '.repeat(32) + '</p>\r\n';
    const original = '\ufeff<!-- 보존 -->\r\n<div class="pb-presentation"><h2 class="pb-presentation-title" style="font-size:66px">샘플 제목</h2>' + paragraph.repeat(60) + '<ul class="pb-presentation-points"><li>목록 원문</li></ul></div>';
    const xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">' + original.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\r', '&#13;') + '</w:t></w:r></w:p></w:body></w:document>';
    const archive = new AdmZip();
    archive.addFile('word/document.xml', Buffer.from(xml));
    const docx = archive.toBuffer();
    let wordRequests = 0;
    app.use('/api/profile-code-document', (_req, _res, next) => { wordRequests += 1; next(); });
    registerCodeDocumentRoute(app, [], multer);
    app.get('/fixture', (_req, res) => res.json({ original, docx: docx.toString('base64') }));
    let resolveResult, rejectResult;
    const result = new Promise((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
    app.post('/result', express.json({ limit: '1mb' }), (req, res) => { res.sendStatus(200); resolveResult(req.body); });
    const run = async () => {
        const check = (value, message) => { if (!value) throw new Error(message); };
        const get = (id) => document.getElementById(id);
        const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const ready = async () => {
            const start = performance.now();
            while (get('pb-resize-file').disabled) {
                if (performance.now() - start > 90000) throw new Error('UI timeout');
                await pause(10);
            }
        };
        const select = (files) => {
            Object.defineProperty(get('pb-resize-file'), 'files', { configurable: true, value: files });
            get('pb-resize-file').dispatchEvent(new Event('change'));
        };
        try {
            const fixture = await (await fetch('/fixture')).json();
            const bytes = Uint8Array.from(atob(fixture.docx), (char) => char.charCodeAt(0));
            const expected = ProfileCodeResizer.applySiteDesign(fixture.original).code;
            check(ProfileCodeResizer.verifyStyleOnlySource(fixture.original, expected), 'source preservation');
            get('pb-resizer-tab').click();
            let saved;
            URL.createObjectURL = (blob) => { saved = blob; return 'blob:test'; };
            URL.revokeObjectURL = () => {};
            HTMLAnchorElement.prototype.click = function () {};
            const rows = [];
            for (const kind of ['txt', 'docx']) {
                for (const count of [50, 100, 200]) {
                    const files = Array.from({ length: count }, (_, i) => new File([kind === 'txt' ? fixture.original : bytes], `sample-${i}.${kind}`));
                    let maxGap = 0, last = performance.now();
                    const heartbeat = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - last); last = now; }, 20);
                    const start = performance.now();
                    select(files);
                    await ready();
                    const readMs = performance.now() - start;
                    // textarea 표시는 CRLF를 LF로 정규화한다. 실제 보존은 아래 ZIP 바이트로 확인한다.
                    check(get('pb-resize-source').value === fixture.original.replaceAll('\r\n', '\n'), 'TXT/Word displayed source');
                    const convertStart = performance.now();
                    get('pb-resize-apply-all').click();
                    await ready();
                    const convertMs = performance.now() - convertStart;
                    check(document.querySelectorAll('.pb-resize-file-item[data-state="success"]').length === count, 'all files converted');
                    const saveStart = performance.now();
                    saved = null;
                    get('pb-resize-save-all').click();
                    const saveMs = performance.now() - saveStart;
                    check(saved?.type === 'application/zip', 'ZIP generated');
                    await pause(25);
                    clearInterval(heartbeat);
                    const data = new Uint8Array(await saved.arrayBuffer()), view = new DataView(data.buffer);
                    let offset = 0, entries = 0;
                    while (view.getUint32(offset, true) === 0x04034b50) {
                        const size = view.getUint32(offset + 18, true), nameSize = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true);
                        const begin = offset + 30 + nameSize + extra;
                        check(new TextDecoder('utf-8', { ignoreBOM: true }).decode(data.subarray(begin, begin + size)) === expected, 'every ZIP entry equals verified result');
                        offset = begin + size; entries += 1;
                    }
                    check(entries === count, 'ZIP entry count');
                    rows.push({ kind, count, inputBytes: files.reduce((sum, file) => sum + file.size, 0), extractedBytes: new TextEncoder().encode(fixture.original).length * count, readMs: Math.round(readMs), convertMs: Math.round(convertMs), saveMs: Math.round(saveMs), maxHeartbeatGapMs: Math.round(maxGap), zipBytes: saved.size });
                }
            }
            // 201개 또는 합계 초과는 기존 200개 결과를 보존하면서 차단한다.
            const previous = get('pb-resize-output').value;
            select(Array.from({ length: 201 }, () => new File(['x'], 'extra.txt')));
            check(get('pb-resize-status').textContent.includes('최대 200개'), '201 rejected with current limit');
            check(document.querySelectorAll('.pb-resize-file-item').length === 200 && get('pb-resize-output').value === previous, 'rejected selection preserves records');
            select([{ name: 'large.txt', size: ProfileCodeFiles.MAX_TOTAL_BYTES + 1 }]);
            check(get('pb-resize-status').dataset.state === 'error' && get('pb-resize-output').value === previous, 'total byte limit preserved');
            await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows, userAgent: navigator.userAgent }) });
        } catch (error) {
            await fetch('/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.stack }) });
        }
    };
    const page = fs.readFileSync(path.join(directory, 'index.html'), 'utf8')
        .replace(/<script[^>]*src="(?:script.js|profile-site-preview.js|\/vendor\/html2canvas\/html2canvas.min.js)"[^>]*><\/script>/g, '')
        .replace('</body>', `<script>window.addEventListener('load', ${run.toString()});</script></body>`);
    app.get('/', (_req, res) => res.type('html').send(page));
    for (const file of ['style.css', 'profile-code-files.js', 'profile-code-resizer.js', 'profile-code-resizer-ui.js']) app.get('/' + file, (_req, res) => res.sendFile(path.join(directory, file)));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    let child, timer;
    try {
        child = spawn(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-extensions', '--disable-background-timer-throttling', `--user-data-dir=${path.join(temporary, 'browser')}`, `http://127.0.0.1:${server.address().port}/`], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr.on('data', (data) => { stderr = (stderr + data).slice(-4000); });
        child.once('error', rejectResult);
        child.once('exit', (code) => rejectResult(new Error(`Chrome exited ${code}: ${stderr}`)));
        timer = setTimeout(() => rejectResult(new Error(`Browser timeout: ${stderr}`)), 165000);
        const report = await result;
        assert.ifError(report.error);
        assert.equal(report.rows.length, 6);
        assert.equal(wordRequests, 350);
        console.log(JSON.stringify({ environment: { node: process.version, platform: os.platform(), cpu: os.cpus()[0].model, memoryGB: Math.round(os.totalmem() / 1024 ** 3) }, ...report }));
    } finally {
        clearTimeout(timer);
        child?.kill();
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
    }
});
