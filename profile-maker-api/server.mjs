import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PROFILE_API_PORT || 3100);
const DAILY_PROFILE_LIMIT = Number(process.env.DAILY_PROFILE_LIMIT || 50);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const TEXT_MODEL = process.env.TEXT_MODEL || 'gemini-3.1-flash-lite';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'gemini-2.5-flash-image';
const usageFilePath = path.join(__dirname, '.profile-usage.json');

const app = express();
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }
});

const TEMPLATE_GUIDES = {
    'tarot-ppt': {
        labelKo: '타로',
        labelEn: 'tarot',
        expertiseGuide: '타로 카드가 보여주는 관계 흐름, 상대방의 속마음, 선택의 갈림길, 현재 감정의 결을 중심으로 전문성을 표현한다.',
        pointFallbacks: ['상대방의 속마음과 관계 흐름을 섬세하게 해석', '현재 감정의 결을 카드 상징으로 정리', '선택의 갈림길에서 참고할 현실적인 방향 제시'],
        cardFallbackTitle: '카드가 짚어내는 관계의 흐름',
        cardFallbackBody: '타로는 현재 감정의 위치와 관계의 변화를 상징으로 읽어내는 상담입니다. 막연한 예측보다 지금 선택해야 할 방향과 마음의 흐름을 차분하게 정리합니다.',
        closingFallbackTitle: '흐릿한 마음에 선명한 방향을 더합니다',
        closingFallbackBody: '복잡하게 얽힌 고민도 하나씩 펼쳐보면 지금 필요한 선택이 보입니다. 부담 없이 마음을 정리할 수 있도록 섬세한 리딩으로 돕겠습니다.',
        imageMood: 'soft tarot reader portrait, elegant Korean spiritual consultant, studio portrait, gentle lighting',
        moodScene: 'warm tarot reading table, candle light, elegant cards, premium editorial still life'
    },
    'saju-ppt': {
        labelKo: '사주',
        labelEn: 'saju',
        expertiseGuide: '사주의 타고난 기질, 대운과 세운의 흐름, 직업과 관계의 균형, 중요한 시기 판단을 중심으로 전문성을 표현한다.',
        pointFallbacks: ['타고난 기질과 성향을 바탕으로 한 분석', '대운과 세운의 흐름을 함께 살피는 해석', '직업, 관계, 변화 시기를 현실적으로 정리'],
        cardFallbackTitle: '사주의 큰 흐름과 현실적인 선택',
        cardFallbackBody: '사주는 타고난 성향과 시기의 흐름을 함께 살펴 현재의 고민을 구조적으로 이해하게 돕습니다. 직업, 관계, 재물, 변화의 때를 현실적인 언어로 풀어냅니다.',
        closingFallbackTitle: '지금의 운세 흐름을 차분히 정리합니다',
        closingFallbackBody: '흐름을 알면 막연한 불안보다 준비할 수 있는 선택이 선명해집니다. 사주의 균형을 바탕으로 현재와 다음 방향을 안정감 있게 안내합니다.',
        imageMood: 'professional saju consultant portrait, refined Korean fortune consultant, calm warm lighting, editorial portrait',
        moodScene: 'refined saju consultation desk, Korean traditional mood, elegant paper and pen, premium editorial still life'
    },
    'sinjeom-ppt': {
        labelKo: '신점',
        labelEn: 'sinjeom',
        expertiseGuide: '신점의 직관적 메시지, 막힌 흐름의 원인, 마음의 불안 정리, 현실에서 바로 참고할 수 있는 조언을 중심으로 전문성을 표현한다.',
        pointFallbacks: ['막힌 흐름의 원인을 직관적으로 짚는 상담', '불안한 마음을 현실적인 조언으로 정리', '지금 필요한 선택과 방향을 선명하게 제시'],
        cardFallbackTitle: '직관과 현실 조언이 만나는 신점',
        cardFallbackBody: '신점은 답답하게 막힌 흐름 속에서 놓치기 쉬운 신호를 짚어내는 상담입니다. 감각적인 메시지를 현실적인 조언으로 정리해 마음의 방향을 세웁니다.',
        closingFallbackTitle: '무거운 마음의 짐을 내려놓으세요',
        closingFallbackBody: '복잡한 상황일수록 지금 필요한 말과 방향이 중요합니다. 날카로운 직관과 따뜻한 해석으로 고민의 핵심을 차분히 풀어드립니다.',
        imageMood: 'confident Korean spiritual advisor portrait, premium studio portrait, calm warm light, elegant styling, trustworthy and refined',
        moodScene: 'Korean spiritual consultation room, warm candle light, elegant ritual table, premium editorial still life, mystical but clean'
    }
};

