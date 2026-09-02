document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('pb-app');
    const canvas = document.getElementById('pb-canvas');
    const tools = document.querySelectorAll('.pb-tool');
    const themeButtons = document.querySelectorAll('.pb-theme-btn');
    const imageUploader = document.getElementById('pb-image-uploader');
    const pptTemplate = document.getElementById('pb-ppt-template');
    const pptTarotCardTypeField = document.getElementById('pb-ppt-tarot-card-type-field');
    const pptTarotCardType = document.getElementById('pb-ppt-tarot-card-type');
    const pptFile = document.getElementById('pb-ppt-file');
    const pptFileSummary = document.getElementById('pb-ppt-file-summary');
    const pptReferenceText = document.getElementById('pb-ppt-reference-text');
    const pptImageStyle = document.getElementById('pb-ppt-image-style');
    const pptReferenceImages = document.getElementById('pb-ppt-reference-images');
    const pptReferencePreview = document.getElementById('pb-ppt-reference-preview');
    const pptImageQuality = document.getElementById('pb-ppt-image-quality');
    const pptGenerateImage = document.getElementById('pb-ppt-generate-image');
    const pptGenerateImageHelp = document.getElementById('pb-ppt-generate-image-help');
    const pptGenerateButton = document.getElementById('pb-ppt-generate-btn');
    const pptStatus = document.getElementById('pb-ppt-status');
    const pptImageIssue = document.getElementById('pb-ppt-image-issue');

    const aiTemplate = document.getElementById('pb-ai-template');
    const aiTarotCardTypeField = document.getElementById('pb-ai-tarot-card-type-field');
    const aiTarotCardType = document.getElementById('pb-ai-tarot-card-type');
    const aiName = document.getElementById('pb-ai-name');
    const aiSpecialty = document.getElementById('pb-ai-specialty');
    const aiTone = document.getElementById('pb-ai-tone');
    const aiCareer = document.getElementById('pb-ai-career');
    const aiReferenceText = document.getElementById('pb-ai-reference-text');
    const aiImageStyle = document.getElementById('pb-ai-image-style');
    const aiReferenceImages = document.getElementById('pb-ai-reference-images');
    const aiReferencePreview = document.getElementById('pb-ai-reference-preview');
    const aiImageQuality = document.getElementById('pb-ai-image-quality');
    const aiGenerateImage = document.getElementById('pb-ai-generate-image');
    const aiGenerateImageHelp = document.getElementById('pb-ai-generate-image-help');
    const aiGenerateButton = document.getElementById('pb-ai-generate-btn');
    const aiStatus = document.getElementById('pb-ai-status');
    const aiImageIssue = document.getElementById('pb-ai-image-issue');
    const fontFamilySelect = document.getElementById('pb-font-family');
    const titleSizeInput = document.getElementById('pb-title-size');
    const bodySizeInput = document.getElementById('pb-body-size');
    const pointSizeInput = document.getElementById('pb-point-size');
    const lineHeightInput = document.getElementById('pb-line-height');
    const titleSizeValue = document.getElementById('pb-title-size-value');
    const bodySizeValue = document.getElementById('pb-body-size-value');
    const pointSizeValue = document.getElementById('pb-point-size-value');
    const lineHeightValue = document.getElementById('pb-line-height-value');
    const historyList = document.getElementById('pb-history-list');
    const historyEmpty = document.getElementById('pb-history-empty');
    const slotStatus = document.getElementById('pb-slot-status');
    const slotRegenerateButtons = Array.from(document.querySelectorAll('.pb-slot-regenerate-btn'));

    const previewModal = document.getElementById('pb-modal');
    const previewArea = document.getElementById('pb-preview-area');
    const codeModal = document.getElementById('pb-code-modal');
    const codeOutput = document.getElementById('pb-code-output');
    const copyButton = document.getElementById('pb-copy-btn');
    const codeGenerateButton = document.getElementById('pb-code-generate-btn');
    const codeDownloadButton = document.getElementById('pb-code-download-btn');
    const downloadAllImagesButton = document.getElementById('pb-download-all-images-btn');
    const exportButton = document.getElementById('pb-export-btn');
    const downloadPortraitButton = document.getElementById('pb-download-portrait-btn');
    const downloadMoodButton = document.getElementById('pb-download-mood-btn');
    const portraitAssetState = document.getElementById('pb-portrait-asset-state');
    const moodAssetState = document.getElementById('pb-mood-asset-state');
    const portraitSiteUrlInput = document.getElementById('pb-portrait-site-url');
    const moodSiteUrlInput = document.getElementById('pb-mood-site-url');
    const embedImagesInCodeInput = document.getElementById('pb-embed-images-in-code');
    const portraitPromptGuide = document.getElementById('pb-portrait-prompt-guide');
    const moodPromptGuide = document.getElementById('pb-mood-prompt-guide');
    const imageAssetsStatus = document.getElementById('pb-image-assets-status');
    const promptCopyButtons = Array.from(document.querySelectorAll('.pb-copy-prompt-btn'));
    let currentUploadTargetImg = null;
    let currentUploadPlaceholder = null;
    let currentBrandColor = '#C21129';
    let currentBrandBg = '#f8f7f5';
    let currentBrandLight = '#fbe6e8';
    let lastProfileDownloadName = 'profile-builder';
    let activeProfileCopyMeta = null;
    let activeProfileReferenceText = '';
    const PROFILE_HISTORY_KEY = 'pb-profile-history-v1';
    const MAX_PROFILE_HISTORY = 8;
    const MAX_REFERENCE_IMAGES = 3;
    const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;
    const MAX_DOCUMENT_FILES = 5;
    const MAX_DOCUMENT_TOTAL_BYTES = 25 * 1024 * 1024;
    const referenceFiles = { ppt: [], ai: [] };
    const defaultTypography = {
        fontFamily: `'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`,
        titleSize: 66,
        bodySize: 35,
        pointSize: 35,
        lineHeight: 1.7
    };
    const siteTypography = {
        titleSize: '42px',
        bodySize: '20px',
        pointSize: '20px',
        chipSize: '20px',
        eyebrowSize: '12px',
        lineHeight: '1.65'
    };

    const templates = {
        'tarot-ppt': {
            theme: 'pb-theme-tarot',
            variant: 'tarot',
            eyebrow: 'Tarot Editorial',
            headline: '타로를 보면, 숨겨진 마음의 결이 보입니다',
            intro: '타로를 통해 관계와 감정의 흐름을 읽고, 지금 필요한 방향을 차분하게 정리합니다.',
            sectionTitle: '타로 리딩이 선명하게 짚어내는 것',
            sectionBody: '속마음과 관계 흐름처럼 말로 설명하기 어려운 감정의 결을 카드 상징으로 풀어냅니다. 현재 상황의 핵심과 선택의 방향을 함께 정리하는 데 강점이 있습니다.',
            points: ['상대방의 속마음과 관계 흐름을 섬세하게 해석', '현재 감정의 결을 카드 상징으로 정리', '선택의 갈림길에서 참고할 현실적인 방향 제시'],
            cardTitle: '카드가 짚어내는 관계의 흐름',
            cardBody: '타로는 현재 감정의 위치와 관계의 변화를 상징으로 읽어내는 상담입니다. 막연한 예측보다 지금 선택해야 할 방향과 마음의 흐름을 차분하게 정리합니다.',
            closingTitle: '흐릿한 마음에 선명한 방향을 더합니다',
            closingBody: '복잡하게 얽힌 고민도 하나씩 펼쳐보면 지금 필요한 선택이 보입니다. 부담 없이 마음을 정리할 수 있도록 섬세한 리딩으로 돕겠습니다.',
            portraitPlaceholder: '타로 상담사 프로필 이미지',
            moodPlaceholder: '타로 무드 이미지'
        },
        'saju-ppt': {
            theme: 'pb-theme-saju',
            variant: 'saju',
            eyebrow: 'Saju Editorial',
            headline: '사주의 흐름을 읽고, 지금의 방향을 정리합니다',
            intro: '사주의 기운과 흐름을 바탕으로 현재 고민을 구조적으로 정리하고 현실적인 방향을 제안합니다.',
            sectionTitle: '사주가 보여주는 기질과 시기의 균형',
            sectionBody: '직업, 진로, 관계, 재물처럼 흐름을 보고 판단해야 하는 고민에 특히 잘 맞는 상담입니다. 타고난 성향과 현재 운의 변화를 함께 살펴 선택의 기준을 세웁니다.',
            points: ['타고난 기질과 성향을 바탕으로 한 분석', '대운과 세운의 흐름을 함께 살피는 해석', '직업, 관계, 변화 시기를 현실적으로 정리'],
            cardTitle: '사주의 큰 흐름과 현실적인 선택',
            cardBody: '사주는 타고난 성향과 시기의 흐름을 함께 살펴 현재의 고민을 구조적으로 이해하게 돕습니다. 직업, 관계, 재물, 변화의 때를 현실적인 언어로 풀어냅니다.',
            closingTitle: '지금의 운세 흐름을 차분히 정리합니다',
            closingBody: '흐름을 알면 막연한 불안보다 준비할 수 있는 선택이 선명해집니다. 사주의 균형을 바탕으로 현재와 다음 방향을 안정감 있게 안내합니다.',
            portraitPlaceholder: '사주 상담사 프로필 이미지',
            moodPlaceholder: '사주 무드 이미지'
        },
        'sinjeom-ppt': {
            theme: 'pb-theme-sinjeom',
            variant: 'sinjeom',
            eyebrow: 'Sinjeom Editorial',
            headline: '신점은 답답한 마음의 방향을 비춰줍니다',
            intro: '복잡한 상황에서 놓치기 쉬운 신호를 차분하게 짚고, 지금 필요한 선택의 방향을 정리합니다.',
            sectionTitle: '신점이 특히 힘을 발휘하는 순간',
            sectionBody: '결정을 앞두고 있거나 답답한 흐름이 길어질 때, 마음의 중심을 다시 잡는 상담에 어울립니다. 직관적인 메시지를 현실적인 조언으로 풀어내 선택의 방향을 정리합니다.',
            points: ['막힌 흐름의 원인을 직관적으로 짚는 상담', '불안한 마음을 현실적인 조언으로 정리', '지금 필요한 선택과 방향을 선명하게 제시'],
            cardTitle: '직관과 현실 조언이 만나는 신점',
            cardBody: '신점은 답답하게 막힌 흐름 속에서 놓치기 쉬운 신호를 짚어내는 상담입니다. 감각적인 메시지를 현실적인 조언으로 정리해 마음의 방향을 세웁니다.',
            closingTitle: '무거운 마음의 짐을 내려놓으세요',
            closingBody: '복잡한 상황일수록 지금 필요한 말과 방향이 중요합니다. 날카로운 직관과 따뜻한 해석으로 고민의 핵심을 차분히 풀어드립니다.',
            portraitPlaceholder: '신점 상담사 프로필 이미지',
            moodPlaceholder: '신점 무드 이미지'
        }
    };

    function setStatus(target, message, type = 'idle') {
        if (!target) return;
        target.textContent = message;
        target.dataset.state = type;
    }

    function loadProfileHistory() {
        try {
            const raw = window.localStorage.getItem(PROFILE_HISTORY_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveProfileHistory(items) {
        try {
            window.localStorage.setItem(PROFILE_HISTORY_KEY, JSON.stringify(items.slice(0, MAX_PROFILE_HISTORY)));
        } catch (error) {
            console.warn('Failed to save profile history', error);
        }
    }

    function renderProfileHistory() {
        if (!historyList || !historyEmpty) return;

        const items = loadProfileHistory();
        historyList.innerHTML = '';
        historyEmpty.hidden = items.length > 0;

        items.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'pb-history-item';
            card.innerHTML = `
                <div class="pb-history-item-head">
                    <strong>${item.title}</strong>
                    <time>${item.createdAtLabel}</time>
                </div>
                <p>${item.summary}</p>
                <button class="pb-action-btn secondary" type="button">다시 불러오기</button>
            `;

            card.querySelector('button')?.addEventListener('click', () => restoreProfileHistoryItem(item.id));
            historyList.appendChild(card);
        });
    }

    function getCurrentPresentationPayload(element = canvas.querySelector('.pb-presentation')) {
        if (!element) return null;

        const getText = (slot) => element.querySelector(`[data-slot="${slot}"]`)?.innerText?.trim() || '';
        const bulletPoints = Array.from(element.querySelectorAll('[data-slot="bulletPoints"] li'))
            .map((item) => item.innerText.trim())
            .filter(Boolean);

        return {
            eyebrow: getText('eyebrow'),
            headline: getText('headline'),
            intro: getText('intro'),
            sectionTitle: getText('sectionTitle'),
            sectionBody: getText('sectionBody'),
            bulletPoints,
            cardTitle: getText('cardTitle'),
            cardBody: getText('cardBody'),
            closingTitle: getText('closingTitle'),
            closingBody: getText('closingBody')
        };
    }

    function storeProfileHistoryItem({ source, templateType, tarotCardType = '', profile, nameHint, imageMode, imageQuality = 'standard', copyMeta = null, referenceText = '' }) {
        if (!profile) return;

        const now = new Date();
        const createdAtLabel = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const sourceLabel = source === 'document' ? '문서 생성' : '직접 입력';
        const summary = [profile.headline, profile.sectionTitle].filter(Boolean).join(' · ');

        const item = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            source,
            templateType,
            tarotCardType,
            imageMode,
            imageQuality,
            copyMeta,
            referenceText,
            title: `${nameHint || '프로필'} / ${sourceLabel}`,
            summary: summary || '저장된 프로필 결과',
            createdAtLabel,
            profile
        };

        const history = loadProfileHistory();
        const next = [item, ...history.filter((historyItem) => historyItem.summary !== item.summary || historyItem.title !== item.title)];
        saveProfileHistory(next);
        renderProfileHistory();
    }

    function restoreProfileHistoryItem(historyId) {
        const item = loadProfileHistory().find((historyEntry) => historyEntry.id === historyId);
        if (!item) return;

        const templateConfig = templates[item.templateType];
        if (!templateConfig) return;

        applyTheme(templateConfig.theme);
        if (pptTemplate) pptTemplate.value = item.templateType;
        if (aiTemplate) aiTemplate.value = item.templateType;
        if (item.tarotCardType) {
            if (pptTarotCardType) pptTarotCardType.value = item.tarotCardType;
            if (aiTarotCardType) aiTarotCardType.value = item.tarotCardType;
        }
        if (aiGenerateImage) aiGenerateImage.checked = Boolean(item.imageMode);
        if (pptGenerateImage) pptGenerateImage.checked = Boolean(item.imageMode);
        if (aiImageQuality) aiImageQuality.value = item.imageQuality || 'standard';
        if (pptImageQuality) pptImageQuality.value = item.imageQuality || 'standard';
        activeProfileCopyMeta = item.copyMeta || null;
        activeProfileReferenceText = item.referenceText || '';
        if (pptReferenceText) pptReferenceText.value = activeProfileReferenceText;
        if (aiReferenceText) aiReferenceText.value = activeProfileReferenceText;
        updateImageGenerationControls();
        updateTarotCardTypeControls();

        const element = replaceCanvasWithElement(item.templateType);
        fillPresentation(element, item.profile);
        syncPresentationImageState(element, { textOnly: !item.imageMode });
        lastProfileDownloadName = item.title.split(' / ')[0] || 'profile-builder';
        resetProfileImageAssets();
        setStatus(imageAssetsStatus, '히스토리는 텍스트만 보관합니다. 필요한 이미지를 직접 업로드하면 다운로드와 사이트용 코드를 사용할 수 있습니다.');
        setStatus(aiStatus, '히스토리에서 저장된 프로필을 다시 불러왔습니다.', 'success');
        setStatus(pptStatus, '히스토리에서 저장된 프로필을 다시 불러왔습니다.', 'success');
        renderImageIssue(aiImageIssue, null);
        renderImageIssue(pptImageIssue, null);
        updateSlotRegenerateState();
    }

    function buildGenerationStatus(baseMessage, usage, imageMeta) {
        const usageMessage = usage
            ? ` ${usage.campaign ? '캠페인 누적' : '오늘 사용량'} ${usage.used}/${usage.limit}`
            : '';

        if (imageMeta?.requested && !imageMeta?.hasAnyImage) {
            const imageMessage = imageMeta.message || '이미지는 프로필 빌더에서 직접 업로드할 수 있습니다.';
            return `${baseMessage}${usageMessage} 텍스트는 정상 생성되었고, 이미지는 자동 생성되지 않아 직접 업로드로 이어서 작업할 수 있습니다. ${imageMessage}`;
        }

        return `${baseMessage}${usageMessage}`;
    }

    function getCurrentPresentationElement() {
        return canvas.querySelector('.pb-presentation');
    }

    function assertStandardProfileExport() {
        const presentation = getCurrentPresentationElement();
        const profileWrapper = presentation?.closest('.pb-element');
        const canvasElements = Array.from(canvas.children).filter((node) => node.classList.contains('pb-element'));
        if (!profileWrapper || canvasElements.length !== 1 || canvasElements[0] !== profileWrapper) {
            throw new Error('담당자별 동일한 폰트와 비율을 유지하려면 자동 생성 프로필만 남긴 뒤 저장해주세요. 수동 추가 블록은 함께 내보낼 수 없습니다.');
        }
    }

    function isCurrentProfileTextOnlyChoice() {
        return Boolean(getCurrentPresentationElement()?.classList.contains('is-text-only-choice'));
    }

    function updateSlotRegenerateState() {
        const hasPresentation = Boolean(getCurrentPresentationElement());
        slotRegenerateButtons.forEach((button) => {
            button.disabled = !hasPresentation;
        });
    }

    function renderImageIssue(panel, imageMeta) {
        if (!panel) return;

        if (!imageMeta?.requested) {
            panel.hidden = true;
            panel.innerHTML = '';
            return;
        }

        imageMeta = {
            ...imageMeta,
            hasAnyImage: imageMeta.success ?? imageMeta.hasAnyImage
        };

        const statusLabel = imageMeta.hasAnyImage ? '정상 생성' : '생성 이슈 발생';
        const summary = imageMeta.hasAnyImage
            ? '이미지 생성이 정상적으로 완료되었습니다.'
            : (imageMeta.message || '이미지 생성이 완료되지 않았습니다.');
        const actionHint = imageMeta.hasAnyImage
            ? '필요하면 이미지 영역을 눌러 직접 교체할 수 있습니다.'
            : '이미지 영역을 눌러 직접 업로드하거나 잠시 후 다시 시도해보세요.';

        panel.hidden = false;
        panel.innerHTML = `
            <div class="pb-issue-header">
                <strong>이미지 생성 상태</strong>
                <span class="pb-issue-badge ${imageMeta.hasAnyImage ? 'is-success' : 'is-warning'}">${statusLabel}</span>
            </div>
            <p class="pb-issue-summary">${summary}</p>
            <p class="pb-issue-action">${actionHint}</p>
            <div class="pb-issue-links">
                <a href="https://ai.dev/rate-limit" target="_blank" rel="noreferrer">Google AI Studio 사용량 확인</a>
                <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noreferrer">Gemini API 무료 티어 한도 보기</a>
            </div>
        `;
    }

    function getProfileAssetImage(kind, root = canvas) {
        const selector = kind === 'portrait'
            ? '.pb-presentation-portrait .pb-uploaded-img'
            : '.pb-presentation-photo .pb-uploaded-img';
        return root.querySelector(selector);
    }

    function hasImageSource(image) {
        return Boolean(image?.getAttribute('src'));
    }

    function syncProfileImageAssets() {
        const hasPortrait = hasImageSource(getProfileAssetImage('portrait'));
        const hasMood = hasImageSource(getProfileAssetImage('mood'));

        if (downloadPortraitButton) downloadPortraitButton.disabled = !hasPortrait;
        if (downloadMoodButton) downloadMoodButton.disabled = !hasMood;
        if (downloadAllImagesButton) downloadAllImagesButton.disabled = !(hasPortrait && hasMood);

        if (portraitAssetState) {
            portraitAssetState.textContent = hasPortrait ? '다운로드 가능' : '이미지 없음';
            portraitAssetState.classList.toggle('is-ready', hasPortrait);
        }
        if (moodAssetState) {
            moodAssetState.textContent = hasMood ? '다운로드 가능' : '이미지 없음';
            moodAssetState.classList.toggle('is-ready', hasMood);
        }
    }

    function resetProfileImageAssets({ clearGuide = true } = {}) {
        if (portraitSiteUrlInput) portraitSiteUrlInput.value = '';
        if (moodSiteUrlInput) moodSiteUrlInput.value = '';
        if (embedImagesInCodeInput) embedImagesInCodeInput.checked = false;
        if (clearGuide) {
            if (portraitPromptGuide) portraitPromptGuide.value = '';
            if (moodPromptGuide) moodPromptGuide.value = '';
        }
        setStatus(imageAssetsStatus, '프로필을 생성하면 이미지 다운로드와 사이트용 코드 기능을 사용할 수 있습니다.');
        syncProfileImageAssets();
    }

    function renderProfileImageGuide(imageGuide) {
        if (portraitPromptGuide) portraitPromptGuide.value = sanitizeDisplayedImagePrompt(imageGuide?.portrait?.prompt);
        if (moodPromptGuide) moodPromptGuide.value = sanitizeDisplayedImagePrompt(imageGuide?.mood?.prompt);
    }

    function sanitizeDisplayedImagePrompt(value) {
        return String(value || '')
            .replace(/&lt;\/?[A-Za-z][\s\S]{0,1000}?&gt;/gi, ' ')
            .replace(/<\/?[A-Za-z][^>]{0,1000}>/g, ' ')
            .replace(/(?:상담사\s*)?(?:고유\s*번호|상담\s*번호|전화\s*번호|연락처|대표\s*번호)\s*[:：#-]?\s*(?:[A-Za-z0-9_-]{2,})?/gi, ' ')
            .replace(/(?:\+?82[-.\s]?)?(?:\(0\d{1,2}\)|0\d{1,2})[-.\s]*\d{3,4}[-.\s]*\d{4}/g, ' ')
            .replace(/\b1[5-8]\d{2}[-.\s]*\d{4}\b/g, ' ')
            .replace(/\b0\d{9,10}\b/g, ' ')
            .replace(/\b(?:\d[\s,().-]*){7,12}\b/g, ' ')
            .replace(/연결\s*후\s*\d+\s*번(?:을)?\s*(?:입력|선택)?/g, ' ')
            .replace(/번호를\s*(?:입력|선택)/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/ *\n */g, '\n')
            .trim();
    }

    function sanitizeDownloadFileName(value) {
        return String(value || 'profile-builder')
            .trim()
            .replace(/[\\/:*?"<>|]+/g, '-')
            .replace(/\s+/g, '-')
            .slice(0, 80) || 'profile-builder';
    }

    function getDataUrlExtension(source) {
        const mimeType = String(source || '').match(/^data:(image\/[^;,]+)/i)?.[1]?.toLowerCase();
        if (mimeType === 'image/jpeg') return 'jpg';
        if (mimeType === 'image/webp') return 'webp';
        if (mimeType === 'image/gif') return 'gif';
        if (mimeType === 'image/svg+xml') return 'svg';
        if (mimeType === 'image/avif') return 'avif';
        return 'png';
    }

    function downloadProfileAsset(kind) {
        const image = getProfileAssetImage(kind);
        const source = image?.getAttribute('src') || '';
        if (!source) {
            setStatus(imageAssetsStatus, '다운로드할 이미지가 없습니다.', 'error');
            return;
        }

        const suffix = kind === 'portrait' ? 'profile' : 'mood';
        const link = document.createElement('a');
        link.href = source;
        link.download = `${sanitizeDownloadFileName(lastProfileDownloadName)}-${suffix}.${getDataUrlExtension(source)}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setStatus(imageAssetsStatus, `${kind === 'portrait' ? '대표' : '무드'} 이미지 다운로드를 시작했습니다. 이 작업은 AI 사용량을 증가시키지 않습니다.`, 'success');
    }

    function downloadAllProfileAssets() {
        const portraitImage = getProfileAssetImage('portrait');
        const moodImage = getProfileAssetImage('mood');
        if (!hasImageSource(portraitImage) || !hasImageSource(moodImage)) {
            setStatus(imageAssetsStatus, '대표 이미지와 무드 이미지가 모두 준비된 뒤 저장해주세요.', 'error');
            return;
        }

        downloadProfileAsset('portrait');
        downloadProfileAsset('mood');
        setStatus(imageAssetsStatus, '대표·무드 이미지 2개 저장을 시작했습니다. 이 작업은 AI 사용량을 증가시키지 않습니다.', 'success');
    }

    function normalizeSiteImageUrl(value, label) {
        const url = String(value || '').trim();
        if (!url) throw new Error(`${label}의 사이트 이미지 URL을 입력해주세요.`);
        if (/^\/(?!\/)[^\s"'<>]*$/.test(url)) return url;
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol === 'https:') return parsedUrl.href;
        } catch {
            // 아래의 공통 안내 문구로 처리한다.
        }
        throw new Error(`${label} URL은 https:// 주소 또는 /로 시작하는 사이트 내부 경로만 사용할 수 있습니다.`);
    }

    function replaceExportImageSources(clone) {
        const mappings = [
            {
                kind: 'portrait',
                label: '대표 이미지',
                input: portraitSiteUrlInput
            },
            {
                kind: 'mood',
                label: '무드 이미지',
                input: moodSiteUrlInput
            }
        ];

        mappings.forEach(({ kind, label, input }) => {
            const image = getProfileAssetImage(kind, clone);
            if (!hasImageSource(image)) return;
            image.setAttribute('src', normalizeSiteImageUrl(input?.value, label));
        });

        if (clone.querySelector('img[src^="data:image/"]')) {
            throw new Error('사이트 URL이 지정되지 않은 Base64 이미지가 남아 있습니다. 모든 이미지 URL을 입력하거나 Base64 포함 옵션을 선택해주세요.');
        }
    }

    async function copyPlainText(text) {
        if (!text) return false;
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-10000px';
            document.body.appendChild(textarea);
            textarea.select();
            let copied = false;
            try {
                copied = document.execCommand('copy');
            } catch {
                copied = false;
            }
            textarea.remove();
            return copied;
        }
    }

    function applyTheme(themeName) {
        appContainer.classList.remove('pb-theme-tarot', 'pb-theme-saju', 'pb-theme-sinjeom');
        appContainer.classList.add(themeName);

        const button = [...themeButtons].find((item) => item.dataset.theme === themeName);
        if (!button) return;

        themeButtons.forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        currentBrandColor = button.dataset.color;
        currentBrandBg = button.dataset.bg;

        if (currentBrandColor === '#6335B4') currentBrandLight = '#ece5f7';
        else if (currentBrandColor === '#D67A00') currentBrandLight = '#faecd6';
        else currentBrandLight = '#fbe6e8';
    }

    function applyTypographySettings() {
        const typography = getTypographySettings();

        canvas.style.setProperty('--pb-font-family', typography.fontFamily);
        canvas.style.setProperty('--pb-title-size', `${typography.titleSize}px`);
        canvas.style.setProperty('--pb-body-size', `${typography.bodySize}px`);
        canvas.style.setProperty('--pb-point-size', `${typography.pointSize}px`);
        canvas.style.setProperty('--pb-body-line-height', String(typography.lineHeight));
        canvas.style.setProperty('--pb-chip-size', `${typography.chipSize}px`);

        if (titleSizeValue) titleSizeValue.textContent = `${typography.titleSize}px`;
        if (bodySizeValue) bodySizeValue.textContent = `${typography.bodySize}px`;
        if (pointSizeValue) pointSizeValue.textContent = `${typography.pointSize}px`;
        if (lineHeightValue) lineHeightValue.textContent = typography.lineHeight.toFixed(1);
    }

    function getTypographySettings() {
        return {
            ...defaultTypography,
            chipSize: defaultTypography.bodySize
        };
    }

    function enhanceTypographySteppers() {
        [
            { input: titleSizeInput, step: 1 },
            { input: bodySizeInput, step: 1 },
            { input: pointSizeInput, step: 1 },
            { input: lineHeightInput, step: 0.1 }
        ].forEach(({ input, step }) => {
            if (!input || input.disabled || input.closest('.pb-range-control')) return;

            const control = document.createElement('div');
            control.className = 'pb-range-control';
            const decrease = document.createElement('button');
            const increase = document.createElement('button');

            decrease.type = 'button';
            increase.type = 'button';
            decrease.className = 'pb-range-step';
            increase.className = 'pb-range-step';
            decrease.textContent = '-';
            increase.textContent = '+';
            decrease.setAttribute('aria-label', '값 줄이기');
            increase.setAttribute('aria-label', '값 키우기');

            input.parentNode.insertBefore(control, input);
            control.appendChild(decrease);
            control.appendChild(input);
            control.appendChild(increase);

            const moveValue = (direction) => {
                const min = Number(input.min || 0);
                const max = Number(input.max || 100);
                const current = Number(input.value || 0);
                const next = Math.min(max, Math.max(min, current + direction * step));
                input.value = step < 1 ? next.toFixed(1) : String(Math.round(next));
                input.dispatchEvent(new Event('input', { bubbles: true }));
            };

            decrease.addEventListener('click', () => moveValue(-1));
            increase.addEventListener('click', () => moveValue(1));
        });
    }

    function bindTypographyControls() {
        enhanceTypographySteppers();
        [fontFamilySelect, titleSizeInput, bodySizeInput, pointSizeInput, lineHeightInput]
            .filter((control) => control && !control.disabled)
            .forEach((control) => {
                const eventName = control.tagName === 'SELECT' ? 'change' : 'input';
                control.addEventListener(eventName, applyTypographySettings);
            });
    }

    function setupCollapsibleSection(section, header, body, options = {}) {
        if (!section || !header || !body) return;

        section.classList.add('pb-collapsible');
        body.classList.add('pb-collapsible-body');

        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'pb-collapse-toggle';
        toggleButton.textContent = options.expanded ? '접기' : '펼치기';
        toggleButton.setAttribute('aria-expanded', options.expanded ? 'true' : 'false');

        header.appendChild(toggleButton);

        if (!options.expanded) {
            section.classList.add('is-collapsed');
        }

        toggleButton.addEventListener('click', () => {
            const collapsed = section.classList.toggle('is-collapsed');
            toggleButton.textContent = collapsed ? '펼치기' : '접기';
            toggleButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
    }

    function initializeCollapsibles() {
        const aiPanels = document.querySelectorAll('.pb-ai-panel');
        if (aiPanels[1]) {
            setupCollapsibleSection(
                aiPanels[1],
                aiPanels[1].querySelector('.pb-ai-header'),
                aiPanels[1].querySelector('.pb-ai-form')
            );
        }

        if (aiPanels[2]) {
            setupCollapsibleSection(
                aiPanels[2],
                aiPanels[2].querySelector('.pb-ai-header'),
                aiPanels[2].querySelector('.pb-ai-form')
            );
        }

        const paletteGroups = document.querySelectorAll('.pb-palette-group');
        paletteGroups.forEach((group) => {
            const title = group.querySelector('.pb-subtitle');
            const body = group.querySelector('.pb-tools-grid');
            if (!title || !body) return;

            const header = document.createElement('div');
            header.className = 'pb-group-header';
            title.parentNode.insertBefore(header, title);
            header.appendChild(title);

            setupCollapsibleSection(group, header, body);
        });
    }

    function hexToRgba(hex, alpha) {
        const normalized = String(hex || '').replace('#', '');
        if (normalized.length !== 6) return `rgba(194,17,41,${alpha})`;
        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function buildPresentationMarkup(type) {
        const template = templates[type];
        if (!template) return '';

        return `
            <section class="pb-presentation pb-presentation--${template.variant}" data-template-type="${type}">
                <div class="pb-presentation-hero">
                    <div class="pb-presentation-copy">
                        <h2 class="pb-presentation-title" contenteditable="true" data-slot="headline">${template.headline}</h2>
                        <p class="pb-presentation-intro" contenteditable="true" data-slot="intro">${template.intro}</p>
                    </div>
                    <div class="pb-presentation-portrait pb-image-uploadable">
                        <div class="pb-upload-placeholder">${template.portraitPlaceholder}</div>
                        <img class="pb-uploaded-img" src="" alt="${template.portraitPlaceholder}">
                    </div>
                </div>
                <div class="pb-presentation-section">
                    <div class="pb-presentation-chip" contenteditable="true" data-slot="sectionTitle">${template.sectionTitle}</div>
                    <p class="pb-presentation-body" contenteditable="true" data-slot="sectionBody">${template.sectionBody}</p>
                </div>
                <div class="pb-presentation-grid">
                    <div class="pb-presentation-card">
                        <h3 contenteditable="true" data-slot="cardTitle">${template.cardTitle}</h3>
                    </div>
                    <div class="pb-presentation-photo pb-image-uploadable">
                        <div class="pb-upload-placeholder">${template.moodPlaceholder}</div>
                        <img class="pb-uploaded-img" src="" alt="${template.moodPlaceholder}">
                    </div>
                    <div class="pb-presentation-detail">
                        <div class="pb-presentation-side">
                            <ul class="pb-presentation-points" data-slot="bulletPoints">
                                ${template.points.map((point) => `<li contenteditable="true">${point}</li>`).join('')}
                            </ul>
                        </div>
                        <p class="pb-presentation-card-body" contenteditable="true" data-slot="cardBody">${template.cardBody}</p>
                    </div>
                </div>
                <div class="pb-presentation-closing">
                    <h3 contenteditable="true" data-slot="closingTitle">${template.closingTitle}</h3>
                    <p contenteditable="true" data-slot="closingBody">${template.closingBody}</p>
                </div>
            </section>`;
    }

    function buildElementMarkup(type) {
        switch (type) {
            case 'hero':
                return `
                    <div class="profile_header" style="width:100%; padding:40px 0; background:${currentBrandBg}; text-align:center; border-radius:16px; margin-bottom:24px;">
                        <div class="pb-image-uploadable" style="display:inline-block; position:relative; cursor:pointer;">
                            <div class="pb-upload-placeholder" style="width:100px; height:100px; border-radius:50%; background:#eaeaea; border:3px solid ${currentBrandLight}; display:flex; align-items:center; justify-content:center; font-size:12px; color:#888;">사진 등록</div>
                            <img class="pb-uploaded-img" src="" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid ${currentBrandLight}; display:none;">
                        </div>
                        <div class="profile_name" style="margin-top:12px; font-size:28px; font-weight:800; color:#111;" contenteditable="true">상담사 이름</div>
                        <div class="profile_text" style="margin-top:8px; font-size:15px; font-weight:600; color:${currentBrandColor};" contenteditable="true">대표 소개 문구</div>
                    </div>`;
            case 'text':
                return `<div style="font-size:15px; padding:0 10px; margin-bottom:24px; color:#333; line-height:1.7;" contenteditable="true">본문 텍스트를 입력하세요.</div>`;
            case 'image':
                return `
                    <div class="pb-image-uploadable" style="width:100%; text-align:center; margin-bottom:24px; cursor:pointer;">
                        <div class="pb-upload-placeholder" style="width:100%; height:200px; background:#eaeaea; border:1px dashed #ccc; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#888;">클릭해서 이미지 업로드</div>
                        <img class="pb-uploaded-img" src="" style="width:100%; max-width:600px; border-radius:12px; display:none; margin:0 auto;">
                    </div>`;
            case 'divider':
                return `<hr style="border:none; border-top:1px solid #eaeaea; margin:40px auto; width:60%;">`;
            case 'spacer':
                return `<div style="height:40px;"></div>`;
            case 'tarot-ppt':
            case 'saju-ppt':
            case 'sinjeom-ppt':
                return buildPresentationMarkup(type);
            default:
                return '';
        }
    }

    function bindUploadables(root) {
        root.querySelectorAll('.pb-image-uploadable').forEach((uploadableArea) => {
            uploadableArea.addEventListener('click', function () {
                currentUploadTargetImg = this.querySelector('.pb-uploaded-img');
                currentUploadPlaceholder = this.querySelector('.pb-upload-placeholder');
                imageUploader.click();
            });
        });
    }

    function makeCanvasElement(type) {
        const markup = buildElementMarkup(type);
        if (!markup) return null;

        const element = document.createElement('div');
        element.className = 'pb-element';
        element.dataset.type = type;
        element.innerHTML = markup;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'pb-delete-btn';
        deleteButton.innerHTML = '×';
        deleteButton.type = 'button';
        deleteButton.addEventListener('click', () => {
            element.remove();
            syncProfileImageAssets();
        });
        element.appendChild(deleteButton);

        bindUploadables(element);
        return element;
    }

    function clearEmptyState() {
        const emptyState = canvas.querySelector('.pb-empty-state');
        if (emptyState) emptyState.remove();
    }

    function appendElement(type) {
        clearEmptyState();
        const element = makeCanvasElement(type);
        if (element) canvas.appendChild(element);
        return element;
    }

    function replaceCanvasWithElement(type) {
        canvas.innerHTML = '';
        const element = makeCanvasElement(type);
        if (element) canvas.appendChild(element);
        return element;
    }

    function fillPresentation(element, payload) {
        if (!element || !payload) return;

        const slotMap = {
            eyebrow: payload.eyebrow,
            headline: payload.headline,
            intro: payload.intro,
            sectionTitle: payload.sectionTitle,
            sectionBody: payload.sectionBody,
            cardTitle: payload.cardTitle,
            cardBody: payload.cardBody,
            closingTitle: payload.closingTitle,
            closingBody: payload.closingBody
        };

        Object.entries(slotMap).forEach(([slot, value]) => {
            if (!value) return;
            const node = element.querySelector(`[data-slot="${slot}"]`);
            if (node) {
                node.innerHTML = slot === 'headline'
                    ? String(value).replace(/\s+/g, ' ').trim()
                    : String(value).replace(/\n/g, '<br>');
            }
        });

        if (Array.isArray(payload.bulletPoints)) {
            const list = element.querySelector('[data-slot="bulletPoints"]');
            if (list) {
                list.innerHTML = payload.bulletPoints.map((item) => `<li contenteditable="true">${item}</li>`).join('');
            }
        }

        if (payload.profileImage) {
            const portrait = element.querySelector('.pb-presentation-portrait');
            const img = portrait?.querySelector('.pb-uploaded-img');
            const placeholder = portrait?.querySelector('.pb-upload-placeholder');
            if (img && placeholder) {
                img.src = payload.profileImage;
                img.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }

        if (payload.moodImage) {
            const mood = element.querySelector('.pb-presentation-photo');
            const img = mood?.querySelector('.pb-uploaded-img');
            const placeholder = mood?.querySelector('.pb-upload-placeholder');
            if (img && placeholder) {
                img.src = payload.moodImage;
                img.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }

        syncPresentationImageState(element);
    }

    function hasUploadedImage(container) {
        if (!container) return false;
        const img = container.querySelector('.pb-uploaded-img');
        return Boolean(img && img.getAttribute('src'));
    }

    function syncPresentationImageState(target, options = {}) {
        const presentation = target?.classList?.contains('pb-presentation')
            ? target
            : target?.querySelector?.('.pb-presentation') || target?.closest?.('.pb-presentation');

        if (!presentation) return;

        const hasPortrait = hasUploadedImage(presentation.querySelector('.pb-presentation-portrait'));
        const hasMood = hasUploadedImage(presentation.querySelector('.pb-presentation-photo'));
        const textOnly = Boolean(options.textOnly && !hasPortrait && !hasMood);
        const portraitNode = presentation.querySelector('.pb-presentation-portrait');
        const moodNode = presentation.querySelector('.pb-presentation-photo');

        presentation.classList.toggle('has-portrait-image', hasPortrait);
        presentation.classList.toggle('has-mood-image', hasMood);
        presentation.classList.toggle('is-text-only-choice', textOnly);

        if (portraitNode) portraitNode.style.display = textOnly ? 'none' : '';
        if (moodNode) moodNode.style.display = textOnly ? 'none' : '';
        if (canvas.contains(presentation)) syncProfileImageAssets();
    }

    function updateImageGenerationControls() {
        const profileImagesOn = Boolean(aiGenerateImage?.checked);
        const docImagesOn = Boolean(pptGenerateImage?.checked);

        if (aiGenerateImageHelp) {
            aiGenerateImageHelp.textContent = profileImagesOn
                ? (aiImageQuality?.value === 'premium'
                    ? '고급 모델로 정밀한 2K 브랜드 연출과 깊이 있는 장면을 생성합니다.'
                    : '일반 모델로 빠르고 자연스러운 1K 실사용 이미지를 생성합니다.')
                : '이미지 영역을 완전히 제외하고 텍스트만으로 완성형 프로필을 구성합니다.';
        }
        if (aiImageStyle) {
            aiImageStyle.disabled = !profileImagesOn;
            aiImageStyle.closest('.pb-ai-field')?.classList.toggle('is-disabled', !profileImagesOn);
        }
        if (aiImageQuality) {
            aiImageQuality.disabled = !profileImagesOn;
            aiImageQuality.closest('.pb-ai-field')?.classList.toggle('is-disabled', !profileImagesOn);
        }
        if (aiReferenceImages) {
            aiReferenceImages.disabled = !profileImagesOn;
            aiReferenceImages.closest('.pb-ai-field')?.classList.toggle('is-disabled', !profileImagesOn);
        }

        if (pptGenerateImageHelp) {
            pptGenerateImageHelp.textContent = docImagesOn
                ? (pptImageQuality?.value === 'premium'
                    ? '문서와 참고 이미지를 바탕으로 정밀한 2K 브랜드 장면 두 장을 생성합니다.'
                    : '문서 내용을 바탕으로 빠르고 자연스러운 1K 이미지 두 장을 생성합니다.')
                : '문서 내용을 텍스트 중심 랜딩형 프로필로만 구성합니다.';
        }
        if (pptImageStyle) {
            pptImageStyle.disabled = !docImagesOn;
            pptImageStyle.closest('.pb-ai-field')?.classList.toggle('is-disabled', !docImagesOn);
        }
        if (pptImageQuality) {
            pptImageQuality.disabled = !docImagesOn;
            pptImageQuality.closest('.pb-ai-field')?.classList.toggle('is-disabled', !docImagesOn);
        }
        if (pptReferenceImages) {
            pptReferenceImages.disabled = !docImagesOn;
            pptReferenceImages.closest('.pb-ai-field')?.classList.toggle('is-disabled', !docImagesOn);
        }

        document.querySelectorAll('.pb-toggle-group').forEach((group) => {
            const targetId = group.dataset.toggleTarget;
            const isOn = targetId === 'pb-ai-generate-image' ? profileImagesOn : docImagesOn;
            group.querySelectorAll('.pb-toggle-btn').forEach((button) => {
                button.classList.toggle('is-active', (button.dataset.value === 'on') === isOn);
            });
        });
    }

    function bindImageModeToggles() {
        document.querySelectorAll('.pb-toggle-group').forEach((group) => {
            const target = document.getElementById(group.dataset.toggleTarget);
            if (!target) return;

            group.querySelectorAll('.pb-toggle-btn').forEach((button) => {
                button.addEventListener('click', () => {
                    target.checked = button.dataset.value === 'on';
                    updateImageGenerationControls();
                });
            });
        });
    }

    function getCleanCanvasClone() {
        const clone = canvas.cloneNode(true);
        const empty = clone.querySelector('.pb-empty-state');
        if (empty) empty.remove();
        clone.querySelectorAll('.pb-delete-btn').forEach((button) => button.remove());
        clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));

        clone.querySelectorAll('.pb-image-uploadable').forEach((uploadable) => {
            const img = uploadable.querySelector('.pb-uploaded-img');
            const placeholder = uploadable.querySelector('.pb-upload-placeholder');
            if (!img || !img.src || img.src === window.location.href) {
                if (img) img.remove();
                if (placeholder) placeholder.remove();
                uploadable.setAttribute('data-export-empty-image', 'true');
            } else if (placeholder) {
                placeholder.remove();
                uploadable.removeAttribute('data-export-empty-image');
            }
        });

        const wrappers = clone.querySelectorAll('.pb-element');
        wrappers.forEach((wrapper) => {
            while (wrapper.firstChild) {
                wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
            }
            wrapper.parentNode.removeChild(wrapper);
        });

        return clone;
    }

    function setInlineStyles(element, styles) {
        if (!element) return;
        Object.entries(styles).forEach(([property, value]) => {
            element.style.setProperty(property, value);
        });
    }

    function setProtectedInlineStyles(element, styles) {
        if (!element) return;
        const protectedProperties = new Set([
            'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
            'width', 'max-width', 'min-width', 'height', 'min-height', 'aspect-ratio',
            'object-fit', 'object-position'
        ]);
        Object.entries(styles).forEach(([property, value]) => {
            element.style.setProperty(property, value, protectedProperties.has(property) ? 'important' : '');
        });
    }

    function normalizeExportRichText(root) {
        root.querySelectorAll('.pb-presentation-title, .pb-presentation-card h3, .pb-presentation-closing h3, .pb-presentation-intro, .pb-presentation-body, .pb-presentation-chip, .pb-presentation-card-body, .pb-presentation-closing p, .pb-presentation-points li').forEach((node) => {
            node.innerHTML = node.innerHTML
                .replace(/<(div|p)[^>]*>/gi, '<br>')
                .replace(/<\/(div|p)>/gi, '')
                .replace(/(<br>\s*){2,}/gi, '<br>')
                .replace(/^(<br>\s*)+|(<br>\s*)+$/gi, '');
            Array.from(node.querySelectorAll('*')).reverse().forEach((child) => {
                if (child.tagName === 'BR') return;
                child.replaceWith(...child.childNodes);
            });
        });
    }

    function compactExportFormattingWhitespace(root) {
        const structuralSelector = [
            '.pb-presentation',
            '.pb-presentation-hero',
            '.pb-presentation-copy',
            '.pb-presentation-portrait',
            '.pb-presentation-section',
            '.pb-presentation-grid',
            '.pb-presentation-card',
            '.pb-presentation-photo',
            '.pb-presentation-detail',
            '.pb-presentation-side',
            '.pb-presentation-closing'
        ].join(', ');
        const structuralContainers = [root, ...root.querySelectorAll(structuralSelector)];

        structuralContainers.forEach((container) => {
            Array.from(container.childNodes).forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) node.remove();
            });
        });
    }

    function updateTarotCardTypeControls() {
        const aiIsTarot = aiTemplate?.value === 'tarot-ppt';
        const pptIsTarot = pptTemplate?.value === 'tarot-ppt';

        if (aiTarotCardTypeField) aiTarotCardTypeField.hidden = !aiIsTarot;
        if (pptTarotCardTypeField) pptTarotCardTypeField.hidden = !pptIsTarot;
        if (aiTarotCardType) aiTarotCardType.disabled = !aiIsTarot;
        if (pptTarotCardType) pptTarotCardType.disabled = !pptIsTarot;
    }

    function stabilizeExportListMarkers(root) {
        root.querySelectorAll('.pb-presentation-points li').forEach((item) => {
            if (item.querySelector('.pb-export-point-marker')) return;
            const marker = document.createElement('span');
            marker.className = 'pb-export-point-marker';
            marker.setAttribute('aria-hidden', 'true');
            item.prepend(marker);
        });
    }

    function appendProfileExportCaptureStyles(root) {
        if (root.querySelector('[data-pb-export-capture-style]')) return;

        const style = document.createElement('style');
        style.setAttribute('data-pb-export-capture-style', 'true');
        style.textContent = `
            .pb-export-capture,
            .pb-export-capture * {
                box-sizing: border-box !important;
            }

            .pb-export-capture .pb-presentation-points li::before {
                content: none !important;
                display: none !important;
            }

            .pb-export-capture .pb-upload-placeholder,
            .pb-export-capture .pb-delete-btn {
                display: none !important;
            }

            .pb-export-capture .pb-uploaded-img {
                display: block !important;
                vertical-align: top !important;
            }
        `;
        root.prepend(style);
    }

    function appendProfileSiteProtectionStyles(root) {
        if (root.querySelector('[data-pb-site-protection-style]')) return;

        const style = document.createElement('style');
        style.setAttribute('data-pb-site-protection-style', 'true');
        style.textContent = `
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

            .pb-site-profile-output,
            .pb-site-profile-output * {
                box-sizing: border-box !important;
                font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif !important;
            }
        `;
        root.prepend(style);
    }

    function waitForExportImages(root) {
        const images = Array.from(root.querySelectorAll('img')).filter((image) => image.getAttribute('src'));
        return Promise.all(images.map((image) => {
            if (image.complete && image.naturalWidth > 0) return Promise.resolve();
            if (typeof image.decode === 'function') {
                return image.decode().catch(() => {});
            }

            return new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
            });
        }));
    }

    async function waitForExportFonts() {
        if (!document.fonts?.ready) return;
        await document.fonts.ready;
    }

    function applyEditorFriendlyExportStyles(clone, { outputMode = 'capture' } = {}) {
        const isSiteCode = outputMode === 'site';
        clone.classList.add('pb-export-capture');
        if (isSiteCode) {
            clone.querySelectorAll('[data-pb-export-capture-style]').forEach((style) => style.remove());
            clone.classList.add('pb-site-profile-output');
            appendProfileSiteProtectionStyles(clone);
        } else {
            appendProfileExportCaptureStyles(clone);
        }

        const fontFamily = defaultTypography.fontFamily;
        const titleSize = `${defaultTypography.titleSize}px`;
        const bodySize = `${defaultTypography.bodySize}px`;
        const pointSize = `${defaultTypography.pointSize}px`;
        const profileBodySize = isSiteCode ? siteTypography.bodySize : bodySize;
        const profilePointSize = isSiteCode ? siteTypography.pointSize : pointSize;
        const lineHeight = isSiteCode ? siteTypography.lineHeight : String(defaultTypography.lineHeight);
        const profileChipSize = isSiteCode
            ? siteTypography.chipSize
            : `${defaultTypography.bodySize + 3}px`;
        const profileEyebrowSize = isSiteCode ? siteTypography.eyebrowSize : '12px';
        const setTypographyStyles = (element, styles) => {
            const resolvedStyles = isSiteCode ? { 'font-family': fontFamily, ...styles } : styles;
            const setter = isSiteCode ? setProtectedInlineStyles : setInlineStyles;
            setter(element, resolvedStyles);
        };
        const setMediaStyles = isSiteCode ? setProtectedInlineStyles : setInlineStyles;

        setInlineStyles(clone, {
            width: isSiteCode ? '100%' : '720px',
            'max-width': isSiteCode ? '100%' : '720px',
            'min-width': '0',
            margin: '0 auto',
            padding: isSiteCode ? '0' : '14px 10px',
            'border-radius': isSiteCode ? '14px' : '18px',
            'box-sizing': 'border-box',
            'background-color': currentBrandBg,
            'box-shadow': 'none',
            'font-family': fontFamily,
            color: '#2a211c'
        });

        clone.querySelectorAll('.pb-presentation').forEach((section) => {
            setInlineStyles(section, {
                border: '0',
                'border-radius': '0',
                width: '100%',
                'max-width': '100%',
                'min-width': '0',
                padding: isSiteCode ? '12px 8px' : '10px',
                color: '#2a211c',
                'box-shadow': 'none',
                overflow: 'hidden',
                position: 'relative',
                'container-type': 'inline-size',
                'box-sizing': 'border-box',
                background: 'transparent'
            });
        });

        clone.querySelectorAll('.pb-presentation-hero').forEach((node) => setInlineStyles(node, {
            display: 'grid',
            'grid-template-columns': '1fr',
            gap: '14px',
            'align-items': 'stretch',
            'margin-bottom': '16px',
            padding: '4px 0 0',
            'border-radius': '0',
            background: 'transparent',
            border: '0',
            'box-shadow': 'none',
            overflow: 'hidden',
            'box-sizing': 'border-box'
        }));

        clone.querySelectorAll('.pb-presentation-copy, .pb-presentation-side').forEach((node) => setInlineStyles(node, {
            display: 'flex',
            'flex-direction': 'column',
            gap: node.classList.contains('pb-presentation-side') ? '16px' : '14px',
            'min-width': '0'
        }));

        clone.querySelectorAll('.pb-presentation-copy').forEach((node) => setInlineStyles(node, {
            'justify-content': 'center',
            padding: '0',
            'border-radius': '0',
            background: 'transparent',
            'box-shadow': 'none'
        }));

        clone.querySelectorAll('.pb-presentation-eyebrow').forEach((node) => setTypographyStyles(node, {
            display: 'inline-block',
            padding: '7px 11px',
            'border-radius': '999px',
            background: 'rgba(255,255,255,0.72)',
            color: currentBrandColor,
            'font-size': profileEyebrowSize,
            'font-weight': '800',
            'line-height': '1.35',
            'letter-spacing': '0',
            'max-width': '100%',
            'overflow-wrap': 'anywhere'
        }));

        clone.querySelectorAll('.pb-presentation-title, .pb-presentation-card h3, .pb-presentation-closing h3').forEach((node) => {
            const resolvedTitleSize = isSiteCode ? siteTypography.titleSize : titleSize;
            const isMainTitle = node.classList.contains('pb-presentation-title');
            setTypographyStyles(node, {
                margin: '0',
                'font-size': resolvedTitleSize,
                'line-height': isSiteCode ? '1.25' : (isMainTitle ? '1.08' : '1.18'),
                'letter-spacing': '0',
                'font-weight': '800',
                'white-space': 'normal',
                'word-break': 'keep-all',
                'overflow-wrap': 'anywhere',
                'text-wrap': 'balance'
            });
        });

        clone.querySelectorAll('.pb-presentation-intro, .pb-presentation-body, .pb-presentation-card-body, .pb-presentation-closing p').forEach((node) => setTypographyStyles(node, {
            margin: '0',
            'font-size': profileBodySize,
            'line-height': lineHeight,
            color: '#554840',
            'word-break': 'keep-all',
            'overflow-wrap': 'anywhere'
        }));

        clone.querySelectorAll('.pb-presentation-hero .pb-presentation-intro').forEach((node) => setTypographyStyles(node, {
            'font-size': profileBodySize,
            'line-height': lineHeight
        }));

        clone.querySelectorAll('.pb-presentation-section').forEach((node) => setInlineStyles(node, {
            'margin-bottom': '18px',
            padding: '13px 15px',
            border: '0',
            'border-left': `4px solid ${currentBrandColor}`,
            'border-radius': '18px',
            background: 'rgba(255,255,255,0.58)',
            'box-shadow': 'none',
            'box-sizing': 'border-box',
            overflow: 'hidden'
        }));

        clone.querySelectorAll('.pb-presentation-chip').forEach((node) => setTypographyStyles(node, {
            display: 'inline-block',
            'margin-bottom': '12px',
            padding: '8px 12px',
            'border-radius': '12px',
            background: currentBrandLight,
            'box-shadow': 'none',
            'font-size': profileChipSize,
            'font-weight': '800',
            color: '#2a211c',
            'max-width': '100%',
            'box-sizing': 'border-box',
            'overflow-wrap': 'anywhere'
        }));

        clone.querySelectorAll('.pb-presentation-grid').forEach((node) => setInlineStyles(node, {
            display: 'grid',
            'grid-template-columns': '1fr',
            gap: '14px',
            'align-items': 'stretch',
            'margin-bottom': '16px'
        }));

        clone.querySelectorAll('.pb-presentation-detail').forEach((node) => setInlineStyles(node, {
            'grid-column': '1 / -1',
            display: 'flex',
            'flex-direction': 'column',
            'justify-content': 'flex-start',
            gap: '16px',
            padding: '13px 15px',
            border: '0',
            'border-radius': '18px',
            background: 'rgba(255,255,255,0.62)',
            'box-shadow': 'none',
            'box-sizing': 'border-box',
            overflow: 'hidden'
        }));

        clone.querySelectorAll('.pb-presentation-points').forEach((node) => setTypographyStyles(node, {
            margin: '0',
            padding: '0',
            display: 'flex',
            'flex-direction': 'column',
            gap: '14px',
            'border-radius': '0',
            background: 'transparent',
            'box-shadow': 'none',
            'font-size': profilePointSize,
            'font-weight': '700',
            'line-height': '1.55',
            color: '#3a2f28',
            'overflow-wrap': 'anywhere',
            'list-style': 'none'
        }));

        clone.querySelectorAll('.pb-presentation-points li').forEach((node) => setTypographyStyles(node, {
            position: 'relative',
            'padding-left': '0',
            display: 'flex',
            'align-items': 'flex-start',
            gap: '12px',
            'font-size': profilePointSize,
            'line-height': '1.55'
        }));

        stabilizeExportListMarkers(clone);
        clone.querySelectorAll('.pb-export-point-marker').forEach((node) => setInlineStyles(node, {
            display: 'inline-block',
            width: '7px',
            height: '7px',
            'min-width': '7px',
            'margin-top': '0.68em',
            'border-radius': '999px',
            background: currentBrandColor
        }));

        clone.querySelectorAll('.pb-presentation-card').forEach((node) => setInlineStyles(node, {
            'grid-column': '1 / -1',
            padding: '0'
        }));

        clone.querySelectorAll('.pb-presentation-card h3, .pb-presentation-closing h3').forEach((node) => setInlineStyles(node, {
            'margin-bottom': '16px',
            color: '#251d19'
        }));

        clone.querySelectorAll('.pb-presentation-card h3').forEach((node) => setInlineStyles(node, {
            margin: '0',
            'max-width': '100%'
        }));

        clone.querySelectorAll('.pb-presentation-card-body').forEach((node) => setInlineStyles(node, {
            'grid-column': '1 / -1',
            padding: '18px 0 0',
            'border-top': '1px solid rgba(124, 88, 70, 0.1)',
            'border-radius': '0',
            background: 'transparent',
            'box-shadow': 'none'
        }));

        clone.querySelectorAll('.pb-presentation-closing').forEach((node) => setInlineStyles(node, {
            padding: '13px 15px',
            border: '0',
            'border-left': '4px solid rgba(124, 88, 70, 0.22)',
            'border-radius': '18px',
            background: 'rgba(255,255,255,0.6)',
            'box-shadow': 'none',
            'box-sizing': 'border-box',
            overflow: 'hidden'
        }));

        clone.querySelectorAll('.pb-presentation-portrait, .pb-presentation-photo').forEach((node) => {
            if (node.closest('.pb-presentation.is-text-only-choice')) {
                node.remove();
                return;
            }

            const image = node.querySelector('.pb-uploaded-img');
            const hasImage = Boolean(image?.getAttribute('src'));
            const isPortrait = node.classList.contains('pb-presentation-portrait');

            setMediaStyles(node, {
                display: 'block',
                width: '100%',
                'max-width': '100%',
                'min-width': '0',
                overflow: 'hidden',
                position: 'relative',
                margin: '0',
                padding: hasImage ? '0' : (isPortrait ? '32px 24px' : '40px 24px'),
                background: hasImage ? '#ffffff' : 'rgba(255,255,255,0.56)',
                border: '0',
                'border-radius': '18px',
                'box-shadow': 'none',
                'box-sizing': 'border-box',
                'text-align': 'center',
                'justify-self': 'stretch',
                'aspect-ratio': isPortrait ? '16 / 8.6' : '16 / 8.8',
                'min-height': isSiteCode ? '0' : (isPortrait ? '330px' : '345px'),
                height: isSiteCode ? 'auto' : (isPortrait ? '330px' : '345px')
            });

            if (!hasImage) {
                node.innerHTML = `<div style="font-size:${profileBodySize}; line-height:${lineHeight}; color:#8c7a70; font-weight:600;">이미지 등록 영역</div>`;
            }
        });

        clone.querySelectorAll('.pb-presentation-portrait .pb-uploaded-img, .pb-presentation-photo .pb-uploaded-img').forEach((node) => {
            const isPortraitImage = Boolean(node.closest('.pb-presentation-portrait'));
            setMediaStyles(node, {
            width: '100%',
            height: '100%',
            display: 'block',
            'max-width': '100%',
            'border-radius': '18px',
            'object-fit': 'cover',
            'object-position': 'center',
            'vertical-align': 'top',
            background: isPortraitImage
                ? 'radial-gradient(circle at top, rgba(255,255,255,0.78), rgba(255,255,255,0.18) 58%), rgba(244, 238, 232, 0.72)'
                : 'transparent'
            });
        });

        normalizeExportRichText(clone);
    }

    function validateReferenceFile(file) {
        const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        if (!allowedTypes.has(file.type)) return 'JPG, PNG 또는 WebP 이미지만 첨부할 수 있습니다.';
        if (!file.size || file.size > MAX_REFERENCE_IMAGE_BYTES) return '참고 이미지 한 장은 5MB 이하여야 합니다.';
        return '';
    }

    function renderReferencePreview(scope) {
        const container = scope === 'ppt' ? pptReferencePreview : aiReferencePreview;
        if (!container) return;
        container.replaceChildren();

        referenceFiles[scope].forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'pb-reference-card';
            const image = document.createElement('img');
            const objectUrl = URL.createObjectURL(file);
            image.src = objectUrl;
            image.alt = `참고 이미지 ${index + 1}`;
            image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
            image.addEventListener('error', () => URL.revokeObjectURL(objectUrl), { once: true });

            const name = document.createElement('span');
            name.className = 'pb-reference-name';
            name.textContent = file.name;

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'pb-reference-remove';
            remove.setAttribute('aria-label', `${file.name} 삭제`);
            remove.textContent = '×';
            remove.addEventListener('click', () => {
                referenceFiles[scope].splice(index, 1);
                renderReferencePreview(scope);
            });

            card.append(image, name, remove);
            container.appendChild(card);
        });
    }

    function selectReferenceFiles(scope, selectedFiles) {
        const statusTarget = scope === 'ppt' ? pptStatus : aiStatus;
        const input = scope === 'ppt' ? pptReferenceImages : aiReferenceImages;
        const files = Array.from(selectedFiles || []);
        if (files.length > MAX_REFERENCE_IMAGES) {
            setStatus(statusTarget, `참고 이미지는 최대 ${MAX_REFERENCE_IMAGES}장까지 첨부할 수 있습니다.`, 'error');
            if (input) input.value = '';
            return;
        }

        const validationError = files.map(validateReferenceFile).find(Boolean);
        if (validationError) {
            setStatus(statusTarget, validationError, 'error');
            if (input) input.value = '';
            return;
        }

        referenceFiles[scope] = files;
        renderReferencePreview(scope);
        if (input) input.value = '';
    }

    function appendReferenceImages(formData, scope, shouldGenerateImages) {
        if (!shouldGenerateImages) return;
        referenceFiles[scope].forEach((file) => formData.append('referenceImages', file, file.name));
    }

    function selectDocumentFiles(selectedFiles) {
        const files = Array.from(selectedFiles || []);
        const totalBytes = files.reduce((total, file) => total + Number(file.size || 0), 0);
        let validationError = '';
        if (files.length > MAX_DOCUMENT_FILES) {
            validationError = `참고 문서는 최대 ${MAX_DOCUMENT_FILES}개까지 선택할 수 있습니다.`;
        } else if (totalBytes > MAX_DOCUMENT_TOTAL_BYTES) {
            validationError = '참고 문서 전체 크기는 25MB 이하여야 합니다.';
        }
        if (validationError) {
            if (pptFile) pptFile.value = '';
            if (pptFileSummary) pptFileSummary.textContent = '선택한 참고 파일이 없습니다.';
            setStatus(pptStatus, validationError, 'error');
            return [];
        }
        if (pptFileSummary) {
            pptFileSummary.textContent = files.length
                ? `선택한 참고 파일 ${files.length}개: ${files.map((file) => file.name).join(', ')}`
                : '선택한 참고 파일이 없습니다.';
        }
        return files;
    }

    const PROFILE_JOB_POLL_INTERVAL_MS = 2000;
    const PROFILE_JOB_STATUS_MAX_CONSECUTIVE_ERRORS = 5;
    const PROFILE_JOB_STORAGE_KEY = 'pb-pending-profile-job';

    function createProfileOperationKey() {
        return window.crypto?.randomUUID?.() || `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    async function parseApiResponse(response) {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data.error || '프로필 생성 요청에 실패했습니다.');
            error.status = response.status;
            throw error;
        }
        return data;
    }

    async function waitForProfileJob(initialJob, statusUrl, statusTarget) {
        let job = initialJob;
        let consecutiveStatusErrors = 0;
        sessionStorage.setItem(PROFILE_JOB_STORAGE_KEY, JSON.stringify({
            jobId: job.id,
            statusUrl,
            statusTargetId: statusTarget?.id || ''
        }));

        while (!['completed', 'partial', 'failed', 'needs_review'].includes(job.state)) {
            const stageLabels = {
                queued: '대기열 접수',
                starting: '생성 준비',
                text: '소개 문구 생성',
                portrait: '대표 이미지 생성',
                mood: '무드 이미지 생성'
            };
            setStatus(statusTarget, `${stageLabels[job.currentStage] || '프로필 생성'} 중입니다. 동일 작업은 다시 눌러도 중복 과금되지 않습니다.`, 'loading');
            await new Promise((resolve) => window.setTimeout(resolve, PROFILE_JOB_POLL_INTERVAL_MS));
            try {
                const response = await fetch(statusUrl, { method: 'GET' });
                const data = await parseApiResponse(response);
                if (!data.job) throw new Error('프로필 작업 상태 응답이 올바르지 않습니다.');
                job = data.job;
                consecutiveStatusErrors = 0;
            } catch (error) {
                consecutiveStatusErrors += 1;
                if (consecutiveStatusErrors >= PROFILE_JOB_STATUS_MAX_CONSECUTIVE_ERRORS) {
                    const lookupError = new Error('프로필 제작 요청은 접수됐지만 진행 상태를 확인하지 못했습니다. 잠시 후 같은 입력으로 다시 확인해주세요. 기존 작업을 재사용하므로 중복 과금되지 않습니다.');
                    lookupError.cause = error;
                    throw lookupError;
                }
                setStatus(
                    statusTarget,
                    `서버에서는 프로필 제작을 계속 진행하고 있습니다. 상태 연결을 다시 확인하는 중입니다. (${consecutiveStatusErrors}/${PROFILE_JOB_STATUS_MAX_CONSECUTIVE_ERRORS})`,
                    'loading'
                );
            }
        }

        sessionStorage.removeItem(PROFILE_JOB_STORAGE_KEY);
        if (job.result) return { ...job.result, job };
        if (job.state === 'needs_review') {
            throw new Error(job.error || '외부 AI 응답 상태를 확인할 수 없어 자동 재시도를 중단했습니다. 관리자에게 작업 ID를 전달해주세요.');
        }
        throw new Error(job.error || '프로필 생성 작업이 실패했습니다.');
    }

    async function requestProfileGeneration(url, options, statusTarget) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                'Idempotency-Key': createProfileOperationKey()
            }
        });
        const data = await parseApiResponse(response);
        const result = data.job
            ? await waitForProfileJob(data.job, data.statusUrl || `/api/profile-jobs/${data.job.id}`, statusTarget)
            : data;
        return { ok: true, json: async () => result };
    }

    async function resumePendingProfileJob() {
        let pending;
        try {
            pending = JSON.parse(sessionStorage.getItem(PROFILE_JOB_STORAGE_KEY) || 'null');
        } catch {
            sessionStorage.removeItem(PROFILE_JOB_STORAGE_KEY);
            return;
        }
        if (!pending?.statusUrl) return;

        const statusTarget = document.getElementById(pending.statusTargetId) || aiStatus || pptStatus;
        try {
            const response = await fetch(pending.statusUrl, { method: 'GET' });
            const data = await parseApiResponse(response);
            await waitForProfileJob(data.job, pending.statusUrl, statusTarget);
            setStatus(statusTarget, '기존 프로필 작업이 완료되었습니다. 같은 입력으로 생성 버튼을 누르면 추가 AI 호출 없이 저장된 결과를 불러옵니다.', 'success');
        } catch (error) {
            setStatus(statusTarget, error.message || '기존 프로필 작업 상태를 확인하지 못했습니다.', 'error');
        }
    }

    function attachSafeFailedStageRetry(panel, profileJob, statusTarget) {
        if (!panel || !profileJob?.id) return;
        const retryable = Object.values(profileJob.stages || {}).some((stage) => stage.state === 'failed');
        if (!retryable) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pb-action-btn secondary';
        button.textContent = '실패한 단계만 이어서 생성';
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                const response = await fetch(`/api/profile-jobs/${profileJob.id}/retry-failed`, { method: 'POST' });
                const data = await parseApiResponse(response);
                const result = await waitForProfileJob(
                    data.job,
                    data.statusUrl || `/api/profile-jobs/${profileJob.id}`,
                    statusTarget
                );
                const presentation = getCurrentPresentationElement();
                if (presentation && result.profile) {
                    activeProfileCopyMeta = result.copyMeta || activeProfileCopyMeta;
                    fillPresentation(presentation, result.profile);
                    syncPresentationImageState(presentation, { textOnly: !result.imageMeta?.requested });
                    renderProfileImageGuide(result.imageGuide);
                    syncProfileImageAssets();
                }
                renderImageIssue(panel, result.imageMeta);
                attachSafeFailedStageRetry(panel, result.job, statusTarget);
                setStatus(statusTarget, '실패가 확인된 단계만 이어서 생성했습니다.', 'success');
            } catch (error) {
                setStatus(statusTarget, error.message || '실패 단계 이어서 생성에 실패했습니다.', 'error');
                button.disabled = false;
            }
        });
        panel.appendChild(button);
    }

    async function requestAiProfile() {
        const templateType = aiTemplate.value;
        const templateConfig = templates[templateType];
        const name = aiName.value.trim();
        const specialty = aiSpecialty.value.trim();
        const tone = aiTone.value.trim();
        const career = aiCareer.value.trim();
        const referenceText = aiReferenceText?.value.trim() || '';
        const imageStyle = aiImageStyle.value.trim();
        const shouldGenerateImages = aiGenerateImage.checked;
        const imageQuality = aiImageQuality?.value || 'standard';

        if (!name || !specialty || !tone || !career) {
            setStatus(aiStatus, '상담사명, 전문분야, 상담 톤, 경력/강점을 먼저 입력해주세요.', 'error');
            return;
        }

        aiGenerateButton.disabled = true;
        setStatus(aiStatus, 'AI가 입력한 정보를 바탕으로 소개 페이지를 생성하는 중입니다...', 'loading');

        try {
            const formData = new FormData();
            formData.append('templateType', templateType);
            if (templateType === 'tarot-ppt') formData.append('tarotCardType', aiTarotCardType?.value || 'auto');
            formData.append('name', name);
            formData.append('specialty', specialty);
            formData.append('tone', tone);
            formData.append('career', career);
            formData.append('referenceText', referenceText);
            formData.append('imageStyle', imageStyle);
            formData.append('generateImage', String(shouldGenerateImages));
            formData.append('imageQuality', imageQuality);
            appendReferenceImages(formData, 'ai', shouldGenerateImages);

            const response = await requestProfileGeneration('/api/generate-profile', {
                method: 'POST',
                body: formData
            }, aiStatus);

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '생성 요청에 실패했습니다.');
            }

            applyTheme(templateConfig.theme);
            const element = replaceCanvasWithElement(templateType);
            fillPresentation(element, data.profile);
            syncPresentationImageState(element, { textOnly: !shouldGenerateImages });
            lastProfileDownloadName = (name || specialty || 'profile-builder').trim();
            activeProfileCopyMeta = data.copyMeta || null;
            activeProfileReferenceText = referenceText;
            resetProfileImageAssets();
            renderProfileImageGuide(data.imageGuide);
            syncProfileImageAssets();
            setStatus(
                imageAssetsStatus,
                shouldGenerateImages
                    ? '이미지를 각각 다운로드한 뒤 사이트에 등록하고 URL을 입력하세요.'
                    : '직접 이미지를 만들 때 아래 프롬프트 가이드를 복사해 사용할 수 있습니다.',
                'success'
            );
            storeProfileHistoryItem({
                source: 'direct',
                templateType,
                tarotCardType: templateType === 'tarot-ppt' ? (aiTarotCardType?.value || 'auto') : '',
                profile: getCurrentPresentationPayload(element.querySelector('.pb-presentation') || element),
                nameHint: lastProfileDownloadName,
                imageMode: shouldGenerateImages,
                imageQuality,
                copyMeta: activeProfileCopyMeta,
                referenceText: activeProfileReferenceText
            });

            setStatus(
                aiStatus,
                buildGenerationStatus(shouldGenerateImages ? '생성이 완료되었습니다.' : '글 중심 프로필 구성이 완료되었습니다.', data.usage, data.imageMeta),
                'success'
            );
            renderImageIssue(aiImageIssue, data.imageMeta);
            attachSafeFailedStageRetry(aiImageIssue, data.job, aiStatus);
            updateSlotRegenerateState();
        } catch (error) {
            setStatus(aiStatus, error.message || 'AI 생성 중 오류가 발생했습니다.', 'error');
            renderImageIssue(aiImageIssue, null);
        } finally {
            aiGenerateButton.disabled = false;
        }
    }

    async function requestPptGeneration() {
        const files = Array.from(pptFile.files || []);
        const file = files[0];
        const templateType = pptTemplate.value;
        const templateConfig = templates[templateType];
        const shouldGenerateImages = pptGenerateImage.checked;
        const imageQuality = pptImageQuality?.value || 'standard';
        const referenceText = pptReferenceText?.value.trim() || '';

        if (!file) {
            setStatus(pptStatus, '먼저 Office 또는 메모장 참고 파일을 선택해주세요.', 'error');
            return;
        }
        if (files.length > MAX_DOCUMENT_FILES) {
            setStatus(pptStatus, `참고 문서는 최대 ${MAX_DOCUMENT_FILES}개까지 선택할 수 있습니다.`, 'error');
            return;
        }
        if (files.reduce((total, selectedFile) => total + Number(selectedFile.size || 0), 0) > MAX_DOCUMENT_TOTAL_BYTES) {
            setStatus(pptStatus, '참고 문서 전체 크기는 25MB 이하여야 합니다.', 'error');
            return;
        }

        const formData = new FormData();
        files.forEach((selectedFile) => formData.append('pptFile', selectedFile, selectedFile.name));
        formData.append('templateType', templateType);
        if (templateType === 'tarot-ppt') formData.append('tarotCardType', pptTarotCardType?.value || 'auto');
        formData.append('imageStyle', pptImageStyle.value.trim());
        formData.append('referenceText', referenceText);
        formData.append('generateImage', String(shouldGenerateImages));
        formData.append('imageQuality', imageQuality);
        appendReferenceImages(formData, 'ppt', shouldGenerateImages);

        pptGenerateButton.disabled = true;
        setStatus(pptStatus, '문서 내용을 분석하고 완성형 소개 페이지를 구성하는 중입니다...', 'loading');

        try {
            const response = await requestProfileGeneration('/api/generate-from-ppt', {
                method: 'POST',
                body: formData
            }, pptStatus);

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '문서 생성 요청에 실패했습니다.');
            }

            applyTheme(templateConfig.theme);
            const element = replaceCanvasWithElement(templateType);
            fillPresentation(element, data.profile);
            syncPresentationImageState(element, { textOnly: !shouldGenerateImages });
            lastProfileDownloadName = file.name.replace(/\.[^.]+$/, '') || 'profile-builder';
            activeProfileCopyMeta = data.copyMeta || null;
            activeProfileReferenceText = referenceText;
            resetProfileImageAssets();
            renderProfileImageGuide(data.imageGuide);
            syncProfileImageAssets();
            setStatus(
                imageAssetsStatus,
                shouldGenerateImages
                    ? '이미지를 각각 다운로드한 뒤 사이트에 등록하고 URL을 입력하세요.'
                    : '직접 이미지를 만들 때 아래 프롬프트 가이드를 복사해 사용할 수 있습니다.',
                'success'
            );
            storeProfileHistoryItem({
                source: 'document',
                templateType,
                tarotCardType: templateType === 'tarot-ppt' ? (pptTarotCardType?.value || 'auto') : '',
                profile: getCurrentPresentationPayload(element.querySelector('.pb-presentation') || element),
                nameHint: lastProfileDownloadName,
                imageMode: shouldGenerateImages,
                imageQuality,
                copyMeta: activeProfileCopyMeta,
                referenceText: activeProfileReferenceText
            });

            const fileMessage = Number(data.meta?.fileCount || 1) > 1 ? `참고 파일 ${data.meta.fileCount}개 분석 완료.` : '';
            const slideMessage = data.meta?.slidesCount ? `슬라이드 ${data.meta.slidesCount}장 분석 완료.` : '';
            const sheetMessage = data.meta?.sheetsCount ? `시트 ${data.meta.sheetsCount}개 분석 완료.` : '';
            const documentMessage = !slideMessage && !sheetMessage && data.meta?.itemCount
                ? `${data.meta.sourceLabel || '문서'} 내용 확인 완료.`
                : '';
            const sourceMessage = [fileMessage, slideMessage, sheetMessage, documentMessage].filter(Boolean).join(' ');
            setStatus(
                pptStatus,
                buildGenerationStatus(
                    `${sourceMessage} ${shouldGenerateImages ? '생성이 완료되었습니다.' : '글 중심 프로필 구성이 완료되었습니다.'}`.trim(),
                    data.usage,
                    data.imageMeta
                ),
                'success'
            );
            renderImageIssue(pptImageIssue, data.imageMeta);
            attachSafeFailedStageRetry(pptImageIssue, data.job, pptStatus);
            updateSlotRegenerateState();
        } catch (error) {
            setStatus(pptStatus, error.message || '문서 생성 중 오류가 발생했습니다.', 'error');
            renderImageIssue(pptImageIssue, null);
        } finally {
            pptGenerateButton.disabled = false;
        }
    }

    themeButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            applyTheme(event.currentTarget.dataset.theme);
        });
    });

    tools.forEach((tool) => {
        tool.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('type', tool.dataset.type);
        });
    });

    canvas.addEventListener('dragover', (event) => event.preventDefault());
    canvas.addEventListener('drop', (event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('type');
        if (type) appendElement(type);
    });

    imageUploader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file || !currentUploadTargetImg || !currentUploadPlaceholder) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            currentUploadTargetImg.src = loadEvent.target.result;
            currentUploadTargetImg.style.display = 'block';
            currentUploadPlaceholder.style.display = 'none';
            const isPortraitAsset = Boolean(currentUploadTargetImg.closest('.pb-presentation-portrait'));
            const isMoodAsset = Boolean(currentUploadTargetImg.closest('.pb-presentation-photo'));
            if (isPortraitAsset && portraitSiteUrlInput) {
                portraitSiteUrlInput.value = '';
            }
            if (isMoodAsset && moodSiteUrlInput) {
                moodSiteUrlInput.value = '';
            }
            syncPresentationImageState(currentUploadTargetImg);
            if (isPortraitAsset || isMoodAsset) {
                setStatus(imageAssetsStatus, '이미지를 교체했습니다. 사이트에 등록한 뒤 새 이미지 URL을 입력해주세요.', 'success');
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    });

    document.getElementById('pb-preview-btn')?.addEventListener('click', () => {
        previewArea.innerHTML = '';
        previewArea.style.backgroundColor = currentBrandBg;
        previewArea.appendChild(getCleanCanvasClone());
        previewModal.classList.add('active');
    });

    document.getElementById('pb-close-modal')?.addEventListener('click', () => previewModal.classList.remove('active'));

    document.getElementById('pb-clear-btn')?.addEventListener('click', () => {
        if (!window.confirm('캔버스의 모든 블록을 지울까요?')) return;
        canvas.innerHTML = `
            <div class="pb-empty-state">
                <div class="pb-empty-icon">DOC</div>
                <p>문서 업로드 생성 버튼으로 시작하거나, 왼쪽 블록을 끌어와 직접 구성해보세요.</p>
            </div>`;
        activeProfileCopyMeta = null;
        activeProfileReferenceText = '';
        resetProfileImageAssets();
        updateSlotRegenerateState();
    });

    exportButton?.addEventListener('click', downloadProfileImage);

    function createSiteRegistrationCode() {
        const presentation = getCurrentPresentationElement();
        if (!presentation) {
            throw new Error('먼저 프로필 결과를 생성해주세요.');
        }
        assertStandardProfileExport();

        const clone = getCleanCanvasClone();
        if (!embedImagesInCodeInput?.checked) replaceExportImageSources(clone);
        applyEditorFriendlyExportStyles(clone, { outputMode: 'site' });
        compactExportFormattingWhitespace(clone);
        const wrapper = document.createElement('div');
        wrapper.appendChild(clone);
        return wrapper.innerHTML.trim();
    }

    function downloadSiteRegistrationCode(code) {
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${sanitizeDownloadFileName(lastProfileDownloadName)}-site-code.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
    }

    codeGenerateButton?.addEventListener('click', () => {
        try {
            codeOutput.value = createSiteRegistrationCode();
            codeModal.classList.add('active');
            setStatus(
                imageAssetsStatus,
                embedImagesInCodeInput?.checked
                    ? 'Base64 이미지가 포함된 호환용 코드를 생성했습니다.'
                    : 'Base64를 제외하고 사이트 이미지 URL을 사용하는 코드를 생성했습니다.',
                'success'
            );
        } catch (error) {
            setStatus(imageAssetsStatus, error.message || '사이트용 코드 생성 중 오류가 발생했습니다.', 'error');
            window.alert(error.message || '사이트용 코드 생성 중 오류가 발생했습니다.');
        }
    });

    codeDownloadButton?.addEventListener('click', () => {
        try {
            const code = createSiteRegistrationCode();
            downloadSiteRegistrationCode(code);
            setStatus(imageAssetsStatus, '사이트 등록용 코드를 UTF-8 메모장 파일로 저장했습니다.', 'success');
        } catch (error) {
            setStatus(imageAssetsStatus, error.message || '사이트 코드 파일 저장 중 오류가 발생했습니다.', 'error');
            window.alert(error.message || '사이트 코드 파일 저장 중 오류가 발생했습니다.');
        }
    });

    document.getElementById('pb-close-code-modal')?.addEventListener('click', () => codeModal.classList.remove('active'));

    downloadPortraitButton?.addEventListener('click', () => downloadProfileAsset('portrait'));
    downloadMoodButton?.addEventListener('click', () => downloadProfileAsset('mood'));
    downloadAllImagesButton?.addEventListener('click', downloadAllProfileAssets);

    promptCopyButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const target = document.getElementById(button.dataset.promptTarget);
            const copied = await copyPlainText(target?.value || '');
            if (!copied) {
                setStatus(imageAssetsStatus, '복사할 프롬프트가 없거나 클립보드 복사에 실패했습니다.', 'error');
                return;
            }

            const originalLabel = button.textContent;
            button.textContent = '복사 완료';
            setStatus(imageAssetsStatus, '프롬프트를 복사했습니다. 별도 이미지 제작 도구에 붙여넣어 사용할 수 있습니다.', 'success');
            setTimeout(() => {
                button.textContent = originalLabel;
            }, 1200);
        });
    });

    async function copyCodeToClipboard() {
        const textToCopy = codeOutput.value;

        if (!textToCopy) {
            window.alert('복사할 코드가 없습니다.');
            return false;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            return true;
        } catch {
            codeOutput.focus();
            codeOutput.select();
            codeOutput.setSelectionRange(0, textToCopy.length);

            try {
                return document.execCommand('copy');
            } catch {
                return false;
            }
        }
    }

    function getActiveTemplateType() {
        return getCurrentPresentationElement()?.dataset.templateType || aiTemplate?.value || pptTemplate?.value || 'sinjeom-ppt';
    }

    async function requestSlotRegeneration(slotKey) {
        const presentation = getCurrentPresentationElement();
        const currentProfile = getCurrentPresentationPayload(presentation);
        const templateType = getActiveTemplateType();
        const textOnlyChoice = isCurrentProfileTextOnlyChoice();

        if (!presentation || !currentProfile) {
            setStatus(slotStatus, '먼저 프로필 결과를 생성한 뒤 필요한 부분만 다시 생성할 수 있습니다.', 'error');
            return;
        }

        const slotLabelMap = {
            headline: '헤드라인',
            intro: '인트로',
            bulletPoints: '핵심 포인트',
            closing: '마무리 문구'
        };

        slotRegenerateButtons.forEach((button) => {
            button.disabled = true;
        });
        setStatus(slotStatus, `${slotLabelMap[slotKey] || '선택 영역'}를 현재 문맥에 맞게 다시 만드는 중입니다...`, 'loading');

        try {
            const response = await fetch('/api/regenerate-profile-slot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateType,
                    slotKey,
                    currentProfile,
                    copyVariant: activeProfileCopyMeta,
                    referenceText: activeProfileReferenceText
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '부분 재생성 요청에 실패했습니다.');
            }

            fillPresentation(presentation, data.profile);
            activeProfileCopyMeta = data.copyMeta || activeProfileCopyMeta;
            syncPresentationImageState(presentation, { textOnly: textOnlyChoice });
            const restoredProfile = getCurrentPresentationPayload(presentation);
            storeProfileHistoryItem({
                source: 'direct',
                templateType,
                profile: restoredProfile,
                nameHint: lastProfileDownloadName,
                imageMode: !textOnlyChoice,
                copyMeta: activeProfileCopyMeta,
                referenceText: activeProfileReferenceText
            });
            setStatus(slotStatus, `${slotLabelMap[slotKey] || '선택 영역'}를 다시 생성했습니다.`, 'success');
        } catch (error) {
            setStatus(slotStatus, error.message || '부분 재생성 중 오류가 발생했습니다.', 'error');
        } finally {
            updateSlotRegenerateState();
        }
    }

    async function downloadProfileImage() {
        const presentation = canvas.querySelector('.pb-presentation');
        if (!presentation) {
            window.alert('먼저 프로필 결과를 생성해주세요.');
            return;
        }

        try {
            assertStandardProfileExport();
        } catch (error) {
            window.alert(error.message);
            return;
        }

        if (typeof window.html2canvas !== 'function') {
            window.alert('이미지 저장 기능을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
            return;
        }

        const stage = document.createElement('div');
        const clone = getCleanCanvasClone();
        applyEditorFriendlyExportStyles(clone);

        stage.style.position = 'fixed';
        stage.style.left = '-10000px';
        stage.style.top = '0';
        stage.style.padding = '24px';
        stage.style.background = currentBrandBg || '#fdf0f1';
        stage.style.zIndex = '-1';
        stage.style.pointerEvents = 'none';
        stage.appendChild(clone);
        document.body.appendChild(stage);

        try {
            await waitForExportFonts();
            await waitForExportImages(clone);

            const rendered = await window.html2canvas(clone, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                logging: false,
                width: clone.offsetWidth,
                height: clone.scrollHeight,
                windowWidth: clone.scrollWidth,
                windowHeight: clone.scrollHeight
            });

            const link = document.createElement('a');
            const fileName = String(lastProfileDownloadName || 'profile-builder').trim().replace(/[\\/:*?"<>|]+/g, '-');
            link.href = rendered.toDataURL('image/png');
            link.download = `${fileName || 'profile-builder'}.png`;
            link.click();
        } catch (error) {
            console.error(error);
            window.alert('프로필 이미지 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            stage.remove();
        }
    }

    copyButton?.addEventListener('click', async () => {
        const copied = await copyCodeToClipboard();

        if (copied) {
            copyButton.textContent = '복사됨';
            setTimeout(() => {
                copyButton.textContent = '복사하기';
            }, 1200);
            return;
        }

        window.alert('복사에 실패했습니다. 코드 영역을 직접 선택해 복사해주세요.');
    });

    aiGenerateButton?.addEventListener('click', requestAiProfile);
    pptGenerateButton?.addEventListener('click', requestPptGeneration);
    pptFile?.addEventListener('change', (event) => selectDocumentFiles(event.target.files));
    aiReferenceImages?.addEventListener('change', (event) => selectReferenceFiles('ai', event.target.files));
    pptReferenceImages?.addEventListener('change', (event) => selectReferenceFiles('ppt', event.target.files));
    slotRegenerateButtons.forEach((button) => {
        button.addEventListener('click', () => requestSlotRegeneration(button.dataset.slotKey));
    });

    initializeCollapsibles();
    bindUploadables(document.body);
    bindTypographyControls();
    bindImageModeToggles();
    aiGenerateImage?.addEventListener('change', updateImageGenerationControls);
    pptGenerateImage?.addEventListener('change', updateImageGenerationControls);
    aiImageQuality?.addEventListener('change', updateImageGenerationControls);
    pptImageQuality?.addEventListener('change', updateImageGenerationControls);
    aiTemplate?.addEventListener('change', updateTarotCardTypeControls);
    pptTemplate?.addEventListener('change', updateTarotCardTypeControls);
    applyTheme('pb-theme-sinjeom');
    applyTypographySettings();
    updateImageGenerationControls();
    updateTarotCardTypeControls();
    resetProfileImageAssets();
    renderProfileHistory();
    updateSlotRegenerateState();
    resumePendingProfileJob();
});
