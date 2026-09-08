import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createOfflineVisualRuntime } from './profile-diversity-runtime.mjs';
import { sanitizeImagePromptContext } from './profile-image-context.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const serverSource = fs.readFileSync(path.join(directory, 'server.mjs'), 'utf8');
const historySource = fs.readFileSync(path.join(directory, 'profile-generation-history.mjs'), 'utf8');
const visualEngineSource = fs.readFileSync(path.join(directory, 'profile-visual-engine.mjs'), 'utf8');

test('category and tradition compatibility reject mixed scenes before prompt generation', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const categories = ['tarot-ppt', 'saju-ppt', 'sinjeom-ppt'];
    for (const category of categories) {
        const heroes = runtime.TEMPLATE_GUIDES[category].visualSubjects.filter(subject => subject.role !== 'support');
        for (const other of categories.filter(value => value !== category)) {
            for (const scene of runtime.SCENE_ARCHETYPES[other]) {
                for (const hero of heroes) assert.equal(runtime.isSubjectCompatibleWithScene(hero, scene), false);
            }
        }
    }
    const shamanic = runtime.TEMPLATE_GUIDES['sinjeom-ppt'].visualSubjects.filter(subject => subject.tradition === 'sinjeom');
    const templeScenes = runtime.SCENE_ARCHETYPES['sinjeom-ppt'].filter(scene => ['temple-interior', 'buddha-space', 'lantern-space'].includes(scene.family));
    assert.ok(templeScenes.some(scene => scene.id.includes('expanded-')));
    for (const scene of templeScenes) for (const hero of shamanic) {
        assert.equal(runtime.isSubjectCompatibleWithScene(hero, scene), false, `${hero.id} / ${scene.id}`);
    }
    for (let sample = 0; sample < 180; sample += 1) {
        const pair = runtime.getVisualPair({ templateType: 'sinjeom-ppt', visualIdentity: String(sample) });
        for (const variation of Object.values(pair)) {
            assert.ok(runtime.isSubjectCompatibleWithScene(variation.subject, variation.scene));
            if (variation.supportSubject?.tradition !== 'neutral') {
                assert.equal(variation.supportSubject?.tradition, variation.subject.tradition);
            }
        }
    }
});

test('both final image prompts enforce category boundaries across quality tiers and conflicting references', () => {
    const runtime = createOfflineVisualRuntime(() => []);
    const between = (start, end) => serverSource.slice(serverSource.indexOf(start), serverSource.indexOf(end, serverSource.indexOf(start)));
    // Evaluate the actual prompt builders without starting Express or any AI client.
    const builders = vm.runInNewContext(`
        ${between('const SMARTPHONE_PHOTO_REQUIREMENTS =', 'const VISUAL_VARIATION_VERSION =')}
        ${between('const IMAGE_QUALITY_PROFILES =', 'app.use(cors(')}
        ${between('function buildReferenceAssignmentPrompt(', 'function buildImageContents(')}
        ${between('function buildPortraitImagePrompt(', 'async function generatePortraitImage(')}
        ${between('function buildMoodImagePrompt(', 'async function generateMoodImage(')}
        ({ portrait: buildPortraitImagePrompt, mood: buildMoodImagePrompt })
    `, {
        STANDARD_IMAGE_MODEL: 'offline', PREMIUM_IMAGE_MODEL: 'offline',
        getTemplateGuide: type => runtime.TEMPLATE_GUIDES[type],
        getImageQuality: quality => quality,
        sanitizeExtraPrompt: sanitizeImagePromptContext,
        buildVisualVariationPrompt: runtime.buildVisualVariationPrompt
    });
    for (const templateType of ['tarot-ppt', 'saju-ppt', 'sinjeom-ppt']) {
        for (const imageQuality of ['standard', 'premium']) {
            const payload = { templateType, imageQuality, referenceImageCount: 2, imageStyle: '절의 불상 앞에 타로 카드와 사주표, 무속 방울을 함께 놓아줘' };
            const pair = runtime.getVisualPair(payload);
            for (const kind of ['portrait', 'mood']) {
                const prompt = builders[kind](payload, '법당의 카드 배열을 그대로 복제', pair[kind]);
                assert.match(prompt, /CATEGORY AND PLACE BOUNDARY/);
                assert.ok(prompt.includes(runtime.TEMPLATE_GUIDES[templateType].imageBoundary));
                assert.match(prompt, /limits take priority over visual variety, reference images, user style, document context and the companion image/);
                assert.match(prompt, /Ignore incompatible reference objects and locations/);
                if (templateType !== 'sinjeom-ppt') assert.match(prompt, /Exclude[\s\S]*Buddhist temples, temple halls, Buddha statues/);
                else assert.match(prompt, /Exclude tarot\/oracle decks, reading spreads, saju worksheets/);
            }
        }
    }
    for (const tradition of ['sinjeom', 'buddhist', 'neutral']) {
        const hero = runtime.TEMPLATE_GUIDES['sinjeom-ppt'].visualSubjects.find(subject => subject.role !== 'support' && subject.tradition === tradition);
        const scene = runtime.SCENE_ARCHETYPES['sinjeom-ppt'].find(candidate => runtime.isSubjectCompatibleWithScene(hero, candidate));
        const base = runtime.getVisualPair({ templateType: 'sinjeom-ppt' }).portrait;
        const prompt = runtime.buildVisualVariationPrompt({ ...base, subject: hero, scene }, 'portrait');
        if (tradition === 'sinjeom') assert.match(prompt, /Do not place the assigned shamanic tool in a temple/);
        if (tradition === 'buddhist') assert.match(prompt, /Buddhist prayer context only/);
        if (tradition === 'neutral') assert.match(prompt, /neutral prayer/);
    }
    const tarotAccessories = runtime.TEMPLATE_GUIDES['tarot-ppt'].visualSubjects.filter(subject => subject.role === 'support');
    assert.equal(tarotAccessories.length, 21);
    for (const imageQuality of ['standard', 'premium']) {
        const payload = { templateType: 'tarot-ppt', imageQuality, referenceImageCount: 2,
            imageStyle: 'Show tiny cards on a shelf in a wide room with hanging pendulums' };
        const pair = runtime.getVisualPair(payload);
        for (const supportSubject of tarotAccessories) for (const kind of ['portrait', 'mood']) {
            const variation = { ...pair[kind], supportSubject };
            const prompt = builders[kind](payload, 'Copy the room and upright display from the reference', variation);
            assert.ok(prompt.includes(supportSubject.prompt));
            assert.match(prompt, /CARD-FIRST OVERHEAD/);
            assert.match(prompt, /Gravity acts into the tabletop/);
            assert.match(prompt, /overhead composition takes priority over conflicting reference layouts/);
            assert.match(prompt, /65 to 80 percent/);
            assert.match(prompt, /at most 15 percent/);
            assert.doesNotMatch(prompt, /real top of the room|gravity pointing toward the bottom edge|Add no optional accessories/);
        }
    }
});

