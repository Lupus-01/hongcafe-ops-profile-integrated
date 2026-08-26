import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { sanitizeImagePromptContext } from './profile-image-context.mjs';

const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(apiDirectory, 'server.mjs'), 'utf8');

test('image prompt context removes document markup and contact guidance', () => {
    const source = '<p:xBody><a:bodyPr wrap="none"/> 상담사 고유번호: HC-12345 전화번호 060-800-8877 연결 후 0번 입력 따뜻한 타로 상담';
    const sanitized = sanitizeImagePromptContext(source);

    assert.equal(sanitized, '따뜻한 타로 상담');
    assert.doesNotMatch(sanitized, /xBody|고유\s*번호|060|연결\s*후/);
});

test('image prompt context removes common phone formats without damaging image specifications', () => {
    const source = '010 1234 5678 / (02) 123-4567 / 1661-8877 / 01012345678 / 11,600-800-8877 / 16:9 / 1600x900';
    const sanitized = sanitizeImagePromptContext(source);

    assert.doesNotMatch(sanitized, /1234|4567|1661|01012345678|11,600/);
    assert.match(sanitized, /16:9/);
    assert.match(sanitized, /1600x900/);
});

test('both profile image prompts sanitize their supplied context', () => {
    const sanitizerCalls = serverSource.match(/const safeExtraPrompt = sanitizeExtraPrompt\(extraPrompt\);/g) || [];
    assert.equal(sanitizerCalls.length, 2);
    assert.match(serverSource, /Do not reproduce contact details or identifying codes/);
});
