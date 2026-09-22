import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const { resize, applySiteDesign, parse, verifyStyleOnlySource } = createRequire(import.meta.url)('./profile-code-resizer.js');

export const fixture = (category = 'tarot') => `<div class="pb-presentation pb-theme-${category}" style="background:#f7f6fb;padding:13px;border:1px solid red;width:640px">
<!-- 원본 공백과 주석 유지 -->
<h2 class='pb-presentation-title' style='font-size:66px !important;color:#321;margin:0;line-height:1.25'>상담 &amp; 이야기</h2>
<p class="pb-presentation-body" style="font-size:35px;color:#554840;line-height:1.65;letter-spacing:1px">기존 본문 <strong style="font-size:48px;font-weight:800">강조</strong><br><a href="https://example.com/?a=1&amp;b=2" style="color:red">링크</a></p>
<div class="pb-presentation-chip" style="font-size:20px">작은 라벨</div>
<div class="pb-presentation-card"><h3 style="font-size:66px">카드 제목</h3><p class="pb-presentation-card-body">카드 내용</p><ul class="pb-presentation-points" style="font-size:35px"><li><span class="pb-export-point-marker" style="width:7px;height:7px;font-size:7px">•</span><span>포인트 내용</span></li></ul></div>
<div class="pb-presentation-closing"><h3>마무리 제목</h3><p>마무리 본문</p></div>
<img src="data:image/png;base64,AAAA" style="width:100%;aspect-ratio:16 / 8.6" alt="사진 > 설명">
</div>`;

test('three categories preserve every source byte except authorized font-size patches', () => {
    for (const category of ['tarot', 'saju', 'sinjeom']) {
        const original = fixture(category);
        const result = resize(original, 42, 20);
        const expected = original
            .replaceAll('font-size:66px !important', 'font-size:42px !important')
            .replaceAll('font-size:66px"', 'font-size:42px !important"')
            .replaceAll('font-size:35px', 'font-size:20px !important')
            .replace('font-size:48px', 'font-size:20px !important')
            .replace('<a href="https://example.com/?a=1&amp;b=2" style="color:red">', '<a href="https://example.com/?a=1&amp;b=2" style="color:red;font-size: 20px !important;">')
            .replace('<p class="pb-presentation-card-body">', '<p class="pb-presentation-card-body" style="font-size: 20px !important;">')
            .replace('<li>', '<li style="font-size: 20px !important;">')
            .replace('<span>포인트', '<span style="font-size: 20px !important;">포인트')
            .replace('<h3>마무리', '<h3 style="font-size: 42px !important;">마무리')
            .replace('<p>마무리', '<p style="font-size: 20px !important;">마무리');
        assert.equal(result.code, expected);
        assert.deepEqual(result.counts, { title: 3, body: 4 });
        assert.equal(resize(result.code, 42, 20).code, result.code);
        assert.equal(resize(result.code, 42, 20).changes, 0);
    }
});

test('inline CSS strings, duplicate sizes, font shorthand and style blocks remain intact', () => {
    const source = `<style>.pb-presentation-title{font-size:99px;color:red}</style><h2 class="pb-presentation-title" style="background:url('data:x;a:b'); font-size : 66px; font-size:50px !IMPORTANT; font:italic 66px/1.2 Arial">제목</h2><p class="pb-presentation-body">본문</p>`;
    const output = resize(source, 42, 20).code;
    assert.ok(output.startsWith('<style>.pb-presentation-title{font-size:99px;color:red}</style>'));
    assert.ok(output.includes("background:url('data:x;a:b'); font-size : 42px !important; font-size:42px !IMPORTANT; font:italic 66px/1.2 Arial;font-size: 42px !important;"));
    assert.equal(resize(output, 42, 20).code, output);
});

test('nested emphasis changes size while labels, marker descendants and images remain byte-identical', () => {
    const source = '<h2 class="pb-presentation-title">제목</h2><p class="pb-presentation-body"><em>강조</em><span class="pb-presentation-chip"><b style="font-size:11px">라벨</b></span><img src="x" style="font-size:10px"></p>';
    const output = resize(source, 44, 22).code;
    assert.ok(output.includes('<em style="font-size: 22px !important;">강조</em>'));
    assert.ok(output.includes('<span class="pb-presentation-chip"><b style="font-size:11px">라벨</b></span><img src="x" style="font-size:10px">'));
});

