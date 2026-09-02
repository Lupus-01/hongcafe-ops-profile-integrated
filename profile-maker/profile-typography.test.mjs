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
    assert.match(script, /bodySize:\s*'20px',\s*\r?\n\s*pointSize:\s*'20px'/);
    assert.match(script, /const profileBodySize = isSiteCode \? siteTypography\.bodySize : bodySize;/);
    assert.match(script, /const profilePointSize = isSiteCode \? siteTypography\.pointSize : pointSize;/);
    assert.match(script, /\.pb-presentation-points'[\s\S]*?'font-size': profilePointSize,/);
});

test('profile site labels use 20px without changing brand poster sizing', () => {
    assert.match(style, /\.pb-presentation\s*\{[\s\S]*?container-type:\s*inline-size;/);
    assert.match(script, /chipSize:\s*'20px'/);
    assert.match(script, /eyebrowSize:\s*'12px'/);
    assert.match(script, /const profileChipSize = isSiteCode\s*\? siteTypography\.chipSize/);
    assert.match(script, /const profileEyebrowSize = isSiteCode \? siteTypography\.eyebrowSize : '12px';/);
    assert.match(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': pointSize,/);
    assert.doesNotMatch(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': profilePointSize,/);
});

test('profile canvas and image export keep the configured title pixels without automatic shrinking', () => {
    assert.match(style, /--pb-title-size:\s*66px;/);
    assert.match(html, /id="pb-title-size"[^>]*value="66"/);
    assert.match(style, /\.pb-presentation-title,[\s\S]*?font-size:\s*var\(--pb-title-size\);/);
    assert.doesNotMatch(style, /--pb-unified-title-fit-size/);
    assert.match(style, /\.pb-presentation-title\s*\{[\s\S]*?white-space:\s*normal;[\s\S]*?word-break:\s*keep-all;[\s\S]*?text-wrap:\s*balance;/);
    assert.match(script, /const resolvedTitleSize = isSiteCode \? siteTypography\.titleSize : titleSize;/);
    assert.match(script, /'font-size': resolvedTitleSize,/);
    assert.match(script, /'white-space': 'normal',[\s\S]*?'word-break': 'keep-all',[\s\S]*?'text-wrap': 'balance'/);
    assert.doesNotMatch(script, /fitPresentationHeadlines/);
});

test('all generated profile outputs use fixed typography standards', () => {
    assert.match(html, /id="pb-font-family" disabled/);
    assert.match(html, /id="pb-title-size"[^>]*value="66" disabled/);
    assert.match(html, /id="pb-body-size"[^>]*value="35" disabled/);
    assert.match(html, /id="pb-point-size"[^>]*value="35" disabled/);
    assert.match(html, /id="pb-line-height"[^>]*value="1\.7" disabled/);
    assert.match(script, /const siteTypography = \{[\s\S]*?titleSize:\s*'42px',[\s\S]*?bodySize:\s*'20px',[\s\S]*?pointSize:\s*'20px',[\s\S]*?chipSize:\s*'20px',[\s\S]*?eyebrowSize:\s*'12px'/);
    assert.match(script, /const resolvedTitleSize = isSiteCode \? siteTypography\.titleSize : titleSize;/);
    assert.match(script, /if \(!input \|\| input\.disabled \|\| input\.closest\('\.pb-range-control'\)\) return;/);
    assert.doesNotMatch(script, /getHeadlineFitCqw/);
    assert.doesNotMatch(script, /headlineMeasureCanvas/);
    assert.doesNotMatch(script, /const computedCanvas = window\.getComputedStyle\(canvas\);/);
    assert.match(script, /'line-height': isSiteCode \? '1\.25' : \(isMainTitle \? '1\.08' : '1\.18'\)/);
    assert.match(style, /font-size:\s*min\(var\(--pb-title-size\), 39px\);/);
});
