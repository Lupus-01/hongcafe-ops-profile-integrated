/* 원문 위치를 기준으로 font-size 값만 수정한다. HTML 재직렬화는 하지 않는다. */
(function (host) {
    'use strict';
    const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
    const blockedTags = new Set('script iframe object embed form input button textarea select template svg math base link'.split(' '));
    const skipClasses = new Set(['pb-presentation-chip', 'pb-presentation-eyebrow', 'pb-export-point-marker']);
    const bodyClasses = new Set(['pb-presentation-intro', 'pb-presentation-body', 'pb-presentation-card-body', 'pb-presentation-points']);
    const fail = (message) => { throw new Error(message); };

    function parse(source) {
        const nodes = [];
        const stack = [];
        let position = 0;
        while (position < source.length) {
            if (source[position] !== '<') { position += 1; continue; }
            if (source.startsWith('<!--', position)) {
                const end = source.indexOf('-->', position + 4);
                if (end < 0) fail('닫히지 않은 HTML 주석이 있습니다.');
                position = end + 3;
                continue;
            }
            const doctype = /^<!doctype\s+html\s*>/i.exec(source.slice(position));
            if (doctype) { position += doctype[0].length; continue; }
            const closing = /^<\/([a-z][a-z0-9-]*)\s*>/i.exec(source.slice(position));
            if (closing) {
                if (stack.pop()?.tag !== closing[1].toLowerCase()) fail('태그 구조를 확실히 구분할 수 없습니다. 원본 코드를 확인해주세요.');
                position += closing[0].length;
                continue;
            }
            const opening = /^<([a-z][a-z0-9-]*)\b/i.exec(source.slice(position));
            if (!opening) fail('지원하지 않는 HTML 문법입니다.');
            const tag = opening[1].toLowerCase();
            if (blockedTags.has(tag)) fail('실행 코드 또는 지원하지 않는 태그가 포함되어 있습니다. 프로필 등록용 코드를 입력해주세요.');
            const node = { tag, start: position, parent: stack.at(-1) || null, attrs: Object.create(null), classes: new Set() };
            let cursor = position + opening[0].length;
            while (cursor < source.length) {
                const whitespace = /^\s*/.exec(source.slice(cursor))[0];
                cursor += whitespace.length;
                if (source[cursor] === '>' || source.startsWith('/>', cursor)) break;
                const attr = /^([^\s=<>\/'"`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"'`=<>]+)))?/.exec(source.slice(cursor));
                if (!attr) fail('속성 문법을 읽을 수 없습니다.');
                const name = attr[1].toLowerCase();
                if (node.attrs[name]) fail('중복 HTML 속성이 있어 안전하게 수정할 수 없습니다.');
                if (/^on/i.test(name) || name === 'srcdoc') fail('실행 속성이 포함된 코드는 지원하지 않습니다.');
                const value = attr[2] ?? attr[3] ?? attr[4] ?? '';
                const quoted = attr[2] !== undefined || attr[3] !== undefined;
                const valueOffset = attr[0].indexOf('=') < 0 ? attr[0].length : attr[0].indexOf('=') + 1 + /^\s*/.exec(attr[0].slice(attr[0].indexOf('=') + 1))[0].length + (quoted ? 1 : 0);
                node.attrs[name] = { value, quoted, start: cursor + valueOffset, end: cursor + valueOffset + value.length };
                cursor += attr[0].length;
            }
            if (cursor >= source.length) fail('닫히지 않은 태그가 있습니다.');
            const selfClosing = source.startsWith('/>', cursor);
            if (selfClosing && !voidTags.has(tag)) fail('일반 태그의 축약 문법은 지원하지 않습니다.');
            node.insert = cursor;
            node.end = cursor + (selfClosing ? 2 : 1);
            if (/[&\\]/.test(node.attrs.class?.value || '')) fail('인코딩된 클래스 이름은 지원하지 않습니다.');
            node.classes = new Set((node.attrs.class?.value || '').split(/\s+/));
            nodes.push(node);
            position = node.end;
            if (tag === 'style') {
                const end = /<\/style\s*>/ig;
                end.lastIndex = position;
                const match = end.exec(source);
                if (!match) fail('닫히지 않은 style 태그가 있습니다.');
                position = match.index + match[0].length;
            } else if (!voidTags.has(tag)) stack.push(node);
        }
        if (stack.length) fail('닫히지 않은 태그가 있습니다.');
        return nodes;
    }

    function declarations(value) {
        // 불명확한 CSS는 추측해서 고치지 않는다. 문자열/함수 내부의 세미콜론은 보존한다.
        if (/[&\\]/.test(value) || /\/\*/.test(value)) fail('교정 대상에 복잡한 CSS 인코딩 또는 주석이 있어 변환을 중단했습니다.');
        let quote = '', depth = 0, start = 0;
        const ranges = [];
        for (let index = 0; index <= value.length; index += 1) {
            const character = value[index];
            if (quote) { if (character === quote) quote = ''; }
            else if (character === '"' || character === "'") quote = character;
            else if (character === '(') depth += 1;
            else if (character === ')') depth -= 1;
            else if ((character === ';' && depth === 0) || index === value.length) {
                const text = value.slice(start, index);
                if (text.trim()) {
                    const match = /^(\s*)([a-z-]+)(\s*:\s*)([\s\S]*?)(\s*)$/i.exec(text);
                    if (!match) fail('CSS 속성을 확실히 구분할 수 없습니다.');
                    ranges.push({ property: match[2].toLowerCase(), start: start + match[1].length + match[2].length + match[3].length, end: index - match[5].length });
                }
                start = index + 1;
            }
            if (depth < 0) fail('CSS 괄호가 올바르지 않습니다.');
        }
        if (quote || depth) fail('CSS 문자열 또는 괄호가 닫히지 않았습니다.');
        return ranges;
    }

    function classify(node) {
        if ([...node.classes].some((name) => skipClasses.has(name))) return 'skip';
        if (node.classes.has('pb-presentation-title')) return 'title';
        const ancestors = [];
        for (let parent = node.parent; parent; parent = parent.parent) ancestors.push(parent);
        if (ancestors.some((parent) => [...parent.classes].some((name) => skipClasses.has(name)))) return 'skip';
        if (node.tag === 'h3' && ancestors.some((parent) => parent.classes.has('pb-presentation-card') || parent.classes.has('pb-presentation-closing'))) return 'title';
        if ([...node.classes].some((name) => bodyClasses.has(name))) return 'body';
        if (node.tag === 'p' && ancestors.some((parent) => parent.classes.has('pb-presentation-closing'))) return 'body';
        return null;
    }

    function resize(source, titleSize, bodySize) {
        if (typeof source !== 'string' || !source.trim()) fail('원본 코드를 입력해주세요.');
        for (const size of [titleSize, bodySize]) {
            if (!Number.isInteger(size) || size < 1 || size > 200) fail('글자 크기는 1~200 사이의 정수 px로 입력해주세요.');
        }
        const nodes = parse(source);
        const patches = [];
        const counts = { title: 0, body: 0 };
        for (const node of nodes) {
            const own = classify(node);
            node.kind = own || node.parent?.kind || null;
            if (!['title', 'body'].includes(node.kind) || ['br', 'hr', 'img', 'style'].includes(node.tag)) continue;
            if (own) counts[own] += 1;
            const size = `${node.kind === 'title' ? titleSize : bodySize}px`;
            const style = node.attrs.style;
            if (!style) {
                patches.push({ start: node.insert, end: node.insert, before: '', after: ` style="font-size: ${size} !important;"`, node: node.start, type: 'attribute' });
                continue;
            }
            if (!style.quoted) fail('따옴표 없는 style 속성은 지원하지 않습니다.');
            const entries = declarations(style.value);
            const sizes = entries.filter((entry) => entry.property === 'font-size');
            for (const entry of sizes) {
                const before = style.value.slice(entry.start, entry.end);
                const priority = /\s*!important\s*$/i.exec(before)?.[0] || ' !important';
                const after = size + priority;
                if (before !== after) patches.push({ start: style.start + entry.start, end: style.start + entry.end, before, after, node: node.start, type: 'value' });
            }
            // 뒤에 오는 font 단축 속성이 크기를 덮는 경우에도 다른 속성은 그대로 둔다.
            const lastSize = entries.findLastIndex((entry) => entry.property === 'font-size');
            const lastFont = entries.findLastIndex((entry) => entry.property === 'font' || entry.property === 'all');
            if (!sizes.length || lastFont > lastSize) {
                const separator = style.value.trimEnd().endsWith(';') || !style.value.trim() ? '' : ';';
                patches.push({ start: style.end, end: style.end, before: '', after: `${separator}font-size: ${size} !important;`, node: node.start, type: 'declaration' });
            }
        }
        if (!counts.title || !counts.body) fail('제목과 본문을 모두 식별할 수 없습니다. 기존 프로필 등록용 HTML인지 확인해주세요.');
        patches.sort((a, b) => a.start - b.start);
        let cursor = 0, code = '', restored = '';
        for (const patch of patches) {
            if (patch.start < cursor || source.slice(patch.start, patch.end) !== patch.before) fail('원본 비교 검증에 실패했습니다.');
            code += source.slice(cursor, patch.start);
            patch.outputStart = code.length;
            code += patch.after;
            cursor = patch.end;
        }
        code += source.slice(cursor);
        cursor = 0;
        for (const patch of patches) {
            restored += code.slice(cursor, patch.outputStart) + patch.before;
            cursor = patch.outputStart + patch.after.length;
        }
        restored += code.slice(cursor);
        if (restored !== source) fail('글자 크기 이외의 변경이 감지되어 출력을 차단했습니다.');
        return { code, counts, changes: patches.length, verified: true };
    }
    function verifyDOM(source, code, document) {
        const original = document.createElement('template');
        const modified = document.createElement('template');
        original.innerHTML = source;
        modified.innerHTML = code;
        const left = Array.from(original.content.querySelectorAll('*'));
        const right = Array.from(modified.content.querySelectorAll('*'));
        const tokens = parse(source);
        if (left.length !== tokens.length || left.length !== right.length) fail('브라우저가 원본 구조를 자동 보정하므로 변환을 중단했습니다.');
        for (let index = 0; index < left.length; index += 1) {
            const a = left[index], b = right[index], token = tokens[index];
            const parent = a.parentElement;
            if (a.localName !== token.tag || (parent ? left.indexOf(parent) : -1) !== (token.parent ? tokens.indexOf(token.parent) : -1)) fail('원본 태그 구조가 브라우저 해석과 달라 변환을 중단했습니다.');
            if (a.localName !== b.localName) fail('태그 변경이 감지되었습니다.');
            const properties = new Set([...Array.from(a.style), ...Array.from(b.style), 'font-family', 'font-weight', 'font-style', 'font-stretch', 'font-variant', 'line-height']);
            for (const property of properties) {
                if (property === 'font-size' || property === 'font') continue;
                if (a.style.getPropertyValue(property) !== b.style.getPropertyValue(property) || a.style.getPropertyPriority(property) !== b.style.getPropertyPriority(property)) fail('글자 크기 외 스타일 변경이 감지되었습니다.');
            }
            a.removeAttribute('style');
            b.removeAttribute('style');
        }
        if (!original.content.isEqualNode(modified.content)) fail('내용 또는 HTML 속성 변경이 감지되었습니다.');
        return true;
    }
    const api = { resize, parse, verifyDOM };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else host.ProfileCodeResizer = api;
})(globalThis);
