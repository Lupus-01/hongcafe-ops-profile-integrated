import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import { FileProfileGenerationHistory } from './profile-generation-history.mjs';
import { selectProfileCopyVariant, buildProfileCopyDirection } from './profile-copy-engine.mjs';
import { createOfflineVisualRuntime } from './profile-diversity-runtime.mjs';

test('1800 profiles: 1500 initial plus 300 continued assignments across three categories, without AI', { timeout: 15 * 60 * 1000 }, async (t) => {
    const categories = ['tarot-ppt', 'saju-ppt', 'sinjeom-ppt'];
    const report = [];
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-scale-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    await yieldToEventLoop();
    for (const templateType of categories) {
        console.log(`[diversity] ${templateType}: 0/600 (AI calls: 0)`);
        let visuals = [];
        let copies = [];
        const baselineVisuals = [];
        const runtime = createOfflineVisualRuntime(() => visuals);
        const baseline = createOfflineVisualRuntime(() => baselineVisuals, { baseline: true });
        const groups = new Set();
        const imageGroups = new Set();
        const directions = {};
        let samePairDirection = 0;
        let baselineSamePairDirection = 0;
        const start = performance.now();
        for (let index = 0; index < 600; index += 1) {
            // 타이머와 테스트 러너의 메시지 처리가 긴 동기 계산에 막히지 않게 한다.
            if (index % 10 === 0) {
                await yieldToEventLoop();
                t.signal.throwIfAborted();
            }
            // 500건/분야에서 저장 후 다시 읽은 이력을 사용해 추가 제작을 재현한다.
            if (index === 500) {
                const filePath = path.join(directory, `${templateType}.json`);
                const saved = new FileProfileGenerationHistory({ filePath });
                copies.forEach((copyVariant, offset) => saved.records.set(String(offset), {
                    id: String(offset), templateType, campaignId: 'first', copyVariant,
                    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 500 - offset)).toISOString(),
                    visuals: visuals.slice(offset * 2, offset * 2 + 2)
                }));
                saved.write();
                const restored = new FileProfileGenerationHistory({ filePath });
                assert.equal(restored.count(), 500);
                copies = restored.getCopyAssignments(templateType);
                visuals = restored.getVisualAssignments(templateType);
            }
            const sourceText = index % 3 === 0 ? '차분하고 따뜻하게 상담합니다.' : '직장과 관계 상담을 전문으로 합니다. 12년 경력으로 질문을 정리해 설명합니다.';
            const copy = selectProfileCopyVariant({ templateType, sourceText, identity: `consultant-${index % 15}`, generationSequence: copies.length, recent: copies });
            assert.ok(!groups.has(copy.groupId));
            assert.ok(!copies.slice(0, 3).some((item) => item.openingIndex === copy.openingIndex));
            assert.match(buildProfileCopyDirection(copy), /원문에서 확인되는 상담사 개인의 정보/);
            groups.add(copy.groupId);
            copies.unshift(copy);
            const payload = { templateType, name: 'same', visualIdentity: 'same', visualNonce: `scale-${index}`, copyVariant: copy, tarotCardType: templateType === 'tarot-ppt' && index % 2 === 0 ? 'rider-waite' : 'auto' };
            // 실제 지원되는 고정 덱 키를 사용한다.
            if (payload.tarotCardType !== 'auto') payload.tarotCardType = Object.entries(runtime.TAROT_CARD_TYPES).find(([, value]) => value.subjectId)?.[0];
            const baselinePayload = { ...payload };
            baseline.assignNovelVisualVariant(baselinePayload);
            const oldPair = baseline.getVisualPair(baselinePayload);
            if (oldPair.portrait.realization.photographicDirection.id === oldPair.mood.realization.photographicDirection.id) baselineSamePairDirection += 1;
            baselineVisuals.unshift(...['portrait', 'mood'].map((kind) => baseline.toVisualHistoryEntry(kind, oldPair[kind])));
            runtime.assignNovelVisualVariant(payload);
            const pair = runtime.getVisualPair(payload);
            assert.notEqual(pair.portrait.scene.id, pair.mood.scene.id);
            if (payload.tarotCardType !== 'auto') {
                const expected = runtime.TAROT_CARD_TYPES[payload.tarotCardType].subjectId;
                assert.equal(pair.portrait.subject.id, expected);
                assert.equal(pair.mood.subject.id, expected);
            }
            if (pair.portrait.realization.photographicDirection.id === pair.mood.realization.photographicDirection.id) samePairDirection += 1;
            const entries = ['portrait', 'mood'].map((kind) => runtime.toVisualHistoryEntry(kind, pair[kind]));
            for (const entry of entries) {
                assert.ok(!imageGroups.has(entry.visualGroupId));
                imageGroups.add(entry.visualGroupId);
                directions[entry.photographicDirectionId] = (directions[entry.photographicDirectionId] || 0) + 1;
            }
            visuals.unshift(...entries);
            if ((index + 1) % 100 === 0) console.log(`[diversity] ${templateType}: ${index + 1}/600 (AI calls: 0)`);
        }
        assert.equal(groups.size, 600);
        assert.equal(imageGroups.size, 1200);
        assert.ok(Object.keys(directions).length >= 3);
        assert.ok(Math.max(...Object.values(directions)) / 1200 < 0.6, JSON.stringify(directions));
        assert.ok(samePairDirection <= 60, `${templateType}: same paired composition ${samePairDirection}/600`);
        assert.ok(samePairDirection < baselineSamePairDirection, 'Macro allocation must reduce same-direction pairs versus the previous scoring rule');
        report.push({ templateType, profiles: copies.length, uniqueCopyGroups: groups.size, uniqueImageGroups: imageGroups.size, directions, samePairDirection, baselineSamePairDirection, milliseconds: Math.round(performance.now() - start) });
    }
    t.diagnostic(JSON.stringify({ mode: 'offline-assignment-not-generated-content', profiles: 1800, imagesAssigned: 3600, externalAiCalls: 0, report }));
});
