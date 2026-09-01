import path from 'node:path';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';

export const SUPPORTED_DOCUMENT_EXTENSIONS = Object.freeze([
    '.docx',
    '.pptx',
    '.xlsx',
    '.xls',
    '.txt',
    '.csv',
    '.tsv',
    '.md'
]);

const DOCUMENT_TYPE_LABELS = Object.freeze({
    docx: 'Word 문서',
    pptx: 'PowerPoint 문서',
    xlsx: 'Excel 문서',
    xls: 'Excel 문서',
    txt: '메모장 텍스트',
    csv: 'CSV 문서',
    tsv: 'TSV 문서',
    md: 'Markdown 문서'
});

function createDocumentError(message) {
    const error = new Error(message);
    error.status = 400;
    error.expose = true;
    return error;
}

function decodeXmlEntities(value) {
    return String(value || '')
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;|&#39;/g, "'");
}

function normalizeDocumentText(value) {
    return String(value || '')
        .replace(/\r\n?/g, '\n')
        .replace(/[\t ]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function getZipEntries(buffer, requiredEntryPattern, label) {
    let entries;
    try {
        entries = new AdmZip(buffer).getEntries();
    } catch {
        throw createDocumentError(`${label} 파일 구조를 확인할 수 없습니다.`);
    }
    if (!entries.some((entry) => requiredEntryPattern.test(entry.entryName))) {
        throw createDocumentError(`확장자와 실제 ${label} 파일 형식이 일치하지 않습니다.`);
    }
    return entries;
}

function extractTaggedTexts(xml, tagName) {
    const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'g');
    return [...String(xml || '').matchAll(pattern)]
        .map((match) => normalizeDocumentText(decodeXmlEntities(match[1])))
        .filter(Boolean);
}

export function parsePptxBuffer(buffer) {
    const entries = getZipEntries(buffer, /^ppt\/presentation\.xml$/i, 'PowerPoint');
    const slideEntries = entries
        .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.entryName))
        .sort((left, right) => {
            const leftNumber = Number(left.entryName.match(/slide(\d+)\.xml/i)?.[1] || 0);
            const rightNumber = Number(right.entryName.match(/slide(\d+)\.xml/i)?.[1] || 0);
            return leftNumber - rightNumber;
        });
    const slides = slideEntries.map((entry, index) => ({
        index: index + 1,
        text: extractTaggedTexts(entry.getData().toString('utf8'), 'a:t').join('\n')
    })).filter((slide) => slide.text);
    return {
        fileType: 'pptx',
        documentType: 'presentation',
        sourceLabel: DOCUMENT_TYPE_LABELS.pptx,
        itemCount: slides.length,
        slides,
        sheets: [],
        combinedText: slides.map((slide) => `[slide ${slide.index}]\n${slide.text}`).join('\n\n')
    };
}

function extractWordXmlText(xml) {
    return normalizeDocumentText(
        decodeXmlEntities(String(xml || '')
            .replace(/<w:tab\b[^>]*\/?\s*>/gi, '\t')
            .replace(/<w:(?:br|cr)\b[^>]*\/?\s*>/gi, '\n')
            .replace(/<\/w:tc>/gi, '\t')
            .replace(/<\/w:p>/gi, '\n')
            .replace(/<[^>]+>/g, ''))
    );
}

export function parseDocxBuffer(buffer) {
    const entries = getZipEntries(buffer, /^word\/document\.xml$/i, 'Word');
    const documentEntry = entries.find((entry) => /^word\/document\.xml$/i.test(entry.entryName));
    const text = extractWordXmlText(documentEntry.getData().toString('utf8'));
    return {
        fileType: 'docx',
        documentType: 'word',
        sourceLabel: DOCUMENT_TYPE_LABELS.docx,
        itemCount: text ? 1 : 0,
        slides: [],
        sheets: [],
        combinedText: text ? `[word document]\n${text}` : ''
    };
}

