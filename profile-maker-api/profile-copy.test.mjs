import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(apiDirectory, 'server.mjs'), 'utf8');

test('profile headline prompts allow complete titles that naturally wrap to two lines', () => {
    const twoLineInstructions = serverSource.match(/자연스럽게 최대 두 줄로 배치될/g) || [];
    assert.equal(twoLineInstructions.length, 3);
    assert.doesNotMatch(serverSource, /줄바꿈 없이 반드시 한 줄 문장/);
    assert.doesNotMatch(serverSource, /줄바꿈 없는 한 줄 제목/);
    assert.match(serverSource, /글자 수를 획일적으로 제한하지 않는다/);
    assert.match(serverSource, /줄바꿈 문자를 직접 넣지 않는다/);
});

test('category copy prompts create a new fingerprint while preserving safe legacy image reuse', () => {
    assert.match(serverSource, /const PROFILE_TEXT_PROMPT_VERSION = 'profile-copy-v5-generation-sequence';/);
    assert.match(serverSource, /profileTextPromptVersion: String\(payload\.profileTextPromptVersion \|\| 'legacy'\)/);
    const versionAssignments = serverSource.match(/payload\.profileTextPromptVersion = PROFILE_TEXT_PROMPT_VERSION;/g) || [];
    assert.equal(versionAssignments.length, 2);
    assert.match(serverSource, /profileTextPromptVersion: PROFILE_TEXT_PROMPT_VERSION/);
    assert.match(serverSource, /PREVIOUS_PROFILE_TEXT_PROMPT_VERSIONS = \['profile-copy-v4-category-language-separation', 'profile-copy-v3-category-combinations', 'profile-copy-v2-two-line-headline', 'legacy'\]/);
    assert.match(serverSource, /reuseCompletedProfileImageStages\(record, reusableLegacyJob\)/);
});

test('all text generation paths use copy variants and strong reference context', () => {
    const directionCalls = serverSource.match(/buildProfileCopyDirection\(payload\.copyVariant\)/g) || [];
    assert.equal(directionCalls.length, 3);
    assert.match(serverSource, /All \$\{referenceImageCount\} uploaded references are primary visual evidence/);
    assert.match(serverSource, /return referenceImages;/);
    assert.match(serverSource, /payload\.referenceText = sanitizeProfileReferenceText/);
});
