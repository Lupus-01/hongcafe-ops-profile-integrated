import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const profileMakerDirectory = path.dirname(fileURLToPath(import.meta.url));
const script = fs.readFileSync(path.join(profileMakerDirectory, 'script.js'), 'utf8');

function getFunctionSource(source, functionName) {
    const start = source.indexOf(`function ${functionName}(`);
    assert.notEqual(start, -1, `${functionName} must exist`);
    const bodyStart = source.indexOf('{', start);
    let depth = 0;

    for (let index = bodyStart; index < source.length; index += 1) {
        if (source[index] === '{') depth += 1;
        if (source[index] !== '}') continue;
        depth -= 1;
        if (depth === 0) return source.slice(start, index + 1);
    }

    throw new Error(`${functionName} source is incomplete`);
}

test('site code compaction removes only formatting whitespace from structural containers', () => {
    const functionSource = getFunctionSource(script, 'compactExportFormattingWhitespace');
    const compact = vm.runInNewContext(`(${functionSource})`, {
        Node: { TEXT_NODE: 3 }
    });
    const formattingWhitespace = {
        nodeType: 3,
        textContent: '\n        ',
        remove() { this.removed = true; }
    };
    const meaningfulText = {
        nodeType: 3,
        textContent: '제목 안의 실제 공백은 유지합니다.',
        remove() { this.removed = true; }
    };
    const nestedWhitespace = {
        nodeType: 3,
        textContent: '  ',
        remove() { this.removed = true; }
    };
    const visualElement = {
        nodeType: 1,
        textContent: '',
        remove() { this.removed = true; }
    };
    const nestedContainer = {
        childNodes: [nestedWhitespace]
    };
    const root = {
        childNodes: [formattingWhitespace, meaningfulText, visualElement],
        querySelectorAll() { return [nestedContainer]; }
    };

    compact(root);

    assert.equal(formattingWhitespace.removed, true);
    assert.equal(nestedWhitespace.removed, true);
    assert.equal(meaningfulText.removed, undefined);
    assert.equal(visualElement.removed, undefined);
});

test('site code compaction runs after styling and before serialization', () => {
    assert.match(script, /applyEditorFriendlyExportStyles\(clone, \{ outputMode: 'site' \}\);\s*compactExportFormattingWhitespace\(clone\);\s*const wrapper/);
    assert.doesNotMatch(script, /innerHTML\.replace\(\s*\/>\\s\+</);
});
