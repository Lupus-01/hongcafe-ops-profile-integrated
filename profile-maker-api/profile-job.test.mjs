import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { FileProfileJobStore, createProfileJobFingerprint } from './profile-job-store.mjs';
import {
    canReuseLegacyProfileImages,
    DurableProfileJobQueue,
    isAmbiguousExternalFailure,
    reuseCompletedProfileImageStages
} from './profile-job-queue.mjs';

function createTestStore(safetyCap) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-profile-job-'));
    const store = new FileProfileJobStore({
        directory,
        campaignId: 'test-campaign',
        safetyCap,
        retentionDays: 1
    });
    return { directory, store };
}

function createInput(generateImageRequested = true) {
    return {
        generateImageRequested,
        payload: { templateType: 'tarot-ppt', name: 'test' },
        referenceImages: []
    };
}

test('10-second AI spacing stays serial and never repeats a failed external request', async () => {
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const requestFunction = source.slice(source.indexOf('async function runGeminiRequest('), source.indexOf('function createHttpError('));
    let now = 100000;
    let attempts = 0;
    const starts = [];
    const delays = [];
    const run = vm.runInNewContext(`
        let geminiQueue = Promise.resolve();
        let geminiQueueDepth = 0;
        let lastGeminiRequestAt = 0;
        const GEMINI_MAX_QUEUE_DEPTH = 120;
        const GEMINI_MIN_REQUEST_INTERVAL_MS = 10000;
        ${requestFunction}
        runGeminiRequest;
    `, {
        Date: { now: () => now },
        wait: async (ms) => { delays.push(ms); now += ms; },
        reserveGeminiAttempt: () => ({ geminiUsed: ++attempts, geminiLimit: 960 }),
        requestContext: { getStore: () => ({}) },
        getKstTimestamp: () => '',
        console: { log() {}, warn() {} },
        createHttpError: (status, message) => Object.assign(new Error(message), { status })
    });
    const failure = new Error('external request failed');
    const results = await Promise.allSettled([3000, 15000, 3000].map((duration, index) => run(`request-${index}`, async () => {
        starts.push(now);
        await Promise.resolve();
        now += duration;
        if (index === 0) throw failure;
        return index;
    })));
    assert.deepEqual(starts, [100000, 110000, 125000]);
    assert.deepEqual(delays, [7000]);
    assert.equal(attempts, 3);
    assert.equal(results[0].status, 'rejected');
    assert.equal(failure.externalRequestStarted, true);
    assert.equal(results[1].value, 1);
    assert.equal(results[2].value, 2);
});

async function waitForTerminalState(store, jobId) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const job = store.read(jobId);
        if (['completed', 'partial', 'failed', 'needs_review'].includes(job.state)) return job;
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error('Timed out waiting for profile job.');
}

test('fingerprints are stable regardless of object key order', () => {
    assert.equal(
        createProfileJobFingerprint({ b: 2, a: { d: 4, c: 3 } }),
        createProfileJobFingerprint({ a: { c: 3, d: 4 }, b: 2 })
    );
});

test('any failure after an external request starts is never safely retryable', () => {
    assert.equal(isAmbiguousExternalFailure({ status: 400, externalRequestStarted: true }), true);
    assert.equal(isAmbiguousExternalFailure({ status: 429, externalRequestStarted: true }), true);
    assert.equal(isAmbiguousExternalFailure({ status: 429 }), false);
});

test('a new text prompt version reuses only safely completed image stages', () => {
    const record = {
        stages: {
            text: { state: 'pending', attempts: 0 },
            portrait: { state: 'pending', attempts: 0 },
            mood: { state: 'pending', attempts: 0 }
        },
        outputs: {}
    };
    const sourceJob = {
        stages: {
            text: { state: 'completed', attempts: 1 },
            portrait: { state: 'completed', attempts: 1, completedAt: '2026-08-25T00:00:00.000Z' },
            mood: { state: 'unknown', attempts: 1, error: 'ambiguous legacy image request' }
        },
        outputs: {
            text: { headline: 'legacy title' },
            portrait: 'data:image/png;base64,legacy-portrait'
        }
    };

    reuseCompletedProfileImageStages(record, sourceJob);

    assert.equal(record.stages.text.state, 'pending');
    assert.equal(record.outputs.text, undefined);
    assert.equal(record.stages.portrait.state, 'completed');
    assert.equal(record.stages.portrait.reused, true);
    assert.equal(record.stages.portrait.attempts, 0);
    assert.equal(record.outputs.portrait, sourceJob.outputs.portrait);
    assert.equal(record.stages.mood.state, 'unknown');
    assert.equal(record.stages.mood.reused, true);
    assert.equal(record.stages.mood.error, 'ambiguous legacy image request');
    assert.equal(record.outputs.mood, undefined);
});

