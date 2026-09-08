import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createProfileJobFingerprint } from './profile-job-store.mjs';

test('v7/v11 and v8/v12 exact requests replay without new jobs or billing after the diversity update', () => {
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const functionSource = source.slice(source.indexOf('function submitProfileJob('), source.indexOf('const profileRecoveryStartedAt')).trim();
    for (const [oldText, oldVisual] of [['profile-copy-v7-concrete-editorial-direction', 'profile-visual-v11-photographic-direction'], ['profile-copy-v8-source-first', 'profile-visual-v12-macro-balance']])
    for (const kind of ['direct', 'document']) for (const generateImageRequested of [false, true]) {
        const input = { profileTextPromptVersion: 'profile-copy-v9-expanded-editorial', visualVariationVersion: generateImageRequested ? 'profile-visual-v13-expanded-scenes' : 'none', referenceInfluenceVersion: 'profile-reference-v2-strong-priority', referenceText: 'unchanged source', referenceDigests: ['reference-image'], generateImageRequested };
        const previous = createProfileJobFingerprint({ kind, ...input, profileTextPromptVersion: oldText, visualVariationVersion: generateImageRequested ? oldVisual : 'none' });
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
