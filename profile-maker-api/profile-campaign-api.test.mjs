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
    for (let attempt = 0; attempt < 200; attempt += 1) {
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

async function submitTextDocument(baseUrl, requestKey) {
    const form = new FormData();
    form.append('pptFile', new Blob([
        Buffer.from('상담사 홍길동\n관계 상담과 현실적인 조언에 강점이 있습니다.', 'utf8')
    ], { type: 'text/plain' }), 'consultant.txt');
    form.append('templateType', 'tarot-ppt');
    form.append('tarotCardType', 'auto');
    form.append('imageStyle', 'natural');
    form.append('generateImage', 'false');
    form.append('imageQuality', 'standard');
    const response = await fetch(`${baseUrl}/api/generate-from-ppt`, {
        method: 'POST',
        headers: { 'Idempotency-Key': requestKey },
        body: form
    });
    const data = await response.json();
    return { response, data };
}

async function submitMultipleTextDocuments(baseUrl, requestKey, reverse = false) {
    const form = new FormData();
    const documents = [
        {
            content: '첫 번째 자료\n따뜻한 공감과 관계 상담을 강조합니다.',
            type: 'text/plain',
            name: 'introduction.txt'
        },
        {
            content: '두 번째 자료\n현실적인 선택과 차분한 설명을 강조합니다.',
            type: 'text/markdown',
            name: 'direction.md'
        }
    ];
    for (const document of (reverse ? documents.reverse() : documents)) {
        form.append('pptFile', new Blob([
            Buffer.from(document.content, 'utf8')
        ], { type: document.type }), document.name);
    }
    form.append('templateType', 'tarot-ppt');
    form.append('tarotCardType', 'auto');
    form.append('imageStyle', 'natural');
    form.append('generateImage', 'false');
    form.append('imageQuality', 'standard');
    const response = await fetch(`${baseUrl}/api/generate-from-ppt`, {
        method: 'POST',
        headers: { 'Idempotency-Key': requestKey },
        body: form
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
    assert.equal(initialHealth.referenceInfluenceVersion, 'profile-reference-v2-strong-priority');
    assert.equal(initialHealth.visualVariationVersion, 'profile-visual-v8-distinct-location-groups');
    assert.deepEqual(initialHealth.visualCombinationConfiguration, {
        realizationCombinationsPerBase: '61440000',
        groupsPerImage: {
            'tarot-ppt': '2064384000000',
            'saju-ppt': '1769472000000',
            'sinjeom-ppt': '5308416000000'
        },
        fixedTarotDeckGroupsPerImage: '147456000000'
    });
    assert.deepEqual(initialHealth.profileCopyConfiguration, {
        categories: 3,
        groupsPerCategory: 1474560,
        groupsTotal: 4423680,
        expressionStyles: 20,
        variantsTotal: 88473600
    });

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
    assert.ok(duplicateJob.result.imageGuide.portrait.visualGroupId);
    assert.ok(duplicateJob.result.imageGuide.mood.visualGroupId);
    assert.notEqual(duplicateJob.result.imageGuide.portrait.visualGroupId, duplicateJob.result.imageGuide.mood.visualGroupId);
    assert.notEqual(duplicateJob.result.imageGuide.portrait.locationId, duplicateJob.result.imageGuide.mood.locationId);
    assert.notEqual(duplicateJob.result.imageGuide.portrait.physicalPlaceId, duplicateJob.result.imageGuide.mood.physicalPlaceId);
    assert.notEqual(duplicateJob.result.imageGuide.portrait.placementId, duplicateJob.result.imageGuide.mood.placementId);

    const firstKeyUse = await submitProfile(baseUrl, 'key owner', 'fixed-idempotency-key');
    assert.ok([200, 202].includes(firstKeyUse.response.status));
    const conflictingKeyUse = await submitProfile(baseUrl, 'different input', 'fixed-idempotency-key');
    assert.equal(conflictingKeyUse.response.status, 409);

    const uniqueSubmissions = await Promise.all(
        Array.from({ length: 5 }, (_, index) => submitProfile(baseUrl, `unique-${index}`, `unique-key-${index}`))
    );
    const uniqueJobIds = new Set(uniqueSubmissions.map(({ data }) => data.job.id));
    assert.equal(uniqueJobIds.size, 5);
    const uniqueJobs = await Promise.all([...uniqueJobIds].map((jobId) => waitForJob(baseUrl, jobId)));
    assert.equal(new Set(uniqueJobs.map((job) => job.result.copyMeta.generationSequence)).size, 5);

    const documentSubmission = await submitTextDocument(baseUrl, 'text-document-key');
    assert.ok([200, 202].includes(documentSubmission.response.status));
    const documentJob = await waitForJob(baseUrl, documentSubmission.data.job.id);
    assert.equal(documentJob.state, 'completed');
    assert.equal(documentJob.result.meta.fileType, 'txt');
    assert.equal(documentJob.result.meta.sourceLabel, '메모장 텍스트');
    assert.equal(documentJob.result.meta.fileCount, 1);

    const multipleDocumentSubmission = await submitMultipleTextDocuments(baseUrl, 'multiple-document-key');
    assert.ok([200, 202].includes(multipleDocumentSubmission.response.status));
    const repeatedMultipleDocumentSubmission = await submitMultipleTextDocuments(baseUrl, 'multiple-document-repeat-key');
    assert.ok([200, 202].includes(repeatedMultipleDocumentSubmission.response.status));
    assert.equal(repeatedMultipleDocumentSubmission.data.job.id, multipleDocumentSubmission.data.job.id);
    const multipleDocumentJob = await waitForJob(baseUrl, multipleDocumentSubmission.data.job.id);
    assert.equal(multipleDocumentJob.state, 'completed');
    assert.equal(multipleDocumentJob.result.meta.fileType, 'multiple');
    assert.equal(multipleDocumentJob.result.meta.sourceLabel, '참고 문서 2개');
    assert.equal(multipleDocumentJob.result.meta.fileCount, 2);
    assert.deepEqual(
        multipleDocumentJob.result.meta.documents.map((document) => document.fileName),
        ['introduction.txt', 'direction.md']
    );
    const reversedMultipleDocumentSubmission = await submitMultipleTextDocuments(baseUrl, 'multiple-document-reversed-key', true);
    assert.ok([200, 202].includes(reversedMultipleDocumentSubmission.response.status));
    assert.notEqual(reversedMultipleDocumentSubmission.data.job.id, multipleDocumentSubmission.data.job.id);

    const finalHealth = await (await fetch(`${baseUrl}/api/health`)).json();
    assert.equal(finalHealth.profileCampaignJobs, 10);
    assert.equal(finalHealth.maxDocumentFileCount, 5);
    assert.equal(finalHealth.maxDocumentTotalBytes, 26214400);
    assert.equal(finalHealth.usedGeminiRequestsToday, 0);
});
