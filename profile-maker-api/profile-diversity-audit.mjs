// 사용 예: node profile-maker-api/profile-diversity-audit.mjs /path/to/.profile-jobs
// 읽기 전용. 결과/이미지 원문을 출력하거나 외부 API를 호출하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { createProfileSimilaritySignature, createProfileFieldSignatures, calculateProfileSimilarity } from './profile-generation-history.mjs';
import { createProfileImageSignatures, compareImageSignatures } from './profile-image-similarity.mjs';

const directory = process.argv[2];
if (!directory || !fs.statSync(directory).isDirectory()) throw new Error('기존 작업 디렉터리 경로를 지정해주세요.');
const categories = new Map(['tarot-ppt', 'saju-ppt', 'sinjeom-ppt'].map((type) => [type, []]));
let unreadable = 0;
for (const campaign of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!campaign.isDirectory() || campaign.name.startsWith('.')) continue;
    const campaignDirectory = path.join(directory, campaign.name);
    for (const entry of fs.readdirSync(campaignDirectory, { withFileTypes: true })) {
        if (!entry.isFile() || !/^[a-f0-9]{32}\.json$/.test(entry.name)) continue;
        try {
            const job = JSON.parse(fs.readFileSync(path.join(campaignDirectory, entry.name), 'utf8'));
            const list = categories.get(job.input?.payload?.templateType);
            if (!list || !job.result?.profile) continue;
            list.push({ id: `${campaign.name}:${job.id}`, date: job.completedAt || job.updatedAt || '',
                copyVersion: job.input.payload.profileTextPromptVersion || 'legacy',
                visualVersion: job.input.payload.visualVariationVersion || 'legacy', profile: job.result.profile });
            list.sort((a, b) => b.date.localeCompare(a.date));
            if (list.length > 20) list.pop();
        } catch { unreadable += 1; }
    }
}
const report = [];
for (const [templateType, samples] of categories) {
    for (const sample of samples) {
        sample.text = createProfileSimilaritySignature(sample.profile);
        sample.fields = createProfileFieldSignatures(sample.profile);
        sample.images = await createProfileImageSignatures(sample.profile);
        delete sample.profile;
    }
    const pairs = [];
    for (let i = 0; i < samples.length; i += 1) for (let j = i + 1; j < samples.length; j += 1) {
        const a = samples[i];
        const b = samples[j];
        const textScore = calculateProfileSimilarity(a.text, b.text);
        const repeatedFields = Object.keys(a.fields).filter((field) => calculateProfileSimilarity(a.fields[field], b.fields[field]) >= 0.8);
        const imagePairs = [];
        for (const [aKind, aImage] of Object.entries(a.images)) for (const [bKind, bImage] of Object.entries(b.images)) {
            const score = compareImageSignatures(aImage, bImage);
            if (score >= 0.94) imagePairs.push({ aKind, bKind, score });
        }
        if (textScore >= 0.55 || repeatedFields.length || imagePairs.length) pairs.push({ a: a.id, b: b.id, textScore: Number(textScore.toFixed(4)), repeatedFields, imagePairs });
    }
    report.push({ templateType, samples: samples.length,
        assessedImages: samples.reduce((sum, item) => sum + Object.values(item.images).filter(Boolean).length, 0),
        unassessedImages: samples.reduce((sum, item) => sum + Object.values(item.images).filter((value) => !value).length, 0),
        versions: [...new Set(samples.map((sample) => `${sample.copyVersion}/${sample.visualVersion}`))],
        reviewPairs: pairs });
}
console.log(JSON.stringify({ mode: 'read-only-existing-results', externalAiCalls: 0, unreadable,
    note: '분야별 최신 최대 20건. 점수는 검토 후보이며 의미 유사성 또는 육안 판정이 아니다. 이미지 URL은 다운로드하지 않는다.', report }, null, 2));
