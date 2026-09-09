import { createIncrementalIndex, increment } from './profile-assignment-index.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createOfflineVisualRuntime } from './profile-diversity-runtime.mjs';
import {
    buildVisualRealizationPrompt,
    calculateStructuredImageGroupCount,
    getVisualRealizationPair,
    PROFILE_VISUAL_VARIATION_VERSION,
    VISUAL_REALIZATION_COUNT_PER_BASE
} from './profile-visual-engine.mjs';

test('new tarot assignments balance shooting groups and cloth colors with distinct pairs', (t) => {
    const history = [];
    const runtime = createOfflineVisualRuntime(() => history);
    const counts = new Map();
    const colors = new Map();
    const accessories = new Set();
    const packLayouts = new Set();
    const packDesigns = new Set();
    const recentPacks = [];
    let recentRepeats = 0;
    for (let sample = 0; sample < 180; sample += 1) {
        const payload = { templateType: 'tarot-ppt', tarotCardType: 'universal-waite', visualIdentity: 'diverse-' + sample, visualNonce: String(sample) };
        runtime.assignNovelVisualVariant(payload);
        const pair = runtime.getVisualPair(payload);
        assert.notEqual(pair.portrait.scene.shootingGroup, pair.mood.scene.shootingGroup);
        assert.notEqual(pair.portrait.clothColor, pair.mood.clothColor);
        assert.notEqual(pair.portrait.supportSubject.motifFamilyId, pair.mood.supportSubject.motifFamilyId);
        const restored = runtime.getVisualPair(JSON.parse(JSON.stringify(payload)));
        const recent = new Set(history.slice(0, 12).map(entry => [entry.shootingGroup, entry.clothColor, entry.background].join(':')));
        for (const kind of ['portrait', 'mood']) {
            const entry = runtime.toVisualHistoryEntry(kind, pair[kind]);
            if (entry.packLayoutId) {
                packLayouts.add(entry.packLayoutId);
                packDesigns.add(entry.packDesignId);
                const combination = `${entry.packLayoutId}:${entry.packDesignId}`;
                assert.ok(!recentPacks.slice(0, 6).includes(combination), 'recent pack composition repeated');
                recentPacks.unshift(combination);
                assert.equal(restored[kind].scene.packArtVariant, pair[kind].scene.packArtVariant);
            }
            assert.ok(pair[kind].scene.diverseTarot);
            assert.equal(pair[kind].subject.id, 'classic-symbolic');
            assert.equal(restored[kind].clothColor, pair[kind].clothColor);
            assert.equal(restored[kind].scene.id, pair[kind].scene.id);
            accessories.add(pair[kind].supportSubject.id);
            if (recent.has([entry.shootingGroup, entry.clothColor, entry.background].join(':'))) recentRepeats += 1;
            counts.set(entry.shootingGroup, (counts.get(entry.shootingGroup) || 0) + 1);
            colors.set(entry.clothColor, (colors.get(entry.clothColor) || 0) + 1);
        }
        history.unshift(runtime.toVisualHistoryEntry('portrait', pair.portrait), runtime.toVisualHistoryEntry('mood', pair.mood));
    }
    for (const [group, target] of Object.entries({ oblique: 90, closeup: 90, overhead: 72, 'deck-detail': 54, 'deck-pack': 54 })) {
        assert.ok(Math.abs(counts.get(group) - target) <= 2, JSON.stringify([...counts]));
    }
    assert.equal(accessories.size, 21);
    assert.equal(packLayouts.size, 18);
    assert.equal(packDesigns.size, 3);
    assert.equal(colors.size, 10);
    assert.ok(Math.max(...colors.values()) - Math.min(...colors.values()) <= 8, JSON.stringify([...colors]));
    assert.ok(recentRepeats <= 10, 'recent visible combination repeats: ' + recentRepeats);
    t.diagnostic(JSON.stringify({ groups: Object.fromEntries(counts), colors: Object.fromEntries(colors), recentRepeats, packLayouts: packLayouts.size, packDesigns: packDesigns.size }));
});

test('all 756 package design-layout choices preserve deck identity and a furnished reading desk', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const bases = runtime.BASE_SCENE_ARCHETYPES['tarot-ppt'].filter(scene => scene.packLayoutId);
    assert.equal(bases.length, 54);
    assert.equal(new Set(bases.map(scene => scene.packLayoutId)).size, 18);
    assert.equal(new Set(bases.map(scene => scene.packStructureId)).size, 6);
    const subjects = runtime.TEMPLATE_GUIDES['tarot-ppt'].visualSubjects.filter(subject => subject.role !== 'support');
    const companion = runtime.SCENE_ARCHETYPES['tarot-ppt'].find(scene => scene.shootingGroup === 'overhead');
    const designs = new Set();
    let checked = 0;
    for (const base of bases) {
        const scene = runtime.SCENE_ARCHETYPES['tarot-ppt'].find(candidate => candidate.baseVenueId === base.id);
        assert.ok(scene, base.id);
        const pair = runtime.getVisualPair({ templateType: 'tarot-ppt', visualIdentity: 'pack-check', visualSceneIds: { portrait: scene.id, mood: companion.id } });
        assert.ok(!['wooden-deck-box', 'flat-card-rest'].includes(pair.portrait.supportSubject.id));
        for (const subject of subjects) {
            const variation = { ...pair.portrait, subject, counterpartSubject: subject };
            const prompt = runtime.buildVisualVariationPrompt(variation, 'portrait');
            assert.ok(prompt.includes(base.packDesigns[subject.id]));
            assert.ok(prompt.includes(subject.prompt));
            assert.match(prompt, /REQUIRED TOGETHER: illustrated paper card packaging/);
            assert.match(prompt, /never wood, bare storage bins or metal tins/);
            assert.match(prompt, /Required secondary accessory set/);
            assert.match(prompt, /Exclude Buddhist temples/);
            assert.match(prompt, /No actual product names, authors, logos, copied commercial artwork/);
            assert.match(prompt, /printed illustrations only/);
            designs.add(`${subject.id}-art-${base.packArtVariant}`);
            checked += 1;
        }
    }
    assert.equal(designs.size, 42);
    assert.equal(checked, 756);
});

