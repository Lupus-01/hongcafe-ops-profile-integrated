(function () {
    'use strict';
    window.ProfileSitePreview = {
        create({ canvas, createCode }) {
            const byId = (id) => document.getElementById(id);
            const panel = byId('pb-site-view');
            const editor = byId('pb-editor-view');
            const frame = byId('pb-site-view-frame');
            const status = byId('pb-site-view-status');
            const width = byId('pb-site-view-width');
            let timer;
            let lastCode = null;
            let frameObserver;
            function fitHeight() {
                if (frame.hidden) return;
                const body = frame.contentDocument?.body;
                if (body) frame.style.height = `${Math.max(100, Math.ceil(body.getBoundingClientRect().height))}px`;
            }
            function render() {
                if (panel.hidden) return;
                try {
                    const code = createCode();
                    status.textContent = '현재 사이트 등록용 HTML을 표시하고 있습니다.';
                    status.dataset.state = 'success';
                    frame.hidden = false;
                    if (lastCode !== code) {
                        lastCode = code;
                        frameObserver?.disconnect();
                        // 편집용 CSS와 실행 스크립트는 미리보기에 전달하지 않는다.
                        frame.srcdoc = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: blob:; style-src 'unsafe-inline'; base-uri https://hongcafe.peoplev.co.kr"><base href="https://hongcafe.peoplev.co.kr/"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:0}body{display:flow-root}</style></head><body>${code}</body></html>`;
                    }
                    fitHeight();
                } catch (error) {
                    lastCode = null;
                    frameObserver?.disconnect();
                    frame.hidden = true;
                    frame.removeAttribute('srcdoc');
                    status.dataset.state = 'error';
                    status.textContent = error.message || '사이트 미리보기를 만들 수 없습니다.';
                }
            }
            function refresh() {
                clearTimeout(timer);
                timer = setTimeout(render, 100);
            }
            function show(mode) {
                const site = mode === 'site';
                panel.hidden = !site;
                editor.hidden = site;
                byId('pb-site-view-btn').setAttribute('aria-pressed', String(site));
                byId('pb-edit-view-btn').setAttribute('aria-pressed', String(!site));
                if (site) refresh();
            }
            frame.addEventListener('load', () => {
                frameObserver?.disconnect();
                if (frame.hidden || !frame.contentDocument?.body) return;
                frameObserver = new ResizeObserver(fitHeight);
                frameObserver.observe(frame.contentDocument.body);
                fitHeight();
            });
            width.addEventListener('change', () => {
                frame.style.width = `${Number(width.value) === 720 ? 720 : 375}px`;
                fitHeight();
            });
            frame.style.width = '375px';
            byId('pb-site-view-btn').addEventListener('click', () => show('site'));
            byId('pb-edit-view-btn').addEventListener('click', () => show('edit'));
            byId('pb-site-view-refresh').addEventListener('click', render);
            for (const id of ['pb-portrait-site-url', 'pb-mood-site-url', 'pb-embed-images-in-code']) {
                byId(id)?.addEventListener('input', refresh);
                byId(id)?.addEventListener('change', refresh);
            }
            new MutationObserver(refresh).observe(canvas, { childList: true, subtree: true, characterData: true, attributes: true });
            show('site');
            return { show, refresh };
        }
    };
}());
