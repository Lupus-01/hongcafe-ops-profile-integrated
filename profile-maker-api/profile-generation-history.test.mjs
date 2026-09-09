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

test('independent photographic structure survives reservation, completion and reload', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-structure-history-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const filePath = path.join(directory, 'history.json');
    const history = new FileProfileGenerationHistory({ filePath });
    const structure = { shootingGroup: 'overhead', cardLayout: 'three-card-row', tableShape: 'outside-crop', clothColor: 'burgundy', tarotDiversityPolicyVersion: 'tarot-diversity-v1-shots-cloth', shootType: 'overhead', distance: 'medium', support: 'linen', background: 'flat-surface', cameraHeight: 'overhead', accessoryId: 'brass-pendulum', accessoryFamily: 'pendulum' };
    Object.assign(structure, { packLayoutId: 'standing-fan', packStructureId: 'tuck', packDesignId: 'classic-symbolic-art-2' });
    Object.assign(structure, { lightingId: 'tarot-light-diffused-bright', surfaceId: 'tarot-surface-satin', editorialPolicy: 'tarot-editorial-v1-layout-light-surface' });
    const guide = { ...structure, visualGroupId: 'independent-card', sceneId: 'tarot-diverse-overhead-round-three-card-triangle--quiet-original' };
    history.reserve({ id: 'new-shot', campaignId: 'test', templateType: 'tarot-ppt', visuals: [{ kind: 'portrait', ...guide }] });
    for (const [key, value] of Object.entries(structure)) assert.equal(history.getVisualAssignments('tarot-ppt')[0][key], value);
    history.complete('new-shot', { profile: {}, imageGuide: { portrait: guide } });
    const reloaded = new FileProfileGenerationHistory({ filePath });
    for (const [key, value] of Object.entries(structure)) assert.equal(reloaded.getVisualAssignments('tarot-ppt')[0][key], value);
});

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
        copyVariant: { groupId: 'group-1', styleId: 'style-1', sourceFocus: { limited: false, evidence: ['개별 상담사의 원문 근거'] } }
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
    assert.doesNotMatch(fs.readFileSync(filePath, 'utf8'), /관계의 흐름|반복되는 감정|개별 상담사의 원문 근거/);
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
        visuals: [{ kind: 'portrait', visualGroupId: 'visual-1', subjectId: 'brass-bell', sceneId: 'scene-1', photographicDirectionId: 'layered-space', exposureId: 'bright', toneId: 'tone-2' }]
    });

    const reloaded = new FileProfileGenerationHistory({ filePath });
    assert.deepEqual(reloaded.getCopyAssignments('saju-ppt').map((item) => item.groupId), ['saju-group-1']);
    assert.deepEqual(reloaded.getVisualAssignments('saju-ppt').map((item) => item.visualGroupId), ['visual-1']);
    assert.equal(reloaded.getVisualAssignments('saju-ppt')[0].motifFamilyId, 'bell');
    assert.equal(reloaded.getVisualAssignments('saju-ppt')[0].photographicDirectionId, 'layered-space');
    assert.equal(reloaded.getVisualAssignments('saju-ppt')[0].exposureId, 'bright');
    assert.equal(reloaded.getVisualAssignments('saju-ppt')[0].toneId, 'tone-2');
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
    assert.equal(history.getVisualAssignments('sinjeom-ppt')[0].photographicDirectionId, '');
    assert.equal(history.getVisualAssignments('sinjeom-ppt')[0].exposureId, '');
    assert.equal(history.getVisualAssignments('sinjeom-ppt')[0].toneId, '');
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

test('matching headline or image is reviewed even when overall text differs, including after reload', (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-field-history-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const filePath = path.join(directory, 'history.json');
    let history = new FileProfileGenerationHistory({ filePath });
    history.reserve({ id: 'first', campaignId: 'old', templateType: 'tarot-ppt' });
    history.complete('first', { profile: { headline: '같은 제목이 계속 반복되는 상담 소개', intro: '전혀 다른 첫 번째 이야기입니다.' }, imageSignatures: { portrait: { version: 1, exactHash: 'same-image' } } });
    history = new FileProfileGenerationHistory({ filePath });
    history.reserve({ id: 'next', campaignId: 'new', templateType: 'tarot-ppt' });
    const result = history.complete('next', { profile: { headline: '같은 제목이 계속 반복되는 상담 소개', intro: '새로운 직업을 찾는 고민과 면접 준비의 경험을 설명합니다.', cardBody: '여러 선택지의 장단점을 분석하여 정리하는 개별적인 방법입니다.' }, imageSignatures: { mood: { version: 1, exactHash: 'same-image' }, portrait: null } });
    assert.equal(result.fieldMatches.headline.score, 1);
    assert.equal(result.imageMatches.mood.recordId, 'first');
    assert.equal(result.imageMatches.mood.kind, 'portrait');
    assert.equal(result.imageComparison.unassessed, 1);
    assert.equal(result.needsReview, true);
    assert.equal(history.count(), 2);
    assert.doesNotMatch(fs.readFileSync(filePath, 'utf8'), /같은 제목이|새로운 직업/);
});
