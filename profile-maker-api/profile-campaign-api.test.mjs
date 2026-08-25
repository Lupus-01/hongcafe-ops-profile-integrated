import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, '..');

async function waitForHealth(baseUrl) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
            const response = await fetch(`${baseUrl}/api/health`);
            if (response.ok) return response.json();
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('Campaign API did not become healthy.');
}

function createProfileForm(name, generateImage = true) {
    const form = new FormData();
    form.append('templateType', 'tarot-ppt');
    form.append('tarotCardType', 'auto');
    form.append('name', name);
    form.append('specialty', 'relationship reading');
    form.append('tone', 'calm');
    form.append('career', 'ten years');
    form.append('imageStyle', 'natural');
    form.append('generateImage', String(generateImage));
    form.append('imageQuality', 'standard');
    return form;
}

async function submitProfile(baseUrl, name, requestKey) {
    const response = await fetch(`${baseUrl}/api/generate-profile`, {
        method: 'POST',
        headers: { 'Idempotency-Key': requestKey },
        body: createProfileForm(name, true)
    });
    const data = await response.json();
    return { response, data };
}

async function waitForJob(baseUrl, jobId) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/profile-jobs/${jobId}`);
        const data = await response.json();
        if (['completed', 'partial', 'failed', 'needs_review'].includes(data.job?.state)) return data.job;
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Profile job ${jobId} did not finish.`);
}

test('campaign API coalesces duplicates without external AI calls', async (t) => {
    const storeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-campaign-api-'));
    const port = 33000 + (process.pid % 1000);
    const baseUrl = `http://127.0.0.1:${port}`;
    const child = spawn(process.execPath, ['profile-maker-api/server.mjs'], {
        cwd: projectRoot,
        env: {
            ...process.env,
            NODE_ENV: 'test',
            PROFILE_AI_MOCK_MODE: 'true',
            PROFILE_API_PORT: String(port),
            PROFILE_API_HOST: '127.0.0.1',
            PROFILE_CAMPAIGN_MODE: 'true',
            PROFILE_CAMPAIGN_ID: 'integration-campaign',
            PROFILE_CAMPAIGN_SAFETY_CAP: '1500',
            PROFILE_JOB_STORE_DIR: storeDirectory,
            AUTH_BYPASS: 'true',
            GEMINI_API_KEY: 'mock-key-that-is-never-called'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    t.after(() => {
        child.kill('SIGTERM');
        fs.rmSync(storeDirectory, { recursive: true, force: true });
    });

    const initialHealth = await waitForHealth(baseUrl);
    assert.equal(initialHealth.profileCampaignMode, true);
    assert.equal(initialHealth.profileCampaignSafetyCap, 1500);
    assert.equal(initialHealth.profileAiMockMode, true);

    const duplicateSubmissions = await Promise.all(
        Array.from({ length: 20 }, (_, index) => submitProfile(baseUrl, 'same consultant', `duplicate-${index}`))
    );
    assert.ok(
        duplicateSubmissions.every(({ response }) => [200, 202].includes(response.status)),
        JSON.stringify(duplicateSubmissions.map(({ response, data }) => ({ status: response.status, data })))
    );
    const duplicateJobIds = new Set(duplicateSubmissions.map(({ data }) => data.job.id));
    assert.equal(duplicateJobIds.size, 1);

    const duplicateJob = await waitForJob(baseUrl, [...duplicateJobIds][0]);
    assert.equal(duplicateJob.state, 'completed');
    assert.equal(duplicateJob.stages.text.attempts, 1);
    assert.equal(duplicateJob.stages.portrait.attempts, 1);
    assert.equal(duplicateJob.stages.mood.attempts, 1);
    assert.equal(Boolean(duplicateJob.result.profile.profileImage), true);
    assert.equal(Boolean(duplicateJob.result.profile.moodImage), true);

    const firstKeyUse = await submitProfile(baseUrl, 'key owner', 'fixed-idempotency-key');
    assert.ok([200, 202].includes(firstKeyUse.response.status));
    const conflictingKeyUse = await submitProfile(baseUrl, 'different input', 'fixed-idempotency-key');
    assert.equal(conflictingKeyUse.response.status, 409);

    const uniqueSubmissions = await Promise.all(
        Array.from({ length: 5 }, (_, index) => submitProfile(baseUrl, `unique-${index}`, `unique-key-${index}`))
    );
    const uniqueJobIds = new Set(uniqueSubmissions.map(({ data }) => data.job.id));
    assert.equal(uniqueJobIds.size, 5);
    await Promise.all([...uniqueJobIds].map((jobId) => waitForJob(baseUrl, jobId)));

    const finalHealth = await (await fetch(`${baseUrl}/api/health`)).json();
    assert.equal(finalHealth.profileCampaignJobs, 7);
    assert.equal(finalHealth.usedGeminiRequestsToday, 0);
});
