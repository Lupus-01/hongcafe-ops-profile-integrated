import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createIncrementalIndex, increment } from './profile-assignment-index.mjs';
import { createOfflineVisualRuntime } from './profile-diversity-runtime.mjs';
import { FileProfileGenerationHistory } from './profile-generation-history.mjs';
import { selectProfileCopyVariant, buildProfileCopyDirection } from './profile-copy-engine.mjs';

test('catalog retains legacy scenes and adds independent tarot subjects with compatible heroes', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    for (const category of ['tarot-ppt', 'saju-ppt', 'sinjeom-ppt']) {
        const bases = runtime.BASE_SCENE_ARCHETYPES[category];
        const count = category === 'tarot-ppt' ? 270 : 120;
        assert.equal(bases.length, count);
        assert.equal(new Set(bases.map(scene => scene.id)).size, count);
        assert.equal(new Set(bases.map(scene => scene.prompt)).size, count);
        assert.equal(runtime.SCENE_ARCHETYPES[category].length, count * 10);
        const heroes = runtime.TEMPLATE_GUIDES[category].visualSubjects.filter(subject => subject.role !== 'support');
        for (const scene of runtime.SCENE_ARCHETYPES[category]) {
            assert.ok(heroes.some(hero => runtime.isSubjectCompatibleWithScene(hero, scene)), scene.id);
        }
    }
});

test('incremental counts match full rebuild after prepend, same-length replacement and restore', () => {
    const index = createIncrementalIndex(() => new Map(), (counts, entry) => increment(counts, entry.key));
    const values = [{ key: 'a' }, { key: 'b' }];
    index(values);
    values.unshift({ key: 'a' });
    assert.deepEqual([...index(values)], [...index([...values])]);
    values[0] = { key: 'c' };
    assert.deepEqual([...index(values)], [...index([...values])]);
    values.length = 1;
    assert.deepEqual([...index(values)], [['c', 1]]);
});

test('cached assignments survive completion and incorporate new reservations and reload', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-history-cache-'));
    try {
        const filePath = path.join(directory, 'history.json');
        const history = new FileProfileGenerationHistory({ filePath });
        history.reserve({ id: 'first', campaignId: 'campaign', templateType: 'tarot-ppt', createdAt: '2026-01-01T00:00:00Z', copyVariant: { groupId: 'first' }, visuals: [{ kind: 'portrait', visualGroupId: 'image-first', subjectId: 'card' }] });
        const copies = history.getCopyAssignments('tarot-ppt');
        const visuals = history.getVisualAssignments('tarot-ppt');
        history.complete('first', { profile: { headline: '원문의 구체적인 강점으로 상담합니다' }, imageGuide: { portrait: { visualGroupId: 'image-first', subjectId: 'card', prompt: 'new prompt hash' } } });
        assert.equal(history.getVisualAssignments('tarot-ppt'), visuals);
        history.reserve({ id: 'second', campaignId: 'campaign', templateType: 'tarot-ppt', createdAt: '2026-01-02T00:00:00Z', copyVariant: { groupId: 'second' }, visuals: [{ kind: 'portrait', visualGroupId: 'image-second' }] });
        assert.equal(history.getCopyAssignments('tarot-ppt'), copies);
        assert.deepEqual(copies.map(copy => copy.groupId), ['second', 'first']);
        const restored = new FileProfileGenerationHistory({ filePath });
        assert.deepEqual(restored.getCopyAssignments('tarot-ppt'), copies);
        assert.deepEqual(restored.getVisualAssignments('tarot-ppt'), visuals);
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('already imported image-heavy jobs are skipped before reading their contents', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-import-cache-'));
    try {
        const jobs = path.join(directory, 'jobs');
        const campaign = 'campaign/with/slashes';
        const campaignPath = path.join(jobs, 'campaign_with_slashes');
        fs.mkdirSync(campaignPath, { recursive: true });
        const jobId = 'a'.repeat(32);
        const jobPath = path.join(campaignPath, jobId + '.json');
        fs.writeFileSync(jobPath, JSON.stringify({ id: jobId, campaignId: campaign, input: { payload: { templateType: 'saju-ppt' } }, result: { profile: { headline: '원문에 기반한 구체적인 상담 설명입니다' } } }));
        const filePath = path.join(directory, 'history.json');
        new FileProfileGenerationHistory({ filePath, sourceJobDirectory: jobs });
        const original = fs.readFileSync;
        fs.readFileSync = function (target, ...args) {
            assert.notEqual(String(target), jobPath, 'Completed job must not be read again');
            return original.call(this, target, ...args);
        };
        try { assert.equal(new FileProfileGenerationHistory({ filePath, sourceJobDirectory: jobs }).count(), 1); }
        finally { fs.readFileSync = original; }
    } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('new copy options provide actual instructions and cached/fresh history selects identically', () => {
    const history = [];
    const input = { templateType: 'saju-ppt', sourceText: '직장 상담과 명리 분석을 전문으로 합니다.', identity: 'same' };
    const styles = new Set();
    for (let generationSequence = 0; generationSequence < 150; generationSequence += 1) {
        const copy = selectProfileCopyVariant({ ...input, generationSequence, recent: history });
        const fresh = selectProfileCopyVariant({ ...input, generationSequence, recent: [...history] });
        assert.deepEqual(copy, fresh);
        const direction = buildProfileCopyDirection(copy);
        assert.doesNotMatch(direction, /undefined|\?\?\?/);
        if (copy.styleIndex >= 20) assert.match(direction, /추가 표현 규칙:/);
        styles.add(copy.styleIndex);
        history.unshift(copy);
    }
    assert.equal(styles.size, 32);
});