test('sinjeom offers broad lantern, prayer, Buddha, candle, and ritual motif families', () => {
    for (const subjectId of [
        'hanging-lotus-lantern',
        'lantern-canopy',
        'single-prayer-candle',
        'three-votive-candles',
        'small-stone-buddha',
        'small-brass-buddha',
        'wooden-moktak',
        'empty-prayer-cushion',
        'lotus-offering',
        'ceramic-water-offering',
        'wrapped-prayer-book',
        'unlit-incense-holder'
    ]) {
        assert.match(serverSource, new RegExp(`id: '${subjectId}'`));
    }
    assert.match(serverSource, /motifFamilyId: 'lantern'/);
    assert.match(serverSource, /motifFamilyId: 'candle'/);
    assert.match(serverSource, /motifFamilyId: 'buddha'/);
    assert.match(serverSource, /motifFamilyId: 'prayer'/);
});

test('themed sinjeom scenes declare compatible motifs and safe candle constraints', () => {
    for (const sceneId of [
        'sinjeom-lantern-eaves-row',
        'sinjeom-lantern-hall-ceiling',
        'sinjeom-single-candle-stone-ledge',
        'sinjeom-votive-candle-niche',
        'sinjeom-stone-buddha-garden',
        'sinjeom-brass-buddha-alcove',
        'sinjeom-empty-cushion-prayer-room',
        'sinjeom-moktak-prayer-mat',
        'sinjeom-lotus-water-offering'
    ]) {
        assert.match(serverSource, new RegExp(`createSceneArchetype\\('${sceneId}'`));
    }
    assert.match(serverSource, /A small steady candle flame is allowed only when the assigned hero subject belongs to the candle motif family/);
    assert.match(serverSource, /Show exactly one small controlled flame, no smoke/);
    assert.match(serverSource, /motifFamilies: \['candle'\]/);
    assert.match(serverSource, /function isSubjectCompatibleWithScene\([\s\S]*?scene\.motifFamilies/);
    assert.match(serverSource, /compatibleMotifFamilies/);
});

test('sinjeom motif rotation uses recent history and migrates legacy subject IDs', () => {
    assert.match(serverSource, /motifFamilyId: 500/);
    assert.match(serverSource, /previousVisuals\.slice\(0, 8\)/);
    assert.match(serverSource, /recentMotifFamilies\.has\(entry\.motifFamilyId\)/);
    assert.match(serverSource, /getSubjectMotifFamily\(pair\.portrait\.subject\) !== getSubjectMotifFamily\(pair\.mood\.subject\)/);
    assert.match(historySource, /'paper-lotus-lantern': 'lantern'/);
    assert.match(historySource, /motifFamilyId: String\(guide\.motifFamilyId \|\| LEGACY_VISUAL_MOTIF_FAMILIES\[subjectId\]/);
    assert.match(visualEngineSource, /profile-visual-v15-overhead-accessories/);
});