test('legacy images are reused only when no new reference input exists', () => {
    const baseInput = {
        profileTextPromptVersion: 'current',
        currentProfileTextPromptVersion: 'current'
    };
    assert.equal(canReuseLegacyProfileImages(baseInput), true);
    assert.equal(canReuseLegacyProfileImages({ ...baseInput, referenceText: '따뜻한 상담실 분위기' }), false);
    assert.equal(canReuseLegacyProfileImages({ ...baseInput, referenceImages: [{ digest: 'reference' }] }), false);
    assert.equal(canReuseLegacyProfileImages({
        ...baseInput,
        profileTextPromptVersion: 'different'
    }), false);
});

test('recent copy assignments use the lightweight index after job creation', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    for (let index = 0; index < 12; index += 1) {
        store.createOrGet({
            fingerprint: createProfileJobFingerprint({ copy: index }),
            kind: 'direct',
            input: {
                ...createInput(false),
                payload: {
                    templateType: 'tarot-ppt',
                    copyVariant: { groupId: `group-${index}` }
                }
            },
            userId: 'user-a'
        });
    }
    const reloadedStore = new FileProfileJobStore({
        directory,
        campaignId: 'test-campaign',
        safetyCap: 1500,
        retentionDays: 1
    });
    reloadedStore.read = () => {
        throw new Error('getRecentCopyAssignments must not read full job files');
    };
    assert.deepEqual(
        reloadedStore.getRecentCopyAssignments('tarot-ppt', 3).map((variant) => variant.groupId),
        ['group-11', 'group-10', 'group-9']
    );
    assert.equal(reloadedStore.getCopyAssignmentCount('tarot-ppt'), 12);
});

test('same profile input replays one persisted job', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const fingerprint = createProfileJobFingerprint({ profile: 1 });
    const first = store.createOrGet({
        fingerprint,
        kind: 'direct',
        input: createInput(),
        userId: 'user-a',
        requestKey: 'request-a'
    });
    const second = store.createOrGet({
        fingerprint,
        kind: 'direct',
        input: createInput(),
        userId: 'user-b',
        requestKey: 'request-b'
    });

    assert.equal(first.replayed, false);
    assert.equal(second.replayed, true);
    assert.equal(first.job.id, second.job.id);
    assert.equal(store.count(), 1);

    assert.throws(() => store.createOrGet({
        fingerprint: createProfileJobFingerprint({ profile: 2 }),
        kind: 'direct',
        input: createInput(),
        userId: 'user-b',
        requestKey: 'request-b'
    }), (error) => error.status === 409);
});

test('one idempotency key cannot be reused for different input', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    store.createOrGet({
        fingerprint: createProfileJobFingerprint({ profile: 1 }),
        kind: 'direct',
        input: createInput(),
        userId: 'user-a',
        requestKey: 'same-key'
    });

    assert.throws(() => store.createOrGet({
        fingerprint: createProfileJobFingerprint({ profile: 2 }),
        kind: 'direct',
        input: createInput(),
        userId: 'user-a',
        requestKey: 'same-key'
    }), (error) => error.status === 409);
});

test('an explicit campaign safety cap remains enforced', (t) => {
    const { directory, store } = createTestStore(2);
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    for (let index = 0; index < 2; index += 1) {
        store.createOrGet({
            fingerprint: createProfileJobFingerprint({ profile: index }),
            kind: 'direct',
            input: createInput(false),
            userId: 'user-a'
        });
    }
    assert.throws(() => store.createOrGet({
        fingerprint: createProfileJobFingerprint({ profile: 3 }),
        kind: 'direct',
        input: createInput(false),
        userId: 'user-a'
    }), (error) => error.status === 429);
});

test('default campaign cap accepts job 24000, rejects new work beyond it, and replays existing work', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    assert.equal(store.safetyCap, 24000);
    // Model the boundary count without writing 24000 unrelated job files.
    t.mock.method(store, 'count', () => 23999);
    const request = {
        fingerprint: createProfileJobFingerprint({ profile: 'last-allowed' }),
        kind: 'direct', input: createInput(false), userId: 'user-a'
    };
    const created = store.createOrGet(request);
    assert.equal(created.replayed, false);
    t.mock.method(store, 'count', () => 24000);
    assert.equal(store.createOrGet(request).replayed, true);
    assert.throws(() => store.createOrGet({
        ...request, fingerprint: createProfileJobFingerprint({ profile: 'over-cap' })
    }), (error) => error.status === 429);
});

test('duplicate queue submissions execute a persisted job once', async (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const created = store.createOrGet({
        fingerprint: createProfileJobFingerprint({ profile: 1 }),
        kind: 'direct',
        input: createInput(false),
        userId: 'user-a'
    });
    let executions = 0;
    const queue = new DurableProfileJobQueue({
        store,
        execute: async () => {
            executions += 1;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { ok: true };
        }
    });

    queue.enqueue(created.job.id);
    queue.enqueue(created.job.id);
    queue.enqueue(created.job.id);
    const completed = await waitForTerminalState(store, created.job.id);
    assert.equal(completed.state, 'completed');
    assert.equal(executions, 1);
});