app.use(cors(FRONTEND_ORIGIN ? { origin: FRONTEND_ORIGIN } : undefined));
app.use(express.json({ limit: '2mb' }));
app.use('/vendor/html2canvas', express.static(path.join(__dirname, '..', 'node_modules', 'html2canvas', 'dist')));
app.use('/profile-maker', express.static(path.join(__dirname, '..', 'profile-maker')));
app.use(express.static(path.join(__dirname, '..', 'profile-maker')));

function getKstDateString() {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function loadUsage() {
    try {
        return JSON.parse(fs.readFileSync(usageFilePath, 'utf8'));
    } catch {
        return {};
    }
}

function saveUsage(usage) {
    fs.writeFileSync(usageFilePath, JSON.stringify(usage, null, 2), 'utf8');
}

function getUsageState() {
    const usage = loadUsage();
    const today = getKstDateString();
    const count = Number(usage[today] || 0);
    return { usage, today, count };
}

function incrementUsage() {
    const { usage, today, count } = getUsageState();
    usage[today] = count + 1;
    saveUsage(usage);
    return { used: usage[today], limit: DAILY_PROFILE_LIMIT };
}

function getTemplateGuide(templateType) {
    return TEMPLATE_GUIDES[templateType] || TEMPLATE_GUIDES['sinjeom-ppt'];
}

function hasContactGuidance(value) {
    return [
        /060[-\d]*/i,
        /고유\s*번호/,
        /상담\s*연결\s*안내/,
        /전화\s*연결/,
        /연결\s*후/,
        /번호를\s*입력/,
        /\b0번\b/,
        /문의\s*유도/,
        /예약/,
        /접속/
    ].some((pattern) => pattern.test(String(value || '')));
}

function cleanGeneratedProfile(profile, templateType) {
    if (!profile || typeof profile !== 'object') return profile;

    const guide = getTemplateGuide(templateType);
    const cleaned = { ...profile };

    if (hasContactGuidance(`${cleaned.cardTitle || ''}\n${cleaned.cardBody || ''}`)) {
        cleaned.cardTitle = guide.cardFallbackTitle;
        cleaned.cardBody = guide.cardFallbackBody;
    }

    if (Array.isArray(cleaned.bulletPoints) && cleaned.bulletPoints.some(hasContactGuidance)) {
        cleaned.bulletPoints = guide.pointFallbacks;
    }

    if (hasContactGuidance(`${cleaned.closingTitle || ''}\n${cleaned.closingBody || ''}`)) {
        cleaned.closingTitle = guide.closingFallbackTitle;
        cleaned.closingBody = guide.closingFallbackBody;
    }

    return cleaned;
}

function parseJsonResponse(rawText) {
    const trimmed = String(rawText || '').trim();
    const withoutFence = trimmed
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');
    return JSON.parse(withoutFence);
}

async function extractTextFromResponse(response) {
    if (!response) return '';
    if (typeof response.text === 'string') return response.text;
    if (typeof response.text === 'function') return await response.text();

    const candidates = response.candidates || [];
    const first = candidates[0];
    const parts = first?.content?.parts || [];
    return parts
        .filter((part) => typeof part.text === 'string')
        .map((part) => part.text)
        .join('');
}

async function generateJsonContent(prompt) {
    const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
            responseMimeType: 'application/json'
        }
    });

    return parseJsonResponse(await extractTextFromResponse(response));
}

