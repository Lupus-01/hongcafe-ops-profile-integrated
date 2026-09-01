import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(directory, 'script.js'), 'utf8');

test('document upload advertises every parser-backed Office and notepad format', () => {
    for (const extension of ['.docx', '.pptx', '.xlsx', '.xls', '.txt', '.csv', '.tsv', '.md']) {
        assert.match(html, new RegExp(extension.replace('.', '\\.')));
    }
    assert.match(html, /Microsoft Word, PowerPoint, Excel과 메모장 파일을 최대 5개/);
    assert.match(html, /Office \/ 메모장 참고 파일 업로드/);
    assert.match(html, /id="pb-ppt-file"[^>]*multiple/);
    assert.match(html, /최대 5개, 합계 25MB/);
});

test('document upload status handles non-slide and non-sheet sources', () => {
    assert.match(script, /data\.meta\?\.itemCount/);
    assert.match(script, /data\.meta\.sourceLabel \|\| '문서'/);
    assert.match(script, /Office 또는 메모장 참고 파일을 선택해주세요/);
    assert.match(script, /files\.forEach\(\(selectedFile\) => formData\.append\('pptFile', selectedFile, selectedFile\.name\)\)/);
    assert.match(script, /선택한 참고 파일 \$\{files\.length\}개/);
    assert.match(script, /data\.meta\?\.fileCount/);
});
