document.addEventListener('DOMContentLoaded', () => {
    'use strict';
    const byId = (id) => document.getElementById(id);
    const maker = byId('pb-app');
    const panel = byId('pb-resizer');
    const source = byId('pb-resize-source');
    const output = byId('pb-resize-output');
    const title = byId('pb-resize-title');
    const body = byId('pb-resize-body');
    const status = byId('pb-resize-status');
    const copy = byId('pb-resize-copy');
    const save = byId('pb-resize-save');
    const preview = byId('pb-resize-preview');
    let verifiedSource = '';
    let fileSequence = 0;
    const setStatus = (message, state = 'idle') => {
        status.textContent = message;
        status.dataset.state = state;
    };
    const updatePreset = () => {
        byId('pb-resize-canvas').setAttribute('aria-pressed', String(Number(title.value) === 66 && Number(body.value) === 35));
        byId('pb-resize-site').setAttribute('aria-pressed', String(Number(title.value) === 42 && Number(body.value) === 20));
    };
    const invalidate = () => {
        output.value = '';
        verifiedSource = '';
        copy.disabled = save.disabled = preview.disabled = true;
        byId('pb-resize-previews').hidden = true;
        byId('pb-resize-before').removeAttribute('srcdoc');
        byId('pb-resize-after').removeAttribute('srcdoc');
        updatePreset();
        setStatus('입력 후 크기 적용 및 검증 버튼을 눌러주세요.');
    };
    for (const [id, resizing] of [['pb-maker-tab', false], ['pb-resizer-tab', true]]) {
        byId(id).addEventListener('click', () => {
            maker.hidden = resizing;
            panel.hidden = !resizing;
            byId('pb-maker-tab').setAttribute('aria-pressed', String(!resizing));
            byId('pb-resizer-tab').setAttribute('aria-pressed', String(resizing));
        });
    }
    for (const input of [source, title, body]) input.addEventListener('input', () => {
        fileSequence += 1;
        invalidate();
        if (input === source) byId('pb-resize-file-name').textContent = '원본 코드 직접 입력 중';
    });
    for (const [id, sizes] of [['pb-resize-site', [42, 20]], ['pb-resize-canvas', [66, 35]]]) {
        byId(id).addEventListener('click', () => { [title.value, body.value] = sizes; invalidate(); });
    }
    byId('pb-resize-file').addEventListener('change', async (event) => {
        const sequence = ++fileSequence;
        invalidate();
        const file = event.target.files[0];
        if (!file) return;
        byId('pb-resize-file-name').textContent = `${file.name} · 읽는 중`;
        try {
            if (!/\.(txt|html?)$/i.test(file.name)) throw new Error('.txt 또는 .html 파일을 선택해주세요.');
            if (file.size > 30 * 1024 * 1024) throw new Error('30MB 이하의 코드 파일을 선택해주세요.');
            const text = await file.text();
            if (sequence !== fileSequence) return;
            invalidate();
            source.value = text;
            byId('pb-resize-file-name').textContent = `${file.name} · 불러오기 완료`;
            setStatus('파일을 불러왔습니다. 크기 적용 및 검증 버튼을 눌러주세요.');
        } catch (error) {
            if (sequence === fileSequence) {
                byId('pb-resize-file-name').textContent = `${file.name} · 불러오기 실패`;
                setStatus(error.message, 'error');
            }
        }
    });

    byId('pb-resize-apply').addEventListener('click', () => {
        invalidate();
        try {
            const result = ProfileCodeResizer.resize(source.value, Number(title.value), Number(body.value));
            ProfileCodeResizer.verifyDOM(source.value, result.code, document);
            verifiedSource = source.value;
            output.value = result.code;
            copy.disabled = save.disabled = preview.disabled = false;
            setStatus(`검증 통과: 제목 ${result.counts.title}곳, 본문 ${result.counts.body}곳 / 크기 지정 ${result.changes}곳 변경. 내용·구조·다른 스타일 보존 확인.`, 'success');
        } catch (error) { setStatus(error.message, 'error'); }
    });
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(output.value);
            setStatus('검증된 수정 코드를 복사했습니다.', 'success');
        } catch {
            output.focus(); output.select();
            setStatus('자동 복사가 차단되었습니다. 선택된 코드를 Ctrl+C로 복사해주세요.');
        }
    });
    save.addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([output.value], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'profile-font-size-adjusted.txt';
        link.click();
        setStatus('검증된 수정 코드의 파일 저장을 요청했습니다.', 'success');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    preview.addEventListener('click', () => {
        // CSP는 미리보기에만 적용하며 복사·저장할 원본/결과에는 삽입하지 않는다.
        const header = '<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src https: http: data:; base-uri \'none\'; form-action \'none\'"></head><body>';
        byId('pb-resize-before').srcdoc = header + verifiedSource + '</body></html>';
        byId('pb-resize-after').srcdoc = header + output.value + '</body></html>';
        byId('pb-resize-previews').hidden = false;
    });
});