function extractInlineImage(response) {
    const visited = new WeakSet();

    function walk(node) {
        if (!node || typeof node !== 'object') return null;
        if (visited.has(node)) return null;
        visited.add(node);

        if (node.inlineData?.data) return node.inlineData;
        if (node.inline_data?.data) return node.inline_data;

        if (Array.isArray(node)) {
            for (const item of node) {
                const found = walk(item);
                if (found) return found;
            }
            return null;
        }

        for (const value of Object.values(node)) {
            const found = walk(value);
            if (found) return found;
        }

        return null;
    }

    const inlineData = walk(response);
    if (!inlineData?.data) return '';

    const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
    return `data:${mimeType};base64,${inlineData.data}`;
}

function summarizeResponseForLog(response) {
    const candidates = response?.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    return {
        candidates: candidates.length,
        parts: parts.map((part) => ({
            hasText: Boolean(part?.text),
            hasInlineData: Boolean(part?.inlineData?.data || part?.inline_data?.data),
            mimeType: part?.inlineData?.mimeType || part?.inline_data?.mime_type || null
        }))
    };
}

function sanitizeExtraPrompt(value, maxLength = 700) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function decodeXmlEntities(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function extractSlideTexts(slideXml) {
    const matches = [...slideXml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)];
    return matches
        .map((match) => decodeXmlEntities(match[1]))
        .filter(Boolean);
}

function parsePptxBuffer(buffer) {
    const zip = new AdmZip(buffer);
    const slideEntries = zip
        .getEntries()
        .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
        .sort((a, b) => {
            const aNum = Number(a.entryName.match(/slide(\d+)\.xml/i)?.[1] || 0);
            const bNum = Number(b.entryName.match(/slide(\d+)\.xml/i)?.[1] || 0);
            return aNum - bNum;
        });

    const slides = slideEntries.map((entry, index) => {
        const xml = entry.getData().toString('utf8');
        const texts = extractSlideTexts(xml);
        return {
            index: index + 1,
            text: texts.join('\n')
        };
    }).filter((slide) => slide.text.trim());

    return {
        slides,
        combinedText: slides.map((slide) => `[slide ${slide.index}]\n${slide.text}`).join('\n\n')
    };
}

function parseXlsxBuffer(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: false,
            defval: ''
        });

        const lines = rows
            .map((row) => row.map((cell) => String(cell || '').trim()).filter(Boolean).join(' | '))
            .filter(Boolean);

        return {
            name: sheetName,
            text: lines.join('\n')
        };
    }).filter((sheet) => sheet.text.trim());

    return {
        sheets,
        combinedText: sheets.map((sheet) => `[sheet ${sheet.name}]\n${sheet.text}`).join('\n\n')
    };
}

async function generateProfileTextFromInput(payload) {
    const guide = getTemplateGuide(payload.templateType);
    const prompt = `
너는 한국어 상담사 소개 페이지 카피라이터다.
반드시 한국어로만 작성하고, 과장되거나 단정적인 표현은 피하면서도 매력적인 소개 문구를 만든다.
응답은 JSON만 반환하고 코드블록은 절대 사용하지 않는다.

입력 정보:
- 분야: ${guide.labelKo}
- 상담사명: ${payload.name}
- 전문분야: ${payload.specialty}
- 상담 톤: ${payload.tone}
- 경력/강점: ${payload.career}

분야별 전문 구성 방향:
${guide.expertiseGuide}

반드시 제외할 내용:
- 전화번호, 060 번호, 고유번호, 연결 후 0번 입력, 상담 연결 안내, 예약/문의 유도 문구를 쓰지 않는다.
- 상담을 신청하거나 연결하는 방법을 설명하지 않는다.
- headline은 12~18자 내외의 짧은 제목으로 쓰고, 최대 2줄 안에 들어갈 분량으로 작성한다.
- headline에 상담사 이름을 반복해서 넣지 않고, 쉼표로 긴 문장을 이어 쓰지 않는다.
- cardTitle/cardBody는 연결 안내가 아니라 ${guide.labelKo} 분야의 전문성, 상담 방식, 해석 강점을 꾸며서 설명한다.
- closingTitle/closingBody는 연락 유도 없이 브랜드 마무리 문구로 작성한다.

반환 스키마:
{
  "eyebrow": "짧은 브랜딩 문구",
  "headline": "메인 제목",
  "intro": "상단 소개 문단 2문장",
  "sectionTitle": "중간 섹션 제목",
  "sectionBody": "중간 설명 본문 2문장",
  "bulletPoints": ["${guide.labelKo} 전문 포인트 1", "${guide.labelKo} 전문 포인트 2", "${guide.labelKo} 전문 포인트 3"],
  "cardTitle": "${guide.labelKo} 전문성 카드 제목",
  "cardBody": "${guide.labelKo} 상담 방식과 해석 강점 설명 2문장",
  "closingTitle": "브랜드형 마무리 제목",
  "closingBody": "연락 안내 없이 신뢰감을 주는 마무리 설명 2문장"
}
`.trim();

    return cleanGeneratedProfile(await generateJsonContent(prompt), payload.templateType);
}