function createSpreadsheetResult(workbook, fileType) {
    const sheets = workbook.SheetNames.map((sheetName) => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            blankrows: false,
            defval: ''
        });
        const lines = rows
            .map((row) => row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join(' | '))
            .filter(Boolean);
        return { name: sheetName, text: lines.join('\n') };
    }).filter((sheet) => sheet.text);
    return {
        fileType,
        documentType: 'spreadsheet',
        sourceLabel: DOCUMENT_TYPE_LABELS[fileType],
        itemCount: sheets.length,
        slides: [],
        sheets,
        combinedText: sheets.map((sheet) => `[sheet ${sheet.name}]\n${sheet.text}`).join('\n\n')
    };
}

export function parseSpreadsheetBuffer(buffer, fileType = 'xlsx') {
    if (fileType === 'xlsx') {
        getZipEntries(buffer, /^xl\/workbook\.xml$/i, 'Excel');
    }
    if (fileType === 'xls') {
        const oleSignature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
        if (!oleSignature.every((value, index) => buffer[index] === value)) {
            throw createDocumentError('확장자와 실제 Excel 파일 형식이 일치하지 않습니다.');
        }
    }
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
        throw createDocumentError('Excel 파일 구조를 확인할 수 없습니다.');
    }
    return createSpreadsheetResult(workbook, fileType);
}

function decodeTextBuffer(buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        return new TextDecoder('utf-8').decode(buffer.subarray(3));
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(buffer.subarray(2));
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(buffer.subarray(2));
    }
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
        return new TextDecoder('euc-kr', { fatal: true }).decode(buffer);
    }
}

export function parseTextBuffer(buffer, fileType = 'txt') {
    let text;
    try {
        text = normalizeDocumentText(decodeTextBuffer(buffer));
    } catch {
        throw createDocumentError('텍스트 파일의 문자 인코딩을 확인할 수 없습니다.');
    }
    if (text.includes('\0')) {
        throw createDocumentError('텍스트 파일에서 읽을 수 없는 바이너리 데이터를 발견했습니다.');
    }
    return {
        fileType,
        documentType: 'text',
        sourceLabel: DOCUMENT_TYPE_LABELS[fileType],
        itemCount: text ? 1 : 0,
        slides: [],
        sheets: [],
        combinedText: text ? `[${fileType} document]\n${text}` : ''
    };
}

export function parseDelimitedTextBuffer(buffer, fileType) {
    let text;
    try {
        text = decodeTextBuffer(buffer);
    } catch {
        throw createDocumentError(`${DOCUMENT_TYPE_LABELS[fileType]}의 문자 인코딩을 확인할 수 없습니다.`);
    }
    if (text.includes('\0')) {
        throw createDocumentError(`${DOCUMENT_TYPE_LABELS[fileType]}에서 읽을 수 없는 바이너리 데이터를 발견했습니다.`);
    }
    let workbook;
    try {
        workbook = XLSX.read(text, {
            type: 'string',
            FS: fileType === 'tsv' ? '\t' : ','
        });
    } catch {
        throw createDocumentError(`${DOCUMENT_TYPE_LABELS[fileType]} 구조를 확인할 수 없습니다.`);
    }
    const parsed = createSpreadsheetResult(workbook, fileType);
    parsed.documentType = 'delimited-text';
    return parsed;
}

export function parseDocumentBuffer(buffer, fileName) {
    const extension = path.extname(String(fileName || '')).toLowerCase();
    if (!SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension)) {
        throw createDocumentError(`지원하지 않는 문서 형식입니다. 지원 형식: ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')}`);
    }
    const fileType = extension.slice(1);
    if (fileType === 'pptx') return parsePptxBuffer(buffer);
    if (fileType === 'docx') return parseDocxBuffer(buffer);
    if (fileType === 'xlsx' || fileType === 'xls') return parseSpreadsheetBuffer(buffer, fileType);
    if (fileType === 'csv' || fileType === 'tsv') return parseDelimitedTextBuffer(buffer, fileType);
    return parseTextBuffer(buffer, fileType);
}

function getSafeDocumentFileName(value, index) {
    return path.basename(String(value || '').trim()) || `참고파일-${index + 1}`;
}