test('recovery never repeats a stage that was running during shutdown', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const created = store.createOrGet({
        fingerprint: createProfileJobFingerprint({ profile: 1 }),
        kind: 'direct',
        input: createInput(),
        userId: 'user-a'
    });
    store.update(created.job.id, (job) => {
        job.state = 'running';
        job.stages.text.state = 'running';
        return job;
    });
    let executions = 0;
    const queue = new DurableProfileJobQueue({
        store,
        execute: async () => {
            executions += 1;
            return {};
        }
    });
    queue.recover();

    const recovered = store.read(created.job.id);
    assert.equal(recovered.state, 'needs_review');
    assert.equal(recovered.stages.text.state, 'unknown');
    assert.equal(executions, 0);
});

test('expired results keep a receipt across restarts and never become new work', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const request = { fingerprint: createProfileJobFingerprint('old'), kind: 'direct', input: createInput(), userId: 'user-a', requestKey: 'old-key' };
    const { job } = store.createOrGet(request);
    store.update(job.id, (record) => ({
        ...record, state: 'completed', completedAt: '2020-01-01T00:00:00.000Z',
        result: { profile: { profileImage: 'large-old-image' } }
    }));
    for (let restart = 0; restart < 2; restart += 1) {
        const restored = new FileProfileJobStore({ directory, campaignId: 'test-campaign', retentionDays: 1, fingerprintForJob: () => 'old-automatic-fingerprint' });
        assert.equal(restored.read(job.id).state, 'expired');
        assert.equal(restored.read(job.id).input, undefined);
        assert.equal(restored.read(job.id).result, null);
        assert.equal(restored.startupJobs[0].automaticFingerprint, 'old-automatic-fingerprint');
        for (const requestKey of ['old-key', 'fresh-key', '']) {
            assert.throws(() => restored.createOrGet({ ...request, requestKey }), (error) => error.status === 410);
        }
        assert.throws(() => restored.createOrGet({ ...request, fingerprint: 'new-version', requestKey: '', reusableJobId: job.id }), (error) => error.status === 410);
        assert.equal(restored.count(), 1);
    }
});

test('replay keys are bound and conflicts cannot bypass validation through aliases', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const request = { fingerprint: 'A', kind: 'direct', input: createInput(false), userId: 'user-a', requestKey: 'key-A' };
    const a = store.createOrGet(request).job;
    const b = store.createOrGet({ ...request, fingerprint: 'B', requestKey: 'key-B' }).job;
    assert.equal(store.createOrGet({ ...request, requestKey: 'replay-A', reusableJobId: a.id }).replayed, true);
    assert.throws(() => store.createOrGet({ ...request, fingerprint: 'C', requestKey: 'replay-A' }), (error) => error.status === 409);
    assert.throws(() => store.createOrGet({ ...request, fingerprint: 'B', reusableJobId: b.id }), (error) => error.status === 409);
    // The same key can safely replay an explicitly compatible previous version.
    const next = store.createOrGet({ ...request, fingerprint: 'A-v2', compatibleFingerprints: ['A'], reusableJobId: a.id });
    assert.equal(next.replayed, true);
    assert.equal(next.job.id, a.id);
    assert.equal(store.count(), 2);
});

test('a request receipt whose result is missing blocks regeneration', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    store.writeRequestRecord('old-key', { jobId: store.getJobId('old'), fingerprint: 'old', kind: 'direct' });
    assert.throws(() => store.createOrGet({ fingerprint: 'old', requestKey: 'old-key', kind: 'direct', input: createInput() }), (error) => error.status === 410);
    assert.equal(store.count(), 0);
});

test('startup reads completed job JSON once and recovery uses lightweight metadata', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    for (let index = 0; index < 4; index += 1) {
        const { job } = store.createOrGet({ fingerprint: String(index), kind: 'direct', input: createInput(), userId: 'user-a' });
        store.update(job.id, (record) => ({ ...record, state: 'completed', result: { profileImage: 'x'.repeat(100000) } }));
    }
    const original = fs.readFileSync;
    let reads = 0;
    t.mock.method(fs, 'readFileSync', (target, ...args) => {
        if (path.dirname(String(target)) === store.directory && String(target).endsWith('.json')) reads += 1;
        return original(target, ...args);
    });
    const restored = new FileProfileJobStore({ directory, campaignId: 'test-campaign' });
    assert.equal(reads, 4);
    const queue = new DurableProfileJobQueue({ store: restored, execute: () => assert.fail('Completed work cannot run') });
    queue.recover(restored.startupJobs);
    assert.equal(reads, 4);
    assert.ok(restored.startupJobs.every((job) => job.input === undefined && job.result === undefined));
});

test('recovery cannot start a job whose usage/history preparation was interrupted', (t) => {
    const { directory, store } = createTestStore();
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const { job } = store.createOrGet({ fingerprint: 'incomplete-preparation', kind: 'direct', input: createInput(), initialState: 'preparing' });
    const queue = new DurableProfileJobQueue({ store, execute: () => assert.fail('Incomplete preparation cannot start AI') });
    queue.recover();
    assert.equal(store.read(job.id).state, 'failed');
    assert.equal(store.read(job.id).stages.text.attempts, 0);
    assert.equal(queue.pending.length, 0);
});