async function generateProfileTextFromPpt(payload, pptInfo) {
    const guide = getTemplateGuide(payload.templateType);
    const slideCount = Array.isArray(pptInfo?.slides) ? pptInfo.slides.length : 0;
    const sheetCount = Array.isArray(pptInfo?.sheets) ? pptInfo.sheets.length : 0;
    const itemCount = slideCount || sheetCount;
    const prompt = `
너는 한국어 상담사 소개 페이지를 구성하는 카피라이터다.
사용자가 업로드한 PPT의 내용에서 핵심 메시지를 추출해서, 상담사 소개 랜딩페이지용 문구로 다시 구성한다.
PPT 문장을 그대로 복사하지 말고, 소개 페이지 문체로 자연스럽게 재작성한다.
응답은 JSON만 반환하고 코드블록은 절대 사용하지 않는다.

분야: ${guide.labelKo}
슬라이드 수: ${itemCount}

분야별 전문 구성 방향:
${guide.expertiseGuide}

반드시 제외할 내용:
- PPT 원문에 전화번호, 060 번호, 고유번호, 연결 후 0번 입력, 상담 연결 안내가 있어도 결과에 포함하지 않는다.
- 예약, 문의, 전화 연결, 상담 신청 방법 같은 행동 유도 문구를 쓰지 않는다.
- cardTitle/cardBody는 연결 안내가 아니라 ${guide.labelKo} 분야의 전문성, 상담 방식, 해석 강점을 꾸며서 설명한다.
- closingTitle/closingBody는 연락 유도 없이 상담사의 분위기와 신뢰감을 정리하는 마무리로 작성한다.

PPT 원문:
${pptInfo.combinedText}

반환 스키마:
{
  "eyebrow": "짧은 브랜딩 문구",
  "headline": "메인 제목",
  "intro": "상단 소개 문단 2~3문장",
  "sectionTitle": "중간 섹션 제목",
  "sectionBody": "중간 설명 본문 2~3문장",
  "bulletPoints": ["${guide.labelKo} 전문 포인트 1", "${guide.labelKo} 전문 포인트 2", "${guide.labelKo} 전문 포인트 3"],
  "cardTitle": "${guide.labelKo} 전문성 카드 제목",
  "cardBody": "${guide.labelKo} 상담 방식과 해석 강점 설명 2문장",
  "closingTitle": "브랜드형 마무리 제목",
  "closingBody": "연락 안내 없이 신뢰감을 주는 마무리 설명 2문장"
}

추가 지침:
- headline은 12~18자 내외의 짧은 제목으로 쓰고, 최대 2줄 안에 들어갈 분량으로 작성한다.
- headline에 상담사 이름을 반복해서 넣지 않고, 쉼표로 긴 문장을 이어 쓰지 않는다.
- bulletPoints는 분야 전문성이 보이도록 짧고 읽기 쉽게 작성한다.
- 상담사 이름이 PPT에 드러나면 intro에 자연스럽게 녹여 넣는다.
`.trim();

    return cleanGeneratedProfile(await generateJsonContent(prompt), payload.templateType);
}

