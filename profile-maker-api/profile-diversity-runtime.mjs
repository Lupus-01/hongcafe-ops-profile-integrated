import { createAdditionalSceneArchetypes } from './profile-scene-catalog.mjs';
import { createIncrementalIndex, increment } from './profile-assignment-index.mjs';
// 테스트/오프라인 감사 전용: API 서버·환경 변수·외부 AI를 시작하지 않고 실제 배정 함수를 실행한다.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { buildVisualRealizationPrompt, getVisualRealizationPair, PROFILE_VISUAL_VARIATION_VERSION } from './profile-visual-engine.mjs';

export function createOfflineVisualRuntime(getHistory) {
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const between = (start, end) => {
        const a = source.indexOf(start);
        const b = source.indexOf(end, a);
        if (a < 0 || b <= a) throw new Error(`Missing offline boundary: ${start}`);
        return source.slice(a, b);
    };
    const assignment = between('function toVisualHistoryEntry(', 'function reserveGenerationHistory(');
    return vm.runInNewContext(`
        ${between('const TEMPLATE_GUIDES =', 'const IMAGE_QUALITY_PROFILES =')}
        function getTemplateGuide(type) { return TEMPLATE_GUIDES[type]; }
        ${between('function createVisualIdentity(', 'function buildVisualVariationPrompt(')}
        ${between('function buildVisualVariationPrompt(', 'function getPositiveIntegerEnv(')}
        ${assignment}
        ({ assignNovelVisualVariant, getVisualPair, buildVisualVariationPrompt, toVisualHistoryEntry, TAROT_CARD_TYPES, SCENE_ARCHETYPES, BASE_SCENE_ARCHETYPES, TEMPLATE_GUIDES, isSubjectCompatibleWithScene })
    `, { crypto, PROFILE_VISUAL_VARIATION_VERSION, getVisualRealizationPair, buildVisualRealizationPrompt, createAdditionalSceneArchetypes, createIncrementalIndex, increment,
        profileGenerationHistory: { getVisualAssignments: getHistory } });
}
