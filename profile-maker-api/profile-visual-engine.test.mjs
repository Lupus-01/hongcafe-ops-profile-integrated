import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {
    buildVisualRealizationPrompt,
    calculateStructuredImageGroupCount,
    getVisualRealizationPair,
    PROFILE_VISUAL_VARIATION_VERSION,
    VISUAL_REALIZATION_COUNT_PER_BASE
} from './profile-visual-engine.mjs';

test('400 realizations retain scene-compatible composition and varied exposure for each camera mode', () => {
    const scenes = [
        [{ family: 'overhead-spread', camera: '45mm overhead view' }, 'ordered-overhead'],
        [{ family: 'card-closeup', camera: '75mm close detail' }, 'material-detail'],
        [{ shotMode: 'wide-environment' }, 'open-space'],
        [{ shotMode: 'environmental' }, 'layered-space']
    ];
    for (const [scene, expected] of scenes) {
        const exposures = new Map();
        for (let sample = 0; sample < 400; sample += 1) {
            const pair = getVisualRealizationPair({ templateType: 'tarot-ppt', stableIdentity: 'same', nonce: String(sample), portraitScene: scene, moodScene: scene });
            assert.equal(pair.portrait.photographicDirection.id, expected);
            assert.equal(pair.mood.photographicDirection.id, expected);
            const exposure = pair.portrait.lighting.exposureId;
            exposures.set(exposure, (exposures.get(exposure) || 0) + 1);
            const prompt = buildVisualRealizationPrompt(pair.portrait);
            assert.match(prompt, new RegExp(`Primary photographic direction \\(${expected}\\)`));
            if (expected !== 'layered-space') assert.doesNotMatch(prompt, /Depth realization:|Focus realization:/);
        }
        assert.equal(exposures.size, 5);
        assert.ok([...exposures.values()].every((count) => count >= 10 && count <= 180));
    }
});

test('visual scoring penalizes recent composition/exposure and palette/tone combinations and accepts legacy history', () => {
    // Evaluate only the pure scoring block, without starting the API or loading its environment.
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const scoring = source.slice(source.indexOf('function toVisualHistoryEntry('), source.indexOf('function assignNovelVisualVariant('));
    const { scoreVisualPair, createVisualUsageIndex } = vm.runInNewContext(`${scoring}\n({ scoreVisualPair, createVisualUsageIndex })`, {
        getSubjectMotifFamily: (subject) => subject.motifFamilyId || subject.id
    });
    const realization = getVisualRealizationPair({ templateType: 'saju-ppt', stableIdentity: 'score', nonce: '1' }).portrait;
    const variation = { realization, subject: { id: 'book' }, scene: { id: 'scene', family: 'archive', venueId: 'venue' }, paletteId: 'palette-1', visualGroupId: 'new' };
    const pair = { portrait: variation, mood: variation };
    const prior = { kind: 'portrait', photographicDirectionId: realization.photographicDirection.id, exposureId: realization.lighting.exposureId, paletteId: 'palette-1', toneId: realization.tone.id };
    const emptyScore = scoreVisualPair(pair, createVisualUsageIndex([]));
    const repeatedScore = scoreVisualPair(pair, createVisualUsageIndex([prior]));
    const differentScore = scoreVisualPair(pair, createVisualUsageIndex([{ ...prior, photographicDirectionId: 'other', paletteId: 'palette-2' }]));
    assert.equal(emptyScore, 0);
    assert.ok(repeatedScore > differentScore + 400000);
    const legacyScore = scoreVisualPair(pair, createVisualUsageIndex([{ subjectId: 'book', sceneId: 'scene' }]));
    assert.ok(Number.isFinite(legacyScore) && legacyScore > 0);
});

test('structured image groups exceed the text variation count even for a fixed tarot deck', () => {
    const textVariationCount = 88473600n;
    const fixedTarot = calculateStructuredImageGroupCount({
        heroSubjects: 14,
        scenes: 300,
        palettes: 8,
        fixedHeroSubject: true
    });
    assert.equal(PROFILE_VISUAL_VARIATION_VERSION, 'profile-visual-v11-photographic-direction');
    assert.equal(VISUAL_REALIZATION_COUNT_PER_BASE, 61440000);
    assert.ok(fixedTarot > textVariationCount);
});

test('paired images use different location, placement, light, tone, material, focus, and depth directions', () => {
    for (const templateType of ['tarot-ppt', 'saju-ppt', 'sinjeom-ppt']) {
        for (let sample = 0; sample < 1000; sample += 1) {
            const pair = getVisualRealizationPair({
                templateType,
                stableIdentity: `consultant-${sample}`,
                nonce: `nonce-${sample}`,
                generationSequence: sample,
                portraitScene: { environment: 'indoor' },
                moodScene: { environment: 'indoor' }
            });
            for (const key of ['location', 'environmentLocation', 'placement', 'lighting', 'tone', 'material', 'focus', 'depth']) {
                assert.notEqual(pair.portrait[key].id, pair.mood[key].id);
            }
            assert.notEqual(pair.portrait.id, pair.mood.id);
        }
    }
});

test('similar consultants receive broadly distributed structured realization IDs', () => {
    for (const templateType of ['tarot-ppt', 'saju-ppt', 'sinjeom-ppt']) {
        const ids = new Set();
        for (let sample = 0; sample < 10000; sample += 1) {
            const pair = getVisualRealizationPair({
                templateType,
                stableIdentity: 'same-consultant-profile',
                nonce: `nonce-${sample}`,
                generationSequence: sample,
                portraitScene: { environment: 'indoor' },
                moodScene: { environment: 'threshold' }
            });
            ids.add(`${pair.portrait.id}|${pair.mood.id}`);
        }
        assert.ok(ids.size > 9990, `${templateType} produced only ${ids.size} realization pairs`);
    }
});

test('category-specific location and placement language stays visibly separate', () => {
    const prompts = Object.fromEntries(['tarot-ppt', 'saju-ppt', 'sinjeom-ppt'].map((templateType) => {
        const pair = getVisualRealizationPair({
            templateType,
            stableIdentity: 'same-consultant',
            nonce: 'same-nonce',
            generationSequence: 1,
            portraitScene: { environment: 'indoor' },
            moodScene: { environment: 'outdoor' }
        });
        return [templateType, buildVisualRealizationPrompt(pair.portrait)];
    }));
    assert.match(prompts['tarot-ppt'], /card|deck|reading/i);
    assert.match(prompts['saju-ppt'], /saju|analysis|manse|four-pillars/i);
    assert.match(prompts['sinjeom-ppt'], /prayer|ceremonial|spiritual/i);
    assert.match(prompts['tarot-ppt'], /reference images are attached[\s\S]*primary evidence/i);
    assert.equal(new Set(Object.values(prompts)).size, 3);
});

test('physical place language follows indoor, outdoor, and threshold scene environments', () => {
    for (const environment of ['indoor', 'outdoor', 'threshold']) {
        const pair = getVisualRealizationPair({
            templateType: 'sinjeom-ppt',
            stableIdentity: `environment-${environment}`,
            nonce: `environment-${environment}`,
            portraitScene: { environment },
            moodScene: { environment }
        });
        assert.match(pair.portrait.environmentLocation.id, new RegExp(`^${environment}-place-`));
        assert.match(pair.mood.environmentLocation.id, new RegExp(`^${environment}-place-`));
    }
});
