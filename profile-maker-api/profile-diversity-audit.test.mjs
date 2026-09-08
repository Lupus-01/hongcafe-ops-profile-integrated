import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('existing-result audit is read-only, category-scoped and reports unavailable images explicitly', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-audit-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const campaign = path.join(directory, 'campaign');
    fs.mkdirSync(campaign);
    const originals = new Map();
    for (const [index, templateType] of ['tarot-ppt', 'tarot-ppt', 'saju-ppt'].entries()) {
        const id = String(index + 1).repeat(32);
        const filePath = path.join(campaign, `${id}.json`);
        const content = JSON.stringify({ id, completedAt: '2026-09-07', input: { payload: { templateType } }, result: { profile: { headline: '비교 대상의 동일한 제목 문구입니다', profileImage: 'https://example.com/never-fetch.png' } } });
        fs.writeFileSync(filePath, content);
        originals.set(filePath, content);
    }
    const result = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./profile-diversity-audit.mjs', import.meta.url)), directory], { encoding: 'utf8' }));
    assert.equal(result.externalAiCalls, 0);
    assert.equal(result.report[0].reviewPairs.length, 1);
    assert.equal(result.report[0].unassessedImages, 2);
    assert.equal(result.report[1].reviewPairs.length, 0);
    assert.equal(result.report[2].samples, 0);
    assert.doesNotMatch(JSON.stringify(result), /비교 대상의|never-fetch/);
    for (const [filePath, content] of originals) assert.equal(fs.readFileSync(filePath, 'utf8'), content);
    assert.equal(fs.readdirSync(campaign).length, originals.size);
});