async function generateImage(prompt, imageKind) {
    const fallbackModels = [
        IMAGE_MODEL,
        'gemini-2.5-flash-image',
        'gemini-3.1-flash-image',
        'gemini-3-pro-image'
    ];
    const modelsToTry = [...new Set(fallbackModels.filter(Boolean))];
    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseModalities: ['TEXT', 'IMAGE']
                }
            });

            const imageDataUrl = extractInlineImage(response);
            if (!imageDataUrl) {
                console.warn(`[image] ${imageKind} image was not returned for model ${model}`, summarizeResponseForLog(response));
                continue;
            }

            console.log(`[image] ${imageKind} image generated successfully with model ${model}`);
            return imageDataUrl;
        } catch (error) {
            lastError = error;
            console.warn(`[image] ${imageKind} generation failed with model ${model}`, error?.message || error);
        }
    }

    throw lastError || new Error(`${imageKind} image generation failed for all configured models.`);
}

async function generatePortraitImage(payload, extraPrompt = '') {
    const guide = getTemplateGuide(payload.templateType);
    const safeExtraPrompt = sanitizeExtraPrompt(extraPrompt);
    const portraitPrompt = `
Create one premium portrait photo for a ${guide.labelEn} consultant profile page.
Reference style: ${payload.imageStyle || 'clean Korean studio portrait, premium consultation brand look'}
Extra context from uploaded material: ${safeExtraPrompt || 'Build a refined, calm, trustworthy profile portrait.'}

Requirements:
- realistic professional portrait
- one person only
- upper body framing
- calm confident expression
- premium website hero image quality
- no text
- no watermark
- do not depict horror, fear, ghosts, blood, weapons, or occult shock imagery
- keep the result elegant, polished, and suitable for a premium consultation brand
- ${guide.imageMood}
`.trim();

    return generateImage(portraitPrompt, 'portrait');
}

async function generateMoodImage(payload, extraPrompt = '') {
    const guide = getTemplateGuide(payload.templateType);
    const safeExtraPrompt = sanitizeExtraPrompt(extraPrompt);
    const moodPrompt = `
Create one premium editorial scene image for a ${guide.labelEn} consultant landing page.
Reference style: ${payload.imageStyle || 'soft editorial still life, premium brand image'}
Extra context from uploaded material: ${safeExtraPrompt || 'Build a scene image that supports the consultant story.'}

Requirements:
- no people
- no text
- no watermark
- warm, elegant, premium composition
- suitable as a supporting image on a profile page
- ${guide.moodScene}
`.trim();

    return generateImage(moodPrompt, 'mood');
}

async function generateBrandPosterText(payload) {
    const prompt = `
너는 한국어 밴드 홍보 포스터를 만드는 브랜드 마케터이자 카피라이터다.
입력된 업체 정보와 참고 내용을 바탕으로 세로형 홍보 포스터 문구를 구성한다.
과장된 표현은 줄이고, 업종과 제품 특징이 분명히 드러나게 작성한다.
응답은 JSON만 반환하고 코드블록은 절대 사용하지 않는다.

업체명: ${payload.brandName}
업종: ${payload.industry}
핵심 제품/서비스: ${payload.products}
업체 특징: ${payload.features}
타깃 고객: ${payload.targetAudience}
홍보 목적: ${payload.promoGoal}
브랜드 톤: ${payload.brandTone || '신뢰감 있고 정돈된 홍보 톤'}
참고 자료 요약: ${payload.referenceText || '없음'}

반환 스키마:
{
  "badge": "상단 짧은 배지 문구",
  "headline": "굵고 강한 메인 제목",
  "subheadline": "메인 제목을 보완하는 짧은 문장",
  "summary": "중간 설명 2~3문장",
  "highlight": "강조 박스 한 줄 문구",
  "bulletPoints": ["포인트 1", "포인트 2", "포인트 3"],
  "infoBlocks": [
    { "label": "항목명", "title": "짧은 제목", "description": "설명" },
    { "label": "항목명", "title": "짧은 제목", "description": "설명" },
    { "label": "항목명", "title": "짧은 제목", "description": "설명" },
    { "label": "항목명", "title": "짧은 제목", "description": "설명" }
  ],
  "closing": "하단 안내 문구",
  "cta": "문의/참여 유도 문구"
}

추가 지침:
- headline은 최대 2줄 정도 분량으로 간결하게 작성한다.
- bulletPoints는 밴드 홍보글에서 바로 읽히게 짧고 명확하게 쓴다.
- infoBlocks는 일정, 대상, 장소, 혜택 같은 실무형 정보 톤으로 작성한다.
- 업체 특성이 예시마다 분명히 달라 보이도록 업종 키워드를 자연스럽게 포함한다.
`.trim();

    return generateJsonContent(prompt);
}