test('exported font-family quote entities preserve raw offsets and all non-size source text', () => {
    for (const quote of ['&quot;', '&QUOT;', '&apos;', '&#34;', '&#0034;', '&#39;', '&#x22;', '&#X0027;']) {
        const style = `font-family:Pretendard,${quote}Apple SD Gothic Neo${quote},sans-serif;`;
        const source = `\ufeff<h2 class="pb-presentation-title" style="${style}font-size:66px !important;color:red">제목 &amp; 원문</h2>\r\n<p class="pb-presentation-body" style="${style}font-size:35px;line-height:1.65">본문  내용</p>`;
        const expected = source.replace('font-size:66px', 'font-size:42px').replace('font-size:35px', 'font-size:20px !important');
        assert.equal(resize(source, 42, 20).code, expected);
        assert.equal(resize(expected, 42, 20).changes, 0);
    }
});

test('entity-quoted CSS strings cannot expose fake size declarations', () => {
    const source = '<h2 class="pb-presentation-title" style="font-family:&quot;name;font-size:99px&quot;;font-size:66px">제목</h2><p class="pb-presentation-body" style="font-family:&#39;other;font-size:88px&#39;">본문</p>';
    assert.equal(resize(source, 42, 20).code, source.replace('font-size:66px', 'font-size:42px !important').replace('88px&#39;', '88px&#39;;font-size: 20px !important;'));
    for (const style of ['font-family:&quot;unclosed;font-size:66px', 'font-&#115;ize:66px', 'font-family:&amp;quot;name&amp;quot;', 'font-family:&quot name', 'font-family:&quot;name&#39;', 'font-size:66px;/* comment */color:red']) {
        assert.throws(() => resize(`<h2 class="pb-presentation-title" style="${style}">제목</h2><p class="pb-presentation-body">본문</p>`, 42, 20));
    }
});

test('rejects ambiguous HTML, unsupported input and invalid sizes without producing code', () => {
    for (const source of ['', '<h2>일반 제목</h2><p>일반 본문</p>', '<h2 class="pb-presentation-title">제목<p class="pb-presentation-body">본문</p>', fixture() + '<script>alert(1)</script>', fixture().replace('font-size:66px', 'font-&#115;ize:66px'), fixture().replace("class='pb-presentation-title'", "class='pb-presentation-title' class='other'"), fixture().replace('alt="사진 > 설명"', 'onerror="alert(1)"'), fixture().replace('font-size:35px', '/* comment */font-size:35px')]) {
        assert.throws(() => resize(source, 42, 20));
    }
    for (const size of [0, -1, 201, NaN, Infinity, 20.5]) assert.throws(() => resize(fixture(), size, 20));
});

