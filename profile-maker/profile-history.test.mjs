import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
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

test('high copy similarity is shown without automatic AI regeneration', () => {
    assert.match(script, /noveltyMeta\?\.needsReview/);
    assert.match(script, /추가 과금을 막기 위해 자동 재생성하지 않았으니 결과를 검토해주세요/);
    assert.doesNotMatch(script, /noveltyMeta\?\.needsReview[\s\S]{0,300}fetch\(/);
});

function browserFunction(name) {
    const start = script.search(new RegExp(`    (?:async )?function ${name}\\(`));
    assert.ok(start >= 0);
    const rest = script.slice(start + 4);
    const end = rest.search(/\n    (?:async )?function /);
    return end < 0 ? rest : rest.slice(0, end);
}

test('generated markup is displayed as text while line breaks and editable points are preserved', () => {
    const node = (tag) => ({
        tag, children: [],
        set innerHTML(_value) { assert.fail('Generated text must never use innerHTML'); },
        replaceChildren() { this.children = []; },
        appendChild(child) { this.children.push(child); }
    });
    const slots = { headline: node('h1'), intro: node('p'), bulletPoints: node('ul') };
    const fill = vm.runInNewContext(`(${browserFunction('fillPresentation')})`, {
        document: { createElement: node, createTextNode: (text) => ({ text }) },
        syncPresentationImageState() {}
    });
    const markup = '<img src=x onerror="unexpected()"> & <script>unexpected()</script>';
    fill({ querySelector: (selector) => slots[selector.match(/data-slot="([^"]+)"/)?.[1]] }, {
        headline: markup, intro: `${markup}\nsecond line`, bulletPoints: [markup, 'plain point']
    });
    assert.equal(slots.headline.children[0].text, markup);
    assert.equal(slots.intro.children[1].tag, 'br');
    assert.equal(slots.intro.children[2].text, 'second line');
    assert.equal(slots.bulletPoints.children[0].tag, 'li');
    assert.equal(slots.bulletPoints.children[0].textContent, markup);
    assert.equal(slots.bulletPoints.children[0].contentEditable, 'true');
});

test('pending result recovery fetches only job status and applies the result before clearing its pointer', async () => {
    const id = 'a'.repeat(32);
    const stored = new Map([['pending', JSON.stringify({ jobId: id, statusUrl: 'https://unused.invalid', statusTargetId: 'status' })]]);
    const status = {};
    const buttons = [{ disabled: false }, { disabled: false }];
    const profile = { headline: 'saved result', profileImage: 'saved image' };
    let applied = false;
    const calls = [];
    const resume = vm.runInNewContext(`
        ${browserFunction('waitForProfileJob')}
        ${browserFunction('resumePendingProfileJob')}
        resumePendingProfileJob;
    `, {
        PROFILE_JOB_STORAGE_KEY: 'pending', sessionStorage: {
            getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key)
        },
        document: { getElementById: () => status }, aiStatus: status, pptStatus: status,
        aiGenerateButton: buttons[0], pptGenerateButton: buttons[1],
        fetch: async (url, options) => {
            calls.push({ url, method: options.method });
            assert.ok(buttons.every((button) => button.disabled));
            return { job: { id, state: 'completed', result: { profile } } };
        },
        parseApiResponse: async (value) => value,
        applyRecoveredProfile: (data) => {
            assert.equal(data.profile, profile);
            assert.ok(stored.has('pending'));
            applied = true;
        },
        buildGenerationStatus: (message) => message, setStatus() {}
    });
    await resume();
    assert.equal(applied, true);
    assert.deepEqual(calls, [{ url: `/api/profile-jobs/${id}`, method: 'GET' }]);
    assert.equal(stored.has('pending'), false);
    assert.ok(buttons.every((button) => !button.disabled));
});

test('recovered profiles restore template, images, reference text and local history together', () => {
    const calls = {};
    const element = { querySelector: () => null };
    const fields = Object.fromEntries(['aiTemplate', 'pptTemplate', 'aiTarotCardType', 'pptTarotCardType', 'aiReferenceText', 'pptReferenceText', 'aiGenerateImage', 'pptGenerateImage', 'aiImageQuality', 'pptImageQuality'].map((name) => [name, {}]));
    const context = vm.createContext({
        ...fields, templates: { 'saju-ppt': { theme: 'saju-theme' } },
        applyTheme: (theme) => { calls.theme = theme; }, replaceCanvasWithElement: (type) => { calls.type = type; return element; },
        fillPresentation: (_element, profile) => { calls.profile = profile; },
        syncPresentationImageState: (_element, options) => { calls.textOnly = options.textOnly; },
        lastProfileDownloadName: '', activeProfileCopyMeta: null, activeProfileReferenceText: '',
        updateImageGenerationControls() {}, updateTarotCardTypeControls() {}, resetProfileImageAssets() {},
        renderProfileImageGuide() {}, syncProfileImageAssets() {},
        getCurrentPresentationPayload: () => calls.profile,
        storeProfileHistoryItem: (item) => { calls.history = item; },
        pptImageIssue: {}, aiImageIssue: {}, renderImageIssue() {}, attachSafeFailedStageRetry() {}, updateSlotRegenerateState() {}
    });
    const apply = vm.runInContext(`(${browserFunction('applyRecoveredProfile')})`, context);
    const profile = { headline: 'saved', profileImage: 'image-one', moodImage: 'image-two' };
    apply({ profile, imageMeta: { requested: true }, copyMeta: { groupId: 'copy-group' }, job: {
        kind: 'document', presentation: { templateType: 'saju-ppt', referenceText: 'saved reference', nameHint: 'consultant', imageQuality: 'premium' }
    } }, {});
    assert.equal(calls.theme, 'saju-theme');
    assert.equal(calls.type, 'saju-ppt');
    assert.equal(calls.profile, profile);
    assert.equal(calls.textOnly, false);
    assert.equal(fields.pptReferenceText.value, 'saved reference');
    assert.equal(calls.history.referenceText, 'saved reference');
    assert.equal(calls.history.copyMeta.groupId, 'copy-group');
    assert.equal(calls.history.imageQuality, 'premium');
});
