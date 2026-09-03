import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildVisualRealizationPrompt,
    calculateStructuredImageGroupCount,
    getVisualRealizationPair,
    PROFILE_VISUAL_VARIATION_VERSION,
    VISUAL_REALIZATION_COUNT_PER_BASE
} from './profile-visual-engine.mjs';

test('structured image groups exceed the text variation count even for a fixed tarot deck', () => {
    const textVariationCount = 88473600n;
    const fixedTarot = calculateStructuredImageGroupCount({
        heroSubjects: 14,
        scenes: 300,
        palettes: 8,
        fixedHeroSubject: true
    });
    assert.equal(PROFILE_VISUAL_VARIATION_VERSION, 'profile-visual-v9-cross-campaign-history');
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
