import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const profileMakerDirectory = path.dirname(fileURLToPath(import.meta.url));
const script = fs.readFileSync(path.join(profileMakerDirectory, 'script.js'), 'utf8');
const style = fs.readFileSync(path.join(profileMakerDirectory, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(profileMakerDirectory, 'index.html'), 'utf8');

test('profile typography keeps points aligned with body text at every container width', () => {
    assert.match(script, /bodySize:\s*35,\s*\r?\n\s*pointSize:\s*35,/);
    assert.match(style, /--pb-body-size:\s*35px;\s*\r?\n\s*--pb-point-size:\s*35px;/);
    assert.match(html, /id="pb-point-size"[^>]*value="35"/);
    assert.match(script, /const profileBodySize = isSiteCode\s*\? 'clamp\(16px, 3cqw, 21px\)'\s*:\s*bodySize;/);
    assert.match(script, /const profilePointSize = isSiteCode \? profileBodySize : pointSize;/);
    assert.match(script, /\.pb-presentation-points'[\s\S]*?'font-size': profilePointSize,/);
});

test('profile site typography scales from its own container without changing brand poster sizing', () => {
    assert.match(style, /\.pb-presentation\s*\{[\s\S]*?container-type:\s*inline-size;/);
    assert.match(script, /const profileChipSize = isSiteCode\s*\? 'clamp\(14px, 2\.4cqw, 17px\)'/);
    assert.match(script, /const profileEyebrowSize = isSiteCode \? 'clamp\(11px, 1\.7cqw, 12px\)' : '12px';/);
    assert.match(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': pointSize,/);
    assert.doesNotMatch(script, /\.pb-brand-poster-points'[\s\S]*?'font-size': profilePointSize,/);
});
