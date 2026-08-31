import crypto from 'node:crypto';
import { sanitizeImagePromptContext } from './profile-image-context.mjs';

const TOPICS = {
    'tarot-ppt': [
        ['relationship-flow', ['관계', '연애', '상대', '속마음'], '관계의 현재 위치와 감정 변화'],
        ['hidden-emotion', ['속마음', '감정', '진심'], '겉으로 드러나지 않은 감정의 결'],
        ['choice-crossroad', ['선택', '갈림길', '결정'], '선택지마다 달라지는 흐름'],
        ['timing-change', ['시기', '언제', '변화'], '변화가 시작되는 시점과 징후'],
        ['reconnection', ['재회', '연락', '회복'], '멀어진 관계의 재정비 가능성'],
        ['new-relationship', ['새로운 인연', '만남', '인연'], '새 관계를 맞이하는 마음의 준비'],
        ['career-choice', ['진로', '직장', '이직'], '일과 진로의 선택지 비교'],
        ['money-decision', ['재물', '금전', '사업'], '현실적인 금전 선택과 위험 신호'],
        ['inner-pattern', ['반복', '패턴', '내면'], '반복되는 감정과 선택의 패턴'],
        ['communication', ['대화', '소통', '오해'], '말하지 못한 마음과 소통의 방향'],
        ['conflict-release', ['갈등', '싸움', '충돌'], '갈등을 키우는 원인과 완화 지점'],
        ['self-recovery', ['회복', '자존감', '마음'], '지친 마음을 회복하는 과정'],
        ['opportunity', ['기회', '도전', '가능성'], '새 기회를 알아보는 상징과 단서'],
        ['boundary', ['거리', '경계', '정리'], '관계에서 지켜야 할 기준과 거리'],
        ['future-direction', ['미래', '앞으로', '방향'], '앞으로의 흐름을 읽는 현실적 기준'],
        ['action-step', ['행동', '실천', '방법'], '현재 바로 점검할 수 있는 작은 행동']
    ],
    'saju-ppt': [
        ['temperament', ['기질', '성향', '성격'], '타고난 기질과 행동 방식'],
        ['five-elements', ['오행', '균형', '기운'], '오행의 강약과 균형'],
        ['major-luck-cycle', ['대운', '큰 흐름'], '대운이 바꾸는 삶의 큰 흐름'],
        ['annual-luck', ['세운', '올해', '연운'], '해마다 달라지는 세운의 흐름'],
        ['career-fit', ['직업', '진로', '적성'], '기질과 맞는 직업 방향'],
        ['wealth-structure', ['재물', '금전', '사업'], '재물 흐름과 현실적인 관리 방식'],
        ['relationship-balance', ['연애', '관계', '인연'], '관계에서 드러나는 기질의 균형'],
        ['compatibility', ['궁합', '배우자', '상대'], '서로 다른 기질의 조화 방식'],
        ['change-timing', ['이직', '이사', '변화'], '변화를 준비하기 좋은 시기'],
        ['study-growth', ['공부', '시험', '성장'], '학습과 성장에 유리한 흐름'],
        ['family-flow', ['가족', '부모', '자녀'], '가족 관계에서의 역할과 균형'],
        ['strength-usage', ['강점', '재능', '장점'], '타고난 강점을 현실에서 쓰는 방법'],
        ['weakness-care', ['약점', '부족', '보완'], '부족한 기운을 생활에서 보완하는 방향'],
        ['seasonal-rhythm', ['계절', '시기', '절기'], '계절과 시기에 따른 컨디션 변화'],
        ['long-term-plan', ['계획', '장기', '미래'], '긴 흐름을 고려한 현실 계획'],
        ['decision-standard', ['선택', '결정', '판단'], '사주의 구조를 활용한 선택 기준']
    ],
    'sinjeom-ppt': [
        ['blocked-cause', ['막힘', '답답', '원인'], '현재 흐름을 막는 핵심 원인'],
        ['turning-signal', ['전환', '징후', '변화'], '전환점이 가까워졌음을 보여주는 징후'],
        ['relationship-heart', ['연애', '관계', '속마음'], '관계에서 놓치고 있는 마음의 신호'],
        ['family-concern', ['가족', '집안', '부모'], '가족과 생활 기반에서 생기는 고민'],
        ['career-block', ['직장', '진로', '이직'], '일의 흐름이 막히는 현실적인 지점'],
        ['money-flow', ['재물', '돈', '사업'], '재물과 사업 흐름에서 주의할 지점'],
        ['human-conflict', ['갈등', '사람', '대인'], '사람 사이에서 반복되는 충돌의 원인'],
        ['anxiety-release', ['불안', '걱정', '두려움'], '불안을 키우는 생각과 내려놓을 부분'],
        ['choice-clarity', ['선택', '결정', '갈림길'], '지금 우선해야 할 선택의 기준'],
        ['timing-read', ['시기', '언제', '때'], '움직일 때와 기다릴 때의 구분'],
        ['environment-change', ['이사', '이동', '환경'], '환경 변화가 흐름에 주는 영향'],
        ['relationship-cut', ['정리', '거리', '끊기'], '정리가 필요한 관계와 감정의 경계'],
        ['new-opening', ['기회', '새로운', '시작'], '새 흐름이 열리는 방향과 준비'],
        ['inner-truth', ['진심', '마음', '본심'], '스스로 외면했던 마음의 핵심'],
        ['reality-action', ['현실', '행동', '실천'], '현실에서 바로 바꿀 수 있는 행동'],
        ['calm-direction', ['방향', '앞으로', '해결'], '복잡한 상황을 정리하는 선명한 방향']
    ]
};

