import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { createOfflineVisualRuntime } from './profile-diversity-runtime.mjs';
import { sanitizeImagePromptContext } from './profile-image-context.mjs';

test('pre-change tarot, sinjeom and persisted legacy saju pairs and prompts remain byte-identical', () => {
    // SHA-256 snapshots captured from commit 06adee6 before changing the engine.
    const expected = {
        'tarot-ppt': '58cd06c6986046d77588e2e6ef0da97efc1a05adc873ed61963749e293d1b45b',
        'sinjeom-ppt': '376e3d1b1fe1bdc3f2f333626aba9ba1162d3eae02bd7a4c9a86174982032c4c',
        'saju-ppt': 'bce36bcfbe1431e7871ffd58338f992e0375bf019ca7899c169373cccf18e9a5'
    };
    const runtime = createOfflineVisualRuntime(() => []);
    for (const [templateType, digest] of Object.entries(expected)) {
        const samples = [];
        for (let i = 0; i < 20; i += 1) {
            const payload = { templateType, visualIdentity: `preserve-${i}`, visualNonce: 'baseline', visualVariationVersion: 'profile-visual-v16-oblique-tables' };
            const pair = runtime.getVisualPair(payload);
            payload.visualSceneIds = { portrait: pair.portrait.scene.id, mood: pair.mood.scene.id };
            assert.equal(JSON.stringify(runtime.getVisualPair(payload)), JSON.stringify(pair));
            samples.push({ payload, pair, prompts: Object.entries(pair).map(([kind, value]) => runtime.buildVisualVariationPrompt(value, kind)) });
        }
        assert.equal(crypto.createHash('sha256').update(JSON.stringify(samples)).digest('hex'), digest, templateType);
    }
});

test('saju assignments balance five shooting groups, separate real motif families and restore exactly', (t) => {
    const history = [];
    const runtime = createOfflineVisualRuntime(() => history);
    const counts = {}, subjects = new Set(), scenes = new Set();
    for (let sample = 0; sample < 200; sample += 1) {
        const payload = { templateType: 'saju-ppt', visualVariationVersion: 'profile-visual-saju-v1-study-compositions', visualIdentity: `saju-${sample}`, visualNonce: String(sample) };
        runtime.assignNovelVisualVariant(payload);
        const pair = runtime.getVisualPair(payload);
        assert.notEqual(pair.portrait.subject.motifFamilyId, pair.mood.subject.motifFamilyId);
        assert.notEqual(pair.portrait.scene.shootingGroup, pair.mood.scene.shootingGroup);
        assert.equal(JSON.stringify(runtime.getVisualPair(JSON.parse(JSON.stringify(payload)))), JSON.stringify(pair));
        for (const kind of ['portrait', 'mood']) {
            const value = pair[kind];
            assert.ok(value.scene.sajuStudy);
            assert.ok(runtime.isSubjectCompatibleWithScene(value.subject, value.scene));
            assert.ok(value.scene.motifFamilies.includes(value.subject.motifFamilyId));
            counts[value.scene.shootingGroup] = (counts[value.scene.shootingGroup] || 0) + 1;
            subjects.add(value.subject.id); scenes.add(value.scene.baseVenueId);
        }
        history.unshift(...['portrait', 'mood'].map(kind => runtime.toVisualHistoryEntry(kind, pair[kind])));
    }
    for (const [group, expected] of Object.entries({ 'analysis-overhead': 100, 'reference-oblique': 100, 'material-close': 80, 'diagram-front': 80, 'consultation-space': 40 })) {
        assert.ok(Math.abs(counts[group] - expected) <= 2, JSON.stringify(counts));
    }
    assert.equal(subjects.size, 12);
    assert.equal(scenes.size, 20);
    t.diagnostic(JSON.stringify({ counts, subjects: subjects.size, scenes: scenes.size, externalAiCalls: 0 }));
});

test('all new saju scenes have compatible heroes and forbid mismatched study objects', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const heroes = runtime.TEMPLATE_GUIDES['saju-ppt'].visualSubjects;
    for (const scene of runtime.SCENE_ARCHETYPES['saju-ppt'].filter(scene => scene.sajuStudy)) {
        assert.ok(heroes.some(hero => runtime.isSubjectCompatibleWithScene(hero, scene)));
        if (scene.shootingGroup === 'analysis-overhead') {
            for (const id of ['wooden-index-system', 'reference-book-stack', 'modern-manse-calendar']) {
                assert.equal(runtime.isSubjectCompatibleWithScene(heroes.find(hero => hero.id === id), scene), false);
            }
        }
    }
});

test('both saju prompt builders keep assigned framing, sharp materials and category boundaries', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
    const builders = vm.runInNewContext(`
        ${between('const SMARTPHONE_PHOTO_REQUIREMENTS =', 'const VISUAL_VARIATION_VERSION =')}
        ${between('const IMAGE_QUALITY_PROFILES =', 'app.use(cors(')}
        ${between('function buildReferenceAssignmentPrompt(', 'function buildImageContents(')}
        ${between('function buildPortraitImagePrompt(', 'async function generatePortraitImage(')}
        ${between('function buildMoodImagePrompt(', 'async function generateMoodImage(')}
        ({ portrait: buildPortraitImagePrompt, mood: buildMoodImagePrompt })
    `, { STANDARD_IMAGE_MODEL: 'offline', PREMIUM_IMAGE_MODEL: 'offline', getTemplateGuide: type => runtime.TEMPLATE_GUIDES[type],
        getImageQuality: quality => quality, sanitizeExtraPrompt: sanitizeImagePromptContext, buildVisualVariationPrompt: runtime.buildVisualVariationPrompt });
    const groups = new Set();
    for (const imageQuality of ['standard', 'premium']) for (let sample = 0; sample < 80; sample += 1) {
        const payload = { templateType: 'saju-ppt', visualIdentity: String(sample), imageQuality, referenceImageCount: 2, imageStyle: '타로 카드와 불상, 손을 보여줘' };
        const pair = runtime.getVisualPair(payload);
        for (const kind of ['portrait', 'mood']) {
            const variation = pair[kind], prompt = builders[kind](payload, '', variation);
            groups.add(variation.scene.shootingGroup);
            assert.ok(prompt.includes(variation.scene.prompt));
            assert.ok(prompt.includes(variation.scene.camera));
            assert.match(prompt, /SAJU STUDY PHOTOGRAPH/);
            assert.match(prompt, /do not blur the whole object/);
            assert.match(prompt, /CATEGORY AND PLACE BOUNDARY/);
            assert.match(prompt, /Exclude photographic hands/);
            assert.doesNotMatch(prompt, /preserve the assigned card family at the scene's subject scale/);
            assert.doesNotMatch(prompt, /Distinct category location:/);
            if (variation.scene.cameraHeight === 'overhead') {
                assert.match(prompt, /gravity acts into the surface/);
                assert.doesNotMatch(prompt, /top edge of the generated image must correspond to the real top of the room/);
            }
        }
    }
    assert.equal(groups.size, 5);
});
