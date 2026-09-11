import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const { resize } = createRequire(import.meta.url)('./profile-code-resizer.js');

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

test('rejects ambiguous HTML, unsupported input and invalid sizes without producing code', () => {
    for (const source of ['', '<h2>일반 제목</h2><p>일반 본문</p>', '<h2 class="pb-presentation-title">제목<p class="pb-presentation-body">본문</p>', fixture() + '<script>alert(1)</script>', fixture().replace('font-size:66px', 'font-&#115;ize:66px'), fixture().replace("class='pb-presentation-title'", "class='pb-presentation-title' class='other'"), fixture().replace('alt="사진 > 설명"', 'onerror="alert(1)"'), fixture().replace('font-size:35px', '/* comment */font-size:35px')]) {
        assert.throws(() => resize(source, 42, 20));
    }
    for (const size of [0, -1, 201, NaN, Infinity, 20.5]) assert.throws(() => resize(fixture(), size, 20));
});