export function parseDocumentFiles(files) {
    if (!Array.isArray(files) || files.length === 0) {
        throw createDocumentError('문서 파일이 업로드되지 않았습니다.');
    }

    const documents = files.map((file, index) => {
        const fileName = getSafeDocumentFileName(file?.originalname || file?.fileName, index);
        let parsed;
        try {
            parsed = parseDocumentBuffer(file?.buffer, fileName);
        } catch (error) {
            throw createDocumentError(`${fileName}: ${error?.message || '문서 내용을 확인하지 못했습니다.'}`);
        }
        if (!parsed.itemCount || !String(parsed.combinedText || '').trim()) {
            throw createDocumentError(`${fileName}: 읽을 수 있는 텍스트를 찾지 못했습니다.`);
        }
        return {
            ...parsed,
            fileName,
            slidesCount: parsed.slides.length,
            sheetsCount: parsed.sheets.length
        };
    });

    const isSingleDocument = documents.length === 1;
    const combinedText = isSingleDocument
        ? documents[0].combinedText
        : documents.map((document, index) => (
            `[참고 파일 ${index + 1}: ${document.fileName}]\n${document.combinedText}`
        )).join('\n\n');
    const slides = documents.flatMap((document) => document.slides.map((slide) => ({
        ...slide,
        fileName: document.fileName
    })));
    const sheets = documents.flatMap((document) => document.sheets.map((sheet) => ({
        ...sheet,
        fileName: document.fileName
    })));

    return {
        fileType: isSingleDocument ? documents[0].fileType : 'multiple',
        documentType: isSingleDocument ? documents[0].documentType : 'multiple',
        sourceLabel: isSingleDocument ? documents[0].sourceLabel : `참고 문서 ${documents.length}개`,
        fileCount: documents.length,
        itemCount: documents.reduce((total, document) => total + document.itemCount, 0),
        slides,
        sheets,
        documents,
        combinedText
    };
}

function getUniqueDocumentBody(document, seenBlocks) {
    const blocks = String(document?.combinedText || '')
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);
    return blocks.filter((block) => {
        const normalized = block.replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR');
        if (seenBlocks.has(normalized)) return false;
        seenBlocks.add(normalized);
        return true;
    }).join('\n\n');
}

export function buildLimitedDocumentText(documentInfo, maxChars) {
    const limit = Math.max(Number(maxChars) || 0, 1);
    const documents = Array.isArray(documentInfo?.documents) && documentInfo.documents.length
        ? documentInfo.documents
        : null;
    if (!documents || documents.length === 1) {
        const text = String(documentInfo?.combinedText ?? documentInfo ?? '');
        if (text.length <= limit) return text;
        return `${text.slice(0, limit)}\n\n[문서가 길어 비용 보호를 위해 앞부분 ${limit}자까지만 반영되었습니다.]`;
    }

    const seenBlocks = new Set();
    const sections = documents.map((document, index) => ({
        header: `[참고 파일 ${index + 1}: ${document.fileName}]`,
        body: getUniqueDocumentBody(document, seenBlocks)
    }));
    const fullText = sections.map(({ header, body }) => `${header}\n${body}`).join('\n\n');
    if (fullText.length <= limit) return fullText;

    const truncationNote = '\n\n[전체 참고 자료가 길어 각 파일의 내용을 균등하게 나누어 반영했습니다.]';
    const fixedLength = sections.reduce((total, section) => total + section.header.length + 1, 0)
        + Math.max(sections.length - 1, 0) * 2
        + truncationNote.length;
    let remaining = Math.max(limit - fixedLength, 0);
    const allocations = Array(sections.length).fill(0);
    let active = sections.map((section, index) => ({ index, length: section.body.length }));

    while (remaining > 0 && active.length) {
        const share = Math.max(Math.floor(remaining / active.length), 1);
        const nextActive = [];
        for (const item of active) {
            if (remaining <= 0) break;
            const available = item.length - allocations[item.index];
            const amount = Math.min(share, available, remaining);
            allocations[item.index] += amount;
            remaining -= amount;
            if (allocations[item.index] < item.length) nextActive.push(item);
        }
        active = nextActive;
    }

    if (fixedLength > limit) return `${fullText.slice(0, limit)}${truncationNote}`;
    return sections.map((section, index) => (
        `${section.header}\n${section.body.slice(0, allocations[index]).trimEnd()}`
    )).join('\n\n') + truncationNote;
}
