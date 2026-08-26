import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const profileMakerDirectory = path.dirname(fileURLToPath(import.meta.url));
const script = fs.readFileSync(path.join(profileMakerDirectory, 'script.js'), 'utf8');
const style = fs.readFileSync(path.join(profileMakerDirectory, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(profileMakerDirectory, 'index.html'), 'utf8');

test('profile site body text and points stay aligned at 20px', () => {
    assert.match(script, /bodySize:\s*35,\s*\r?\n\s*pointSize:\s*35,/);
    assert.match(style, /--pb-body-size:\s*35px;\s*\r?\n\s*--pb-point-size:\s*35px;/);
    assert.match(html, /id="pb-point-size"[^>]*value="35"/);
    assert.match(script, /const profileBodySize = isSiteCode\s*\? '20px'\s*:\s*bodySize;/);
    assert.match(script, /const profilePointSize = isSiteCode \? profileBodySize : pointSize;/);
    assert.match(script, /\.pb-presentation-points'[\s\S]*?'font-size': profilePointSize,/);
});

test('profile site typography scales from its own container without changing brand poster sizing', () => {
    assert.match(style, /\.pb-presentation\s*\{[\s\S]*?container-type:\s*inline-size;/);
    assert.match(script, /const profileChipSize = isSiteCode\s*\? 'clamp\(14px, max\(2\.4cqw, 1\.35vw\), 18px\)'/);
    assert.match(script, /const profileEyebrowSize = isSiteCode \? 'clamp\(11px, 1\.7cqw, 12px\)' : '12px';/);
    assert.match(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': pointSize,/);
    assert.doesNotMatch(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': profilePointSize,/);
});

test('site main titles grow within a balanced two-line capacity', () => {
    assert.match(script, /function getHeadlineFitCqw\(text, fontFamily, \{ containerFillPercent = 96, lineCapacity = 1 \} = \{\}\)/);
    assert.match(script, /const twoLineTitleSize = getHeadlineFitCqw\(headlineText, fontFamily, \{/);
    assert.match(script, /lineCapacity: 2/);
    assert.match(script, /clamp\(24px, 2\.4vw, 42px\)/);
    assert.match(script, /'white-space': isMainTitle && !isSiteCode \? 'nowrap' : 'normal'/);
    assert.match(script, /'text-wrap': isSiteCode \? 'balance' : 'wrap'/);
    assert.match(script, /const maxTitleSize = isSiteCode \? 42/);
});
