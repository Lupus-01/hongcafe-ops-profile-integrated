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

test('profile site labels use 20px without changing brand poster sizing', () => {
    assert.match(style, /\.pb-presentation\s*\{[\s\S]*?container-type:\s*inline-size;/);
    assert.match(script, /const profileChipSize = isSiteCode\s*\? '20px'/);
    assert.match(script, /const profileEyebrowSize = isSiteCode \? 'clamp\(11px, 1\.7cqw, 12px\)' : '12px';/);
    assert.match(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': pointSize,/);
    assert.doesNotMatch(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': profilePointSize,/);
});

test('profile canvas and image export keep the configured title pixels without automatic shrinking', () => {
    assert.match(style, /--pb-title-size:\s*66px;/);
    assert.match(html, /id="pb-title-size"[^>]*value="66"/);
    assert.match(style, /\.pb-presentation-title,[\s\S]*?font-size:\s*var\(--pb-title-size\);/);
    assert.doesNotMatch(style, /--pb-unified-title-fit-size/);
    assert.match(style, /\.pb-presentation-title\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?word-break:\s*keep-all;[\s\S]*?text-wrap:\s*balance;/);
    assert.match(script, /const resolvedTitleSize = isSiteCode[\s\S]*?: `\$\{maxTitleSize\}px`;/);
    assert.match(script, /'font-size': resolvedTitleSize,/);
    assert.match(script, /'white-space': 'normal',[\s\S]*?'word-break': 'keep-all',[\s\S]*?'text-wrap': 'balance'/);
    assert.doesNotMatch(script, /fitPresentationHeadlines/);
});

test('site main titles retain the existing responsive two-line capacity', () => {
    assert.match(script, /function getHeadlineFitCqw\(text, fontFamily, \{ containerFillPercent = 96, lineCapacity = 1 \} = \{\}\)/);
    assert.match(script, /const twoLineTitleSize = isSiteCode[\s\S]*?getHeadlineFitCqw\(headlineText, fontFamily, \{/);
    assert.match(script, /lineCapacity: 2/);
    assert.match(script, /clamp\(24px, 2\.4vw, 42px\)/);
    assert.match(script, /'line-height': isSiteCode \? '1\.25' : \(isMainTitle \? '1\.08' : '1\.18'\)/);
    assert.match(script, /const maxTitleSize = isSiteCode \? 42/);
    assert.match(style, /font-size:\s*min\(var\(--pb-title-size\), 39px\);/);
});
