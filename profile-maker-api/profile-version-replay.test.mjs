import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createProfileJobFingerprint, FileProfileJobStore } from './profile-job-store.mjs';
import os from 'node:os';
import path from 'node:path';

test('v7/v11 through v9/v15 exact requests replay across reference changes without new jobs or billing', () => {
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const functionSource = source.slice(source.indexOf('function submitProfileJob('), source.indexOf('const profileRecoveryStartedAt')).trim();
    for (const [oldText, oldVisual] of [['profile-copy-v7-concrete-editorial-direction', 'profile-visual-v11-photographic-direction'], ['profile-copy-v8-source-first', 'profile-visual-v12-macro-balance'], ['profile-copy-v9-expanded-editorial', 'profile-visual-v13-expanded-scenes'], ['profile-copy-v9-expanded-editorial', 'profile-visual-v14-independent-shots'], ['profile-copy-v9-expanded-editorial', 'profile-visual-v15-overhead-accessories']])
    for (const kind of ['direct', 'document']) for (const generateImageRequested of [false, true]) {
        const input = { profileTextPromptVersion: 'profile-copy-v9-expanded-editorial', visualVariationVersion: generateImageRequested ? 'profile-visual-v16-oblique-tables' : 'none', referenceInfluenceVersion: 'profile-reference-v3-material-only', referenceText: 'unchanged source', referenceDigests: ['reference-image'], generateImageRequested };
        const previous = createProfileJobFingerprint({ kind, ...input, profileTextPromptVersion: oldText, visualVariationVersion: generateImageRequested ? oldVisual : 'none', referenceInfluenceVersion: ['profile-visual-v14-independent-shots', 'profile-visual-v15-overhead-accessories'].includes(oldVisual) ? 'profile-reference-v3-material-only' : 'profile-reference-v2-strong-priority' });
        const job = { id: 'existing-job', state: 'completed', result: { profile: { headline: 'existing', profileImage: 'existing-image' } } };
        const submit = vm.runInNewContext(`(${functionSource})`, {
            createProfileJobFingerprint,
            canReuseLegacyProfileImages: () => false,
            PROFILE_TEXT_PROMPT_VERSION: input.profileTextPromptVersion,
            getProfileJobRequestKey: () => '',
            loadUsage: () => ({}),
            profileJobFingerprintAliases: new Map([[previous, job.id]]),
            profileJobStore: { read: () => job, toPublicJob: (value) => value, createOrGet: ({ reusableJobId }) => {
                if (reusableJobId === job.id) return { job, replayed: true };
                throw new Error('New work must not start');
            } }
        });
        const res = { setHeader(key, value) { assert.equal(value, 'true'); }, status(code) { assert.equal(code, 200); return this; }, json(value) { assert.equal(value.job, job); } };
        assert.equal(submit({}, res, { kind, fingerprintInput: input, input: {} }), job);
        assert.throws(() => submit({}, res, { kind, fingerprintInput: { ...input, referenceText: 'changed source' }, input: {}, requestKey: 'changed-input' }), /New work must not start/);
    }
});

test('tarot v15 and saju v16 request keys survive new versions and cold restarts without billing', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-v16-replay-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const functionSource = source.slice(source.indexOf('function submitProfileJob('), source.indexOf('const profileRecoveryStartedAt')).trim();
    for (const [templateType, oldVisual, newVisual] of [['tarot-ppt', 'profile-visual-v15-overhead-accessories', 'profile-visual-v16-oblique-tables'], ['saju-ppt', 'profile-visual-v16-oblique-tables', 'profile-visual-saju-v1-study-compositions']])
    for (const expired of [false, true]) for (const kind of ['direct', 'document']) {
        const campaignId = `${templateType}-${kind}-${expired}`;
        const oldInput = { templateType, profileTextPromptVersion: 'profile-copy-v9-expanded-editorial', visualVariationVersion: oldVisual, referenceInfluenceVersion: 'profile-reference-v3-material-only', referenceText: 'same source', referenceDigests: ['same-reference'], generateImageRequested: true };
        const fingerprint = createProfileJobFingerprint({ kind, ...oldInput });
        const original = new FileProfileJobStore({ directory, campaignId });
        const { job } = original.createOrGet({ fingerprint, kind, input: { payload: { templateType } }, requestKey: 'same-key' });
        original.update(job.id, record => ({ ...record, state: 'completed', completedAt: expired ? '2020-01-01T00:00:00.000Z' : new Date().toISOString(), result: { profile: { headline: 'saved', profileImage: 'saved-image' } } }));
        const restored = new FileProfileJobStore({ directory, campaignId });
        const submit = vm.runInNewContext(`(${functionSource})`, {
            createProfileJobFingerprint, canReuseLegacyProfileImages: () => false,
            PROFILE_TEXT_PROMPT_VERSION: oldInput.profileTextPromptVersion,
            getProfileJobRequestKey: () => 'same-key',
            loadUsage: () => { throw new Error('Usage must not be touched'); },
            reserveProfileUsage: () => { throw new Error('Billing must not start'); },
            profileJobFingerprintAliases: new Map([[fingerprint, job.id]]),
            profileJobStore: restored
        });
        const res = { setHeader(key, value) { assert.equal(value, 'true'); }, status(code) { assert.equal(code, 200); return this; }, json(value) { assert.equal(value.job.id, job.id); } };
        const options = { kind, fingerprintInput: { ...oldInput, visualVariationVersion: newVisual, referenceInfluenceVersion: 'profile-reference-v3-material-only' }, input: {} };
        if (expired) assert.throws(() => submit({}, res, options), error => error.status === 410);
        else assert.equal(submit({}, res, options).id, job.id);
    }
});
