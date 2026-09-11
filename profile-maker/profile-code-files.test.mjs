import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import AdmZip from 'adm-zip';
const { decodeText, outputNames, createZip } = createRequire(import.meta.url)('./profile-code-files.js');

test('TXT preserves BOM, CRLF, tabs, repeated spaces and HTML entities without guessing encoding', () => {
    const text = '\ufeff<h2>제목 &amp; 내용</h2>\r\n\t  공백  유지\r\n';
    assert.equal(decodeText(Buffer.from(text, 'utf8')), text);
    assert.equal(decodeText(Buffer.from(text, 'utf16le')), text);
    const bigEndian = Buffer.from(text, 'utf16le'); bigEndian.swap16();
    assert.equal(decodeText(bigEndian), text);
    assert.throws(() => decodeText(Uint8Array.from([0xc0, 0xaf])));
});

test('result names retain Korean names and avoid path traversal and collisions', () => {
    const names = outputNames(['상담.txt', '상담.docx', '상담.txt', '../A.txt', 'CON.txt', 'a.txt', 'A.docx']);
    assert.deepEqual(names.slice(0, 3), ['상담-크기수정.txt', '상담-크기수정-2.txt', '상담-크기수정-3.txt']);
    assert.equal(new Set(names.map((name) => name.toLowerCase())).size, names.length);
    assert.ok(names.every((name) => !/[\\/]/.test(name)));
    assert.equal(names[4], '_CON-크기수정.txt');
});

test('ZIP round-trips each exact UTF-8 result through an independent ZIP reader', async () => {
    const files = [
        { name: '상담-크기수정.txt', code: '\ufeff<h2 style="font-size:42px">내용  유지</h2>\r\n\t' },
        { name: '상담-크기수정-2.txt', code: '<p>&amp; &lt; \n 빈 줄\n\n</p>' }
    ];
    const blob = createZip(files);
    const zip = new AdmZip(Buffer.from(await blob.arrayBuffer()));
    assert.equal(blob.type, 'application/zip');
    assert.equal(zip.getEntries().length, files.length);
    for (const file of files) assert.deepEqual(zip.readFile(file.name), Buffer.from(file.code, 'utf8'));
    assert.throws(() => createZip([]));
});