const LENSES = {
    'tarot-ppt': ['상징의 연결', '감정의 이동', '선택지 대비', '현재와 다음 흐름', '겉마음과 속마음', '반복 카드 패턴', '관계의 거리', '행동 전후 변화', '기회와 경고 신호', '내면 욕구', '현실 조건과 감정', '회복 가능성'],
    'saju-ppt': ['기질의 강약', '오행의 상생과 보완', '대운의 큰 방향', '세운의 시기 변화', '타고난 장점 활용', '부족한 요소 보완', '직업과 생활 균형', '관계 역할의 조화', '변화 시기의 준비', '장기 흐름과 단기 선택', '환경과 기질의 상호작용', '현실 실행 가능성'],
    'sinjeom-ppt': ['막힘의 근원', '현재 드러난 징후', '마음과 현실의 간극', '관계의 숨은 긴장', '전환 직전의 흐름', '지켜야 할 경계', '놓아야 할 집착', '생활 기반의 변화', '우선순위 재정리', '기다림과 행동의 구분', '불안의 실제 원인', '현실에서 확인할 단서']
};

const STRUCTURES = ['원인→현재→방향', '현재→숨은 배경→실천', '상황→두 선택지→기준', '고민→반복 패턴→전환', '강점→주의점→활용', '겉으로 보이는 흐름→내부 원인→정리', '과거 영향→현재 위치→다음 단계', '핵심 질문→해석→현실 조언', '막힘→풀리는 조건→행동', '기회→위험→균형점', '감정→관계→생활', '진단→우선순위→마무리'];
const EMPHASES = ['전문성', '상담 과정', '현실 적용', '정서적 안정', '선택 기준', '변화 준비', '관계 이해', '자기 이해', '위험 회피', '장기 방향'];
const OPENINGS = ['핵심 장면 제시', '현재 고민에서 시작', '반복 패턴 질문', '상반된 두 흐름 대비', '상담사의 관찰 방식 소개', '변화 징후 제시', '숨은 원인 제시', '현실 선택의 어려움 공감'];
const CLOSINGS = ['작은 행동으로 종결', '선택 기준으로 종결', '마음의 안정으로 종결', '장기 방향으로 종결', '경계와 균형으로 종결', '준비할 시점으로 종결', '상담사의 태도로 종결', '스스로 확인할 질문으로 종결'];
const STYLES = ['분석형', '서사형', '진단형', '질문 유도형', '대비형', '단계 진행형', '패턴 해석형', '시기 중심형', '공감형', '단정한 안내형', '차분한 전문가형', '실천 가이드형', '다층 해석형', '미니멀형', '따뜻한 상담형', '근거 정리형', '전환점형', '균형형', '성찰형', '브랜드 에디토리얼형'];

const CATEGORY_VOICE = {
    'tarot-ppt': '카드의 상징과 감정 이동을 연결하되 미래를 단정하지 않고 선택의 여지를 남긴다. 사주 용어와 신점식 계시 표현을 쓰지 않는다.',
    'saju-ppt': '타고난 구조와 시기의 흐름을 차분하고 분석적으로 설명한다. 카드 상징이나 신점식 직감·징조 표현을 쓰지 않는다.',
    'sinjeom-ppt': '핵심을 직관적으로 짚되 공포나 운명 단정을 피하고 현실에서 확인할 방향으로 연결한다. 카드와 대운·세운 중심 설명을 쓰지 않는다.'
};

