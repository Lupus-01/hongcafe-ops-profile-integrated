import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FileProfileJobStore, createProfileJobFingerprint } from './profile-job-store.mjs';
import { DurableProfileJobQueue } from './profile-job-queue.mjs';

function createTestStore(safetyCap = 1500) {
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

test('campaign safety cap is enforced at 1500-compatible job counting', (t) => {
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