test('site design converts all categories without losing content, colors, URLs or source formatting', () => {
    for (const category of ['tarot', 'saju', 'sinjeom']) {
        const original = '\ufeff' + fixture(category);
        const result = applySiteDesign(original);
        const nodes = parse(result.code);
        const css = (className) => nodes.find((node) => node.classes.has(className)).attrs.style.value;
        assert.match(css('pb-presentation'), /padding: 30px 16px 12px !important/);
        assert.match(css('pb-presentation'), /background:#f7f6fb/);
        assert.match(css('pb-presentation-title'), /font-size: 26px !important;line-height: 1.25/);
        assert.match(css('pb-presentation-body'), /font-size: 16px !important;line-height: 1.5/);
        assert.match(css('pb-presentation-chip'), /padding: 8px 12px !important;border-radius: 6px/);
        assert.match(css('pb-presentation-chip'), /font-size: 16px/);
        assert.match(css('pb-presentation-closing'), /background: transparent !important/);
        assert.match(result.code, /font-weight:800/);
        assert.match(result.code, /letter-spacing:1px/);
        assert.ok(result.code.includes('href="https://example.com/?a=1&amp;b=2"'));
        assert.ok(result.code.includes('<img src="data:image/png;base64,AAAA" style="width:100%;aspect-ratio:16 / 8.6" alt="사진 > 설명">'));
        assert.ok(result.code.startsWith('\ufeff'));
        assert.ok(result.code.includes('<!-- 원본 공백과 주석 유지 -->'));
        assert.equal((result.code.match(/>•<\/span>/g) || []).length, 1);
        assert.equal(verifyStyleOnlySource(original, result.code), true);
        assert.equal(applySiteDesign(result.code).code, result.code);
        assert.equal(applySiteDesign(result.code).changes, 0);
        assert.equal(applySiteDesign(applySiteDesign(result.code, 30, 18).code).code, result.code);
    }
});

test('site design preserves markers and uses CSS without adding HTML; ambiguous duplicates are rejected', () => {
    const base = fixture().replace('<span class="pb-export-point-marker" style="width:7px;height:7px;font-size:7px">•</span>', '');
    const converted = applySiteDesign(base).code;
    assert.equal(parse(converted).filter((node) => node.classes.has('pb-export-point-marker')).length, 0);
    assert.match(converted, /list-style: &quot;· &quot; outside !important/);
    assert.equal(verifyStyleOnlySource(base, converted), true);
    assert.equal(applySiteDesign(converted).code, converted);
    const duplicate = base.replace('<li>', '<li><span class="pb-export-point-marker">·</span><span class="pb-export-point-marker"></span>');
    assert.throws(() => applySiteDesign(duplicate), /목록 기호가 여러 개/);
    assert.throws(() => applySiteDesign(base.replace('<li>', '<li><span class="pb-export-point-marker">보존할 내용</span>')), /예상하지 못한 내용/);
    const outside = '<p style="font-size:99px">프로필 밖 내용</p>';
    assert.ok(applySiteDesign(base + outside).code.endsWith(outside));
    assert.throws(() => applySiteDesign('<h2 class="pb-presentation-title">제목</h2><p class="pb-presentation-body">본문</p>'), /프로필 영역/);
    assert.throws(() => applySiteDesign(base, 0, 16), /정수/);
});

test('CSS-only source verification rejects every non-style change including whitespace and markers', () => {
    const original = '\ufeff' + fixture().replaceAll('\n', '\r\n').replace('>•</span>', ' data-note="기호 보존" aria-hidden="true">•</span>');
    const code = applySiteDesign(original).code;
    assert.equal(verifyStyleOnlySource(original, code), true);
    for (const changed of [
        code.replace('기존 본문', '변경 본문'),
        code.replace('>•</span>', '>·</span>'),
        code.replace('data-note="기호 보존"', 'data-note="변경"'),
        code.replace('aria-hidden="true"', 'aria-hidden="false"'),
        code.replace('https://example.com/', 'https://changed.example/'),
        code.replace('base64,AAAA', 'base64,BBBB'),
        code.replace('<!-- 원본 공백과 주석 유지 -->', ''),
        code.replace(/\r\n/g, '\n'),
        code.slice(1),
        code.replace('기존 본문 ', '기존 본문  '),
        code.replace('</li>', '<span></span></li>')
    ]) assert.throws(() => verifyStyleOnlySource(original, changed), /CSS 외/);
});

test('site design preserves CSS entities, backgrounds, separators and nested chip typography', () => {
    const original = fixture().replace('font-size:20px">작은 라벨', 'font-size:20px;background:#abc">작은 <b style="font-size:40px">라벨</b>')
        .replace('<div class="pb-presentation-card">', '<div class="pb-presentation-detail" style="background:rgba(255,255,255,0.62);border-top:1px solid red;font-family:&quot;Apple SD Gothic Neo&quot;"><div class="pb-presentation-card">')
        .replace('<div class="pb-presentation-closing">', '</div><div class="pb-presentation-closing">');
    const result = applySiteDesign(original);
    assert.match(result.code, /background:#abc/);
    assert.match(result.code, /background:rgba\(255,255,255,0.62\);border-top:1px solid red;font-family:&quot;Apple SD Gothic Neo&quot;/);
    assert.match(result.code, /<b style="font-size: 16px !important;line-height: 1.5/);
    assert.equal(applySiteDesign(result.code).code, result.code);
});