const CATEGORY_LANGUAGE = {
    'tarot-ppt': {
        fallbackTopicIndex: 15,
        fallbackTopic: '카드 상징으로 현재 고민의 위치와 선택지를 폭넓게 정리',
        evidence: '카드 배열과 상징의 연결을',
        focus: '감정 이동과 선택지의 차이에',
        openingBasis: '현재 펼쳐진 카드가 보여주는 장면',
        closingBasis: '내담자가 선택할 수 있는 현실 기준',
        styleBasis: '상징을 해석하되 미래를 단정하지 않는 리딩 문체',
        preferredWords: ['카드', '상징', '배열', '감정 이동', '선택지'],
        excludedWords: ['오행', '대운', '세운', '신령', '계시', '신내림']
    },
    'saju-ppt': {
        fallbackTopicIndex: 15,
        fallbackTopic: '타고난 기질과 시기 흐름을 폭넓게 살펴 현실적인 선택 기준 정리',
        evidence: '타고난 기질·오행 구성과 대운·세운의 변화를',
        focus: '구조의 균형과 장단기 시기에',
        openingBasis: '타고난 구성과 현재 운의 조건',
        closingBasis: '기질과 시기에 맞춘 준비 기준',
        styleBasis: '구조와 시기를 차분하게 설명하는 분석 문체',
        preferredWords: ['기질', '오행', '구조', '균형', '대운·세운', '시기'],
        excludedWords: ['타로 카드', '카드 배열', '리딩', '신령', '계시', '신내림']
    },
    'sinjeom-ppt': {
        fallbackTopicIndex: 15,
        fallbackTopic: '현재 막힘의 핵심과 우선 확인할 현실 방향을 직관적으로 정리',
        evidence: '현재 드러난 징후와 직관적으로 포착한 핵심을',
        focus: '막힘의 원인과 현실에서 확인할 전환점에',
        openingBasis: '지금 두드러지는 징후와 고민의 핵심',
        closingBasis: '당장 지킬 경계와 우선 확인할 방향',
        styleBasis: '핵심을 선명하게 짚되 공포와 운명 단정을 피하는 문체',
        preferredWords: ['직관', '징후', '막힘의 원인', '전환점', '경계', '확인할 방향'],
        excludedWords: ['타로 카드', '카드 배열', '리딩', '오행', '대운', '세운']
    }
};

export const COPY_EXPRESSION_STYLE_COUNT = STYLES.length;
export const COPY_GROUP_COUNT_PER_CATEGORY = 16 * 12 * 12 * 10 * 8 * 8;
export const COPY_GROUP_COUNT_TOTAL = COPY_GROUP_COUNT_PER_CATEGORY * Object.keys(TOPICS).length;
export const COPY_VARIANT_COUNT_TOTAL = COPY_GROUP_COUNT_TOTAL * COPY_EXPRESSION_STYLE_COUNT;

function digestFor(value) {
    return crypto.createHash('sha256').update(String(value || '')).digest();
}

function pickRelevantTopic(topics, sourceText, digest, fallbackTopicIndex) {
    const normalized = String(sourceText || '').toLowerCase();
    const scores = topics.map((topic) => topic[1].reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0));
    const highest = Math.max(...scores);
    if (highest === 0) {
        return { topicIndex: fallbackTopicIndex, topicMatchMode: 'fallback' };
    }
    const candidates = scores.map((score, index) => score === highest ? index : -1).filter((index) => index >= 0);
    return {
        topicIndex: candidates[digest.readUInt32BE(0) % candidates.length],
        topicMatchMode: 'keyword'
    };
}

