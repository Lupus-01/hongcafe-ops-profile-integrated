/* 원문 위치를 기준으로 허용한 스타일과 목록 기호만 수정한다. HTML 재직렬화는 하지 않는다. */
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
                const node = stack.pop();
                if (node?.tag !== closing[1].toLowerCase()) fail('태그 구조를 확실히 구분할 수 없습니다. 원본 코드를 확인해주세요.');
                node.closeStart = position;
                node.outerEnd = position + closing[0].length;
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
                node.closeStart = match.index;
                node.outerEnd = match.index + match[0].length;
                position = match.index + match[0].length;
            } else if (!voidTags.has(tag)) stack.push(node);
        }
        if (stack.length) fail('닫히지 않은 태그가 있습니다.');
        return nodes;
    }

    function declarations(value) {
        // 불명확한 CSS는 추측해서 고치지 않는다. 문자열/함수 내부의 세미콜론은 보존한다.
        if (/\\/.test(value) || /\/\*/.test(value)) fail('교정 대상에 복잡한 CSS 인코딩 또는 주석이 있어 변환을 중단했습니다.');
        let quote = '', depth = 0, start = 0, lastSeparator = -1;
        const ranges = [];
        for (let index = 0; index <= value.length; index += 1) {
            let character = value[index];
            let entityLength = 0;
            if (character === '&') {
                // HTML 속성의 따옴표 엔티티만 해석한다. 원문 인덱스와 표기는 유지한다.
                const entity = /^(?:&quot;|&QUOT;|&apos;|&#0*(?:34|39);|&#[xX]0*(?:22|27);)/.exec(value.slice(index));
                if (!entity) fail('교정 대상에 복잡한 CSS 인코딩 또는 주석이 있어 변환을 중단했습니다.');
                character = /^(?:&apos;|&#0*39;|&#[xX]0*27;)$/.test(entity[0]) ? "'" : '"';
                entityLength = entity[0].length;
            }
            if (quote) { if (character === quote) quote = ''; }
            else if (character === '"' || character === "'") quote = character;
            else if (character === '(') depth += 1;
            else if (character === ')') depth -= 1;
            else if ((character === ';' && depth === 0) || index === value.length) {
                if (character === ';') lastSeparator = index;
                const text = value.slice(start, index);
                if (text.trim()) {
                    const match = /^(\s*)([a-z-]+)(\s*:\s*)([\s\S]*?)(\s*)$/i.exec(text);
                    if (!match) fail('CSS 속성을 확실히 구분할 수 없습니다.');
                    ranges.push({ property: match[2].toLowerCase(), declarationStart: start, declarationEnd: index + (character === ';' ? 1 : 0), start: start + match[1].length + match[2].length + match[3].length, end: index - match[5].length });
                }
                start = index + 1;
            }
            if (depth < 0) fail('CSS 괄호가 올바르지 않습니다.');
            if (entityLength) index += entityLength - 1;
        }
        if (quote || depth) fail('CSS 문자열 또는 괄호가 닫히지 않았습니다.');
        return { entries: ranges, endsWithSeparator: lastSeparator >= 0 && !value.slice(lastSeparator + 1).trim() };
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
            const { entries, endsWithSeparator } = declarations(style.value);
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
                const separator = endsWithSeparator || !style.value.trim() ? '' : ';';
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
    // 사이트 출력의 확정된 배치만 적용한다. 원본 글꼴·색상·이미지 속성은 건드리지 않는다.
    function siteStyles(node, titleSize, bodySize) {
        const has = (name) => node.classes.has(`pb-presentation${name}`);
        const styles = {};
        const add = (values) => Object.assign(styles, values);
        if (has('') || node.siteWrapper) add({ width: '100%', 'max-width': '100%', 'min-width': '0', 'box-sizing': 'border-box', 'text-align': 'left', 'box-shadow': 'none' });
        if (node.siteWrapper) add({ margin: '0 auto', padding: '0', 'border-radius': '14px' });
        if (has('')) add({ padding: '30px 16px 12px', border: '0', 'border-radius': '0', overflow: 'hidden' });
        if (has('-hero')) add({ display: 'grid', 'grid-template-columns': '1fr', gap: '14px', 'align-items': 'stretch', 'margin-bottom': '30px', padding: '0', border: '0', 'border-radius': '0', background: 'transparent', 'box-shadow': 'none' });
        if (has('-copy') || has('-side')) add({ display: 'flex', 'flex-direction': 'column', gap: has('-side') ? '16px' : '14px', 'min-width': '0' });
        if (has('-copy')) add({ 'justify-content': 'center', padding: '0', 'border-radius': '0', background: 'transparent', 'box-shadow': 'none' });
        if (has('-section') || has('-closing')) add({ padding: '0', border: '0', 'border-left': '0', 'border-radius': '0', background: 'transparent', 'box-shadow': 'none', 'box-sizing': 'border-box', overflow: 'hidden' });
        if (has('-section') || has('-grid')) add({ 'margin-bottom': '30px' });
        if (has('-grid')) add({ display: 'grid', 'grid-template-columns': '1fr', gap: '14px', 'align-items': 'stretch' });
        if (has('-detail')) add({ 'grid-column': '1 / -1', display: 'flex', 'flex-direction': 'column', 'justify-content': 'flex-start', gap: '16px', padding: '16px', 'margin-top': '2px', 'box-sizing': 'border-box' });
        if (has('-card')) add({ 'grid-column': '1 / -1', padding: '0' });
        if (has('-card-body')) add({ 'grid-column': '1 / -1', padding: '18px 0 0' });
        if (has('-chip')) add({ display: 'inline-block', 'margin-bottom': '12px', padding: '8px 12px', 'border-radius': '6px', 'max-width': '100%', 'box-sizing': 'border-box', 'box-shadow': 'none' });
        if (['title', 'body', 'chip'].includes(node.siteKind) && !['img', 'br', 'hr', 'style'].includes(node.tag)) {
            add({ 'font-size': `${node.siteKind === 'title' ? titleSize : bodySize}px`, 'line-height': node.siteKind === 'title' ? '1.25' : '1.5', 'text-align': 'left', 'word-break': 'keep-all', 'overflow-wrap': 'anywhere' });
            if (node.siteOwn === 'title' || node.siteOwn === 'body') add({ margin: '0' });
            if (node.siteKind === 'title') add({ 'letter-spacing': '0', 'white-space': 'normal', 'text-wrap': 'balance' });
            if (node.tag === 'h3' && node.parent?.classes.has('pb-presentation-closing')) add({ 'margin-bottom': '16px' });
        }
        if (has('-points')) add({ margin: '0', padding: '0', display: 'flex', 'flex-direction': 'column', gap: '6px', 'list-style': 'none' });
        if (node.siteListItem) add({ position: 'relative', margin: '0', padding: '0 0 0 16px', display: 'block', 'list-style': 'none', 'box-sizing': 'border-box' });
        const media = has('-portrait') || has('-photo');
        if (media) add({ display: 'block', width: '100%', 'max-width': '100%', 'min-width': '0', margin: '0', padding: '0', 'border-radius': '8px', overflow: 'hidden', 'min-height': '0', height: 'auto', 'box-sizing': 'border-box' });
        if (node.tag === 'img' && node.classes.has('pb-uploaded-img') && node.inMedia) add({ width: '100%', 'max-width': '100%', height: '100%', display: 'block', 'border-radius': '8px' });
        return styles;
    }

    function applySiteDesign(source, titleSize = 26, bodySize = 16) {
        if (typeof source !== 'string' || !source.trim()) fail('원본 코드를 입력해주세요.');
        for (const size of [titleSize, bodySize]) {
            if (!Number.isInteger(size) || size < 1 || size > 200) fail('글자 크기는 1~200 사이의 정수 px로 입력해주세요.');
        }
        const nodes = parse(source), patches = [], counts = { title: 0, body: 0 };
        const roots = nodes.filter((node) => node.classes.has('pb-presentation'));
        if (!roots.length) fail('사이트 디자인을 적용할 프로필 영역을 식별할 수 없습니다.');
        const wrappers = new Set(roots.map((node) => node.parent).filter((node) => node && (node.attrs.id?.value === 'pb-canvas' || node.classes.has('pb-export-capture') || node.classes.has('pb-site-profile-output'))));
        const patch = (start, end, after) => {
            const before = source.slice(start, end);
            if (before !== after) patches.push({ start, end, before, after });
        };
        for (const node of nodes) {
            node.inProfile = node.classes.has('pb-presentation') || Boolean(node.parent?.inProfile);
            node.siteWrapper = wrappers.has(node);
            node.inMedia = node.parent?.classes.has('pb-presentation-portrait') || node.parent?.classes.has('pb-presentation-photo') || Boolean(node.parent?.inMedia);
            if (!node.inProfile && !node.siteWrapper) continue;
            node.siteOwn = node.classes.has('pb-presentation-chip') ? 'chip' : classify(node);
            if (node.siteOwn === 'skip' && node.parent?.siteKind === 'chip' && !node.classes.has('pb-export-point-marker') && !node.classes.has('pb-presentation-eyebrow')) node.siteOwn = null;
            node.siteKind = node.siteOwn || node.parent?.siteKind || null;
            node.siteListItem = node.tag === 'li' && node.parent?.classes.has('pb-presentation-points');
            if (node.siteOwn === 'title' || node.siteOwn === 'body') counts[node.siteOwn] += 1;
            if (node.classes.has('pb-export-point-marker')) {
                if (!node.parent?.siteListItem || node.tag !== 'span' || !/^[\s·•]*$/.test(source.slice(node.end, node.closeStart))) fail('목록 기호에 예상하지 못한 내용이 있어 변환을 중단했습니다.');
                continue;
            }
            const styles = siteStyles(node, titleSize, bodySize);
            if (!Object.keys(styles).length) continue;
            const suffix = Object.entries(styles).map(([property, value]) => `${property}: ${value} !important;`).join('');
            const style = node.attrs.style;
            if (!style) { patch(node.insert, node.insert, ` style="${suffix}"`); continue; }
            if (!style.quoted) fail('따옴표 없는 style 속성은 지원하지 않습니다.');
            const { entries } = declarations(style.value);
            let rest = '', cursor = 0;
            for (const entry of entries) {
                if (!Object.hasOwn(styles, entry.property)) continue;
                rest += style.value.slice(cursor, entry.declarationStart);
                cursor = entry.declarationEnd;
            }
            rest += style.value.slice(cursor);
            const separator = !rest.trim() || declarations(rest).endsWithSeparator ? '' : ';';
            patch(style.start, style.end, rest + separator + suffix);
        }
        if (!counts.title || !counts.body) fail('제목과 본문을 모두 식별할 수 없습니다. 기존 프로필 등록용 HTML인지 확인해주세요.');
        const marker = `<span class="pb-export-point-marker" aria-hidden="true" style="position: absolute !important;left: 0 !important;top: 0 !important;width: 10px !important;font-size: ${bodySize}px !important;line-height: 1.5 !important;text-align: left !important;">·</span>`;
        for (const node of nodes.filter((item) => item.siteListItem)) {
            const markers = nodes.filter((item) => item.parent === node && item.classes.has('pb-export-point-marker'));
            if (!markers.length) patch(node.end, node.end, marker);
            markers.forEach((item, index) => patch(item.start, item.outerEnd, index === 0 ? marker : ''));
        }
        patches.sort((a, b) => a.start - b.start);
        let cursor = 0, code = '';
        for (const change of patches) {
            if (change.start < cursor || source.slice(change.start, change.end) !== change.before) fail('원본 비교 검증에 실패했습니다.');
            code += source.slice(cursor, change.start) + change.after;
            cursor = change.end;
        }
        code += source.slice(cursor);
        return { code, counts, changes: patches.length, verified: true };
    }

    function verifySiteDOM(source, code, document, titleSize, bodySize) {
        // 속성 전체를 허용하는 대신, 원문에서 재계산한 지정 변경과 정확히 같은지 확인한다.
        if (applySiteDesign(source, titleSize, bodySize).code !== code) fail('허용한 사이트 디자인 외의 변경이 감지되었습니다.');
        const fragments = [source, code].map((text) => {
            const template = document.createElement('template');
            template.innerHTML = text;
            const elements = Array.from(template.content.querySelectorAll('*')), tokens = parse(text);
            if (elements.length !== tokens.length) fail('브라우저가 원본 구조를 자동 보정하므로 변환을 중단했습니다.');
            elements.forEach((element, index) => {
                const token = tokens[index];
                if (element.localName !== token.tag || elements.indexOf(element.parentElement) !== (token.parent ? tokens.indexOf(token.parent) : -1)) fail('원본 태그 구조가 브라우저 해석과 달라 변환을 중단했습니다.');
                element.removeAttribute('style');
            });
            template.content.querySelectorAll('.pb-presentation .pb-presentation-points > li > .pb-export-point-marker').forEach((element) => element.remove());
            template.content.normalize();
            return template.content;
        });
        if (!fragments[0].isEqualNode(fragments[1])) fail('내용 또는 HTML 속성 변경이 감지되었습니다.');
        return true;
    }

    function verifyDOM(source, code, document, options = {}) {
        if (options.mode === 'site') return verifySiteDOM(source, code, document, options.titleSize ?? 26, options.bodySize ?? 16);
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
    const api = { resize, applySiteDesign, parse, verifyDOM };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else host.ProfileCodeResizer = api;
})(globalThis);