async function regenerateProfileSlot(payload) {
    const guide = getTemplateGuide(payload.templateType);
    const currentProfileJson = JSON.stringify(payload.currentProfile || {}, null, 2);
    const slotInstructions = {
        headline: {
            schema: '{"headline":"메인 제목"}',
            instructions: '- headline만 다시 쓴다.\n- 기존 톤을 유지하되 더 선명하고 읽기 쉽게 만든다.\n- 1~2줄 분량으로 간결하게 쓴다.'
        },
        intro: {
            schema: '{"intro":"상단 소개 문단 2~3문장"}',
            instructions: '- intro만 다시 쓴다.\n- headline과 자연스럽게 이어지게 쓴다.\n- 상담사 소개 페이지 첫 인상에 맞게 신뢰감 있게 쓴다.'
        },
        bulletPoints: {
            schema: '{"bulletPoints":["핵심 포인트 1","핵심 포인트 2","핵심 포인트 3"]}',
            instructions: '- bulletPoints만 다시 쓴다.\n- 3개를 반환한다.\n- 실제 상담 포인트처럼 짧고 또렷하게 쓴다.'
        },
        closing: {
            schema: '{"closingTitle":"마무리 제목","closingBody":"마무리 설명 2문장"}',
            instructions: '- closingTitle과 closingBody만 다시 쓴다.\n- 전체 내용을 정리하되 연락, 예약, 상담 연결 안내 없이 신뢰감 있는 마무리 톤으로 쓴다.'
        }
    };

    const config = slotInstructions[payload.slotKey];
    if (!config) {
        throw new Error('지원하지 않는 재생성 슬롯입니다.');
    }

    const prompt = `
너는 한국어 상담사 소개 페이지 카피라이터다.
현재 프로필 문맥을 유지하면서 요청된 슬롯만 다시 작성한다.
분야: ${guide.labelKo}
분야별 전문 구성 방향: ${guide.expertiseGuide}

현재 프로필 JSON:
${currentProfileJson}

재생성 대상: ${payload.slotKey}

반환 스키마:
${config.schema}

추가 지시:
${config.instructions}
- 응답은 JSON만 반환한다.
- 다른 슬롯은 절대 포함하지 않는다.
- 전화번호, 060 번호, 고유번호, 연결 후 0번 입력, 상담 연결 안내, 예약/문의 유도 문구는 절대 쓰지 않는다.
`.trim();

    return cleanGeneratedProfile(await generateJsonContent(prompt), payload.templateType);
}

async function generateBrandPosterImage(payload) {
    const posterPrompt = `
Create one premium promotional image for a Korean band marketing poster.
Brand name: ${payload.brandName}
Industry: ${payload.industry}
Products or service: ${payload.products}
Brand features: ${payload.features}
Target audience: ${payload.targetAudience}
Promotion goal: ${payload.promoGoal}
Brand tone: ${payload.brandTone || 'clean, trustworthy, modern'}
Logo mood hint: ${payload.logoMood || payload.brandTone || 'refined and brand-aligned'}
Reference style: ${payload.imageStyle || 'clean marketing poster illustration, polished brand visual'}

Requirements:
- no text
- no watermark
- suitable as the main visual for a vertical promotional poster
- polished, commercial, clean composition
- reflect the business category clearly
- keep the mood aligned with the supplied brand tone
- the image should immediately communicate the partner company's industry and main offer
- make the visual direction distinct for this business instead of generic stock imagery
- if the business is education, show a bright academic, classroom, study, or parent-information atmosphere
- if the business is beauty, show a premium skincare, clinic, cosmetic, or clean lifestyle atmosphere
- if the business is food, show ingredients, plated products, packaging, or warm dining mood
- if the business is finance, consulting, or professional service, show trust, order, premium desk, or modern office mood
- prioritize product or service relevance over abstract decoration
- leave enough clean space in the composition so the poster layout can sit on top
`.trim();

    return generateImage(posterPrompt, 'brand');
}

