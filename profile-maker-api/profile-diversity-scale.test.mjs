import { runAssignmentBenchmark } from './profile-diversity-benchmark.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('offline allocation resumes from a checkpoint and matches uninterrupted execution', { timeout: 60000 }, async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-resume-'));
    try {
        const checkpoint = path.join(directory, 'checkpoint.json');
        const options = { profiles: 360, checkpoint, log: () => {} };
        const partial = await runAssignmentBenchmark({ ...options, stopAfter: 300 });
        assert.equal(partial.complete, false);
        assert.equal(partial.profiles, 300);
        const resumed = await runAssignmentBenchmark(options);
        const uninterruptedCheckpoint = path.join(directory, 'uninterrupted.json');
        const uninterrupted = await runAssignmentBenchmark({ profiles: 360, checkpoint: uninterruptedCheckpoint, log: () => {} });
        assert.equal(resumed.complete, true);
        assert.deepEqual(resumed.categories, uninterrupted.categories);
        assert.deepEqual(JSON.parse(fs.readFileSync(checkpoint, 'utf8')).categories,
            JSON.parse(fs.readFileSync(uninterruptedCheckpoint, 'utf8')).categories);
        assert.equal(resumed.imagesAssigned, 720);
        assert.equal(resumed.externalAiCalls, 0);
        await assert.rejects(runAssignmentBenchmark({ ...options, profiles: 361 }), /configuration changed/);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
