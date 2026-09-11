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
    const apply = byId('pb-resize-apply');
    const applyAll = byId('pb-resize-apply-all');
    const saveAll = byId('pb-resize-save-all');
    const manual = { name: '직접 입력', raw: Object.freeze({ text: '' }), result: null, state: 'ready', error: '' };
    let records = [], selected = -1, busy = false, generation = 0, readController = null;
    const current = () => selected < 0 ? manual : records[selected];
    const setStatus = (message, state = 'idle') => {
        status.textContent = message;
        status.dataset.state = state;
    };
    const updatePreset = () => {
        byId('pb-resize-site').setAttribute('aria-pressed', String(Number(title.value) === 42 && Number(body.value) === 20));
    };
    const hidePreview = () => {
        byId('pb-resize-previews').hidden = true;
        byId('pb-resize-before').removeAttribute('srcdoc');
        byId('pb-resize-after').removeAttribute('srcdoc');
    };
    const validResult = (record) => Boolean(record?.result && record.result.title === Number(title.value) && record.result.body === Number(body.value));
    const refresh = () => {
        const item = current();
        output.value = validResult(item) ? item.result.code : '';
        source.readOnly = selected >= 0 || busy;
        copy.disabled = save.disabled = preview.disabled = busy || !validResult(item);
        apply.disabled = busy || !item?.raw;
        applyAll.disabled = busy || !records.some((record) => record.raw);
        saveAll.disabled = busy || !records.some(validResult);
        title.disabled = body.disabled = byId('pb-resize-site').disabled = busy;
        byId('pb-resize-file').disabled = busy;
        byId('pb-resize-cancel').hidden = !busy;
        const list = byId('pb-resize-file-list');
        list.replaceChildren();
        const labels = { waiting: '읽기 대기', reading: '읽는 중', ready: '검증 대기', processing: '검증 중', success: '완료', error: '실패' };
        records.forEach((record, index) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'pb-resize-file-item'; button.dataset.state = record.state;
            button.setAttribute('aria-pressed', String(index === selected));
            const name = document.createElement('strong'); name.textContent = record.name;
            const detail = document.createElement('small'); detail.textContent = record.error || `${labels[record.state]}${record.state === 'success' ? ' · ' + record.outputName : ''}`;
            button.append(name, detail); button.addEventListener('click', () => selectRecord(index)); list.appendChild(button);
        });
        byId('pb-resize-batch-summary').textContent = records.length
            ? `전체 ${records.length}개 · 완료 ${records.filter(validResult).length}개 · 실패 ${records.filter((record) => record.state === 'error').length}개` : '';
    };
    function selectRecord(index) {
        if (selected < 0) manual.raw = Object.freeze({ text: source.value });
        selected = index;
        const item = current();
        source.value = item?.raw?.text || '';
        byId('pb-resize-current-name').textContent = item.name;
        hidePreview(); refresh();
        if (item.error) setStatus(item.error, 'error');
        else if (validResult(item)) setStatus('검증 완료: 이 파일의 내용·구조·다른 스타일 보존을 확인했습니다.', 'success');
        else setStatus(index < 0 ? '원본 코드를 직접 붙여 넣으세요.' : '파일 원본은 읽기 전용입니다. 크기 적용 및 검증을 실행해주세요.');
    }
    const invalidate = () => {
        for (const item of [manual, ...records]) {
            item.result = null;
            if (item.raw) { item.state = 'ready'; item.error = ''; }
        }
        hidePreview(); updatePreset(); refresh();
        setStatus('크기가 변경되었습니다. 다시 적용 및 검증해주세요.');
    };
    const verifyRecord = (record) => {
        if (!validResult(record) || !record.raw) throw new Error('다시 크기 적용 및 검증해주세요.');
        // 내보내기 직전에도 원본에서 다시 계산해 저장된 결과의 임의 변경을 차단한다.
        const check = ProfileCodeResizer.resize(record.raw.text, record.result.title, record.result.body);
        if (check.code !== record.result.code) throw new Error('검증된 결과와 달라 저장을 차단했습니다.');
        ProfileCodeResizer.verifyDOM(record.raw.text, record.result.code, document);
        return record.result.code;
    };
    const convert = (record) => {
        record.result = null;
        try {
            if (!record.raw) throw new Error(record.error || '읽기에 성공한 파일만 처리할 수 있습니다.');
            const result = ProfileCodeResizer.resize(record.raw.text, Number(title.value), Number(body.value));
            ProfileCodeResizer.verifyDOM(record.raw.text, result.code, document);
            record.result = Object.freeze({ code: result.code, title: Number(title.value), body: Number(body.value) });
            record.state = 'success'; record.error = '';
        } catch (error) { record.state = 'error'; record.error = error.message; }
    };
    const download = (blob, name) => {
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = name; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    for (const [id, resizing] of [['pb-maker-tab', false], ['pb-resizer-tab', true]]) {
        byId(id).addEventListener('click', () => {
            maker.hidden = resizing;
            panel.hidden = !resizing;
            byId('pb-maker-tab').setAttribute('aria-pressed', String(!resizing));
            byId('pb-resizer-tab').setAttribute('aria-pressed', String(resizing));
        });
    }
    for (const input of [title, body]) input.addEventListener('input', invalidate);
    source.addEventListener('input', () => {
        if (selected >= 0 || busy) return;
        manual.raw = Object.freeze({ text: source.value }); manual.result = null; manual.error = ''; manual.state = 'ready';
        hidePreview(); refresh(); setStatus('직접 입력한 코드를 적용 및 검증해주세요.');
    });
    byId('pb-resize-manual').addEventListener('click', () => selectRecord(-1));
    byId('pb-resize-site').addEventListener('click', () => {
        title.value = 42;
        body.value = 20;
        invalidate();
    });
    byId('pb-resize-file').addEventListener('change', async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        if (files.length > ProfileCodeFiles.MAX_FILES || files.reduce((sum, file) => sum + file.size, 0) > ProfileCodeFiles.MAX_TOTAL_BYTES) {
            setStatus('한 번에 최대 50개, 합계 60MB 이하로 선택해주세요. 기존 목록은 유지됩니다.', 'error'); return;
        }
        const sequence = ++generation;
        readController?.abort(); readController = new AbortController();
        if (selected < 0) manual.raw = Object.freeze({ text: source.value });
        const names = ProfileCodeFiles.outputNames(files.map((file) => file.name));
        records = files.map((file, index) => ({ name: file.name, outputName: names[index], raw: null, result: null, state: 'waiting', error: '' }));
        selected = 0; source.value = ''; busy = true;
        byId('pb-resize-current-name').textContent = records[0].name;
        byId('pb-resize-file-name').textContent = `${files.length}개 파일 읽는 중`;
        hidePreview(); refresh();
        let totalTextBytes = 0;
        for (let index = 0; index < files.length; index += 1) {
            const item = records[index]; item.state = 'reading'; refresh();
            try {
                const text = await ProfileCodeFiles.readFile(files[index], readController.signal);
                if (sequence !== generation) return;
                const size = new TextEncoder().encode(text).length;
                if (totalTextBytes + size > ProfileCodeFiles.MAX_TOTAL_BYTES) throw new Error('추출한 전체 코드가 60MB를 넘습니다. 파일을 나누어 선택해주세요.');
                totalTextBytes += size;
                item.raw = Object.freeze({ text }); item.state = 'ready';
            } catch (error) {
                if (sequence !== generation) return;
                item.state = 'error'; item.error = error.message;
            }
            if (index === selected) source.value = item.raw?.text || '';
            refresh();
        }
        busy = false;
        byId('pb-resize-file-name').textContent = `${files.length}개 파일 읽기 완료`;
        selectRecord(selected);
        setStatus('파일 읽기를 마쳤습니다. 전체 크기 적용 및 검증을 실행해주세요.');
    });
    byId('pb-resize-cancel').addEventListener('click', () => {
        generation += 1; readController?.abort(); busy = false;
        records.forEach((item) => {
            if (['waiting', 'reading', 'processing'].includes(item.state)) {
                item.state = item.raw ? 'ready' : 'error';
                item.error = item.raw ? '' : '읽기가 중단되었습니다. 파일을 다시 선택해주세요.';
            }
        });
        refresh(); setStatus('처리를 중단했습니다. 완료된 결과는 유지됩니다.');
    });
    apply.addEventListener('click', () => {
        if (busy) return;
        if (selected < 0) manual.raw = Object.freeze({ text: source.value });
        const item = current(); convert(item); hidePreview(); refresh();
        setStatus(item.error || '검증 통과: 내용·구조·다른 스타일 보존을 확인했습니다.', item.error ? 'error' : 'success');
    });
    applyAll.addEventListener('click', async () => {
        if (busy) return;
        const sequence = ++generation;
        busy = true; hidePreview(); refresh();
        for (let index = 0; index < records.length; index += 1) {
            const item = records[index];
            if (!item.raw) continue;
            item.state = 'processing'; refresh(); setStatus(`${index + 1}/${records.length} 검증 중: ${item.name}`);
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (sequence !== generation) return;
            convert(item); refresh();
        }
        busy = false; refresh();
        const failed = records.filter((item) => item.state === 'error').length;
        setStatus(`전체 처리 완료: 성공 ${records.filter(validResult).length}개, 실패 ${failed}개. 실패 파일은 저장에서 제외됩니다.`, failed ? 'error' : 'success');
    });
    copy.addEventListener('click', async () => {
        const item = current(), snapshot = item?.result;
        let code;
        try { code = verifyRecord(item); }
        catch (error) { setStatus(error.message, 'error'); return; }
        try {
            await navigator.clipboard.writeText(code);
            if (current() !== item || item.result !== snapshot) return;
            setStatus('검증된 수정 코드를 복사했습니다.', 'success');
        } catch {
            if (current() !== item || item.result !== snapshot) return;
            output.value = code;
            output.focus(); output.select();
            setStatus('자동 복사가 차단되었습니다. 선택된 코드를 Ctrl+C로 복사해주세요.');
        }
    });
    save.addEventListener('click', () => {
        try {
            const item = current(), code = verifyRecord(item);
            download(new Blob([code], { type: 'text/plain;charset=utf-8' }), item.outputName || 'profile-font-size-adjusted.txt');
            setStatus('검증된 수정 코드의 파일 저장을 요청했습니다.', 'success');
        } catch (error) { setStatus(error.message, 'error'); }
    });
    saveAll.addEventListener('click', () => {
        try {
            const files = [];
            for (const item of records.filter(validResult)) {
                try { files.push({ name: item.outputName, code: verifyRecord(item) }); }
                catch (error) { item.result = null; item.state = 'error'; item.error = error.message; }
            }
            refresh();
            if (!files.length) throw new Error('검증을 통과한 결과가 없습니다.');
            download(ProfileCodeFiles.createZip(files), 'profile-font-size-results.zip');
            setStatus(`검증된 ${files.length}개 결과의 ZIP 저장을 요청했습니다. 실패 파일은 포함하지 않았습니다.`, 'success');
        } catch (error) { setStatus(error.message, 'error'); }
    });
    preview.addEventListener('click', () => {
        // CSP는 미리보기에만 적용하며 복사·저장할 원본/결과에는 삽입하지 않는다.
        const header = '<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src https: http: data:; base-uri \'none\'; form-action \'none\'"></head><body>';
        try {
            const item = current(), code = verifyRecord(item);
            byId('pb-resize-before').srcdoc = header + item.raw.text + '</body></html>';
            byId('pb-resize-after').srcdoc = header + code + '</body></html>';
            byId('pb-resize-previews').hidden = false;
        } catch (error) { setStatus(error.message, 'error'); }
    });
});
