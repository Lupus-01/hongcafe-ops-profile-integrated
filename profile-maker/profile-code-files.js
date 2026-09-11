(function (host) {
    'use strict';
    const MAX_FILE_BYTES = 30 * 1024 * 1024;
    const MAX_TOTAL_BYTES = 60 * 1024 * 1024;
    const MAX_FILES = 50;
    const fail = (message) => { throw new Error(message); };
    function decodeText(bytes) {
        const data = new Uint8Array(bytes);
        const encoding = data[0] === 0xff && data[1] === 0xfe ? 'utf-16le'
            : data[0] === 0xfe && data[1] === 0xff ? 'utf-16be' : 'utf-8';
        try {
            // BOM, CRLF, 연속 공백도 원문으로 유지한다. 추측 인코딩 변환은 하지 않는다.
            return new TextDecoder(encoding, { fatal: true, ignoreBOM: true }).decode(data);
        } catch { fail('문자 인코딩을 안전하게 읽을 수 없습니다. TXT를 UTF-8 또는 BOM 포함 UTF-16으로 저장해주세요.'); }
    }
    function extractWordCode(xml, Parser = host.DOMParser) {
        const doc = new Parser().parseFromString(xml, 'application/xml');
        if (doc.getElementsByTagName('parsererror').length || doc.doctype) fail('Word XML 구조를 안전하게 읽을 수 없습니다.');
        const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
        const root = doc.documentElement;
        if (root.namespaceURI !== ns || root.localName !== 'document') fail('지원하는 Word 문서 형식이 아닙니다.');
        const bodies = doc.getElementsByTagNameNS(ns, 'body');
        if (bodies.length !== 1) fail('Word 본문을 확실히 구분할 수 없습니다.');
        const banned = new Set(['tbl', 'drawing', 'pict', 'object', 'altChunk', 'ins', 'del', 'moveFrom', 'moveTo', 'fldSimple', 'fldChar', 'instrText', 'delText', 'vanish', 'webHidden', 'sym', 'txbxContent', 'footnoteReference', 'endnoteReference']);
        for (const element of doc.getElementsByTagName('*')) {
            if (element.namespaceURI !== ns) {
                // 대체 콘텐츠/확장 요소는 코드가 숨겨질 수 있어 추측하지 않는다.
                fail('확장 요소가 포함된 Word 문서입니다. 코드만 TXT로 저장해주세요.');
            }
            if (banned.has(element.localName)) fail('표·그림·필드·숨김 글자·변경 추적이 포함된 Word 문서는 코드 보존을 위해 처리하지 않습니다.');
            if (element.localName !== 't' && Array.from(element.childNodes).some((child) => [3, 4].includes(child.nodeType) && child.textContent.trim())) {
                fail('정상 텍스트 영역 밖에 Word 내용이 있어 처리를 중단했습니다.');
            }
        }
        const paragraphs = [], visitedText = new Set();
        const appendRun = (node) => {
            let text = '';
            for (const child of node.childNodes) {
                if (child.nodeType === 3) {
                    if (child.textContent.trim()) fail('Word 코드 텍스트 위치가 올바르지 않습니다.');
                    continue;
                }
                if (child.nodeType !== 1) continue;
                switch (child.localName) {
                    case 't':
                        if (child.children.length) fail('Word 텍스트 내부 구조가 올바르지 않습니다.');
                        visitedText.add(child);
                        text += child.textContent; break;
                    case 'tab': text += '\t'; break;
                    case 'br': case 'cr': text += '\n'; break;
                    case 'rPr':
                        if (child.getElementsByTagNameNS(ns, 't').length) fail('Word 서식 영역에 코드가 포함되어 있습니다.');
                        break;
                    case 'lastRenderedPageBreak': break;
                    default: fail('지원하지 않는 Word 텍스트 요소입니다. 코드만 TXT로 저장해주세요.');
                }
            }
            return text;
        };
        const paragraphText = (node) => {
            let text = '';
            for (const child of node.childNodes) {
                if (child.nodeType === 3) { if (child.textContent.trim()) fail('Word 문단 구조가 올바르지 않습니다.'); continue; }
                if (child.nodeType !== 1) continue;
                if (child.localName === 'r') text += appendRun(child);
                else if (child.localName === 'hyperlink') text += paragraphText(child);
                else if (['pPr', 'bookmarkStart', 'bookmarkEnd', 'proofErr'].includes(child.localName)) {
                    if (child.getElementsByTagNameNS(ns, 't').length) fail('Word 부가 영역에 코드가 포함되어 있습니다.');
                } else fail('지원하지 않는 Word 문단 요소입니다. 코드만 TXT로 저장해주세요.');
            }
            return text;
        };
        for (const child of bodies[0].childNodes) {
            if (child.nodeType === 3) { if (child.textContent.trim()) fail('Word 본문 구조가 올바르지 않습니다.'); continue; }
            if (child.nodeType !== 1) continue;
            if (child.localName === 'p') paragraphs.push(paragraphText(child));
            else if (child.localName !== 'sectPr' || child.getElementsByTagNameNS(ns, 't').length) fail('일반 문단에 저장된 HTML 코드만 지원합니다.');
        }
        const code = paragraphs.join('\n');
        if (visitedText.size !== doc.getElementsByTagNameNS(ns, 't').length) fail('읽지 못한 Word 텍스트가 있어 처리를 중단했습니다.');
        if (!code.trim()) fail('Word 문서에 HTML 코드 텍스트가 없습니다.');
        return code;
    }
    async function readFile(file, signal) {
        if (!/\.(txt|docx)$/i.test(file.name)) fail('.txt 또는 .docx 파일만 지원합니다. .doc 파일은 .docx로 저장해주세요.');
        if (file.size > MAX_FILE_BYTES) fail('파일당 30MB 이하로 선택해주세요.');
        if (/\.txt$/i.test(file.name)) return decodeText(await file.arrayBuffer());
        const form = new FormData();
        form.append('file', file);
        const response = await fetch('/api/profile-code-document', { method: 'POST', credentials: 'same-origin', body: form, signal });
        let data;
        try { data = await response.json(); } catch { fail('Word 읽기 서버 응답을 확인할 수 없습니다.'); }
        if (!response.ok) fail(data.error || 'Word 파일을 읽지 못했습니다.');
        if (typeof data.documentXml !== 'string') fail('Word 읽기 응답 형식이 올바르지 않습니다.');
        return extractWordCode(data.documentXml);
    }
    function outputNames(names) {
        const used = new Set();
        return names.map((name) => {
            let base = Array.from(String(name).replace(/\.[^.]*$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '')).slice(0, 90).join('') || 'profile';
            if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base)) base = '_' + base;
            let candidate = `${base}-크기수정.txt`, suffix = 2;
            while (used.has(candidate.toLowerCase())) candidate = `${base}-크기수정-${suffix++}.txt`;
            used.add(candidate.toLowerCase());
            return candidate;
        });
    }
    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
        }
        return (crc ^ 0xffffffff) >>> 0;
    }
    // 압축 없이 ZIP에 담는다. 각 TXT의 UTF-8 바이트는 다시 변환하지 않는다.
    function createZip(files) {
        if (!files.length || files.length > MAX_FILES) fail('저장할 결과 파일을 확인해주세요.');
        const parts = [], central = [], encoder = new TextEncoder();
        let offset = 0, centralSize = 0;
        for (const file of files) {
            const name = encoder.encode(file.name), data = encoder.encode(file.code);
            if (name.length > 65535 || offset + data.length > 256 * 1024 * 1024) fail('전체 저장 크기가 너무 큽니다. 파일을 나누어 처리해주세요.');
            const crc = crc32(data);
            const header = new Uint8Array(30), h = new DataView(header.buffer);
            h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
            h.setUint16(12, 33, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
            const record = new Uint8Array(46), c = new DataView(record.buffer);
            c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
            c.setUint16(14, 33, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
            parts.push(header, name, data); central.push(record, name);
            offset += 30 + name.length + data.length; centralSize += 46 + name.length;
        }
        const end = new Uint8Array(22), e = new DataView(end.buffer);
        e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
        return new Blob([...parts, ...central, end], { type: 'application/zip' });
    }
    const api = { MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, decodeText, extractWordCode, readFile, outputNames, createZip };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else host.ProfileCodeFiles = api;
})(globalThis);
