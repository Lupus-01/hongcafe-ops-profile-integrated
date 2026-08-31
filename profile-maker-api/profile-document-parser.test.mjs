import assert from 'node:assert/strict';
import test from 'node:test';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';
import {
    parseDocumentBuffer,
    SUPPORTED_DOCUMENT_EXTENSIONS
} from './profile-document-parser.mjs';

function createZipBuffer(entries) {
    const zip = new AdmZip();
    for (const [name, content] of Object.entries(entries)) {
        zip.addFile(name, Buffer.from(content, 'utf8'));
    }
    return zip.toBuffer();
}

function createWorkbookBuffer(bookType) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([['상담사', '강점'], ['홍길동', '따뜻한 관계 상담']]),
        '상담 정보'
    );
    return XLSX.write(workbook, { type: 'buffer', bookType });
}

test('supported document list covers modern Office and notepad formats', () => {
    assert.deepEqual(SUPPORTED_DOCUMENT_EXTENSIONS, [
        '.docx', '.pptx', '.xlsx', '.xls', '.txt', '.csv', '.tsv', '.md'
    ]);
});

test('DOCX main document text and table cells are extracted', () => {
    const buffer = createZipBuffer({
        '[Content_Types].xml': '<Types/>',
        'word/document.xml': `
            <w:document xmlns:w="word"><w:body>
                <w:p><w:r><w:t>따뜻한 상담</w:t></w:r></w:p>
                <w:tbl><w:tr><w:tc><w:p><w:r><w:t>경력 10년</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
            </w:body></w:document>`
    });
    const parsed = parseDocumentBuffer(buffer, 'profile.docx');
    assert.equal(parsed.fileType, 'docx');
    assert.match(parsed.combinedText, /따뜻한 상담/);
    assert.match(parsed.combinedText, /경력 10년/);
});

test('PPTX slides are ordered and extracted', () => {
    const buffer = createZipBuffer({
        '[Content_Types].xml': '<Types/>',
        'ppt/presentation.xml': '<p:presentation/>',
        'ppt/slides/slide2.xml': '<p:sld><a:t>두 번째</a:t></p:sld>',
        'ppt/slides/slide1.xml': '<p:sld><a:t>첫 번째</a:t></p:sld>'
    });
    const parsed = parseDocumentBuffer(buffer, 'profile.pptx');
    assert.equal(parsed.slides.length, 2);
    assert.match(parsed.combinedText, /\[slide 1\]\n첫 번째[\s\S]*\[slide 2\]\n두 번째/);
});

test('XLSX and legacy XLS spreadsheets are extracted', () => {
    for (const fileType of ['xlsx', 'xls']) {
        const parsed = parseDocumentBuffer(createWorkbookBuffer(fileType), `profile.${fileType}`);
        assert.equal(parsed.fileType, fileType);
        assert.equal(parsed.sheets.length, 1);
        assert.match(parsed.combinedText, /홍길동 \| 따뜻한 관계 상담/);
    }
});

test('UTF-8 and UTF-16 notepad files are extracted', () => {
    const utf8 = parseDocumentBuffer(Buffer.from('상담 특징\n차분한 설명', 'utf8'), 'memo.txt');
    const utf16 = parseDocumentBuffer(Buffer.from('\ufeff상담 특징\r\n현실적인 조언', 'utf16le'), 'memo.txt');
    assert.match(utf8.combinedText, /차분한 설명/);
    assert.match(utf16.combinedText, /현실적인 조언/);
});

test('CSV and TSV files are parsed as spreadsheet text', () => {
    const csv = parseDocumentBuffer(Buffer.from('이름,분야\n홍길동,타로', 'utf8'), 'profile.csv');
    const tsv = parseDocumentBuffer(Buffer.from('이름\t분야\n홍길동\t사주', 'utf8'), 'profile.tsv');
    assert.match(csv.combinedText, /홍길동 \| 타로/);
    assert.match(tsv.combinedText, /홍길동 \| 사주/);
});

test('unsupported legacy Word and disguised DOCX files are rejected', () => {
    assert.throws(
        () => parseDocumentBuffer(Buffer.from('legacy'), 'profile.doc'),
        /지원하지 않는 문서 형식/
    );
    assert.throws(
        () => parseDocumentBuffer(Buffer.from('not-a-zip'), 'profile.docx'),
        /Word 파일 구조/
    );
    assert.throws(
        () => parseDocumentBuffer(Buffer.from('not-an-excel-file'), 'profile.xlsx'),
        /Excel 파일 구조/
    );
    assert.throws(
        () => parseDocumentBuffer(Buffer.from('not-an-excel-file'), 'profile.xls'),
        /실제 Excel 파일 형식/
    );
});
