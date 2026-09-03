import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    calculateProfileSimilarity,
    createProfileSimilaritySignature,
    FileProfileGenerationHistory
} from './profile-generation-history.mjs';

function createProfile(headline, body) {
    return {
        headline,
        intro: body,
        sectionTitle: '상담 안내',
        sectionBody: body,
        bulletPoints: ['첫 번째 기준', '두 번째 기준', '세 번째 기준']
    };
}

test('profile similarity detects repeated copy without storing the original text', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-generation-history-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const filePath = path.join(directory, 'history.json');
    const history = new FileProfileGenerationHistory({ filePath, similarityThreshold: 0.5 });
    const firstProfile = createProfile('관계의 흐름을 읽는 시간', '반복되는 감정의 원인을 살펴 현실적인 선택 기준을 정리합니다.');

    history.reserve({
        id: 'round-1:job-1',
        campaignId: 'round-1',
        jobId: 'job-1',
        templateType: 'tarot-ppt',
        copyVariant: { groupId: 'group-1', styleId: 'style-1' }
    });
    history.complete('round-1:job-1', { profile: firstProfile });

    history.reserve({
        id: 'round-2:job-2',
        campaignId: 'round-2',
        jobId: 'job-2',
        templateType: 'tarot-ppt',
        copyVariant: { groupId: 'group-2', styleId: 'style-2' }
    });
    const assessment = history.complete('round-2:job-2', { profile: firstProfile });
    assert.equal(assessment.similarityScore, 1);
    assert.equal(assessment.needsReview, true);
    assert.equal(assessment.matchedRecordId, 'round-1:job-1');
    assert.doesNotMatch(fs.readFileSync(filePath, 'utf8'), /관계의 흐름|반복되는 감정/);
});

test('generation history persists copy and visual assignments across campaign IDs', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-generation-history-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const filePath = path.join(directory, 'history.json');
    const first = new FileProfileGenerationHistory({ filePath });
    first.reserve({
        id: 'round-1:job-1',
        campaignId: 'round-1',
        jobId: 'job-1',
        templateType: 'saju-ppt',
        copyVariant: { groupId: 'saju-group-1' },
        visuals: [{ kind: 'portrait', visualGroupId: 'visual-1', subjectId: 'brass-bell', sceneId: 'scene-1' }]
    });

    const reloaded = new FileProfileGenerationHistory({ filePath });
    assert.deepEqual(reloaded.getCopyAssignments('saju-ppt').map((item) => item.groupId), ['saju-group-1']);
    assert.deepEqual(reloaded.getVisualAssignments('saju-ppt').map((item) => item.visualGroupId), ['visual-1']);
    assert.equal(reloaded.getVisualAssignments('saju-ppt')[0].motifFamilyId, 'bell');
});

test('available completed campaign jobs are imported once into shared history', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-generation-import-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const campaignDirectory = path.join(directory, 'first-round');
    fs.mkdirSync(campaignDirectory);
    const jobId = 'a'.repeat(32);
    fs.writeFileSync(path.join(campaignDirectory, `${jobId}.json`), JSON.stringify({
        id: jobId,
        campaignId: 'first-round',
        createdAt: '2026-09-01T00:00:00.000Z',
        input: { payload: { templateType: 'sinjeom-ppt', copyVariant: { groupId: 'legacy-group' } } },
        result: {
            profile: createProfile('막힘을 정리하는 기준', '지금 확인할 현실적인 방향을 차분하게 살펴봅니다.'),
            imageGuide: { portrait: { visualGroupId: 'legacy-visual', prompt: 'private prompt material' } }
        }
    }), 'utf8');

    const filePath = path.join(directory, '.generation-history.json');
    const history = new FileProfileGenerationHistory({ filePath, sourceJobDirectory: directory });
    assert.equal(history.count(), 1);
    assert.equal(history.getCopyAssignments('sinjeom-ppt')[0].groupId, 'legacy-group');
    assert.equal(history.getVisualAssignments('sinjeom-ppt')[0].visualGroupId, 'legacy-visual');
    assert.doesNotMatch(fs.readFileSync(filePath, 'utf8'), /private prompt material|막힘을 정리/);

    const reloaded = new FileProfileGenerationHistory({ filePath, sourceJobDirectory: directory });
    assert.equal(reloaded.count(), 1);
});

test('similarity remains low for substantially different profile copy', () => {
    const first = createProfileSimilaritySignature(createProfile(
        '관계의 흐름을 읽는 시간',
        '감정의 이동과 선택지를 카드 배열로 차분히 살펴봅니다.'
    ));
    const second = createProfileSimilaritySignature(createProfile(
        '타고난 기질의 강점을 발견하세요',
        '오행의 균형과 장기적인 직업 계획을 분석합니다.'
    ));
    assert.ok(calculateProfileSimilarity(first, second) < 0.3);
});
