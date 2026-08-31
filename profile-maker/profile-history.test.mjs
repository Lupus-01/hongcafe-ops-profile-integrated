import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const profileMakerDirectory = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(profileMakerDirectory, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(profileMakerDirectory, 'script.js'), 'utf8');
const style = fs.readFileSync(path.join(profileMakerDirectory, 'style.css'), 'utf8');

test('profile history is a collapsed native disclosure with its existing controls intact', () => {
    assert.match(html, /<details class="pb-history-disclosure">/);
    assert.doesNotMatch(html, /<details class="pb-history-disclosure"\s+open/);
    assert.match(html, /<summary class="pb-ai-header pb-history-summary">/);
    assert.match(html, /id="pb-history-list"/);
    assert.match(html, /id="pb-history-empty"/);
    assert.match(script, /restoreProfileHistoryItem\(item\.id\)/);
    assert.match(style, /\.pb-history-disclosure\[open\] > \.pb-history-summary/);
});

test('stored image prompt guides are sanitized before display and copy', () => {
    assert.match(script, /portraitPromptGuide\.value = sanitizeDisplayedImagePrompt/);
    assert.match(script, /moodPromptGuide\.value = sanitizeDisplayedImagePrompt/);
    assert.match(script, /고유\\s\*번호/);
    assert.match(script, /\\b1\[5-8\]\\d\{2\}/);
});

test('copy group and reference text survive history restore and slot regeneration', () => {
    assert.match(html, /id="pb-ppt-reference-text"/);
    assert.match(html, /id="pb-ai-reference-text"/);
    assert.match(script, /copyMeta: activeProfileCopyMeta/);
    assert.match(script, /referenceText: activeProfileReferenceText/);
    assert.match(script, /activeProfileCopyMeta = item\.copyMeta \|\| null/);
    assert.match(script, /copyVariant: activeProfileCopyMeta/);
});