function validateUsage(res) {
    const { count } = getUsageState();
    if (count >= DAILY_PROFILE_LIMIT) {
        res.status(429).json({
            error: `오늘 생성 한도 ${DAILY_PROFILE_LIMIT}개를 모두 사용했습니다.`,
            usage: { used: count, limit: DAILY_PROFILE_LIMIT }
        });
        return false;
    }
    return true;
}

function validateApiKey(res) {
    if (!ai) {
        res.status(500).json({
            error: 'GEMINI_API_KEY가 설정되지 않았습니다. 서버의 .env 파일을 확인해주세요.'
        });
        return false;
    }
    return true;
}

function buildImageMeta(generateImageRequested, profileImage, moodImage, failures) {
    const filteredFailures = failures.filter(Boolean);
    const hasAnyImage = Boolean(profileImage || moodImage);

    if (!generateImageRequested) {
        return {
            requested: false,
            success: false,
            hasAnyImage: false,
            message: ''
        };
    }

    if (hasAnyImage) {
        return {
            requested: true,
            success: true,
            hasAnyImage: true,
            message: ''
        };
    }

    return {
        requested: true,
        success: false,
        hasAnyImage: false,
        message: filteredFailures[0] || '이미지 생성에 실패했습니다. 프로필 빌더에서 직접 이미지를 업로드해주세요.'
    };
}

function getReadableImageError(error) {
    const status = error?.status;
    const message = String(error?.message || '');

    if (status === 429 || message.includes('RESOURCE_EXHAUSTED') || message.includes('Quota exceeded')) {
        return 'AI 이미지 생성 한도를 초과했습니다. 프로필 빌더에서 직접 이미지를 업로드해주세요.';
    }

    if (status === 404 || message.includes('NOT_FOUND')) {
        return '현재 이미지 생성 모델을 사용할 수 없습니다. 프로필 빌더에서 직접 이미지를 업로드해주세요.';
    }

    return 'AI 이미지 생성에 실패했습니다. 프로필 빌더에서 직접 이미지를 업로드해주세요.';
}

app.get('/api/health', (_req, res) => {
    const { count } = getUsageState();
    res.json({
        ok: true,
        dailyLimit: DAILY_PROFILE_LIMIT,
        usedToday: count,
        hasApiKey: Boolean(GEMINI_API_KEY),
        imageModel: IMAGE_MODEL,
        textModel: TEXT_MODEL
    });
});

app.post('/api/generate-profile', async (req, res) => {
    const payload = req.body || {};
    const requiredFields = ['templateType', 'name', 'specialty', 'tone', 'career'];
    const missingField = requiredFields.find((field) => !payload[field] || !String(payload[field]).trim());

    if (missingField) {
        return res.status(400).json({ error: `${missingField} 값이 비어 있습니다.` });
    }

    if (!validateUsage(res) || !validateApiKey(res)) return;

    try {
        const profile = await generateProfileTextFromInput(payload);
        let profileImage = '';
        let moodImage = '';
        const imageFailures = [];

        if (payload.generateImage) {
            try {
                profileImage = await generatePortraitImage(payload, `${payload.name} / ${payload.specialty}`);
            } catch (imageError) {
                console.error('Portrait image generation failed:', imageError);
                imageFailures.push(getReadableImageError(imageError));
            }

            try {
                moodImage = await generateMoodImage(payload, `${payload.specialty} / ${payload.tone}`);
            } catch (imageError) {
                console.error('Mood image generation failed:', imageError);
                imageFailures.push(getReadableImageError(imageError));
            }
        }

        const usage = incrementUsage();
        res.json({
            profile: {
                ...profile,
                profileImage,
                moodImage
            },
            imageMeta: buildImageMeta(payload.generateImage, profileImage, moodImage, imageFailures),
            usage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'AI 생성 중 오류가 발생했습니다. 모델 설정 또는 API 키를 확인해주세요.'
        });
    }
});

