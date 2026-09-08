// 테스트/오프라인 감사 전용: API 서버·환경 변수·외부 AI를 시작하지 않고 실제 배정 함수를 실행한다.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { getVisualRealizationPair, PROFILE_VISUAL_VARIATION_VERSION } from './profile-visual-engine.mjs';

export function createOfflineVisualRuntime(getHistory, { baseline = false } = {}) {
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const between = (start, end) => {
        const a = source.indexOf(start);
        const b = source.indexOf(end, a);
        if (a < 0 || b <= a) throw new Error(`Missing offline boundary: ${start}`);
        return source.slice(a, b);
    };
    let assignment = between('function toVisualHistoryEntry(', 'function reserveGenerationHistory(');
    if (baseline) {
        assignment = assignment.replace('const macroScore = scoreVisualMacroPair(pair, usageIndex);', 'const macroScore = 0;');
    }
    return vm.runInNewContext(`
        ${between('const TEMPLATE_GUIDES =', 'const IMAGE_QUALITY_PROFILES =')}
        function getTemplateGuide(type) { return TEMPLATE_GUIDES[type]; }
        ${between('function createVisualIdentity(', 'function buildVisualVariationPrompt(')}
        ${assignment}
        ({ assignNovelVisualVariant, getVisualPair, toVisualHistoryEntry, TAROT_CARD_TYPES })
    `, { crypto, PROFILE_VISUAL_VARIATION_VERSION, getVisualRealizationPair,
        profileGenerationHistory: { getVisualAssignments: getHistory } });
}