test('oblique prompts preserve identifiable card faces and assigned accessories despite reference layouts', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const scenes = runtime.SCENE_ARCHETYPES['tarot-ppt'].filter(scene => scene.obliqueTabletop);
    for (const scene of scenes) {
        const other = scenes.find(candidate => candidate.shootType !== scene.shootType
            && candidate.support !== scene.support);
        const pair = runtime.getVisualPair({ templateType: 'tarot-ppt', visualIdentity: 'prompt-check', visualSceneIds: { portrait: scene.id, mood: other.id } });
        const prompt = runtime.buildVisualVariationPrompt(pair.portrait, 'portrait');
        assert.match(prompt, /standalone photograph/);
        assert.match(prompt, /assigned composition takes priority/);
        assert.doesNotMatch(prompt, /reading cloth is expected|consultation-table photograph|Optional supporting accessory|primary evidence/);
        assert.ok(prompt.includes(scene.camera));
        assert.match(prompt, /OBLIQUE READING TABLE/);
        assert.match(prompt, /35 to 55 percent/);
        assert.match(prompt, /Required secondary accessory set/);
        assert.ok(prompt.includes(pair.portrait.supportSubject.prompt));
        assert.doesNotMatch(prompt, /Add no optional accessories|about 10 percent|Do not enlarge the small deck cue|Preserve the true overhead|CARD-FIRST OVERHEAD/);
    }
    const source = fs.readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
    const referenceSource = source.slice(source.indexOf('function buildReferenceAssignmentPrompt('), source.indexOf('function buildImageContents('));
    const referencePrompt = vm.runInNewContext(`(${referenceSource})`);
    for (const kind of ['portrait', 'mood']) assert.match(referencePrompt(3, kind), /take priority over references/);
});

test('persisted legacy tarot scene IDs remain readable', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const oldScenes = runtime.SCENE_ARCHETYPES['tarot-ppt'].filter(scene => !scene.shootType);
    const first = oldScenes[0];
    const second = oldScenes.find(scene => scene.family !== first.family);
    const pair = runtime.getVisualPair({ templateType: 'tarot-ppt', visualIdentity: 'legacy', visualSceneIds: { portrait: first.id, mood: second.id } });
    assert.equal(pair.portrait.scene.id, first.id);
    assert.equal(pair.mood.scene.id, second.id);
});

test('v14 room and detail IDs remain restorable without newly assigned accessories', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const pair = runtime.getVisualPair({ templateType: 'tarot-ppt', visualIdentity: 'saved-v14', visualSceneIds: {
        portrait: 'tarot-independent-consultation-space-1--quiet-original',
        mood: 'tarot-independent-single-card-1--quiet-original'
    } });
    assert.equal(pair.portrait.scene.shootType, 'consultation-space');
    assert.equal(pair.mood.scene.shootType, 'single-card');
    assert.equal(pair.portrait.supportSubject, null);
    assert.equal(pair.mood.supportSubject, null);
});

test('saved v15 scenes keep overhead prompts and accessories while new scenes use diverse shooting groups', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const payload = { templateType: 'tarot-ppt', visualIdentity: 'saved-v15', visualNonce: 'persisted', visualSceneIds: {
        portrait: 'tarot-overhead-three-card-row-linen--quiet-original',
        mood: 'tarot-overhead-four-card-grid-walnut--quiet-original'
    } };
    const pair = runtime.getVisualPair(payload);
    const restored = runtime.getVisualPair(JSON.parse(JSON.stringify(payload)));
    for (const kind of ['portrait', 'mood']) {
        assert.equal(pair[kind].scene.cameraHeight, 'overhead');
        assert.ok(pair[kind].supportSubject);
        assert.equal(restored[kind].supportSubject.id, pair[kind].supportSubject.id);
        const prompt = runtime.buildVisualVariationPrompt(pair[kind], kind);
        assert.match(prompt, /CARD-FIRST OVERHEAD/);
        assert.doesNotMatch(prompt, /OBLIQUE READING TABLE/);
    }
    const fresh = runtime.getVisualPair({ templateType: 'tarot-ppt', visualIdentity: 'new-v16' });
    for (const kind of ['portrait', 'mood']) assert.ok(fresh[kind].scene.diverseTarot);
});

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
        createIncrementalIndex, increment, SCENE_ARCHETYPES: { 'tarot-ppt': [] }, getSubjectMotifFamily: (subject) => subject.motifFamilyId || subject.id
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
    assert.equal(PROFILE_VISUAL_VARIATION_VERSION, 'profile-visual-v16-oblique-tables');
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
    assert.match(prompts['sinjeom-ppt'], /Category identity: sinjeom-ppt/);
    assert.match(prompts['tarot-ppt'], /reference images are attached[\s\S]*assigned composition[\s\S]*take priority/i);
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
