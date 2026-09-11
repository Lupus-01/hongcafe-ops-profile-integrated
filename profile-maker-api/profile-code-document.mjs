import AdmZip from 'adm-zip';
import { inflateRawSync } from 'node:zlib';

export const MAX_CODE_FILE_BYTES = 30 * 1024 * 1024;
const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };

// 생성용 문서 파서의 공백 정리/안내 문구 추가를 거치지 않는다.
// XML은 브라우저의 XML 파서로 읽어 실제 w:t 텍스트를 보존한다.
export function readCodeDocumentXml(buffer, name) {
    if (!/\.docx$/i.test(name || '')) fail('Word 코드는 .docx 형식만 지원합니다. .doc 파일은 .docx로 저장해주세요.');
    if (!buffer?.length || buffer.length > MAX_CODE_FILE_BYTES) fail('Word 파일은 30MB 이하여야 합니다.');
    try {
        const entries = new AdmZip(buffer).getEntries();
        if (entries.length > 2048) fail('Word 파일 내부 항목이 너무 많습니다.');
        const documents = entries.filter((entry) => entry.entryName === 'word/document.xml');
        if (documents.length !== 1) fail('올바른 DOCX 문서 구조가 아닙니다.');
        // 별도 영역이나 변경 추적 내용이 누락된 채 성공하지 않도록 보수적으로 제한한다.
        if (entries.some((entry) => /^word\/(?:header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(entry.entryName))) {
            fail('머리말·꼬리말·각주가 있는 Word 문서는 지원하지 않습니다. 코드만 TXT로 저장해주세요.');
        }
        const entry = documents[0];
        if (entry.header.encrypted || entry.header.size > MAX_CODE_FILE_BYTES) fail('암호화되었거나 압축 해제 크기가 30MB를 넘는 문서입니다.');
        const compressed = entry.getCompressedData();
        const content = entry.header.method === 0 ? compressed
            : entry.header.method === 8 ? inflateRawSync(compressed, { maxOutputLength: MAX_CODE_FILE_BYTES })
                : fail('지원하지 않는 DOCX 압축 방식입니다.');
        if (content.length > MAX_CODE_FILE_BYTES || content.length !== entry.header.size) fail('Word 문서 데이터 크기가 일치하지 않습니다.');
        // AdmZip의 CRC 검증도 통과해야 반환한다. 위 단계에서 실제 해제 크기를 먼저 제한한다.
        if (!entry.getData().equals(content)) fail('Word 문서 데이터 검증에 실패했습니다.');
        const encoding = content[0] === 0xff && content[1] === 0xfe ? 'utf-16le'
            : content[0] === 0xfe && content[1] === 0xff ? 'utf-16be' : 'utf-8';
        return new TextDecoder(encoding, { fatal: true }).decode(content);
    } catch (error) {
        if (error.status === 400) throw error;
        fail('DOCX 파일을 손상 없이 읽을 수 없습니다. 코드가 들어 있는 정상 Word 파일인지 확인해주세요.');
    }
}

export function registerCodeDocumentRoute(app, middleware, multer) {
    const readUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CODE_FILE_BYTES, files: 1, fields: 0, parts: 2 } }).single('file');
    app.post('/api/profile-code-document', ...middleware, (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        readUpload(req, res, (error) => {
            if (error) return res.status(400).json({ error: 'DOCX 파일 하나를 30MB 이하로 업로드해주세요.' });
            try {
                if (!req.file) fail('Word 파일을 선택해주세요.');
                const documentXml = readCodeDocumentXml(req.file.buffer, req.file.originalname);
                res.json({ documentXml });
            } catch (failure) {
                res.status(failure.status || 400).json({ error: failure.message });
            }
        });
    });
}
