document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('pb-app');
    const sidebar = document.querySelector('.pb-sidebar');
    const sidebarHeader = document.querySelector('.pb-sidebar-header');
    const canvas = document.getElementById('pb-canvas');
    const tools = document.querySelectorAll('.pb-tool');
    const themeButtons = document.querySelectorAll('.pb-theme-btn');
    const imageUploader = document.getElementById('pb-image-uploader');
    const themeSection = document.querySelector('.pb-section');
    const paletteContainer = document.querySelector('.pb-palette-container');

    const pptTemplate = document.getElementById('pb-ppt-template');
    const pptFile = document.getElementById('pb-ppt-file');
    const pptImageStyle = document.getElementById('pb-ppt-image-style');
    const pptGenerateImage = document.getElementById('pb-ppt-generate-image');
    const pptGenerateImageHelp = document.getElementById('pb-ppt-generate-image-help');
    const pptGenerateButton = document.getElementById('pb-ppt-generate-btn');
    const pptStatus = document.getElementById('pb-ppt-status');
    const pptImageIssue = document.getElementById('pb-ppt-image-issue');

    const aiTemplate = document.getElementById('pb-ai-template');
    const aiName = document.getElementById('pb-ai-name');
    const aiSpecialty = document.getElementById('pb-ai-specialty');
    const aiTone = document.getElementById('pb-ai-tone');
    const aiCareer = document.getElementById('pb-ai-career');
    const aiImageStyle = document.getElementById('pb-ai-image-style');
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
    const exportButton = document.getElementById('pb-export-btn');
    let brandNameInput;
    let brandIndustryInput;
    let brandProductsInput;
    let brandFeaturesInput;
    let brandTargetInput;
    let brandGoalInput;
    let brandToneInput;
    let brandLogoMoodInput;
    let brandReferenceInput;
    let brandAccentInput;
    let brandLogoFileInput;
    let brandImageStyleInput;
    let brandGenerateImageInput;
    let brandGenerateButton;
    let brandStatus;
    let brandImageIssue;

    let currentUploadTargetImg = null;
    let currentUploadPlaceholder = null;
    let currentBrandColor = '#C21129';
    let currentBrandBg = '#fdf0f1';
    let currentBrandLight = '#fbe6e8';
    let currentMode = 'profile';
    let currentBrandLogoDataUrl = '';
    let lastProfileDownloadName = 'profile-builder';
    const PROFILE_HISTORY_KEY = 'pb-profile-history-v1';
    const MAX_PROFILE_HISTORY = 8;
    const defaultTypography = {
        fontFamily: `'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`,
        titleSize: 42,
        bodySize: 16,
        pointSize: 17,
        lineHeight: 1.8
    };

    const templates = {
        'tarot-ppt': {
            theme: 'pb-theme-tarot',
            variant: 'tarot',
            eyebrow: 'Tarot Editorial',
            headline: '타로를 보면, 숨겨진 마음의 결이 보입니다',
            intro: '타로를 통해 관계와 감정의 흐름을 읽고, 지금 필요한 방향을 차분하게 정리합니다.',
            sectionTitle: '전화타로, 어떤 점이 매력적인가요?',
            sectionBody: '속마음과 관계 흐름처럼 말로 설명하기 어려운 감정의 결을 함께 정리하는 상담에 강점이 있습니다.',
            points: ['상대방의 속마음이 궁금할 때', '막막한 관계의 방향을 알고 싶을 때', '감정을 차분히 정리하고 싶을 때'],
            cardTitle: '전화로도 충분히 깊이 있는 타로 상담',
            cardBody: '편한 공간에서 부담 없이 이야기하며 핵심을 정리하고 방향을 함께 읽어드립니다.',
            closingTitle: '편하게 이야기 나누며 속마음을 읽어봅니다',
            closingBody: '자동 이미지가 비어 있으면 카드 영역을 눌러 직접 이미지를 넣을 수 있습니다.',
            portraitPlaceholder: '타로 상담사 프로필 이미지',
            moodPlaceholder: '타로 무드 이미지'
        },
        'saju-ppt': {
            theme: 'pb-theme-saju',
            variant: 'saju',
            eyebrow: 'Saju Editorial',
            headline: '사주의 흐름을 읽고, 지금의 방향을 정리합니다',
            intro: '사주의 기운과 흐름을 바탕으로 현재 고민을 구조적으로 정리하고 현실적인 방향을 제안합니다.',
            sectionTitle: '사주 상담이 필요한 순간을 짚어드립니다',
            sectionBody: '직업, 진로, 시기, 관계처럼 흐름을 보고 판단해야 하는 고민에 특히 잘 맞는 형식입니다.',
            points: ['올해 흐름이 궁금할 때', '진로와 직업 방향이 막힐 때', '관계와 시기를 함께 보고 싶을 때'],
            cardTitle: '사주를 통해 현재와 다음 흐름을 읽습니다',
            cardBody: '복잡한 고민도 큰 흐름과 세부 포인트를 나눠 이해하기 쉽게 풀어드립니다.',
            closingTitle: '지금의 흐름을 정리하고 다음 방향을 준비합니다',
            closingBody: '자동 이미지가 비어 있으면 상담사 이미지와 무드 이미지를 직접 업로드할 수 있습니다.',
            portraitPlaceholder: '사주 상담사 프로필 이미지',
            moodPlaceholder: '사주 무드 이미지'
        },
        'sinjeom-ppt': {
            theme: 'pb-theme-sinjeom',
            variant: 'sinjeom',
            eyebrow: 'Sinjeom Editorial',
            headline: '신점은 답답한 마음의 방향을 비춰줍니다',
            intro: '복잡한 상황에서 놓치기 쉬운 신호를 차분하게 짚고, 지금 필요한 선택의 방향을 정리합니다.',
            sectionTitle: '신점 상담이 특히 필요한 순간',
            sectionBody: '결정을 앞두고 있거나 답답한 흐름이 길어질 때, 마음의 중심을 다시 잡는 상담에 어울립니다.',
            points: ['답답한 상황의 방향이 궁금할 때', '결정을 앞두고 확신이 필요할 때', '현실적인 조언과 흐름을 함께 보고 싶을 때'],
            cardTitle: '신점 상담은 흐름과 메시지를 함께 정리합니다',
            cardBody: '막연한 불안보다 지금 필요한 포인트를 구체적으로 짚는 데 초점을 둡니다.',
            closingTitle: '필요한 답을 차분하게 정리해드립니다',
            closingBody: 'AI 이미지가 생성되지 않아도 이미지 영역을 눌러 직접 업로드할 수 있습니다.',
            portraitPlaceholder: '신점 상담사 프로필 이미지',
            moodPlaceholder: '신점 무드 이미지'
        }
    };

    const brandPosterTemplate = {
        badge: '브랜드 맞춤 홍보 이미지',
        headline: '업체 특징이 한눈에 보이는 홍보 이미지를 만듭니다',
        subheadline: '로고와 핵심 메시지를 반영해 밴드용 세로 포스터 톤으로 정리합니다.',
        summary: '파트너사 소개, 제품 특징, 타깃 고객을 바탕으로 한 장의 정돈된 홍보 이미지 구조를 만듭니다.',
        highlight: '브랜드 핵심 메시지를 깔끔하게 보여주는 밴드형 포스터',
        bulletPoints: ['업체 성격에 맞는 문구 구성', '로고 분위기에 맞춘 포인트 컬러', '밴드에 바로 올리기 쉬운 세로 레이아웃'],
        infoBlocks: [
            { label: '업종', title: '브랜드 성격', description: '업종과 톤을 반영한 메시지' },
            { label: '대상', title: '타깃 고객', description: '읽는 사람이 바로 이해하는 문구' },
            { label: '강점', title: '핵심 특징', description: '제품과 서비스의 차별점 정리' },
            { label: '활용', title: '홍보 목적', description: '밴드 공지/이벤트/안내형 포스터' }
        ],
        closing: '업체 성격과 브랜드 무드를 반영한 결과물을 바로 수정하고 내보낼 수 있습니다.',
        cta: '로고와 자료를 바탕으로 업체용 홍보 이미지를 생성해보세요.',
        logoPlaceholder: '업체 로고',
        visualPlaceholder: '홍보 메인 비주얼'
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

    function storeProfileHistoryItem({ source, templateType, profile, nameHint, imageMode }) {
        if (!profile) return;

        const now = new Date();
        const createdAtLabel = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const sourceLabel = source === 'document' ? '문서 생성' : '직접 입력';
        const summary = [profile.headline, profile.sectionTitle].filter(Boolean).join(' · ');

        const item = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            source,
            templateType,
            imageMode,
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
        if (aiGenerateImage) aiGenerateImage.checked = Boolean(item.imageMode);
        if (pptGenerateImage) pptGenerateImage.checked = Boolean(item.imageMode);
        updateImageGenerationControls();

        const element = replaceCanvasWithElement(item.templateType);
        fillPresentation(element, item.profile);
        syncPresentationImageState(element, { textOnly: !item.imageMode });
        lastProfileDownloadName = item.title.split(' / ')[0] || 'profile-builder';
        setStatus(aiStatus, '히스토리에서 저장된 프로필을 다시 불러왔습니다.', 'success');
        setStatus(pptStatus, '히스토리에서 저장된 프로필을 다시 불러왔습니다.', 'success');
        renderImageIssue(aiImageIssue, null);
        renderImageIssue(pptImageIssue, null);
        updateSlotRegenerateState();
    }

    function buildGenerationStatus(baseMessage, usage, imageMeta) {
        const usageMessage = usage ? ` 오늘 사용량 ${usage.used}/${usage.limit}` : '';

        if (imageMeta?.requested && !imageMeta?.hasAnyImage) {
            const imageMessage = imageMeta.message || '이미지는 프로필 빌더에서 직접 업로드할 수 있습니다.';
            return `${baseMessage}${usageMessage} 텍스트는 정상 생성되었고, 이미지는 자동 생성되지 않아 직접 업로드로 이어서 작업할 수 있습니다. ${imageMessage}`;
        }

        return `${baseMessage}${usageMessage}`;
    }

    function getCurrentPresentationElement() {
        return canvas.querySelector('.pb-presentation');
    }

    function isCurrentProfileTextOnlyChoice() {
        return Boolean(getCurrentPresentationElement()?.classList.contains('is-text-only-choice'));
    }

    function updateSlotRegenerateState() {
        const hasPresentation = currentMode === 'profile' && Boolean(getCurrentPresentationElement());
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
        const fontFamily = fontFamilySelect?.value || defaultTypography.fontFamily;
        const titleSize = Number(titleSizeInput?.value || defaultTypography.titleSize);
        const bodySize = Number(bodySizeInput?.value || defaultTypography.bodySize);
        const pointSize = Number(pointSizeInput?.value || defaultTypography.pointSize);
        const lineHeight = Number(lineHeightInput?.value || defaultTypography.lineHeight);

        canvas.style.setProperty('--pb-font-family', fontFamily);
        canvas.style.setProperty('--pb-title-size', `${titleSize}px`);
        canvas.style.setProperty('--pb-body-size', `${bodySize}px`);
        canvas.style.setProperty('--pb-point-size', `${pointSize}px`);
        canvas.style.setProperty('--pb-body-line-height', String(lineHeight));
        canvas.style.setProperty('--pb-subtitle-size', `${Math.max(bodySize + 10, 24)}px`);
        canvas.style.setProperty('--pb-chip-size', `${Math.max(bodySize, 15)}px`);

        if (titleSizeValue) titleSizeValue.textContent = `${titleSize}px`;
        if (bodySizeValue) bodySizeValue.textContent = `${bodySize}px`;
        if (pointSizeValue) pointSizeValue.textContent = `${pointSize}px`;
        if (lineHeightValue) lineHeightValue.textContent = lineHeight.toFixed(1);
    }

    function bindTypographyControls() {
        [fontFamilySelect, titleSizeInput, bodySizeInput, pointSizeInput, lineHeightInput]
            .filter(Boolean)
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

    function buildBrandPanelMarkup() {
        return `
            <section class="pb-section pb-ai-panel pb-mode-panel" id="pb-brand-panel" data-mode-section="brand" hidden>
                <div class="pb-ai-header">
                    <h3>업체 이미지 생성</h3>
                    <span class="pb-ai-badge">브랜드 포스터</span>
                </div>
                <div class="pb-ai-form">
                    <label class="pb-ai-field">
                        <span>업체명</span>
                        <input id="pb-brand-name" type="text" placeholder="예: 청담도사, 2099 비즈중학교">
                    </label>
                    <label class="pb-ai-field">
                        <span>업종</span>
                        <input id="pb-brand-industry" type="text" placeholder="예: 교육, 뷰티, 식품, 금융, 상담">
                    </label>
                    <label class="pb-ai-field">
                        <span>핵심 제품/서비스</span>
                        <input id="pb-brand-products" type="text" placeholder="예: 학부모 설명회, 프리미엄 스킨케어, 건강식품">
                    </label>
                    <label class="pb-ai-field">
                        <span>업체 특징</span>
                        <textarea id="pb-brand-features" rows="3" placeholder="예: 신뢰감 있는 운영, 프리미엄 이미지, 전문성, 친근한 분위기"></textarea>
                    </label>
                    <label class="pb-ai-field">
                        <span>타깃 고객</span>
                        <input id="pb-brand-target" type="text" placeholder="예: 학부모, 30대 직장인, 자영업자">
                    </label>
                    <label class="pb-ai-field">
                        <span>홍보 목적</span>
                        <input id="pb-brand-goal" type="text" placeholder="예: 밴드 공지, 이벤트 홍보, 신규 고객 유입">
                    </label>
                    <label class="pb-ai-field">
                        <span>브랜드 톤</span>
                        <input id="pb-brand-tone" type="text" placeholder="예: 신뢰감 있는, 따뜻한, 프리미엄, 경쾌한">
                    </label>
                    <label class="pb-ai-field">
                        <span>로고 분위기</span>
                        <input id="pb-brand-logo-mood" type="text" placeholder="예: 미니멀한, 밝은 교육 느낌, 고급스러운, 친근한">
                    </label>
                    <label class="pb-ai-field">
                        <span>참고 자료 요약</span>
                        <textarea id="pb-brand-reference" rows="4" placeholder="파트너사 자료에서 중요한 특징, 제품 설명, 캠페인 내용을 붙여넣어 주세요."></textarea>
                    </label>
                    <label class="pb-ai-field">
                        <span>대표 포인트 컬러</span>
                        <input id="pb-brand-accent" type="color" value="#4F7DFF">
                    </label>
                    <label class="pb-ai-field">
                        <span>로고 업로드</span>
                        <input id="pb-brand-logo-file" type="file" accept="image/*">
                    </label>
                    <label class="pb-ai-field">
                        <span>비주얼 스타일</span>
                        <input id="pb-brand-image-style" type="text" placeholder="예: 깨끗한 3D 일러스트, 브랜드 포스터, 정돈된 상업 비주얼">
                    </label>
                    <label class="pb-ai-inline">
                        <input id="pb-brand-generate-image" type="checkbox" checked>
                        <span>메인 홍보 이미지 자동 생성</span>
                    </label>
                    <button id="pb-brand-generate-btn" class="pb-action-btn primary" type="button">업체 이미지 생성</button>
                    <p id="pb-brand-status" class="pb-ai-status">로고와 업체 특징을 바탕으로 밴드용 세로 홍보 이미지를 구성합니다.</p>
                    <div id="pb-brand-image-issue" class="pb-issue-panel" hidden></div>
                </div>
            </section>`;
    }

    function insertModeTabs() {
        if (!sidebarHeader || sidebarHeader.querySelector('.pb-mode-tabs')) return;

        const modeTabs = document.createElement('div');
        modeTabs.className = 'pb-mode-tabs';
        modeTabs.innerHTML = `
            <button class="pb-mode-tab active" type="button" data-mode="profile">프로필 이미지 생성</button>
            <button class="pb-mode-tab" type="button" data-mode="brand">업체 이미지 생성</button>
        `;
        sidebarHeader.appendChild(modeTabs);
    }

    function insertBrandPanel() {
        if (!sidebar || document.getElementById('pb-brand-panel')) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildBrandPanelMarkup().trim();
        const panel = wrapper.firstElementChild;
        sidebar.insertBefore(panel, paletteContainer);
    }

    function markModeSections() {
        themeSection?.setAttribute('data-mode-section', 'profile');
        document.querySelectorAll('.pb-ai-panel:not(#pb-brand-panel)').forEach((panel) => {
            panel.setAttribute('data-mode-section', 'profile');
        });
        paletteContainer?.setAttribute('data-mode-section', 'profile');
    }

    function createBrandEmptyState() {
        return `
            <div class="pb-empty-state pb-brand-empty-state">
                <div class="pb-empty-icon">BRAND</div>
                <p>업체 이미지 생성 탭에서 업체 정보와 로고를 입력하면 밴드용 홍보 포스터 템플릿이 생성됩니다.</p>
            </div>`;
    }

    function updateModeVisibility(mode) {
        currentMode = mode;
        document.querySelectorAll('[data-mode-section]').forEach((section) => {
            const visible = section.getAttribute('data-mode-section') === mode;
            section.hidden = !visible;
        });

        document.querySelectorAll('.pb-mode-tab').forEach((button) => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });

        if (mode === 'brand') {
            appContainer.classList.add('pb-mode-brand');
            if (exportButton) exportButton.textContent = '이미지 파일 저장';
            if (codeGenerateButton) codeGenerateButton.hidden = true;
            if (!canvas.children.length || canvas.querySelector('.pb-empty-state')) {
                canvas.innerHTML = createBrandEmptyState();
            }
        } else {
            appContainer.classList.remove('pb-mode-brand');
            if (exportButton) exportButton.textContent = '프로필 이미지 저장';
            if (codeGenerateButton) codeGenerateButton.hidden = false;
            if (!canvas.children.length || canvas.querySelector('.pb-brand-empty-state')) {
                canvas.innerHTML = `
                    <div class="pb-empty-state">
                        <div class="pb-empty-icon">DOC</div>
                        <p>문서 업로드 생성 버튼으로 시작하거나, 왼쪽 블록을 끌어와 직접 구성해보세요.</p>
                    </div>`;
            }
        }

        updateSlotRegenerateState();
    }

    function bindModeTabs() {
        document.querySelectorAll('.pb-mode-tab').forEach((button) => {
            button.addEventListener('click', () => updateModeVisibility(button.dataset.mode));
        });
    }

    function buildBrandPosterMarkup() {
        return `
            <section class="pb-brand-poster" data-template-type="brand-poster">
                <div class="pb-brand-poster-inner">
                    <div class="pb-brand-poster-topline" data-brand-slot="badge">${brandPosterTemplate.badge}</div>
                    <div class="pb-brand-poster-logo pb-image-uploadable">
                        <div class="pb-upload-placeholder">${brandPosterTemplate.logoPlaceholder}</div>
                        <img class="pb-uploaded-img" src="" alt="${brandPosterTemplate.logoPlaceholder}">
                    </div>
                    <h2 class="pb-brand-poster-headline" contenteditable="true" data-brand-slot="headline">${brandPosterTemplate.headline}</h2>
                    <p class="pb-brand-poster-subheadline" contenteditable="true" data-brand-slot="subheadline">${brandPosterTemplate.subheadline}</p>
                    <div class="pb-brand-poster-visual pb-image-uploadable">
                        <div class="pb-upload-placeholder">${brandPosterTemplate.visualPlaceholder}</div>
                        <img class="pb-uploaded-img" src="" alt="${brandPosterTemplate.visualPlaceholder}">
                    </div>
                    <div class="pb-brand-poster-summary" contenteditable="true" data-brand-slot="summary">${brandPosterTemplate.summary}</div>
                    <div class="pb-brand-poster-highlight" contenteditable="true" data-brand-slot="highlight">${brandPosterTemplate.highlight}</div>
                    <ul class="pb-brand-poster-points" data-brand-slot="bulletPoints">
                        ${brandPosterTemplate.bulletPoints.map((point) => `<li contenteditable="true">${point}</li>`).join('')}
                    </ul>
                    <div class="pb-brand-poster-info" data-brand-slot="infoBlocks">
                        ${brandPosterTemplate.infoBlocks.map((block) => `
                            <div class="pb-brand-poster-info-card">
                                <span class="pb-brand-poster-info-label">${block.label}</span>
                                <strong>${block.title}</strong>
                                <p>${block.description}</p>
                            </div>
                        `).join('')}
                    </div>
                    <div class="pb-brand-poster-closing" contenteditable="true" data-brand-slot="closing">${brandPosterTemplate.closing}</div>
                    <div class="pb-brand-poster-cta" contenteditable="true" data-brand-slot="cta">${brandPosterTemplate.cta}</div>
                </div>
            </section>`;
    }

    function buildPresentationMarkup(type) {
        const template = templates[type];
        if (!template) return '';

        return `
            <section class="pb-presentation pb-presentation--${template.variant}" data-template-type="${type}">
                <div class="pb-presentation-hero">
                    <div class="pb-presentation-copy">
                        <div class="pb-presentation-eyebrow" contenteditable="true" data-slot="eyebrow">${template.eyebrow}</div>
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
                    <div class="pb-presentation-photo pb-image-uploadable">
                        <div class="pb-upload-placeholder">${template.moodPlaceholder}</div>
                        <img class="pb-uploaded-img" src="" alt="${template.moodPlaceholder}">
                    </div>
                    <div class="pb-presentation-side">
                        <ul class="pb-presentation-points" data-slot="bulletPoints">
                            ${template.points.map((point) => `<li contenteditable="true">${point}</li>`).join('')}
                        </ul>
                        <div class="pb-presentation-card">
                            <h3 contenteditable="true" data-slot="cardTitle">${template.cardTitle}</h3>
                            <p contenteditable="true" data-slot="cardBody">${template.cardBody}</p>
                        </div>
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
            case 'brand-poster':
                return buildBrandPosterMarkup();
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
        deleteButton.addEventListener('click', () => element.remove());
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
            if (node) node.innerHTML = String(value).replace(/\n/g, '<br>');
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
    }

    function updateImageGenerationControls() {
        const profileImagesOn = Boolean(aiGenerateImage?.checked);
        const docImagesOn = Boolean(pptGenerateImage?.checked);

        if (aiGenerateImageHelp) {
            aiGenerateImageHelp.textContent = profileImagesOn
                ? '대표 이미지와 무드 이미지를 함께 시도합니다. 실패해도 직접 업로드로 이어갈 수 있습니다.'
                : '이미지 영역을 완전히 제외하고 텍스트만으로 완성형 프로필을 구성합니다.';
        }
        if (aiImageStyle) {
            aiImageStyle.disabled = !profileImagesOn;
            aiImageStyle.closest('.pb-ai-field')?.classList.toggle('is-disabled', !profileImagesOn);
        }

        if (pptGenerateImageHelp) {
            pptGenerateImageHelp.textContent = docImagesOn
                ? '문서 내용을 바탕으로 대표 이미지와 무드 이미지를 함께 생성합니다.'
                : '문서 내용을 텍스트 중심 랜딩형 프로필로만 구성합니다.';
        }
        if (pptImageStyle) {
            pptImageStyle.disabled = !docImagesOn;
            pptImageStyle.closest('.pb-ai-field')?.classList.toggle('is-disabled', !docImagesOn);
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

    function normalizeExportRichText(root) {
        root.querySelectorAll('.pb-presentation-title, .pb-presentation-card h3, .pb-presentation-closing h3, .pb-presentation-intro, .pb-presentation-body, .pb-presentation-chip, .pb-presentation-card p, .pb-presentation-closing p, .pb-brand-poster-headline, .pb-brand-poster-subheadline, .pb-brand-poster-summary, .pb-brand-poster-highlight, .pb-brand-poster-closing, .pb-brand-poster-cta, .pb-brand-poster-info-card p, .pb-brand-poster-info-card strong').forEach((node) => {
            node.innerHTML = node.innerHTML
                .replace(/<(\/?)(div|p)[^>]*>/gi, (_, closing) => (closing ? '<br>' : ''))
                .replace(/(<br>\s*){2,}/gi, '<br>')
                .replace(/^(<br>\s*)+|(<br>\s*)+$/gi, '');
        });
    }

    function applyEditorFriendlyExportStyles(clone) {
        const computedCanvas = window.getComputedStyle(canvas);
        const fontFamily = computedCanvas.getPropertyValue('--pb-font-family').trim() || defaultTypography.fontFamily;
        const titleSize = computedCanvas.getPropertyValue('--pb-title-size').trim() || `${defaultTypography.titleSize}px`;
        const bodySize = computedCanvas.getPropertyValue('--pb-body-size').trim() || `${defaultTypography.bodySize}px`;
        const pointSize = computedCanvas.getPropertyValue('--pb-point-size').trim() || `${defaultTypography.pointSize}px`;
        const lineHeight = computedCanvas.getPropertyValue('--pb-body-line-height').trim() || String(defaultTypography.lineHeight);
        const subtitleSize = computedCanvas.getPropertyValue('--pb-subtitle-size').trim() || '26px';
        const chipSize = computedCanvas.getPropertyValue('--pb-chip-size').trim() || '16px';

        setInlineStyles(clone, {
            width: '100%',
            'max-width': '540px',
            padding: '40px 30px',
            'border-radius': '24px',
            'box-sizing': 'border-box',
            'background-color': currentBrandBg,
            'font-family': fontFamily,
            color: '#2a211c'
        });

        clone.querySelectorAll('.pb-presentation').forEach((section) => {
            let backgroundValue = 'linear-gradient(180deg, #fdf6f7 0%, #f8e8eb 100%)';
            if (section.classList.contains('pb-presentation--tarot')) {
                backgroundValue = 'linear-gradient(180deg, #faf8fe 0%, #efe8fb 100%)';
            } else if (section.classList.contains('pb-presentation--saju')) {
                backgroundValue = 'linear-gradient(180deg, #fdf9f3 0%, #f5ebdc 100%)';
            }

            setInlineStyles(section, {
                border: '1px solid rgba(124, 88, 70, 0.08)',
                'border-radius': '28px',
                padding: '28px',
                color: '#2a211c',
                'box-shadow': '0 24px 40px rgba(78, 49, 30, 0.08)',
                background: backgroundValue
            });
        });

        clone.querySelectorAll('.pb-presentation-hero').forEach((node) => setInlineStyles(node, {
            display: 'block',
            'margin-bottom': '26px'
        }));

        clone.querySelectorAll('.pb-presentation-copy, .pb-presentation-side').forEach((node) => setInlineStyles(node, {
            display: 'flex',
            'flex-direction': 'column',
            gap: node.classList.contains('pb-presentation-side') ? '20px' : '14px'
        }));

        clone.querySelectorAll('.pb-presentation-eyebrow').forEach((node) => setInlineStyles(node, {
            display: 'inline-block',
            padding: '7px 12px',
            'border-radius': '999px',
            background: 'rgba(255,255,255,0.72)',
            color: currentBrandColor,
            'font-size': '11px',
            'font-weight': '700',
            'letter-spacing': '0.12em',
            'text-transform': 'uppercase'
        }));

        clone.querySelectorAll('.pb-presentation-title').forEach((node) => setInlineStyles(node, {
            margin: '0',
            'font-size': titleSize,
            'line-height': '1.12',
            'letter-spacing': '-0.04em',
            'font-weight': '800',
            'word-break': 'keep-all'
        }));

        clone.querySelectorAll('.pb-presentation-intro, .pb-presentation-body, .pb-presentation-card p, .pb-presentation-closing p').forEach((node) => setInlineStyles(node, {
            margin: '0',
            'font-size': bodySize,
            'line-height': lineHeight,
            color: '#554840',
            'word-break': 'keep-all'
        }));

        clone.querySelectorAll('.pb-presentation-section').forEach((node) => setInlineStyles(node, {
            'margin-bottom': '26px'
        }));

        clone.querySelectorAll('.pb-presentation-chip').forEach((node) => setInlineStyles(node, {
            display: 'inline-block',
            'margin-bottom': '14px',
            padding: '10px 16px',
            'border-radius': '14px',
            background: 'rgba(255,255,255,0.78)',
            'box-shadow': '0 10px 24px rgba(78, 49, 30, 0.05)',
            'font-size': chipSize,
            'font-weight': '800',
            color: '#2a211c'
        }));

        clone.querySelectorAll('.pb-presentation-grid').forEach((node) => setInlineStyles(node, {
            display: 'block',
            'margin-bottom': '28px'
        }));

        clone.querySelectorAll('.pb-presentation-points').forEach((node) => setInlineStyles(node, {
            margin: '0',
            'padding-left': '20px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '12px',
            'font-size': pointSize,
            'font-weight': '700',
            'line-height': '1.55',
            color: '#3a2f28'
        }));

        clone.querySelectorAll('.pb-presentation-card').forEach((node) => setInlineStyles(node, {
            padding: '22px',
            'border-radius': '22px',
            background: 'rgba(255,255,255,0.72)',
            'box-shadow': '0 14px 30px rgba(78, 49, 30, 0.06)'
        }));

        clone.querySelectorAll('.pb-presentation-card h3, .pb-presentation-closing h3').forEach((node) => setInlineStyles(node, {
            margin: '0 0 12px',
            'font-size': subtitleSize,
            'line-height': '1.18',
            'letter-spacing': '-0.04em',
            'font-weight': '800',
            color: '#251d19',
            'word-break': 'keep-all'
        }));

        clone.querySelectorAll('.pb-presentation-closing').forEach((node) => setInlineStyles(node, {
            padding: '22px 24px',
            'border-radius': '24px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.62))'
        }));

        clone.querySelectorAll('.pb-presentation-portrait, .pb-presentation-photo').forEach((node) => {
            const hasImage = Boolean(node.querySelector('.pb-uploaded-img'));
            const isPortrait = node.classList.contains('pb-presentation-portrait');

            setInlineStyles(node, {
                display: 'block',
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
                margin: isPortrait ? '20px 0 0' : '0 0 22px',
                padding: hasImage ? '0' : (isPortrait ? '32px 24px' : '40px 24px'),
                background: hasImage ? 'rgba(255,255,255,0.6)' : 'linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.42))',
                'border-radius': isPortrait ? '28px' : '24px',
                'box-shadow': 'inset 0 0 0 1px rgba(124, 88, 70, 0.08)',
                'box-sizing': 'border-box',
                'text-align': 'center'
            });

            if (!hasImage) {
                node.innerHTML = `<div style="font-size:${bodySize}; line-height:${lineHeight}; color:#8c7a70; font-weight:600;">이미지 등록 영역</div>`;
            }
        });

        clone.querySelectorAll('.pb-presentation-portrait .pb-uploaded-img, .pb-presentation-photo .pb-uploaded-img').forEach((node) => setInlineStyles(node, {
            width: '100%',
            height: 'auto',
            display: 'block',
            'max-width': '100%',
            'object-fit': 'contain'
        }));

        clone.querySelectorAll('.pb-brand-poster').forEach((node) => setInlineStyles(node, {
            width: '100%',
            'border-radius': '30px',
            padding: '18px',
            background: `linear-gradient(180deg, ${hexToRgba(currentBrandColor, 0.12)}, ${hexToRgba(currentBrandColor, 0.05)})`,
            'box-shadow': `0 24px 40px ${hexToRgba(currentBrandColor, 0.12)}`,
            'box-sizing': 'border-box'
        }));

        clone.querySelectorAll('.pb-brand-poster-inner').forEach((node) => setInlineStyles(node, {
            background: '#ffffff',
            'border-radius': '26px',
            padding: '24px',
            border: `1px solid ${hexToRgba(currentBrandColor, 0.16)}`
        }));

        clone.querySelectorAll('.pb-brand-poster-topline').forEach((node) => setInlineStyles(node, {
            display: 'inline-flex',
            padding: '8px 14px',
            'border-radius': '999px',
            background: hexToRgba(currentBrandColor, 0.12),
            color: currentBrandColor,
            'font-size': '12px',
            'font-weight': '800',
            'margin-bottom': '16px'
        }));

        clone.querySelectorAll('.pb-brand-poster-logo, .pb-brand-poster-visual').forEach((node) => {
            const isLogo = node.classList.contains('pb-brand-poster-logo');
            const hasImage = Boolean(node.querySelector('.pb-uploaded-img'));
            setInlineStyles(node, {
                width: '100%',
                'margin-bottom': isLogo ? '18px' : '20px',
                padding: hasImage ? '0' : (isLogo ? '20px' : '48px 24px'),
                background: hasImage ? '#fff' : `linear-gradient(180deg, ${hexToRgba(currentBrandColor, 0.08)}, rgba(255,255,255,0.9))`,
                'border-radius': isLogo ? '18px' : '24px',
                'box-shadow': `inset 0 0 0 1px ${hexToRgba(currentBrandColor, 0.14)}`,
                'box-sizing': 'border-box',
                'text-align': 'center'
            });

            if (!hasImage) {
                node.innerHTML = `<div style="font-size:${bodySize}; line-height:${lineHeight}; color:#7d6f6a; font-weight:600;">${isLogo ? '로고 등록 영역' : '메인 비주얼 영역'}</div>`;
            }
        });

        clone.querySelectorAll('.pb-brand-poster-logo .pb-uploaded-img').forEach((node) => setInlineStyles(node, {
            display: 'block',
            width: '100%',
            'max-width': '180px',
            height: 'auto',
            margin: '0 auto'
        }));

        clone.querySelectorAll('.pb-brand-poster-visual .pb-uploaded-img').forEach((node) => setInlineStyles(node, {
            display: 'block',
            width: '100%',
            'max-width': '100%',
            height: 'auto',
            'border-radius': '24px',
            'object-fit': 'contain'
        }));

        clone.querySelectorAll('.pb-brand-poster-headline').forEach((node) => setInlineStyles(node, {
            margin: '0 0 12px',
            'font-size': titleSize,
            'line-height': '1.1',
            'font-weight': '800',
            'letter-spacing': '-0.04em',
            color: '#222',
            'word-break': 'keep-all'
        }));

        clone.querySelectorAll('.pb-brand-poster-subheadline, .pb-brand-poster-summary, .pb-brand-poster-closing').forEach((node) => setInlineStyles(node, {
            margin: '0 0 16px',
            'font-size': bodySize,
            'line-height': lineHeight,
            color: '#555',
            'word-break': 'keep-all'
        }));

        clone.querySelectorAll('.pb-brand-poster-highlight').forEach((node) => setInlineStyles(node, {
            margin: '0 0 18px',
            padding: '14px 16px',
            'border-radius': '16px',
            background: hexToRgba(currentBrandColor, 0.1),
            color: '#222',
            'font-size': chipSize,
            'font-weight': '800'
        }));

        clone.querySelectorAll('.pb-brand-poster-points').forEach((node) => setInlineStyles(node, {
            margin: '0 0 18px',
            padding: '0 0 0 20px',
            display: 'flex',
            'flex-direction': 'column',
            gap: '10px',
            'font-size': pointSize,
            'line-height': '1.55',
            color: '#333',
            'font-weight': '700'
        }));

        clone.querySelectorAll('.pb-brand-poster-info').forEach((node) => setInlineStyles(node, {
            display: 'grid',
            'grid-template-columns': '1fr 1fr',
            gap: '12px',
            'margin-bottom': '18px'
        }));

        clone.querySelectorAll('.pb-brand-poster-info-card').forEach((node) => setInlineStyles(node, {
            padding: '16px',
            'border-radius': '18px',
            background: '#fff',
            'box-shadow': `inset 0 0 0 1px ${hexToRgba(currentBrandColor, 0.12)}`
        }));

        clone.querySelectorAll('.pb-brand-poster-info-label').forEach((node) => setInlineStyles(node, {
            display: 'block',
            'margin-bottom': '8px',
            color: currentBrandColor,
            'font-size': '11px',
            'font-weight': '800'
        }));

        clone.querySelectorAll('.pb-brand-poster-info-card strong').forEach((node) => setInlineStyles(node, {
            display: 'block',
            'margin-bottom': '6px',
            'font-size': chipSize,
            'line-height': '1.35',
            color: '#222'
        }));

        clone.querySelectorAll('.pb-brand-poster-info-card p, .pb-brand-poster-cta').forEach((node) => setInlineStyles(node, {
            margin: '0',
            'font-size': bodySize,
            'line-height': lineHeight,
            color: '#555'
        }));

        clone.querySelectorAll('.pb-brand-poster-cta').forEach((node) => setInlineStyles(node, {
            padding: '14px 18px',
            'border-radius': '16px',
            background: currentBrandColor,
            color: '#fff',
            'font-weight': '700',
            'text-align': 'center'
        }));

        normalizeExportRichText(clone);
    }

    async function requestAiProfile() {
        const templateType = aiTemplate.value;
        const templateConfig = templates[templateType];
        const name = aiName.value.trim();
        const specialty = aiSpecialty.value.trim();
        const tone = aiTone.value.trim();
        const career = aiCareer.value.trim();
        const imageStyle = aiImageStyle.value.trim();
        const shouldGenerateImages = aiGenerateImage.checked;

        if (!name || !specialty || !tone || !career) {
            setStatus(aiStatus, '상담사명, 전문분야, 상담 톤, 경력/강점을 먼저 입력해주세요.', 'error');
            return;
        }

        aiGenerateButton.disabled = true;
        setStatus(aiStatus, 'AI가 입력한 정보를 바탕으로 소개 페이지를 생성하는 중입니다...', 'loading');

        try {
            const response = await fetch('/api/generate-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateType,
                    name,
                    specialty,
                    tone,
                    career,
                    imageStyle,
                    generateImage: shouldGenerateImages
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '생성 요청에 실패했습니다.');
            }

            applyTheme(templateConfig.theme);
            const element = replaceCanvasWithElement(templateType);
            fillPresentation(element, data.profile);
            syncPresentationImageState(element, { textOnly: !shouldGenerateImages });
            lastProfileDownloadName = (name || specialty || 'profile-builder').trim();
            storeProfileHistoryItem({
                source: 'direct',
                templateType,
                profile: getCurrentPresentationPayload(element.querySelector('.pb-presentation') || element),
                nameHint: lastProfileDownloadName,
                imageMode: shouldGenerateImages
            });

            setStatus(
                aiStatus,
                buildGenerationStatus(shouldGenerateImages ? '생성이 완료되었습니다.' : '글 중심 프로필 구성이 완료되었습니다.', data.usage, data.imageMeta),
                'success'
            );
            renderImageIssue(aiImageIssue, data.imageMeta);
            updateSlotRegenerateState();
        } catch (error) {
            setStatus(aiStatus, error.message || 'AI 생성 중 오류가 발생했습니다.', 'error');
            renderImageIssue(aiImageIssue, null);
        } finally {
            aiGenerateButton.disabled = false;
        }
    }

    async function requestPptGeneration() {
        const file = pptFile.files[0];
        const templateType = pptTemplate.value;
        const templateConfig = templates[templateType];
        const shouldGenerateImages = pptGenerateImage.checked;

        if (!file) {
            setStatus(pptStatus, '먼저 PPT 또는 Excel 파일을 선택해주세요.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('pptFile', file);
        formData.append('templateType', templateType);
        formData.append('imageStyle', pptImageStyle.value.trim());
        formData.append('generateImage', String(shouldGenerateImages));

        pptGenerateButton.disabled = true;
        setStatus(pptStatus, '문서 내용을 분석하고 완성형 소개 페이지를 구성하는 중입니다...', 'loading');

        try {
            const response = await fetch('/api/generate-from-ppt', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '문서 생성 요청에 실패했습니다.');
            }

            applyTheme(templateConfig.theme);
            const element = replaceCanvasWithElement(templateType);
            fillPresentation(element, data.profile);
            syncPresentationImageState(element, { textOnly: !shouldGenerateImages });
            lastProfileDownloadName = file.name.replace(/\.[^.]+$/, '') || 'profile-builder';
            storeProfileHistoryItem({
                source: 'document',
                templateType,
                profile: getCurrentPresentationPayload(element.querySelector('.pb-presentation') || element),
                nameHint: lastProfileDownloadName,
                imageMode: shouldGenerateImages
            });

            const slideMessage = data.meta?.slidesCount ? `슬라이드 ${data.meta.slidesCount}장 분석 완료.` : '';
            const sheetMessage = data.meta?.sheetsCount ? `시트 ${data.meta.sheetsCount}개 분석 완료.` : '';
            const sourceMessage = [slideMessage, sheetMessage].filter(Boolean).join(' ');
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
            updateSlotRegenerateState();
        } catch (error) {
            setStatus(pptStatus, error.message || '문서 생성 중 오류가 발생했습니다.', 'error');
            renderImageIssue(pptImageIssue, null);
        } finally {
            pptGenerateButton.disabled = false;
        }
    }

    function cacheBrandControls() {
        brandNameInput = document.getElementById('pb-brand-name');
        brandIndustryInput = document.getElementById('pb-brand-industry');
        brandProductsInput = document.getElementById('pb-brand-products');
        brandFeaturesInput = document.getElementById('pb-brand-features');
        brandTargetInput = document.getElementById('pb-brand-target');
        brandGoalInput = document.getElementById('pb-brand-goal');
        brandToneInput = document.getElementById('pb-brand-tone');
        brandLogoMoodInput = document.getElementById('pb-brand-logo-mood');
        brandReferenceInput = document.getElementById('pb-brand-reference');
        brandAccentInput = document.getElementById('pb-brand-accent');
        brandLogoFileInput = document.getElementById('pb-brand-logo-file');
        brandImageStyleInput = document.getElementById('pb-brand-image-style');
        brandGenerateImageInput = document.getElementById('pb-brand-generate-image');
        brandGenerateButton = document.getElementById('pb-brand-generate-btn');
        brandStatus = document.getElementById('pb-brand-status');
        brandImageIssue = document.getElementById('pb-brand-image-issue');
    }

    async function requestBrandPosterGeneration() {
        const brandName = brandNameInput?.value.trim();
        const industry = brandIndustryInput?.value.trim();
        const products = brandProductsInput?.value.trim();
        const features = brandFeaturesInput?.value.trim();
        const targetAudience = brandTargetInput?.value.trim();
        const promoGoal = brandGoalInput?.value.trim();
        const brandTone = brandToneInput?.value.trim();
        const logoMood = brandLogoMoodInput?.value.trim();
        const referenceText = brandReferenceInput?.value.trim();
        const imageStyle = brandImageStyleInput?.value.trim();
        const accentColor = brandAccentInput?.value || '#4F7DFF';

        if (!brandName || !industry || !products || !features || !targetAudience || !promoGoal) {
            setStatus(brandStatus, '업체명, 업종, 제품/서비스, 업체 특징, 타깃 고객, 홍보 목적을 먼저 입력해주세요.', 'error');
            return;
        }

        brandGenerateButton.disabled = true;
        setStatus(brandStatus, '업체 자료를 바탕으로 밴드용 홍보 이미지를 구성하는 중입니다...', 'loading');

        try {
            currentBrandLogoDataUrl = await readFileAsDataUrl(brandLogoFileInput?.files?.[0]);

            const response = await fetch('/api/generate-brand-poster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brandName,
                    industry,
                    products,
                    features,
                    targetAudience,
                    promoGoal,
                    brandTone,
                    logoMood,
                    referenceText,
                    imageStyle,
                    generateImage: Boolean(brandGenerateImageInput?.checked)
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '업체 이미지 생성 요청이 실패했습니다.');
            }

            applyBrandPosterTheme(accentColor);
            const element = replaceCanvasWithElement('brand-poster');
            fillBrandPoster(element, data.poster, currentBrandLogoDataUrl);

            setStatus(brandStatus, buildGenerationStatus('업체 이미지 생성이 완료되었습니다.', data.usage, data.imageMeta), 'success');
            renderImageIssue(brandImageIssue, data.imageMeta);
        } catch (error) {
            setStatus(brandStatus, error.message || '업체 이미지 생성 중 오류가 발생했습니다.', 'error');
            renderImageIssue(brandImageIssue, null);
        } finally {
            brandGenerateButton.disabled = false;
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
            syncPresentationImageState(currentUploadTargetImg);
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
        if (currentMode === 'brand') {
            canvas.innerHTML = createBrandEmptyState();
            updateSlotRegenerateState();
            return;
        }
        canvas.innerHTML = `
            <div class="pb-empty-state">
                <div class="pb-empty-icon">DOC</div>
                <p>문서 업로드 생성 버튼으로 시작하거나, 왼쪽 블록을 끌어와 직접 구성해보세요.</p>
            </div>`;
        updateSlotRegenerateState();
    });

    exportButton?.addEventListener('click', async () => {
        if (currentMode === 'brand') {
            await downloadBrandPosterImage();
            return;
        }

        await downloadProfileImage();
    });

    codeGenerateButton?.addEventListener('click', () => {
        if (currentMode === 'brand') {
            window.alert('업체 이미지 생성 모드에서는 코드보다 이미지 파일 저장을 사용해주세요.');
            return;
        }

        const clone = getCleanCanvasClone();
        const wrapper = document.createElement('div');
        wrapper.appendChild(clone);
        codeOutput.value = wrapper.innerHTML.trim();
        codeModal.classList.add('active');
    });

    document.getElementById('pb-close-code-modal')?.addEventListener('click', () => codeModal.classList.remove('active'));

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

    function applyBrandPosterTheme(accentColor) {
        const accent = accentColor || '#4F7DFF';
        canvas.style.setProperty('--pb-brand-accent', accent);
        canvas.style.setProperty('--pb-brand-accent-soft', hexToRgba(accent, 0.14));
        currentBrandColor = accent;
        currentBrandBg = hexToRgba(accent, 0.08);
    }

    function fillBrandPoster(element, payload, logoDataUrl) {
        if (!element || !payload) return;

        const slotMap = {
            badge: payload.badge,
            headline: payload.headline,
            subheadline: payload.subheadline,
            summary: payload.summary,
            highlight: payload.highlight,
            closing: payload.closing,
            cta: payload.cta
        };

        Object.entries(slotMap).forEach(([slot, value]) => {
            if (!value) return;
            const node = element.querySelector(`[data-brand-slot="${slot}"]`);
            if (node) node.innerHTML = String(value).replace(/\n/g, '<br>');
        });

        if (Array.isArray(payload.bulletPoints)) {
            const list = element.querySelector('[data-brand-slot="bulletPoints"]');
            if (list) {
                list.innerHTML = payload.bulletPoints.map((item) => `<li contenteditable="true">${item}</li>`).join('');
            }
        }

        if (Array.isArray(payload.infoBlocks)) {
            const infoContainer = element.querySelector('[data-brand-slot="infoBlocks"]');
            if (infoContainer) {
                infoContainer.innerHTML = payload.infoBlocks.slice(0, 4).map((block) => `
                    <div class="pb-brand-poster-info-card">
                        <span class="pb-brand-poster-info-label">${block.label || '안내'}</span>
                        <strong>${block.title || ''}</strong>
                        <p>${block.description || ''}</p>
                    </div>
                `).join('');
            }
        }

        const logoArea = element.querySelector('.pb-brand-poster-logo');
        const logoImg = logoArea?.querySelector('.pb-uploaded-img');
        const logoPlaceholder = logoArea?.querySelector('.pb-upload-placeholder');
        if (logoDataUrl && logoImg && logoPlaceholder) {
            logoImg.src = logoDataUrl;
            logoImg.style.display = 'block';
            logoPlaceholder.style.display = 'none';
        }

        if (payload.promoImage) {
            const visual = element.querySelector('.pb-brand-poster-visual');
            const img = visual?.querySelector('.pb-uploaded-img');
            const placeholder = visual?.querySelector('.pb-upload-placeholder');
            if (img && placeholder) {
                img.src = payload.promoImage;
                img.style.display = 'block';
                placeholder.style.display = 'none';
            }
        }
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve('');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result || '');
            reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
            reader.readAsDataURL(file);
        });
    }

    function getVisualCanvasClone() {
        const clone = canvas.cloneNode(true);
        clone.querySelectorAll('.pb-delete-btn').forEach((button) => button.remove());
        clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
        const empty = clone.querySelector('.pb-empty-state');
        if (empty) empty.remove();
        return clone;
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
                    currentProfile
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '부분 재생성 요청에 실패했습니다.');
            }

            fillPresentation(presentation, data.profile);
            syncPresentationImageState(presentation, { textOnly: textOnlyChoice });
            const restoredProfile = getCurrentPresentationPayload(presentation);
            storeProfileHistoryItem({
                source: 'direct',
                templateType,
                profile: restoredProfile,
                nameHint: lastProfileDownloadName,
                imageMode: !textOnlyChoice
            });
            setStatus(slotStatus, `${slotLabelMap[slotKey] || '선택 영역'}를 다시 생성했습니다.`, 'success');
        } catch (error) {
            setStatus(slotStatus, error.message || '부분 재생성 중 오류가 발생했습니다.', 'error');
        } finally {
            updateSlotRegenerateState();
        }
    }

    async function downloadBrandPosterImage() {
        const poster = canvas.querySelector('.pb-brand-poster');
        if (!poster) {
            window.alert('먼저 업체 이미지 결과를 생성해주세요.');
            return;
        }

        if (typeof window.html2canvas !== 'function') {
            window.alert('이미지 저장 기능을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
            return;
        }

        const stage = document.createElement('div');
        const clone = getVisualCanvasClone();
        const posterClone = clone.querySelector('.pb-brand-poster');
        if (posterClone) {
            posterClone.style.width = '540px';
            posterClone.style.maxWidth = '540px';
            posterClone.style.margin = '0 auto';
        }

        const logoClone = clone.querySelector('.pb-brand-poster-logo .pb-uploaded-img');
        if (logoClone) {
            logoClone.style.maxWidth = '100%';
            logoClone.style.maxHeight = '96px';
            logoClone.style.width = 'auto';
            logoClone.style.height = 'auto';
        }

        const visualClone = clone.querySelector('.pb-brand-poster-visual .pb-uploaded-img');
        if (visualClone) {
            visualClone.style.maxHeight = '320px';
            visualClone.style.width = '100%';
            visualClone.style.height = 'auto';
        }

        stage.style.position = 'fixed';
        stage.style.left = '-10000px';
        stage.style.top = '0';
        stage.style.padding = '24px';
        stage.style.background = currentBrandBg || '#f3f6ff';
        stage.style.zIndex = '-1';
        stage.style.pointerEvents = 'none';
        stage.appendChild(clone);
        document.body.appendChild(stage);

        try {
            const rendered = await window.html2canvas(clone, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                logging: false
            });

            const link = document.createElement('a');
            const brandName = (brandNameInput?.value || 'brand-poster').trim().replace(/[\\/:*?"<>|]+/g, '-');
            link.href = rendered.toDataURL('image/png');
            link.download = `${brandName || 'brand-poster'}.png`;
            link.click();
        } catch (error) {
            console.error(error);
            window.alert('이미지 파일 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            stage.remove();
        }
    }

    async function downloadProfileImage() {
        const presentation = canvas.querySelector('.pb-presentation');
        if (!presentation) {
            window.alert('먼저 프로필 결과를 생성해주세요.');
            return;
        }

        if (typeof window.html2canvas !== 'function') {
            window.alert('이미지 저장 기능을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
            return;
        }

        const stage = document.createElement('div');
        const clone = getVisualCanvasClone();

        clone.style.width = '540px';
        clone.style.maxWidth = '540px';
        clone.style.margin = '0 auto';
        clone.style.boxShadow = 'none';

        clone.querySelectorAll('.pb-image-uploadable').forEach((uploadable) => {
            const img = uploadable.querySelector('.pb-uploaded-img');
            const placeholder = uploadable.querySelector('.pb-upload-placeholder');
            const hasImage = Boolean(img && img.getAttribute('src'));

            if (hasImage) {
                if (placeholder) placeholder.remove();
                return;
            }

            if (uploadable.closest('.pb-presentation.is-text-only-choice')) {
                uploadable.remove();
                return;
            }

            if (placeholder) {
                placeholder.innerHTML = '';
            }
        });

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
            const rendered = await window.html2canvas(clone, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                logging: false
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
    slotRegenerateButtons.forEach((button) => {
        button.addEventListener('click', () => requestSlotRegeneration(button.dataset.slotKey));
    });

    insertModeTabs();
    insertBrandPanel();
    cacheBrandControls();
    markModeSections();
    bindModeTabs();
    initializeCollapsibles();
    bindUploadables(document.body);
    bindTypographyControls();
    bindImageModeToggles();
    aiGenerateImage?.addEventListener('change', updateImageGenerationControls);
    pptGenerateImage?.addEventListener('change', updateImageGenerationControls);
    brandGenerateButton?.addEventListener('click', requestBrandPosterGeneration);
    brandAccentInput?.addEventListener('input', (event) => {
        if (currentMode === 'brand') {
            applyBrandPosterTheme(event.target.value);
        }
    });
    applyTheme('pb-theme-sinjeom');
    applyTypographySettings();
    updateImageGenerationControls();
    renderProfileHistory();
    updateSlotRegenerateState();
    updateModeVisibility('profile');
});
