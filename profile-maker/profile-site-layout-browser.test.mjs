import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const chrome = process.env.PROFILE_TEST_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const source = fs.readFileSync(path.join(directory, 'script.js'), 'utf8');
function extract(name) {
    const start = source.indexOf(`    function ${name}(`);
    assert.ok(start >= 0, name);
    const rest = source.slice(start + 4);
    return rest.slice(0, rest.search(/\n    (?:async )?function /)).trim();
}

test('serialized site output preserves bullets, alignment and spacing at mobile and desktop widths', { skip: !fs.existsSync(chrome) }, () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'hongcafe-site-layout-'));
    const functions = ['buildPresentationMarkup', 'setInlineStyles', 'setProtectedInlineStyles', 'normalizeExportRichText', 'stabilizeExportListMarkers', 'appendProfileExportCaptureStyles', 'applySiteListMarkers', 'applyProfileSiteProtectionStyles', 'applyEditorFriendlyExportStyles'].map(extract).join('\n');
    const run = () => {
        const check = (condition, message) => { if (!condition) throw new Error(message); };
        const close = (a, b, message) => check(Math.abs(a - b) < 1, `${message}: ${a} / ${b}`);
        const template = {
            headline: '막막한 관계의 이정표를 찾기 위한 첫 번째 카드',
            intro: '상담사와 함께 깊은 고민을 정리합니다. 차분한 리딩으로 마음속 이야기를 풀어나갑니다.',
            sectionTitle: '관계를 가로막는 감정의 결 살피기', sectionBody: '현재 위치와 감정의 흐름을 단계적으로 진단하고 선택할 수 있는 방향을 함께 살펴봅니다.',
            cardTitle: '상징의 연결로 읽어내는 심리의 갈림길',
            points: ['다채로운 덱을 활용한 상담', '관계와 감정의 흐름을 살피고 선택할 수 있는 여러 방향을 함께 정리하는 긴 문장입니다.', '마음의 이야기를 전하는 리딩'],
            cardBody: '배열된 상징을 통해 감정의 변화를 객관적으로 해석합니다.',
            closingTitle: '답답한 마음을 열어가는 차분한 기록', closingBody: '고민의 해답을 찾을 수 있도록 성실한 태도로 함께하겠습니다.',
            portraitPlaceholder: '대표 이미지', moodPlaceholder: '무드 이미지'
        };
        for (const variant of ['tarot', 'saju', 'sinjeom']) {
            templates[variant] = { ...template, variant };
            for (const width of [320, 375, 430, 720]) {
              for (const resizeLegacy of [false, 'empty', 'text', 'missing']) {
                const root = document.createElement('div');
                root.innerHTML = buildPresentationMarkup(variant);
                const imageUrl = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="350"><rect width="640" height="350" fill="#ccc3de"/></svg>');
                root.querySelectorAll('img').forEach((img) => img.setAttribute('src', imageUrl));
                root.querySelectorAll('.pb-upload-placeholder').forEach((node) => node.remove());
                const originalText = root.textContent.replace(/\s/g, '');
                if (resizeLegacy) {
                    // 이전 큰 글자·장식·여백이 있는 HTML을 최신 기준으로 변환한다.
                    applyEditorFriendlyExportStyles(root, { outputMode: 'capture' });
                    root.querySelectorAll('style').forEach((node) => node.remove());
                    root.querySelectorAll('.pb-export-point-marker').forEach((node) => node.remove());
                    if (resizeLegacy !== 'missing') root.querySelectorAll('li').forEach((item) => {
                        const marker = document.createElement('span');
                        marker.className = 'pb-export-point-marker';
                        marker.setAttribute('aria-hidden', 'true');
                        marker.style.cssText = 'display:inline-block;width:7px;height:7px;margin-top:0.68em;border-radius:999px;background:#6335b4';
                        marker.textContent = resizeLegacy === 'text' ? '·' : '';
                        item.prepend(marker);
                    });
                    const original = root.outerHTML;
                    const result = ProfileCodeResizer.applySiteDesign(original);
                    check(ProfileCodeResizer.verifyStyleOnlySource(original, result.code), 'every non-style source byte preserved');
                    check(ProfileCodeResizer.verifyDOM(original, result.code, document, { mode: 'site' }), 'converted DOM preservation');
                    check(ProfileCodeResizer.applySiteDesign(result.code).code === result.code, 'repeated conversion is stable');
                    root.outerCode = result.code;
                } else {
                    applyEditorFriendlyExportStyles(root, { outputMode: 'site' });
                    applyEditorFriendlyExportStyles(root, { outputMode: 'site' });
                }
                const frame = document.createElement('div');
                frame.style.cssText = `width:${width}px; margin:20px; text-align:center`;
                frame.innerHTML = root.outerCode || root.outerHTML; // 실제 저장과 같은 직렬화 이후 검사
                document.body.appendChild(frame);
                const output = frame.firstElementChild;
                check(output.querySelectorAll('.pb-export-point-marker').length === (resizeLegacy === 'missing' ? 0 : 3), 'marker elements are never added or deleted by conversion');
                check(output.textContent.replace(/[·\s]/g, '') === originalText, 'copy preserved');
                output.querySelectorAll('img').forEach((img) => check(img.getAttribute('src') === imageUrl, 'image URL preserved'));
                const left = output.getBoundingClientRect().left + 16;
                for (const selector of ['h2', 'h3', 'p', '.pb-presentation-chip', '.pb-export-point-marker']) {
                    output.querySelectorAll(selector).forEach((node) => {
                        const inset = node.closest('.pb-presentation-detail') ? 16 : 0;
                        close(node.getBoundingClientRect().left, left + inset, 'left alignment');
                        check(getComputedStyle(node).textAlign === 'left', 'host center alignment overridden');
                    });
                }
                const chip = output.querySelector('.pb-presentation-chip');
                output.querySelectorAll('h2,h3').forEach((node) => {
                    check(getComputedStyle(node).fontSize === '26px', 'title size');
                    check(getComputedStyle(node).lineHeight === '32.5px', 'title line height');
                });
                output.querySelectorAll('p,li,.pb-presentation-chip').forEach((node) => check(getComputedStyle(node).fontSize === '16px', 'body and chip size'));
                output.querySelectorAll('p,li').forEach((node) => check(getComputedStyle(node).lineHeight === '24px', 'body line height'));
                output.querySelectorAll('.pb-presentation-portrait,.pb-presentation-photo,img').forEach((node) => check(getComputedStyle(node).borderRadius === '8px', 'image radius'));
                output.querySelectorAll('.pb-presentation-section,.pb-presentation-closing').forEach((node) => {
                    check(getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)', 'section background cleared');
                    check(getComputedStyle(node).borderLeftWidth === '0px', 'section border cleared');
                });
                const chipStyle = getComputedStyle(chip);
                check(chipStyle.paddingLeft === '12px' && chipStyle.paddingRight === '12px' && chipStyle.paddingTop === '8px' && chipStyle.paddingBottom === '8px', 'chip breathing room');
                const detail = output.querySelector('.pb-presentation-detail');
                close(detail.getBoundingClientRect().left, left, 'detail outer edge');
                close(output.getBoundingClientRect().right - detail.getBoundingClientRect().right, 16, 'right outer spacing');
                check(getComputedStyle(detail).padding === '16px', 'detail breathing room');
                close(detail.getBoundingClientRect().top - output.querySelector('.pb-presentation-photo').getBoundingClientRect().bottom, 16, 'photo to detail spacing');
                close(output.querySelector('h2').getBoundingClientRect().top - output.getBoundingClientRect().top, 30, 'top spacing');
                const sections = ['.pb-presentation-hero', '.pb-presentation-section', '.pb-presentation-grid', '.pb-presentation-closing'].map((selector) => output.querySelector(selector));
                for (let i = 1; i < sections.length; i++) close(sections[i].getBoundingClientRect().top - sections[i - 1].getBoundingClientRect().bottom, 30, 'section gap');
                for (const selector of ['.pb-presentation-section', '.pb-presentation-closing']) {
                    const style = getComputedStyle(output.querySelector(selector));
                    check(style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.borderLeftWidth === '0px', 'box decoration removed');
                }
                const items = [...output.querySelectorAll('li')];
                close(items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().bottom, 6, 'list gap');
                if (resizeLegacy === 'missing') {
                    check(getComputedStyle(items[1]).paddingLeft === '0px' && getComputedStyle(items[1]).marginLeft === '16px', 'native CSS marker text indent');
                    check(getComputedStyle(items[1]).display === 'list-item' && getComputedStyle(items[1]).listStyleType.includes('·'), 'native CSS marker is visible');
                } else {
                    check(getComputedStyle(items[1]).paddingLeft === '16px', 'wrapped list text indent');
                    const marker = output.querySelector('.pb-export-point-marker');
                    check(marker.textContent === (resizeLegacy === 'empty' ? '' : '·'), 'original marker content preserved');
                    check(marker.getBoundingClientRect().width > 0 && marker.getBoundingClientRect().height > 0, 'original marker remains visible');
                }
                check(frame.scrollWidth <= width, 'no horizontal overflow');
                output.querySelectorAll('h2,h3,p,li,.pb-presentation-chip').forEach((node) => check(node.scrollWidth <= node.clientWidth + 1, 'no clipped text'));
                if (variant !== 'tarot' || width !== 375 || resizeLegacy !== 'text') frame.remove();
              }
            }
        }
        const label = document.createElement('p');
        label.id = 'test-result'; label.textContent = 'PASS'; document.body.appendChild(label);
    };
    const page = `<!doctype html><meta charset="utf-8"><style>body{margin:0;font-family:Arial,sans-serif}</style><script>
        ${fs.readFileSync(path.join(directory, 'profile-code-resizer.js'), 'utf8')}
        const templates = {};
        const defaultTypography = ${source.match(/const defaultTypography = (\{[\s\S]*?\});/)[1]};
        const siteTypography = ${source.match(/const siteTypography = (\{[\s\S]*?\});/)[1]};
        const currentBrandBg='#f7f6fb', currentBrandColor='#6335b4', currentBrandLight='#ece5f7';
        ${functions}
        window.onload = () => { try { (${run})(); } catch (e) { document.body.textContent = 'FAIL: ' + e.stack; } };
        </script>`;
    const file = path.join(temporary, 'test.html');
    fs.writeFileSync(file, page);
    const capture = process.env.PROFILE_TEST_SCREENSHOT ? [`--screenshot=${path.resolve(process.env.PROFILE_TEST_SCREENSHOT)}`] : [];
    const output = execFileSync(chrome, ['--headless', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-extensions', '--host-resolver-rules=MAP * ~NOTFOUND', `--user-data-dir=${path.join(temporary, 'browser')}`, '--window-size=800,2000', ...capture, '--virtual-time-budget=2000', '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', timeout: 45000, maxBuffer: 4 * 1024 * 1024, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.ok(/id="test-result">PASS<\/p>/.test(output), output.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1]?.slice(-2000) || 'Browser did not finish');
});