app.post('/api/generate-from-ppt', upload.single('pptFile'), async (req, res) => {
    const payload = req.body || {};
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: '문서 파일이 업로드되지 않았습니다.' });
    }

    const lowerFileName = file.originalname.toLowerCase();
    const isPptx = lowerFileName.endsWith('.pptx');
    const isXlsx = lowerFileName.endsWith('.xlsx');

    if (!isPptx && !isXlsx) {
        return res.status(400).json({ error: '현재는 .pptx 와 .xlsx 형식만 지원합니다.' });
    }

    if (!validateUsage(res) || !validateApiKey(res)) return;

    try {
        const parsedDocument = isPptx ? parsePptxBuffer(file.buffer) : parseXlsxBuffer(file.buffer);
        const itemCount = isPptx ? parsedDocument.slides.length : parsedDocument.sheets.length;

        if (!itemCount) {
            return res.status(400).json({
                error: isPptx ? 'PPT에서 읽을 수 있는 텍스트를 찾지 못했습니다.' : '엑셀에서 읽을 수 있는 텍스트를 찾지 못했습니다.'
            });
        }

        const profile = await generateProfileTextFromPpt(payload, parsedDocument);
        let profileImage = '';
        let moodImage = '';
        const imageFailures = [];

        if (String(payload.generateImage) === 'true') {
            try {
                profileImage = await generatePortraitImage(payload, parsedDocument.combinedText.slice(0, 1500));
            } catch (imageError) {
                console.error('Portrait image generation failed:', imageError);
                imageFailures.push(getReadableImageError(imageError));
            }

            try {
                moodImage = await generateMoodImage(payload, parsedDocument.combinedText.slice(0, 1500));
            } catch (imageError) {
                console.error('Mood image generation failed:', imageError);
                imageFailures.push(getReadableImageError(imageError));
            }
        }

        const usage = incrementUsage();
        res.json({
            profile: {
                ...profile,
                profileImage,
                moodImage
            },
            imageMeta: buildImageMeta(String(payload.generateImage) === 'true', profileImage, moodImage, imageFailures),
            usage,
            meta: {
                fileType: isPptx ? 'pptx' : 'xlsx',
                slidesCount: isPptx ? itemCount : 0,
                sheetsCount: isXlsx ? itemCount : 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: isPptx ? 'PPT 분석 또는 AI 구성 중 오류가 발생했습니다.' : '엑셀 분석 또는 AI 구성 중 오류가 발생했습니다.'
        });
    }
});

app.post('/api/regenerate-profile-slot', async (req, res) => {
    const payload = req.body || {};

    if (!payload.templateType || !payload.slotKey || !payload.currentProfile) {
        return res.status(400).json({ error: 'templateType, slotKey, currentProfile 값이 필요합니다.' });
    }

    if (!validateUsage(res) || !validateApiKey(res)) return;

    try {
        const regenerated = await regenerateProfileSlot(payload);
        const usage = incrementUsage();
        res.json({
            profile: regenerated,
            usage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: '부분 재생성 중 오류가 발생했습니다.'
        });
    }
});

app.post('/api/generate-brand-poster', async (req, res) => {
    const payload = req.body || {};
    const requiredFields = ['brandName', 'industry', 'products', 'features', 'targetAudience', 'promoGoal'];
    const missingField = requiredFields.find((field) => !payload[field] || !String(payload[field]).trim());

    if (missingField) {
        return res.status(400).json({ error: `${missingField} 값이 비어 있습니다.` });
    }

    if (!validateUsage(res) || !validateApiKey(res)) return;

    try {
        const poster = await generateBrandPosterText(payload);
        let promoImage = '';
        const imageFailures = [];

        if (payload.generateImage) {
            try {
                promoImage = await generateBrandPosterImage(payload);
            } catch (imageError) {
                console.error('Brand poster image generation failed:', imageError);
                imageFailures.push(getReadableImageError(imageError));
            }
        }

        const usage = incrementUsage();
        res.json({
            poster: {
                ...poster,
                promoImage
            },
            imageMeta: buildImageMeta(payload.generateImage, promoImage, '', imageFailures),
            usage
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: '업체 이미지 생성 중 오류가 발생했습니다. 입력 정보와 API 설정을 확인해주세요.'
        });
    }
});

app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'profile-maker', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Profile builder server running on http://localhost:${PORT}`);
});
