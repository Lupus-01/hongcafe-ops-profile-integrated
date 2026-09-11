import assert from 'node:assert/strict';
import test from 'node:test';
import AdmZip from 'adm-zip';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readCodeDocumentXml } from './profile-code-document.mjs';

const xml = '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t xml:space="preserve">&lt;h2 class="pb-presentation-title"&gt;제목  &amp;amp; 원문&lt;/h2&gt;</w:t></w:r></w:p></w:body></w:document>';
function docx() { const zip = new AdmZip(); zip.addFile('word/document.xml', Buffer.from(xml)); return zip; }

test('Word reader preserves original XML and rejects unsupported or incomplete archives', () => {
    assert.equal(readCodeDocumentXml(docx().toBuffer(), '상담.docx'), xml);
    assert.throws(() => readCodeDocumentXml(docx().toBuffer(), '상담.doc'));
    assert.throws(() => readCodeDocumentXml(Buffer.from('not a zip'), '상담.docx'));
    const extra = docx(); extra.addFile('word/header1.xml', Buffer.from('<header/>'));
    assert.throws(() => readCodeDocumentXml(extra.toBuffer(), '상담.docx'));
});

test('real Word API enforces authentication and does not consume generation usage', async (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-code-doc-'));
    const portServer = http.createServer(); portServer.listen(0, '127.0.0.1'); await once(portServer, 'listening');
    const port = portServer.address().port; await new Promise((resolve) => portServer.close(resolve));
    const secret = 'code-document-test-secret-32-characters';
    const child = spawn(process.execPath, ['profile-maker-api/server.mjs'], {
        cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
        env: { ...process.env, NODE_ENV: 'test', AUTH_BYPASS: 'false', PROFILE_AUTH_SECRET: secret, GEMINI_API_KEY: '', PROFILE_AI_MOCK_MODE: 'false', PROFILE_CAMPAIGN_MODE: 'false', PROFILE_API_HOST: '127.0.0.1', PROFILE_API_PORT: String(port), PROFILE_JOB_STORE_DIR: tmp, PROFILE_GENERATION_HISTORY_FILE: path.join(tmp, 'history.json'), PROFILE_USAGE_FILE: path.join(tmp, 'usage.json') },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let logs = ''; child.stdout.on('data', (data) => { logs += data; }); child.stderr.on('data', (data) => { logs += data; });
    t.after(async () => { if (child.exitCode === null) { const closed = once(child, 'close'); child.kill(); await closed; } });
    const base = `http://127.0.0.1:${port}`;
    let health;
    for (let i = 0; i < 200; i += 1) {
        try { const response = await fetch(base + '/api/health'); if (response.ok) { health = await response.json(); break; } } catch {}
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.ok(health, logs);
    const claims = Buffer.from(JSON.stringify({ sub: 'code-reader-test', exp: Date.now() + 60000 })).toString('base64url');
    const cookie = `profile_api_auth=${claims}.${crypto.createHmac('sha256', secret).update(claims).digest('base64url')}`;
    const post = (name, authenticated, twice = false) => {
        const body = new FormData(); body.append('file', new Blob([docx().toBuffer()]), name);
        if (twice) body.append('file', new Blob([docx().toBuffer()]), 'second.docx');
        return fetch(base + '/api/profile-code-document', { method: 'POST', headers: authenticated ? { Cookie: cookie } : {}, body });
    };
    assert.equal((await post('code.docx', false)).status, 401);
    const response = await post('code.docx', true);
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).documentXml, xml);
    assert.equal((await post('code.doc', true)).status, 400);
    assert.equal((await post('code.docx', true, true)).status, 400);
    const after = await (await fetch(base + '/api/health')).json();
    for (const property of ['usedToday', 'usedImagesToday', 'usedGeminiRequestsToday', 'profileCampaignJobs', 'profileGenerationHistoryRecords']) assert.equal(after[property], health[property], property);
    assert.ok(!logs.includes('[gemini-audit]'));
});
