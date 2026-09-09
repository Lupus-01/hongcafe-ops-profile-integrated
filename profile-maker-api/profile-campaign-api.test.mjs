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

async function submitSinjeomProfile(baseUrl, name, requestKey) {
    const form = new FormData();
    form.append('templateType', 'sinjeom-ppt');
    form.append('name', name);
    form.append('specialty', '기도와 마음 정리 상담');
    form.append('tone', '차분하고 현실적');
    form.append('career', '오랜 상담 경험');
    form.append('imageStyle', '밝고 정갈한 한국 기도 공간');
    form.append('generateImage', 'true');
    form.append('imageQuality', 'standard');
    const response = await fetch(`${baseUrl}/api/generate-profile`, {
        method: 'POST',
        headers: { 'Idempotency-Key': requestKey },
        body: form
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
    const usageFile = path.join(storeDirectory, 'usage.json');
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
            // Empty values exercise defaults without inheriting developer .env limits.
            PROFILE_CAMPAIGN_SAFETY_CAP: '',
            DAILY_PROFILE_LIMIT: '',
            DAILY_IMAGE_LIMIT: '',
            DAILY_GEMINI_REQUEST_LIMIT: '',
            DAILY_IMAGE_ATTEMPT_LIMIT: '',
            DAILY_PREMIUM_IMAGE_ATTEMPT_LIMIT: '',
            PROFILE_USER_DAILY_LIMIT: '',
            PROFILE_RATE_LIMIT_MAX: '',
            GEMINI_MAX_QUEUE_DEPTH: '',
            GEMINI_MIN_REQUEST_INTERVAL_MS: '',
            PROFILE_JOB_STORE_DIR: storeDirectory,
            PROFILE_GENERATION_HISTORY_FILE: path.join(storeDirectory, 'history.json'),
            PROFILE_USAGE_FILE: usageFile,
            PROFILE_JOB_RETENTION_DAYS: '45',
            AUTH_BYPASS: 'true',
            GEMINI_API_KEY: 'mock-key-that-is-never-called'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    // Drain captured logs so a full pipe cannot stall the test server.
    let serverLogs = '';
    child.stdout.on('data', (chunk) => { serverLogs = (serverLogs + chunk).slice(-20000); });
    child.stderr.on('data', (chunk) => { serverLogs = (serverLogs + chunk).slice(-20000); });
    t.after(async () => {
        const closed = new Promise((resolve) => child.once('close', resolve));
        child.kill('SIGTERM');
        if (child.exitCode === null && child.signalCode === null) await closed;
        fs.rmSync(storeDirectory, { recursive: true, force: true });
    });

    const initialHealth = await waitForHealth(baseUrl);
    assert.equal(initialHealth.profileCampaignMode, true);
    assert.equal(initialHealth.profileCampaignDailyLimitsEnforced, false);
    assert.equal(initialHealth.profileCampaignSafetyCap, 24000);
    assert.equal(initialHealth.dailyLimit, 480);
    assert.equal(initialHealth.dailyImageLimit, 480);
    assert.equal(initialHealth.dailyGeminiRequestLimit, 960);
    assert.equal(initialHealth.dailyImageAttemptLimit, 720);
    assert.equal(initialHealth.dailyPremiumImageAttemptLimit, 144);
    assert.equal(initialHealth.profileUserDailyLimit, 720);
    assert.equal(initialHealth.profileRateLimitMax, 240);
    assert.equal(initialHealth.geminiMaxQueueDepth, 120);
    assert.equal(initialHealth.geminiMinRequestIntervalMs, 10000);
    assert.equal(initialHealth.profileAiMockMode, true);
    assert.equal(initialHealth.referenceInfluenceVersion, 'profile-reference-v3-material-only');
    assert.equal(initialHealth.visualVariationVersion, 'profile-visual-v16-oblique-tables');
    assert.equal(initialHealth.tarotIndependentShootingTypes.length, 5);
    assert.equal(initialHealth.tarotActiveBaseSceneCount, 132);
    assert.equal(initialHealth.tarotAccessoryCount, 21);
    assert.equal(initialHealth.tarotDiversityPolicyVersion, 'tarot-diversity-v2-printed-packs');
    assert.equal(initialHealth.tarotClothColors.length, 10);
    assert.deepEqual(initialHealth.tarotShootingGroupWeights, { oblique: 25, closeup: 25, overhead: 20, 'deck-detail': 15, 'deck-pack': 15 });
    assert.deepEqual(initialHealth.tarotPackCatalog, { layoutCount: 21, structureCount: 6, designCount: 42, compatibleDesignLayoutCount: 882, countBasis: 'compatible-design-layout-configurations-not-independent-photographs' });
    assert.deepEqual(initialHealth.tarotEditorialCatalog, { policy: 'tarot-editorial-v1-layout-light-surface', layoutCount: 12, baseSceneCount: 18, lightingDirections: 6, surfaceTreatments: 6, countBasis: 'layouts-separate-from-compatible-light-and-surface-variants' });
    assert.equal(initialHealth.profileTextPromptVersion, 'profile-copy-v9-expanded-editorial');
    assert.deepEqual(initialHealth.visualCombinationConfiguration, {
        realizationCombinationsPerBase: '61440000',
        countBasis: 'configuration-space-not-perceptual-uniqueness; tarot counts active scene/light/tone/palette/cloth/deck/accessory choices only',
        groupsPerImage: {
            'tarot-ppt': '4316256000',
            'saju-ppt': '7077888000000',
            'sinjeom-ppt': '127401984000000'
        },
        fixedTarotDeckGroupsPerImage: '308304000'
    });
    assert.deepEqual(initialHealth.profileCopyConfiguration, {
        categories: 3,
        groupsPerCategory: 11796480,
        groupsTotal: 35389440,
        expressionStyles: 32,
        variantsTotal: 1132462080
    });
    assert.equal(initialHealth.pairedSceneSubjects['sinjeom-ppt'], 30);
    assert.equal(initialHealth.pairedHeroSubjects['sinjeom-ppt'], 18);
    assert.equal(initialHealth.pairedHeroMotifFamilies['sinjeom-ppt'], 14);
    assert.equal(initialHealth.baseSceneArchetypeCounts['sinjeom-ppt'], 120);
    assert.equal(initialHealth.sceneArchetypeCounts['sinjeom-ppt'], 1200);

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
    const replayWithNewKey = await submitProfile(baseUrl, 'key owner', 'replay-key');
    assert.equal(replayWithNewKey.response.headers.get('Idempotency-Replayed'), 'true');
    assert.equal((await submitProfile(baseUrl, 'new conflicting input', 'replay-key')).response.status, 409);
    assert.equal((await submitProfile(baseUrl, 'same consultant', 'fixed-idempotency-key')).response.status, 409);
    assert.equal(duplicateJob.presentation.templateType, 'tarot-ppt');
    assert.equal(duplicateJob.presentation.nameHint, 'same consultant');
    assert.equal(duplicateJob.input, undefined);
    assert.equal(duplicateJob.outputs, undefined);

    const healthBeforeInvalid = await (await fetch(`${baseUrl}/api/health`)).json();
    for (const templateType of ['unsupported', '__proto__', 'constructor']) {
        const form = createProfileForm('invalid template');
        form.set('templateType', templateType);
        const invalid = await fetch(`${baseUrl}/api/generate-profile`, { method: 'POST', body: form });
        assert.equal(invalid.status, 400);
        assert.match((await invalid.json()).error, /프로필 분야/);
    }
    const invalidSlot = await fetch(`${baseUrl}/api/regenerate-profile-slot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType: 'tarot-ppt', slotKey: '__proto__', currentProfile: {} })
    });
    assert.equal(invalidSlot.status, 400);
    const invalidDocument = new FormData();
    invalidDocument.append('pptFile', new Blob(['sample document']), 'sample.txt');
    invalidDocument.append('templateType', 'unsupported');
    assert.equal((await fetch(`${baseUrl}/api/generate-from-ppt`, { method: 'POST', body: invalidDocument })).status, 400);
    const healthAfterInvalid = await (await fetch(`${baseUrl}/api/health`)).json();
    assert.equal(healthAfterInvalid.profileCampaignJobs, healthBeforeInvalid.profileCampaignJobs);
    assert.equal(healthAfterInvalid.usedToday, healthBeforeInvalid.usedToday);

    const savedUsage = fs.readFileSync(usageFile, 'utf8');
    fs.writeFileSync(usageFile, '{broken');
    const corruptUsageResponse = await submitProfile(baseUrl, 'corrupt ledger input', 'corrupt-ledger-key');
    assert.equal(corruptUsageResponse.response.status, 503);
    assert.match(corruptUsageResponse.data.error, /사용량/);
    fs.writeFileSync(usageFile, savedUsage);
    const healthAfterCorrupt = await (await fetch(`${baseUrl}/api/health`)).json();
    assert.equal(healthAfterCorrupt.profileCampaignJobs, healthBeforeInvalid.profileCampaignJobs);
    assert.equal(healthAfterCorrupt.usedToday, healthBeforeInvalid.usedToday);
    assert.match(serverLogs, /\[profile-startup\] readyAt=.*pid=.*totalMs=/);

    const uniqueSubmissions = await Promise.all(
        Array.from({ length: 5 }, (_, index) => submitProfile(baseUrl, `unique-${index}`, `unique-key-${index}`))
    );
    const uniqueJobIds = new Set(uniqueSubmissions.map(({ data }) => data.job.id));
    assert.equal(uniqueJobIds.size, 5);
    const uniqueJobs = await Promise.all([...uniqueJobIds].map((jobId) => waitForJob(baseUrl, jobId)));
    assert.equal(new Set(uniqueJobs.map((job) => job.result.copyMeta.generationSequence)).size, 5);
    const generatedVisualGroups = [duplicateJob, ...uniqueJobs].flatMap((job) => ([
        job.result.imageGuide.portrait.visualGroupId,
        job.result.imageGuide.mood.visualGroupId
    ]));
    assert.equal(new Set(generatedVisualGroups).size, generatedVisualGroups.length);
    assert.equal(uniqueJobs.every((job) => job.result.noveltyMeta.visual.reusedVisualGroup === false), true);

    const sinjeomSubmissions = await Promise.all(
        Array.from({ length: 12 }, (_, index) => submitSinjeomProfile(baseUrl, `sinjeom-${index}`, `sinjeom-key-${index}`))
    );
    assert.equal(sinjeomSubmissions.every(({ response }) => [200, 202].includes(response.status)), true);
    const sinjeomJobs = await Promise.all(sinjeomSubmissions.map(({ data }) => waitForJob(baseUrl, data.job.id)));
    const sinjeomGuides = sinjeomJobs.flatMap((job) => [job.result.imageGuide.portrait, job.result.imageGuide.mood]);
    for (const job of sinjeomJobs) {
        assert.notEqual(job.result.imageGuide.portrait.motifFamilyId, job.result.imageGuide.mood.motifFamilyId);
    }
    assert.equal(new Set(sinjeomGuides.map((guide) => guide.visualGroupId)).size, sinjeomGuides.length);
    assert.ok(new Set(sinjeomGuides.map((guide) => guide.motifFamilyId)).size >= 10);
    for (const guide of sinjeomGuides) {
        if (guide.motifFamilyId === 'candle') assert.ok(['candle-prayer', 'temple-interior'].includes(guide.sceneFamily));
        if (guide.motifFamilyId === 'buddha') assert.ok(['buddha-space', 'temple-interior', 'architectural-wide'].includes(guide.sceneFamily));
        if (guide.motifFamilyId === 'lantern') assert.ok(['lantern-space', 'temple-interior', 'threshold-veranda', 'architectural-wide'].includes(guide.sceneFamily));
    }

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
    assert.equal(finalHealth.profileCampaignJobs, 22);
    assert.equal(finalHealth.profileGenerationHistoryRecords, 22);
    assert.equal(finalHealth.profileCopySimilarityThreshold, 0.55);
    assert.equal(finalHealth.maxDocumentFileCount, 5);
    assert.equal(finalHealth.maxDocumentTotalBytes, 26214400);
    assert.equal(finalHealth.usedGeminiRequestsToday, 0);
});