export function selectProfileCopyVariant({ templateType, sourceText = '', identity = '', recent = [] }) {
    const resolvedType = Object.hasOwn(TOPICS, templateType) ? templateType : 'sinjeom-ppt';
    const topics = TOPICS[resolvedType];
    const categoryLanguage = CATEGORY_LANGUAGE[resolvedType];
    const baseDigest = digestFor(`${resolvedType}\0${identity}\0${sourceText}`);
    const { topicIndex, topicMatchMode } = pickRelevantTopic(
        topics,
        sourceText,
        baseDigest,
        categoryLanguage.fallbackTopicIndex
    );
    const recentExact = new Set(recent.map((item) => item?.groupId).filter(Boolean));
    const recentSignatures = new Set(recent.slice(0, 10).map((item) => item?.signature).filter(Boolean));
    const recentStyleIds = new Set(recent.map((item) => item?.styleId).filter(Boolean));

    for (let attempt = 0; attempt < 512; attempt += 1) {
        const digest = digestFor(`${baseDigest.toString('hex')}\0${attempt}`);
        const lensIndex = digest.readUInt32BE(0) % LENSES[resolvedType].length;
        const structureIndex = digest.readUInt32BE(4) % STRUCTURES.length;
        const emphasisIndex = digest.readUInt32BE(8) % EMPHASES.length;
        const openingIndex = digest.readUInt32BE(12) % OPENINGS.length;
        const closingIndex = digest.readUInt32BE(16) % CLOSINGS.length;
        const styleIndex = digest.readUInt32BE(20) % STYLES.length;
        const groupId = `${resolvedType}:${topicIndex}:${lensIndex}:${structureIndex}:${emphasisIndex}:${openingIndex}:${closingIndex}`;
        const signature = `${resolvedType}:${topicIndex}:${lensIndex}:${structureIndex}`;
        const styleId = `style-${styleIndex + 1}`;
        if (recentExact.has(groupId) || recentSignatures.has(signature) || recentStyleIds.has(styleId)) continue;
        return { templateType: resolvedType, groupId, signature, styleId, topicIndex, topicMatchMode, lensIndex, structureIndex, emphasisIndex, openingIndex, closingIndex, styleIndex };
    }
    throw new Error('[copy-config] A non-repeating profile copy variant could not be selected.');
}

export function buildProfileCopyDirection(copyVariant) {
    const resolvedType = Object.hasOwn(TOPICS, copyVariant?.templateType) ? copyVariant.templateType : 'sinjeom-ppt';
    const categoryLanguage = CATEGORY_LANGUAGE[resolvedType];
    const topic = TOPICS[resolvedType][copyVariant?.topicIndex ?? 0];
    const topicDirection = copyVariant?.topicMatchMode === 'fallback'
        ? categoryLanguage.fallbackTopic
        : topic[2];
    return [
        `카테고리 고유 문체: ${CATEGORY_VOICE[resolvedType]}`,
        `핵심 상담 주제: ${topicDirection}`,
        `해석 관점: ${LENSES[resolvedType][copyVariant?.lensIndex ?? 0]}`,
        `글 전개 구조: ${categoryLanguage.evidence} 근거로 ${STRUCTURES[copyVariant?.structureIndex ?? 0]} 순서로 전개한다.`,
        `가장 강조할 가치: ${EMPHASES[copyVariant?.emphasisIndex ?? 0]}을 ${categoryLanguage.focus} 연결한다.`,
        `도입 방식: ${categoryLanguage.openingBasis}에서 ${OPENINGS[copyVariant?.openingIndex ?? 0]} 방식으로 시작한다.`,
        `마무리 방식: ${categoryLanguage.closingBasis}을 중심으로 ${CLOSINGS[copyVariant?.closingIndex ?? 0]} 방식으로 끝맺는다.`,
        `표현 방식: ${STYLES[copyVariant?.styleIndex ?? 0]}을 유지하되 ${categoryLanguage.styleBasis}를 사용한다.`,
        `권장 핵심 어휘: ${categoryLanguage.preferredWords.join(', ')} 중 문맥에 맞는 표현을 결과 전체에 2개 이상 자연스럽게 사용한다.`,
        `교차 카테고리 금지 어휘: ${categoryLanguage.excludedWords.join(', ')}를 결과 문구에 사용하지 않는다.`,
        '공통적인 "흐름·방향·현실적인 조언"만 반복하지 말고, 해당 카테고리의 해석 근거가 각 본문과 핵심 포인트에 드러나게 한다.',
        '입력 자료에 없는 경력, 상담 사례, 세부 전문 주제는 만들어내지 않는다.',
        '각 슬롯은 앞 슬롯을 바꾸어 말하지 말고 서로 다른 정보를 담당한다.'
    ].join('\n');
}

export function sanitizeProfileReferenceText(value, maxLength = 3000) {
    return sanitizeImagePromptContext(value, maxLength)
        .replace(/(?:이전|위의|기존)\s*(?:지시|명령|규칙)[을를]?\s*(?:무시|잊어)(?:하고|하며)?/gi, ' ')
        .replace(/(?:system|assistant|developer)\s*(?:prompt|message)?\s*[:：]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, Math.max(Number(maxLength) || 0, 0));
}

export function getProfileCopyConfigurationSummary() {
    return {
        categories: Object.keys(TOPICS).length,
        groupsPerCategory: COPY_GROUP_COUNT_PER_CATEGORY,
        groupsTotal: COPY_GROUP_COUNT_TOTAL,
        expressionStyles: COPY_EXPRESSION_STYLE_COUNT,
        variantsTotal: COPY_VARIANT_COUNT_TOTAL
    };
}
