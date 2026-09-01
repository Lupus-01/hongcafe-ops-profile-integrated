import assert from 'node:assert/strict';
import test from 'node:test';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';
import {
    buildLimitedDocumentText,
    parseDocumentBuffer,
    parseDocumentFiles,
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

function createUtf16BeBuffer(value) {
    const body = Buffer.from(value, 'utf16le');
    for (let index = 0; index < body.length; index += 2) {
        [body[index], body[index + 1]] = [body[index + 1], body[index]];
    }
    return Buffer.concat([Buffer.from([0xfe, 0xff]), body]);
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
    const utf16Le = parseDocumentBuffer(Buffer.from('\ufeff상담 특징\r\n현실적인 조언', 'utf16le'), 'memo.txt');
    const utf16Be = parseDocumentBuffer(createUtf16BeBuffer('상담 특징\r\n차분한 방향'), 'memo.txt');
    assert.match(utf8.combinedText, /차분한 설명/);
    assert.match(utf16Le.combinedText, /현실적인 조언/);
    assert.match(utf16Be.combinedText, /차분한 방향/);
});

test('EUC-KR notepad, CSV, and TSV files preserve Korean text', () => {
    const text = parseDocumentBuffer(Buffer.from('bbf3b4e320c6afc2a10ab5fbb6e6c7d120bcb3b8ed', 'hex'), 'memo.txt');
    const csv = parseDocumentBuffer(Buffer.from('c0ccb8a72cbad0bedf0ac8abb1e6b5bf2cc5b8b7ce', 'hex'), 'profile.csv');
    const tsv = parseDocumentBuffer(Buffer.from('c0ccb8a709bad0bedf0ac8abb1e6b5bf09bbe7c1d6', 'hex'), 'profile.tsv');
    assert.match(text.combinedText, /따뜻한 설명/);
    assert.match(csv.combinedText, /홍길동 \| 타로/);
    assert.match(tsv.combinedText, /홍길동 \| 사주/);
});

test('notepad files containing binary null bytes are rejected', () => {
    assert.throws(
        () => parseDocumentBuffer(Buffer.from([0x41, 0x00, 0x42]), 'binary.txt'),
        /읽을 수 없는 바이너리 데이터/
    );
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

test('multiple mixed documents retain file order, source metadata, and all extracted content', () => {
    const parsed = parseDocumentFiles([
        { originalname: '소개.txt', buffer: Buffer.from('따뜻한 공감 상담', 'utf8') },
        { originalname: '전문분야.csv', buffer: Buffer.from('분야,강점\n관계,현실적인 방향', 'utf8') },
        { originalname: '메모.md', buffer: Buffer.from('차분한 설명과 신뢰감', 'utf8') }
    ]);
    assert.equal(parsed.fileType, 'multiple');
    assert.equal(parsed.sourceLabel, '참고 문서 3개');
    assert.equal(parsed.fileCount, 3);
    assert.deepEqual(parsed.documents.map((document) => document.fileName), ['소개.txt', '전문분야.csv', '메모.md']);
    assert.match(parsed.combinedText, /참고 파일 1: 소개\.txt[\s\S]*따뜻한 공감 상담/);
    assert.match(parsed.combinedText, /참고 파일 2: 전문분야\.csv[\s\S]*관계 \| 현실적인 방향/);
    assert.match(parsed.combinedText, /참고 파일 3: 메모\.md[\s\S]*차분한 설명과 신뢰감/);
});

test('single-file aggregation preserves the legacy document metadata and text', () => {
    const buffer = Buffer.from('한 파일 참고 내용', 'utf8');
    const legacy = parseDocumentBuffer(buffer, 'single.txt');
    const aggregated = parseDocumentFiles([{ originalname: 'single.txt', buffer }]);
    assert.equal(aggregated.fileType, legacy.fileType);
    assert.equal(aggregated.sourceLabel, legacy.sourceLabel);
    assert.equal(aggregated.combinedText, legacy.combinedText);
    assert.equal(aggregated.fileCount, 1);
});

test('limited multi-document text gives every file a fair share of the prompt budget', () => {
    const parsed = parseDocumentFiles([
        { originalname: 'first.txt', buffer: Buffer.from(`첫번째고유내용 ${'가'.repeat(2000)}`, 'utf8') },
        { originalname: 'second.txt', buffer: Buffer.from(`두번째고유내용 ${'나'.repeat(2000)}`, 'utf8') },
        { originalname: 'third.txt', buffer: Buffer.from(`세번째고유내용 ${'다'.repeat(2000)}`, 'utf8') }
    ]);
    const limited = buildLimitedDocumentText(parsed, 900);
    assert.ok(limited.length <= 900);
    assert.match(limited, /참고 파일 1: first\.txt[\s\S]*첫번째고유내용/);
    assert.match(limited, /참고 파일 2: second\.txt[\s\S]*두번째고유내용/);
    assert.match(limited, /참고 파일 3: third\.txt[\s\S]*세번째고유내용/);
    assert.match(limited, /각 파일의 내용을 균등하게 나누어 반영/);
});

test('multiple document parse errors identify the failing file', () => {
    assert.throws(
        () => parseDocumentFiles([
            { originalname: 'valid.txt', buffer: Buffer.from('정상 자료', 'utf8') },
            { originalname: 'broken.docx', buffer: Buffer.from('not-a-zip') }
        ]),
        /broken\.docx: Word 파일 구조/
    );
});
